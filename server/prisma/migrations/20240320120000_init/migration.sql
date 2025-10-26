CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "is_admin" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "batches" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "images" (
  "id" SERIAL PRIMARY KEY,
  "batch_id" INTEGER NOT NULL REFERENCES "batches"("id") ON DELETE CASCADE,
  "storage_path" TEXT NOT NULL,
  "thumb_path" TEXT,
  "ocr_text" TEXT,
  "title" TEXT,
  "author" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','ocr_done','checked_out')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "books" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "books_title_author_key" ON "books"("title", "author");

CREATE TABLE IF NOT EXISTS "checkouts" (
  "id" SERIAL PRIMARY KEY,
  "image_id" INTEGER NOT NULL REFERENCES "images"("id") ON DELETE CASCADE,
  "book_id" INTEGER NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "admin_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "checked_out_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ocr_jobs" (
  "id" SERIAL PRIMARY KEY,
  "image_id" INTEGER NOT NULL REFERENCES "images"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'queued' CHECK ("status" IN ('queued','working','done','error')),
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'books_updated_at_trigger') THEN
    CREATE TRIGGER books_updated_at_trigger
    BEFORE UPDATE ON "books"
    FOR EACH ROW
    EXECUTE PROCEDURE update_books_updated_at();
  END IF;
END$$;
