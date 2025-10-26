import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';
import { getStorageService } from '../services/storage.js';
import { ocrQueue } from '../queue/ocrQueue.js';
import { presentImage } from '../utils/imagePresenter.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/upload', requireAuth, requireAdmin, uploadRateLimiter, upload.array('images'), async (req, res) => {
  const batchIdSchema = z.object({ batchId: z.coerce.number() });
  const { batchId } = batchIdSchema.parse(req.query);
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    return res.status(400).json({ error: 'No files provided' });
  }
  const storage = getStorageService();
  const images = [];
  for (const file of files) {
    const saved = await storage.saveFile(file);
    const image = await prisma.image.create({
      data: {
        batchId,
        storagePath: saved.storagePath,
        thumbPath: saved.thumbPath,
        status: 'pending'
      }
    });
    const job = await prisma.oCRJob.create({ data: { imageId: image.id, status: 'queued' } });
    ocrQueue.enqueue(image.id);
    const presented = await presentImage(image);
    images.push({
      ...presented,
      job
    });
  }
  res.status(201).json({ images });
});

router.get('/:id', requireAuth, async (req, res) => {
  const paramsSchema = z.object({ id: z.coerce.number() });
  const { id } = paramsSchema.parse(req.params);
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  const presented = await presentImage(image);
  res.json({ image: presented });
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional()
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const paramsSchema = z.object({ id: z.coerce.number() });
  const { id } = paramsSchema.parse(req.params);
  const data = updateSchema.parse(req.body);
  try {
    const image = await prisma.image.update({
      where: { id },
      data
    });
    const presented = await presentImage(image);
    res.json({ image: presented });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Image not found' });
    }
    throw error;
  }
});

router.post('/:id/checkout', requireAuth, requireAdmin, async (req, res) => {
  const paramsSchema = z.object({ id: z.coerce.number() });
  const { id } = paramsSchema.parse(req.params);
  const payload = updateSchema.required({ title: true, author: true }).parse(req.body);
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  if (image.status === 'checked_out') {
    return res.status(400).json({ error: 'Image already checked out' });
  }
  const book = await prisma.book.upsert({
    where: { title_author: { title: payload.title, author: payload.author } },
    update: {
      title: payload.title,
      author: payload.author
    },
    create: {
      title: payload.title,
      author: payload.author
    }
  });
  const checkout = await prisma.checkout.create({
    data: {
      imageId: image.id,
      bookId: book.id,
      adminId: req.currentUser!.id
    }
  });
  await prisma.image.update({
    where: { id: image.id },
    data: {
      status: 'checked_out',
      title: payload.title,
      author: payload.author
    }
  });
  res.status(201).json({ checkout, book });
});

export default router;
