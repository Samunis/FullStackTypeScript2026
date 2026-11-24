import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../db.js';
import { cleanDb } from './setup.js';
import { createTestUser } from './helpers.js';

describe('Auth Endpoints (integration)', () => {
    beforeEach(async () => {
        await cleanDb();
    });

    afterAll(async () => {
        await cleanDb();
        await prisma.$disconnect();
    });

    it('registers and sets an HttpOnly refresh cookie', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'new@example.com',
                username: 'New User',
                password: 'securepassword',
            });

        expect(res.status).toBe(201);
        expect(res.body.user.password).toBeUndefined();
        expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('returns 401 without an access token and 403 without the required role', async () => {
        const noAuth = await request(app).get('/api/v1/users');
        expect(noAuth.status).toBe(401);

        const { accessToken } = await createTestUser();
        const noRole = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(noRole.status).toBe(403);
    });

    it('invalidates the refresh token after logout', async () => {
        const { cookies } = await createTestUser();

        await request(app)
            .post('/api/auth/logout')
            .set('Cookie', cookies)
            .expect(204);

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookies);

        expect(res.status).toBe(401);
    });

    it('rotates a refresh token successfully', async () => {
        const { cookies } = await createTestUser();

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookies);

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.headers['set-cookie'][0]).toContain('refreshToken=');
    });

    it('rejects a refresh token after it is rotated', async () => {
        const { cookies } = await createTestUser();

        await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookies)
            .expect(200);

        const replay = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookies);

        expect(replay.status).toBe(401);
    });
});
