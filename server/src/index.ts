import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './env.js';
import { ocrQueue } from './queue/ocrQueue.js';
import { prisma } from './lib/prisma.js';

async function bootstrap() {
  await ocrQueue.start();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
    console.log('Step 1 done');
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
