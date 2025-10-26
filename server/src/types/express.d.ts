import { User } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    currentUser?: User;
    session?: {
      userId?: number;
      isAdmin?: boolean;
      [key: string]: unknown;
    } | null;
  }
}
