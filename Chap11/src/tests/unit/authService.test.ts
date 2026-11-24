import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../mocks/prisma.js';


vi.mock('../../db.js', async () => {
  const { prismaMock } = await import('../mocks/prisma.js');
  return { prisma: prismaMock };
});


vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('$argon2id$v=19$mocked-hash'),
  verify: vi.fn(),
  argon2id: 2,
}));

import * as argon2 from 'argon2';
import { registerUser, loginUser } from '../../services/authService.js';
import { verifyAccessToken } from '../../utils/jwt.js';
import { AuthError } from '../../errors.js';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('JWT_ACCESS_SECRET', 'unit-test-access-secret-at-least-32-chars');
    vi.stubEnv('JWT_REFRESH_SECRET', 'unit-test-refresh-secret-at-least-32-chars');
  });

  it('hashes the password with argon2id and returns tokens', async () => {
    prismaMock.user.create.mockResolvedValue({
      id: 1, email: 'new@example.com', username: 'New User', role: 'USER',
    } as any);
    prismaMock.refreshToken.create.mockResolvedValue({} as any);

    const result = await registerUser({
      email: 'new@example.com',
      username: 'New User',
      password: 'securepassword',
    });

    expect(argon2.hash).toHaveBeenCalledWith('securepassword', {
      type: argon2.argon2id,
    });
    
    expect((prismaMock.user.create.mock.calls[0][0] as any).data.password).toBe(
      '$argon2id$v=19$mocked-hash',
    );
    expect(result.user.email).toBe('new@example.com');

    const payload = await verifyAccessToken(result.accessToken);
    expect(payload.sub).toBe('1');
    expect(payload.role).toBe('USER');
    expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
  });

  it('turns a duplicate email into a clear AuthError', async () => {
    prismaMock.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      registerUser({ email: 'dup@example.com', username: 'Dup', password: 'securepassword' }),
    ).rejects.toThrow('An account with this email already exists');
  });

  it('rejects a wrong password with a generic error', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1, email: 'user@example.com', password: '$argon2id$hash', role: 'USER',
    } as any);
    vi.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      loginUser({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('gives the same error for an unknown email and still runs a hash check', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    vi.mocked(argon2.verify).mockResolvedValue(false);

    const attempt = loginUser({ email: 'nobody@example.com', password: 'whatever' });

    await expect(attempt).rejects.toBeInstanceOf(AuthError);
    await expect(attempt).rejects.toThrow('Invalid email or password');
  
    expect(argon2.verify).toHaveBeenCalledOnce();
  });

  it('logs in with a correct password and never returns the hash', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 7, email: 'user@example.com', username: 'User', password: '$argon2id$hash', role: 'ADMIN',
    } as any);
    vi.mocked(argon2.verify).mockResolvedValue(true);
    prismaMock.refreshToken.create.mockResolvedValue({} as any);

    const result = await loginUser({ email: 'user@example.com', password: 'correct' });

    expect(result.user).not.toHaveProperty('password');
    const payload = await verifyAccessToken(result.accessToken);
    expect(payload.role).toBe('ADMIN');
  });
});
