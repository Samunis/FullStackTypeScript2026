import { Router, type Request, type Response } from 'express';
import { registerUser, loginUser } from '../services/authService.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/cookies.js';
import {
    createAccessToken,
    createRefreshToken,
    daysFromNow,
    hashRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt.js';
import { prisma } from '../db.js';



const router = Router();

router.post(
    '/api/auth/register',
    validate(registerSchema),
    async (req: Request, res: Response) => {
        const { user, accessToken, refreshToken } = await registerUser(
            req.body,
        );

        setRefreshTokenCookie(res, refreshToken);
        res.status(201).json({ user, accessToken });
    },
);

router.post(
    '/api/auth/login',
    validate(loginSchema),
    async (req: Request, res: Response) => {
        const { user, accessToken, refreshToken } = await loginUser(req.body);

        setRefreshTokenCookie(res, refreshToken);
        res.json({ user, accessToken });
    },
);

router.post('/api/auth/logout', async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    if (token) {
        const tokenHash = hashRefreshToken(token);
        await prisma.refreshToken.deleteMany({
            where: { token: tokenHash },
        });
    }
    clearRefreshTokenCookie(res);
    res.status(204).send();
});

router.post('/api/auth/refresh', async (req: Request, res: Response) => {
    const oldToken = req.cookies.refreshToken;
    if (!oldToken) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
    }

    const oldTokenHash = hashRefreshToken(oldToken);

    let payload;
    try {
        ({ payload } = await verifyRefreshToken(oldToken));
    } catch {
        await prisma.refreshToken.deleteMany({ where: { token: oldTokenHash } });
        clearRefreshTokenCookie(res);
        res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
        return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
        where: { token: oldTokenHash },
    });

    const userId = Number(payload.sub);
    if (
        !storedToken ||
        storedToken.expiresAt < new Date() ||
        storedToken.userId !== userId
    ) {
        await prisma.refreshToken.deleteMany({ where: { token: oldTokenHash } });
        clearRefreshTokenCookie(res);
        res.status(401).json({ error: 'TOKEN_REVOKED' });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        await prisma.refreshToken.deleteMany({ where: { userId } });
        clearRefreshTokenCookie(res);
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
    }

    const accessToken = await createAccessToken(user.id, user.role);
    const newRefreshToken = await createRefreshToken(user.id);
    const newTokenHash = hashRefreshToken(newRefreshToken);

    try {
        await prisma.$transaction(async (tx) => {
            const deleted = await tx.refreshToken.deleteMany({
                where: { id: storedToken.id, token: oldTokenHash },
            });

            if (deleted.count !== 1) {
                throw new Error('REFRESH_TOKEN_ALREADY_USED');
            }

            await tx.refreshToken.create({
                data: {
                    token: newTokenHash,
                    userId: user.id,
                    expiresAt: daysFromNow(7),
                },
            });
        });
    } catch {
        clearRefreshTokenCookie(res);
        res.status(401).json({ error: 'TOKEN_REVOKED' });
        return;
    }

    setRefreshTokenCookie(res, newRefreshToken);
    res.json({ accessToken });
});

router.delete(
    '/api/auth/sessions',
    authenticate,
    async (req: Request, res: Response) => {
        await prisma.refreshToken.deleteMany({
            where: { userId: req.user!.id },
        });
        clearRefreshTokenCookie(res);
        res.status(204).send();
    },
);

export default router;