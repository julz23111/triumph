import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { env } from '../env.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface SavedFile {
  storagePath: string;
  thumbPath?: string;
}

export interface StorageService {
  saveFile(file: Express.Multer.File): Promise<SavedFile>;
  getPublicUrl(key: string): Promise<string>;
  getFileBuffer(key: string): Promise<Buffer>;
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

class LocalStorageService implements StorageService {
  async ensureDir(subdir: string) {
    await fs.mkdir(path.join(UPLOADS_DIR, subdir), { recursive: true });
  }

  async saveFile(file: Express.Multer.File): Promise<SavedFile> {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname) || '.jpg';
    const baseName = `${id}${ext}`;
    const originalsDir = 'originals';
    const thumbsDir = 'thumbs';
    await this.ensureDir(originalsDir);
    await this.ensureDir(thumbsDir);

    const originalPath = path.join(UPLOADS_DIR, originalsDir, baseName);
    await fs.writeFile(originalPath, file.buffer);

    const thumbPath = path.join(UPLOADS_DIR, thumbsDir, baseName);
    await sharp(file.buffer).rotate().resize(512, 512, { fit: 'inside' }).toFile(thumbPath);

    return {
      storagePath: path.relative(process.cwd(), originalPath),
      thumbPath: path.relative(process.cwd(), thumbPath)
    };
  }

  async getPublicUrl(key: string): Promise<string> {
    return `/${key.replace(/\\/g, '/')}`;
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const filePath = path.resolve(process.cwd(), key);
    return fs.readFile(filePath);
  }
}

class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.S3_BUCKET) {
      throw new Error('S3_BUCKET is required when using s3 storage');
    }
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION || 'auto',
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY
          }
        : undefined
    });
  }

  async saveFile(file: Express.Multer.File): Promise<SavedFile> {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname) || '.jpg';
    const key = `originals/${id}${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    const thumbBuffer = await sharp(file.buffer).rotate().resize(512, 512, { fit: 'inside' }).toBuffer();
    const thumbKey = `thumbs/${id}${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: file.mimetype
      })
    );

    return {
      storagePath: key,
      thumbPath: thumbKey
    };
  }

  async getPublicUrl(key: string): Promise<string> {
    if (env.S3_PUBLIC_URL) {
      const base = env.S3_PUBLIC_URL.endsWith('/') ? env.S3_PUBLIC_URL : `${env.S3_PUBLIC_URL}/`;
      return new URL(key, base).toString();
    }
    if (env.S3_ENDPOINT?.startsWith('http')) {
      const base = env.S3_ENDPOINT.endsWith('/') ? env.S3_ENDPOINT : `${env.S3_ENDPOINT}/`;
      return new URL(`${this.bucket}/${key}`, base).toString();
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, { expiresIn: 60 });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${key}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

let storageService: StorageService;

export function getStorageService(): StorageService {
  if (!storageService) {
    storageService = env.STORAGE_DRIVER === 's3' ? new S3StorageService() : new LocalStorageService();
  }
  return storageService;
}
