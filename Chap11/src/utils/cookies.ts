import type { CookieOptions, Response } from 'express';
import { REFRESH_TOKEN_TTL_DAYS } from './jwt.js';
import { daysToMs } from './date.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';


function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  };
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: daysToMs(REFRESH_TOKEN_TTL_DAYS),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}
