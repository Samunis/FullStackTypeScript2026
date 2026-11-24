import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_DAYS = 7;

const ALGORITHM = 'HS256';
const encoder = new TextEncoder();

type SecretName = 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET';


function getSecret(name: SecretName): Uint8Array {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} must be set and at least 32 characters long`);
  }
  return encoder.encode(value);
}

export async function createAccessToken(userId: number, role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(String(userId))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret('JWT_ACCESS_SECRET'));
}

export async function createRefreshToken(userId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(String(userId))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(getSecret('JWT_REFRESH_SECRET'));
}


export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_ACCESS_SECRET'), {
    algorithms: [ALGORITHM],
  });
  return payload;
}


export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_REFRESH_SECRET'), {
    algorithms: [ALGORITHM],
  });
  return payload;
}
