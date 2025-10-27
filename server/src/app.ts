import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import morgan from 'morgan';
import { env, isProduction } from './env.js';
import authRoutes from './routes/auth.js';
import batchesRoutes from './routes/batches.js';
import imagesRoutes from './routes/images.js';
import exportRoutes from './routes/exports.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!isProduction) {
    app.use(morgan('dev'));
  }
  app.use(
    cookieSession({
      name: 'library_session',
      secret: env.SESSION_SECRET,
      sameSite: 'lax',
      httpOnly: true,
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
  );
  app.use('/uploads', express.static('uploads'));
  app.use(attachUser);

  app.use('/auth', authRoutes);
  app.use('/batches', batchesRoutes);
  app.use('/images', imagesRoutes);
  app.use('/exports', exportRoutes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
