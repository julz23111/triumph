import type { Image } from '@prisma/client';
import { getStorageService } from '../services/storage.js';

export interface PresentedImage {
  id: number;
  batchId: number;
  storagePath: string;
  publicUrl: string;
  thumbUrl?: string;
  ocrText?: string | null;
  title?: string | null;
  author?: string | null;
  status: 'pending' | 'ocr_done' | 'checked_out';
  createdAt: Date;
}

export async function presentImage(image: Image): Promise<PresentedImage> {
  const storage = getStorageService();
  const publicUrl = await storage.getPublicUrl(image.storagePath);
  const thumbUrl = image.thumbPath ? await storage.getPublicUrl(image.thumbPath) : undefined;
  return {
    id: image.id,
    batchId: image.batchId,
    storagePath: image.storagePath,
    publicUrl,
    thumbUrl,
    ocrText: image.ocrText,
    title: image.title,
    author: image.author,
    status: image.status as 'pending' | 'ocr_done' | 'checked_out',
    createdAt: image.createdAt
  };
}
