import { errors } from 'jose';
import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { isRole } from '../types/roles.js';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = await verifyAccessToken(token);
    const id = Number(payload.sub);

    
    if (!Number.isSafeInteger(id) || id <= 0 || !isRole(payload.role)) {
      throw new Error('Malformed token payload');
    }

    req.user = { id, role: payload.role };
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
     
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired',
      });
      return;
    }
 
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid access token',
    });
    return;
  }

  next();
}
