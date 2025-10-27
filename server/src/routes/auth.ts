import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post('/login', authRateLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!req.session) {
    req.session = {};
  }
  req.session.userId = user.id;
  req.session.isAdmin = user.isAdmin;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    }
  });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.status(204).end();
});

router.get('/me', (req, res) => {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({
    user: {
      id: req.currentUser.id,
      email: req.currentUser.email,
      isAdmin: req.currentUser.isAdmin,
      createdAt: req.currentUser.createdAt
    }
  });
});

export default router;
