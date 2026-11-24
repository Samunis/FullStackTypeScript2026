import { Router, type Request, type Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshSession,
  logout,
  logoutAllSessions,
} from '../services/authService.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import {
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/cookies.js';
import { TokenError } from '../errors.js';

const router = Router();

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}



router.post(
  '/api/auth/register',
  validate(registerSchema),
  async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await registerUser(req.body);
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
    res.status(200).json({ user, accessToken });
  },
);

router.post('/api/auth/refresh', async (req: Request, res: Response) => {
  const oldToken = readRefreshCookie(req);
  if (!oldToken) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing refresh token' });
    return;
  }

  try {
    const { accessToken, refreshToken } = await refreshSession(oldToken);
    setRefreshTokenCookie(res, refreshToken);
    res.json({ accessToken });
  } catch (error) {
    if (error instanceof TokenError) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ error: error.code });
      return;
    }
    throw error;
  }
});

router.post('/api/auth/logout', async (req: Request, res: Response) => {
  await logout(readRefreshCookie(req));
  clearRefreshTokenCookie(res);
  res.status(204).send();
});

router.delete(
  '/api/auth/sessions',
  authenticate,
  async (req: Request, res: Response) => {
    await logoutAllSessions(req.user!.id);
    clearRefreshTokenCookie(res);
    res.status(204).send();
  },
);

export default router;
