# Library Vision

A full-stack remake of the Library Vision app using Node.js, Express, PostgreSQL, and a Vite + React frontend. Admins can upload batches of book spine photos, trigger OCR (Tesseract.js by default with optional OpenAI Vision fallback), and run a streamlined single-photo checkout workflow.

## Monorepo structure

```
.
├── server   # Express API, Prisma models, OCR queue
└── web      # Vite + React mobile-first dashboard
```

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

## Environment configuration

Copy `.env.example` to `.env` and populate the values you need:

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — random string (16+ chars) for cookie sessions.
- `OCR_PROVIDER` — `tesseract` (default) or `openai`.
- `OPENAI_API_KEY` — only required if `OCR_PROVIDER=openai`.
- `STORAGE_DRIVER` — `local` (saves to `/uploads`) or `s3` (for R2/S3 compatible storage). When using `s3`, provide the `S3_*` variables.
- `PORT` / `CORS_ORIGIN` — Express port and web origin.
- `VITE_API_BASE_URL` — API base URL used by the web app. During local development keep it at `http://localhost:4000`.

> Never commit real secrets. `.env.example` is safe to share.

## Install dependencies

```bash
npm install
```

This installs dependencies for both workspaces (`server` and `web`).

## Database

Prisma migrations live under `server/prisma/migrations`.

- Apply migrations in production:

  ```bash
  npm run migrate
  ```

- During development you can use Prisma's migrate dev flow:

  ```bash
  npm run migrate --workspace server -- migrate:dev
  ```

- Seed an admin user (defaults to `admin@example.com` / `admin123`):

  ```bash
  npm run seed
  ```

Use `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars to change seed credentials.

## Development

Run the API and web app together:

```bash
npm run dev
```

- Express API: http://localhost:4000
- React front-end: http://localhost:5173

The server prints `Step 1 done` after the scaffold, migrations, basic auth, and baseline routes are in place.

## Production build

```bash
npm run build
```

This builds the Express project (`server/dist`) and the Vite front-end (`web/dist`). Deploy the front-end to Cloudflare Pages and host the Express API (or use Pages Functions + the included Neon-compatible client).

## Scripts

- `npm run migrate` – apply Prisma migrations.
- `npm run seed` – seed the database with an initial admin.
- `npm run dev` – run API + web concurrently.
- `npm run build` – build both workspaces.
- `npm run lint` – run TypeScript checks for server and web.

## API quick reference

| Method | Endpoint | Notes |
| ------ | -------- | ----- |
| POST | `/auth/login` | Email/password login (admin only uploads).
| POST | `/auth/logout` | Clear cookie session.
| GET | `/auth/me` | Current session.
| POST | `/batches` | Create a batch (admin).
| GET | `/batches` | List batches with image summaries.
| GET | `/batches/:id` | Batch detail with images.
| POST | `/images/upload?batchId=` | Upload book spine photos (multer, admin).
| GET | `/images/:id` | Fetch image + OCR data.
| PATCH | `/images/:id` | Update title/author.
| POST | `/images/:id/checkout` | Create/find book, mark image checked out.
| GET | `/exports/checkouts.csv` | Download checkout history.

## Storage

- Local dev stores originals + thumbnails under `/uploads`. Express statically serves `/uploads/*`.
- For S3/R2, set `STORAGE_DRIVER=s3` and provide bucket credentials plus an optional `S3_PUBLIC_URL` for generating public URLs.

## OCR queue

Uploads create OCR jobs stored in the database. A lightweight queue powered by `p-queue` grabs pending jobs, runs OCR via Tesseract.js (auto-rotate + resize) or OpenAI Vision, and updates image metadata/status.

## Deployment notes

- The API reads the OpenAI API key from `process.env.OPENAI_API_KEY`. Never log or hardcode it.
- Consider Neon serverless PostgreSQL when deploying to Cloudflare Pages Functions. The repo includes the `@neondatabase/serverless` client and an optional stub at `server/functions/api/index.ts` showing how to bridge Express inside a Pages Function.
- The web app is mobile-first, with sticky checkout actions for quick one-handed processing.

## License

MIT
