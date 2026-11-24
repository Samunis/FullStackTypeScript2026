import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { parseId } from '../utils/params.js';
import type { UpdateMeInput } from '../schemas/user.js';

const publicUserFields = {
  id: true,
  email: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;


export async function getProfile(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { ...publicUserFields, profile: { select: { bio: true } } },
  });

  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }
  res.json(user);
}

/** PUT /api/v1/users/me — only username and bio can be changed here. */
export async function updateProfile(req: Request, res: Response) {
  const { username, bio } = req.body as UpdateMeInput;
  const userId = req.user!.id;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username !== undefined && { username }),
      ...(bio !== undefined && {
        profile: {
          upsert: {
            create: { bio },
            update: { bio },
          },
        },
      }),
    },
    select: { ...publicUserFields, profile: { select: { bio: true } } },
  });

  res.json(user);
}


export async function getAll(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: publicUserFields,
    orderBy: { id: 'asc' },
  });
  res.json(users);
}


export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'INVALID_ID' });
    return;
  }


  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}
