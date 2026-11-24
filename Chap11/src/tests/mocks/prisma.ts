import { mockDeep, mockReset } from 'vitest-mock-extended';
import { beforeEach } from 'vitest';
import type { prisma } from '../../db.js';

export const prismaMock = mockDeep<typeof prisma>();

beforeEach(() => {
  mockReset(prismaMock);
});
