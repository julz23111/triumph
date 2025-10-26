import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  if (req.session?.userId) {
    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (user) {
      req.currentUser = user;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.currentUser?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
