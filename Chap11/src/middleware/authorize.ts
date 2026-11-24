import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../types/roles.js';


export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
  
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }

    next();
  };
}
