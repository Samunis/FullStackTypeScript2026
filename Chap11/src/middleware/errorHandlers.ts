import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { AuthError } from '../errors.js';



export const prismaErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'CONFLICT', message: 'Resource already exists' });
      return;
    }
  }
  next(err);
};

export const generalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AuthError) {
    res.status(400).json({ error: 'AUTH_ERROR', message: err.message });
    return;
  }


  const status = (err as { status?: unknown }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const type = (err as { type?: unknown }).type;
    res.status(status).json({ error: typeof type === 'string' ? type : 'BAD_REQUEST' });
    return;
  }

  console.error(err);
 
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
};
