import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';
import app from '../../app.js';
import { prisma } from '../../db.js';
import {
  createTestUser,
  createUserWithRole,
  getCookies,
  resetDatabase,
  TEST_PASSWORD,
} from '../helpers.js';

describe('Auth endpoints', () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it('registers, hides the password and sets a hardened refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', username: 'New User', password: 'securepassword' });

    expect(res.status).toBe(201);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toBeUndefined();

    const cookie = getCookies(res)[0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/auth');
  });

  it('stores an argon2id hash, not the plaintext password', async () => {
    await createTestUser({ email: 'hash@example.com' });
    const user = await prisma.user.findUnique({
      where: { email: 'hash@example.com' },
      omit: { password: false },
    });
    expect(user?.password).toMatch(/^\$argon2id\$/);
  });

  it('rejects invalid input with field-level validation errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', username: 'A', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'username', 'password']));
  });

  it('rejects a duplicate email', async () => {
    await createTestUser();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', username: 'Again', password: 'securepassword' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('An account with this email already exists');
  });

  it('uses the same error for wrong password and unknown email', async () => {
    await createTestUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

    expect(wrongPassword.status).toBe(400);
    expect(unknownEmail.status).toBe(400);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('logs in with correct credentials', async () => {
    await createTestUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(getCookies(res)[0]).toContain('refreshToken=');
  });
});

describe('Authentication middleware (401)', () => {
  beforeEach(resetDatabase);

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('returns INVALID_TOKEN for a tampered token', async () => {
    const { accessToken } = await createTestUser();
    const tampered = accessToken.slice(0, -2) + (accessToken.endsWith('AA') ? 'BB' : 'AA');

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('returns TOKEN_EXPIRED for an expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ role: 'USER' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('1')
      .setIssuedAt(now - 3600)
      .setExpirationTime(now - 60)
      .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
  });

  it('returns the current user from /users/me', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.password).toBeUndefined();
  });

  it('does not let a user promote themselves through PUT /users/me', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'Renamed', role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('Renamed');
    expect(res.body.role).toBe('USER');
  });
});

describe('Role-based access control (403)', () => {
  beforeEach(resetDatabase);

  it('returns 401 without token and 403 without the ADMIN role', async () => {
    const noAuth = await request(app).get('/api/v1/users');
    expect(noAuth.status).toBe(401);

    const { accessToken } = await createTestUser();
    const noRole = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(noRole.status).toBe(403);
  });

  it('lets an admin list and delete users', async () => {
    const { user } = await createTestUser();
    const { accessToken } = await createUserWithRole('ADMIN', 'admin@example.com');

    const list = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].password).toBeUndefined();

    const del = await request(app)
      .delete(`/api/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(del.status).toBe(204);
  });
});

describe('Post ownership', () => {
  beforeEach(resetDatabase);

  async function createPost(accessToken: string) {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Original', authorId: 9999 });
    return res;
  }

  it('takes the author from the token, not from the request body', async () => {
    const { user, accessToken } = await createTestUser();
    const res = await createPost(accessToken);

    expect(res.status).toBe(201);
    expect(res.body.authorId).toBe(user.id);
  });

  it('allows the owner but returns 403 for another user', async () => {
    const owner = await createTestUser({ email: 'owner@example.com' });
    const other = await createTestUser({ email: 'other@example.com' });
    const post = (await createPost(owner.accessToken)).body;

    const forbidden = await request(app)
      .put(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ title: 'Hacked' });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .put(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Edited by owner' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.title).toBe('Edited by owner');
  });

  it('allows a moderator to edit any post', async () => {
    const owner = await createTestUser({ email: 'owner@example.com' });
    const moderator = await createUserWithRole('MODERATOR', 'mod@example.com');
    const post = (await createPost(owner.accessToken)).body;

    const res = await request(app)
      .put(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${moderator.accessToken}`)
      .send({ title: 'Moderated' });
    expect(res.status).toBe(200);
  });
});

describe('Token refresh and logout', () => {
  beforeEach(resetDatabase);

  it('rotates the refresh token: a new pair is issued and the old token stops working', async () => {
    const { cookies } = await createTestUser();

    const first = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
    expect(first.status).toBe(200);
    expect(first.body.accessToken).toEqual(expect.any(String));
    const newCookies = getCookies(first);
    expect(newCookies[0]).not.toBe(cookies[0]);

    const reused = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
    expect(reused.status).toBe(401);
    expect(reused.body.error).toBe('TOKEN_REVOKED');

    const second = await request(app).post('/api/auth/refresh').set('Cookie', newCookies);
    expect(second.status).toBe(200);
  });

  it('returns 401 without a refresh cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('invalidates the refresh token after logout', async () => {
    const { cookies } = await createTestUser();

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookies);
    expect(logout.status).toBe(204);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
    expect(res.status).toBe(401);
  });

  it('logs out every session with DELETE /api/auth/sessions', async () => {
    const { accessToken, cookies: deviceA } = await createTestUser();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: TEST_PASSWORD });
    const deviceB = getCookies(login);

    const res = await request(app)
      .delete('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(204);

    for (const cookies of [deviceA, deviceB]) {
      const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
      expect(refresh.status).toBe(401);
    }
  });
});

describe('Security hardening', () => {
  it('sets Helmet security headers', async () => {
    const res = await request(app).get('/api/v1/posts');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects request bodies over 10kb', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });
});
