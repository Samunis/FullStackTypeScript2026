import { createHash, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTVerifyResult } from 'jose';

function requiredSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
    const value = process.env[name];
    if (!value || value.length < 32) {
        throw new Error(`${name} is missing or too short (min 32 chars)`);
    }
    return value;
}

const accessSecret = new TextEncoder().encode(
    requiredSecret('JWT_ACCESS_SECRET')
);

const refreshSecret = new TextEncoder().encode(
    requiredSecret('JWT_REFRESH_SECRET')
);

export async function createAccessToken(
    userId: number,
    role: string,
): Promise<string> {
    return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
}

export async function createRefreshToken(
    userId: number,
): Promise<string> {
    return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);
}

export async function verifyRefreshToken(
    token: string,
): Promise<JWTVerifyResult> {
    return jwtVerify(token, refreshSecret);
}

export function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}