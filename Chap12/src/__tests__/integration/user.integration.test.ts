import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma, cleanDb } from "./setup.js";
describe("User CRUD (integration)", () => {
beforeEach(async () => {
    await cleanDb();
});
afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
});
it("creates and retrieves a user", async () => {
    const user = await prisma.user.create({
    data: {
        username: "jon",
        email: "jon@example.com",
        password: "test-password",
    },
    });
    const found = await prisma.user.findUnique({
    where: { id: user.id },
    });
    expect(found).not.toBeNull();
    expect(found!.username).toBe("jon");
});
it("enforces unique email constraint", async () => {
    await prisma.user.create({
    data: {
        username: "jon",
        email: "same@example.com",
        password: "test-password",
    },
    });
    await expect(
    prisma.user.create({
    data: {
        username: "dave",
        email: "same@example.com",
        password: "test-password-2",
    },
    })
    ).rejects.toThrow();
});
});