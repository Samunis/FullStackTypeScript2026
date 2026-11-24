import { PrismaClient } from "../../generated/prisma/client.js";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";

export type MockPrismaClient = DeepMockProxy<PrismaClient>;
export const prismaMock = mockDeep<PrismaClient>();