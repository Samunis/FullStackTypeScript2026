import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
    const passwordHash = await argon2.hash("ChangeMe123!");

    await prisma.$transaction([
        prisma.post.deleteMany(),
        prisma.profile.deleteMany(),
        prisma.user.deleteMany(),
        prisma.category.deleteMany(),
    ]);
    const ts = await prisma.category.create({
        data: { name: "TypeScript" },
    });
    await prisma.user.create({
        data: {
            username: "jon",
            email: "jon@example.com",
            password: passwordHash,
            role: "ADMIN",
            profile: {
                create: { bio: "Full-stack developer" },
            },
            posts: {
                create: {
                    title: "Getting Started with TypeScript",
                    content: "TypeScript adds static typing to JavaScript.",
                    published: true,
                    views: 142,
                    categories: { connect: [{ id: ts.id }] },
                },
            },
        },
    });

    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error("Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });