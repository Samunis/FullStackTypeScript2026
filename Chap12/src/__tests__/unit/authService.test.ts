import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../mocks/prisma.js';

vi.mock('../../db.js', () => ({
    prisma: prismaMock,
}));

vi.mock('../../utils/jwt.js', () => ({
    createAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
    createRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
    hashRefreshToken: vi.fn().mockReturnValue('mock-refresh-token-hash'),
    daysFromNow: vi.fn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
}));

vi.mock('argon2', () => ({
    hash: vi.fn().mockResolvedValue('$argon2id$v=19$mocked-hash'),
    verify: vi.fn(),
    argon2id: 2,
}));

import * as argon2 from 'argon2';
import { registerUser, loginUser } from '../../services/authService.js';

describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('hashes the password and creates user with tokens', async () => {
        prismaMock.user.create.mockResolvedValue({
            id: 1,
            email: 'new@example.com',
            username: 'New User',
            role: 'USER',
        } as any);
        prismaMock.refreshToken.create.mockResolvedValue({} as any);
        prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));

        const result = await registerUser({
            email: 'new@example.com',
            username: 'New User',
            password: 'securepassword',
        });

        expect(argon2.hash).toHaveBeenCalledWith('securepassword', {
            type: argon2.argon2id,
        });
        expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
        expect(result.user.email).toBe('new@example.com');
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
    });

    it('rejects wrong password with generic error', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 1,
            email: 'user@example.com',
            password: '$argon2id$hash',
            role: 'USER',
        } as any);
        (argon2.verify as any).mockResolvedValue(false);

        await expect(
            loginUser({ email: 'user@example.com', password: 'wrong' }),
        ).rejects.toThrow('Invalid email or password');
    });

    it('logs in successfully with a valid password', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 1,
            email: 'user@example.com',
            username: 'User',
            password: '$argon2id$hash',
            role: 'USER',
        } as any);
        (argon2.verify as any).mockResolvedValue(true);
        prismaMock.refreshToken.create.mockResolvedValue({} as any);

        const result = await loginUser({
            email: 'user@example.com',
            password: 'correctpassword',
        });

        expect(argon2.verify).toHaveBeenCalledWith(
            '$argon2id$hash',
            'correctpassword',
        );
        expect(result.user).not.toHaveProperty('password');
        expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
    });
});
