import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
connectionString: process.env.DATABASE_URL!,
});
export const prisma = new PrismaClient({ adapter });

export async function cleanDb() {
    await prisma.$transaction([
        prisma.refreshToken.deleteMany(),
        prisma.post.deleteMany(),
        prisma.profile.deleteMany(),
        prisma.category.deleteMany(),
        prisma.user.deleteMany(),
    ]);
}