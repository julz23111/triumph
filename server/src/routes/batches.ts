import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { presentImage } from '../utils/imagePresenter.js';

const router = Router();

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const batch = await prisma.batch.create({
    data: { adminId: req.currentUser!.id }
  });
  res.status(201).json({ batch });
});

router.get('/', requireAuth, async (req, res) => {
  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      images: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  const presented = await Promise.all(
    batches.map(async (batch) => ({
      ...batch,
      images: await Promise.all(batch.images.map((image) => presentImage(image)))
    }))
  );
  res.json({ batches: presented });
});

router.get('/:id', requireAuth, async (req, res) => {
  const paramsSchema = z.object({ id: z.coerce.number() });
  const { id } = paramsSchema.parse(req.params);
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  const images = await Promise.all(batch.images.map((image) => presentImage(image)));
  res.json({ batch: { ...batch, images } });
});

export default router;
