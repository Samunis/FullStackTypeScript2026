import 'dotenv/config';
import * as argon2 from 'argon2';
import { prisma } from '../src/db.js';

const DEFAULT_PASSWORD = 'password123';

async function main() {
  const password = await argon2.hash(DEFAULT_PASSWORD, { type: argon2.argon2id });

  await prisma.refreshToken.deleteMany();
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'Admin',
      password,
      role: 'ADMIN',
      profile: { create: { bio: 'Site administrator' } },
    },
  });

  const moderator = await prisma.user.create({
    data: {
      email: 'moderator@example.com',
      username: 'Moderator',
      password,
      role: 'MODERATOR',
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      username: 'Alice',
      password,
      profile: { create: { bio: 'Regular user' } },
      posts: {
        create: [
          { title: 'Hello world', content: 'My first post', published: true },
          { title: 'Draft post', content: 'Work in progress' },
        ],
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      username: 'Bob',
      password,
      posts: {
        create: [{ title: "Bob's post", content: 'Only Bob, moderators and admins can edit this', published: true }],
      },
    },
  });

  console.log('Seeded users (password for all: %s):', DEFAULT_PASSWORD);
  for (const u of [admin, moderator, alice, bob]) {
    console.log(`  ${u.role.padEnd(9)} ${u.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
