/*
 * Optional Cloudflare Pages Functions entry point.
 *
 * Cloudflare invokes the exported onRequest handler. Inside, you can use the
 * @neondatabase/serverless client (HTTP fetch) to talk to Postgres without a
 * persistent TCP connection. This stub simply demonstrates how to create the
 * client and hand the request over to the Express app when running in a
 * worker-friendly runtime such as Miniflare.
 */

import type { Env } from '@cloudflare/workers-types';
import { Pool } from '@neondatabase/serverless';
import { createApp } from '../../dist/app.js';

let cachedPool: Pool | undefined;

function getPool(databaseUrl: string) {
  if (!cachedPool) {
    cachedPool = new Pool({ connectionString: databaseUrl });
  }
  return cachedPool;
}

export const onRequest: ExportedHandler<Env>['fetch'] = async (request, env, ctx) => {
  const databaseUrl = env.DATABASE_URL as string;
  if (!databaseUrl) {
    return new Response('DATABASE_URL is not configured', { status: 500 });
  }

  // Attach the Neon pool to the global scope so that Prisma can use it via
  // the Data Proxy or a custom adapter.
  getPool(databaseUrl);

  const { default: serverlessExpress } = await import('@vendia/serverless-express');
  const app = createApp();
  const handler = serverlessExpress({ app });
  const response = await handler(request, ctx, env);
  return response as Response;
};
