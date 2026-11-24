import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { parseId } from '../utils/params.js';
import type { Role } from '../types/roles.js';
import type { CreatePostInput, UpdatePostInput } from '../schemas/post.js';

const authorSelect = { select: { id: true, username: true } } as const;



function canModify(post: { authorId: number }, user: { id: number; role: Role }): boolean {
  return post.authorId === user.id || user.role === 'MODERATOR' || user.role === 'ADMIN';
}


export async function getAll(_req: Request, res: Response) {
  const posts = await prisma.post.findMany({
    include: { author: authorSelect },
    orderBy: { createdAt: 'desc' },
  });
  res.json(posts);
}


export async function getById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'INVALID_ID' });
    return;
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: { author: authorSelect },
  });

  if (!post) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }
  res.json(post);
}


export async function create(req: Request, res: Response) {
  const { title, content, published } = req.body as CreatePostInput;

  const post = await prisma.post.create({
    data: { title, content, published, authorId: req.user!.id },
    include: { author: authorSelect },
  });
  res.status(201).json(post);
}


export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'INVALID_ID' });
    return;
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }


  if (!canModify(post, req.user!)) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  const { title, content, published } = req.body as UpdatePostInput;
  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { title, content, published },
    include: { author: authorSelect },
  });
  res.json(updated);
}


export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'INVALID_ID' });
    return;
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  if (!canModify(post, req.user!)) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }

  await prisma.post.delete({ where: { id: post.id } });
  res.status(204).send();
}
