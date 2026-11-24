import * as argon2 from 'argon2';
import { prisma } from '../db.js';
import { AuthError, TokenError } from '../errors.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
} from '../utils/jwt.js';
import { daysFromNow } from '../utils/date.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.js';

const HASH_OPTIONS = { type: argon2.argon2id } as const;
const INVALID_CREDENTIALS = 'Invalid email or password';


let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  return (dummyHash ??= argon2.hash('timing-equalisation-dummy-password', HASH_OPTIONS));
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

async function issueTokens(userId: number, role: string) {
  const accessToken = await createAccessToken(userId, role);
  const refreshToken = await createRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: daysFromNow(REFRESH_TOKEN_TTL_DAYS),
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput) {
  const hashedPassword = await argon2.hash(input.password, HASH_OPTIONS);

  let user;
  try {
    
    user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        password: hashedPassword,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AuthError('An account with this email already exists');
    }
    throw error;
  }

  const tokens = await issueTokens(user.id, user.role);
  return { user, ...tokens };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    omit: { password: false },
  });

  if (!user) {
    await argon2.verify(await getDummyHash(), input.password);
    throw new AuthError(INVALID_CREDENTIALS);
  }

  const validPassword = await argon2.verify(user.password, input.password);
  if (!validPassword) {
    
    throw new AuthError(INVALID_CREDENTIALS);
  }

  
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id, expiresAt: { lt: new Date() } },
  });

  const tokens = await issueTokens(user.id, user.role);
  const { password: _password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, ...tokens };
}


export async function refreshSession(oldToken: string) {
  
  let userId: number;
  try {
    const payload = await verifyRefreshToken(oldToken);
    userId = Number(payload.sub);
  } catch {
    throw new TokenError('INVALID_REFRESH_TOKEN');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
  });

  if (!storedToken || storedToken.userId !== userId || storedToken.expiresAt < new Date()) {
    throw new TokenError('TOKEN_REVOKED');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new TokenError('TOKEN_REVOKED');
  }

  const accessToken = await createAccessToken(user.id, user.role);
  const refreshToken = await createRefreshToken(user.id);

 
  await prisma.$transaction(async (tx) => {
  
    const { count } = await tx.refreshToken.deleteMany({
      where: { id: storedToken.id },
    });
    if (count === 0) {
      throw new TokenError('TOKEN_REVOKED');
    }

    await tx.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: daysFromNow(REFRESH_TOKEN_TTL_DAYS),
      },
    });
  });

  return { accessToken, refreshToken };
}


export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}


export async function logoutAllSessions(userId: number) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}


export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
