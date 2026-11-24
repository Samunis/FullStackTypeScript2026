import request from 'supertest';
import app from '../app.js';
import { prisma } from '../db.js';

export const TEST_PASSWORD = 'testpassword123';

export function getCookies(res: request.Response): string[] {
  const header = res.headers['set-cookie'] as string[] | string | undefined;
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

export async function createTestUser(
  overrides?: Partial<{ email: string; username: string; password: string }>,
) {
  const userData = {
    email: overrides?.email ?? 'test@example.com',
    username: overrides?.username ?? 'Test User',
    password: overrides?.password ?? TEST_PASSWORD,
  };

  const res = await request(app).post('/api/auth/register').send(userData);

  return {
    user: res.body.user as { id: number; email: string; role: string },
    accessToken: res.body.accessToken as string,
    cookies: getCookies(res),
  };
}


export async function createUserWithRole(role: 'ADMIN' | 'MODERATOR', email: string) {
  const { user } = await createTestUser({ email });
  await prisma.user.update({ where: { id: user.id }, data: { role } });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: TEST_PASSWORD });

  return { user, accessToken: res.body.accessToken as string };
}

export async function resetDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
}
