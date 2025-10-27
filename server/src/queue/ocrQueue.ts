import PQueue from 'p-queue';
import { prisma } from '../lib/prisma.js';
import { getStorageService } from '../services/storage.js';
import { runOcr } from '../services/ocr.js';

class OCRQueue {
  private queue = new PQueue({ concurrency: 1 });

  constructor() {
    this.queue.on('error', (error) => {
      console.error('OCR queue error', error);
    });
  }

  async start() {
    const queuedJobs = await prisma.oCRJob.findMany({
      where: { status: 'queued' },
      include: { image: true }
    });
    for (const job of queuedJobs) {
      this.enqueue(job.imageId);
    }
  }

  enqueue(imageId: number) {
    this.queue.add(async () => {
      const job = await prisma.oCRJob.findFirst({
        where: { imageId },
        orderBy: { createdAt: 'desc' }
      });
      if (!job) {
        return;
      }
      await prisma.oCRJob.update({ where: { id: job.id }, data: { status: 'working', error: null } });
      const image = await prisma.image.findUnique({ where: { id: imageId } });
      if (!image) {
        await prisma.oCRJob.update({ where: { id: job.id }, data: { status: 'error', error: 'Image not found' } });
        return;
      }
      try {
        const storage = getStorageService();
        const buffer = await storage.getFileBuffer(image.storagePath);
        const { text, title, author } = await runOcr(buffer);
        await prisma.$transaction([
          prisma.image.update({
            where: { id: imageId },
            data: {
              ocrText: text,
              title: title ?? image.title,
              author: author ?? image.author,
              status: 'ocr_done'
            }
          }),
          prisma.oCRJob.update({
            where: { id: job.id },
            data: { status: 'done', error: null }
          })
        ]);
      } catch (error) {
        console.error('OCR job failed', error);
        await prisma.oCRJob.update({
          where: { id: job.id },
          data: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    });
  }
}

export const ocrQueue = new OCRQueue();
