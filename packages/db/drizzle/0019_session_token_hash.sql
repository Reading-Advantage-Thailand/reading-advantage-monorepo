-- Add token_hash column to sessions for SHA-256-hashed session token storage
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "token_hash" TEXT;--> statement-breakpoint
UPDATE "sessions" SET "token_hash" = encode(digest("token", 'sha256'), 'hex');--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "token_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "token" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions"("token_hash");
