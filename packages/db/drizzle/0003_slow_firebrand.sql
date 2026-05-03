-- Drop pre-unified-auth tables (replaced by Drizzle-based auth in @reading-advantage/auth)
DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
DROP TABLE IF EXISTS "verification_tokens" CASCADE;

-- Add SYSTEM role for cross-tenant admin operations
ALTER TYPE "role" ADD VALUE 'SYSTEM';

-- ─── users table: migrate from JWT-era schema to unified auth schema ───

ALTER TABLE "users" ADD COLUMN "username" text;
ALTER TABLE "users" ADD COLUMN "display_username" text;

-- Email is optional in unified auth (username is the primary identifier)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Add uniqueness constraints for username-based auth
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");
ALTER TABLE "users" ADD CONSTRAINT "users_display_username_unique" UNIQUE ("display_username");

-- Remove JWT-era columns no longer used
ALTER TABLE "users" DROP COLUMN "password";
ALTER TABLE "users" DROP COLUMN "email_verified";
ALTER TABLE "users" DROP COLUMN "firebase_uid";

-- ─── accounts table: replace OAuth/JWT columns with provider-based auth ───

ALTER TABLE "accounts" DROP COLUMN "type";
ALTER TABLE "accounts" DROP COLUMN "provider";
ALTER TABLE "accounts" DROP COLUMN "provider_account_id";
ALTER TABLE "accounts" DROP COLUMN "expires_at";
ALTER TABLE "accounts" DROP COLUMN "token_type";
ALTER TABLE "accounts" DROP COLUMN "scope";
ALTER TABLE "accounts" DROP COLUMN "id_token";
ALTER TABLE "accounts" DROP COLUMN "session_state";

ALTER TABLE "accounts" ADD COLUMN "provider_id" text NOT NULL DEFAULT 'credential';
ALTER TABLE "accounts" ADD COLUMN "password" text;
ALTER TABLE "accounts" ADD COLUMN "access_token_expires_at" timestamp;
ALTER TABLE "accounts" ADD COLUMN "refresh_token_expires_at" timestamp;
ALTER TABLE "accounts" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "accounts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_provider_unique" UNIQUE ("user_id", "provider_id");

-- ─── sessions table: replace JWT session_token with unified token ───

ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_session_token_unique";
ALTER TABLE "sessions" DROP COLUMN "session_token";
ALTER TABLE "sessions" DROP COLUMN "expires";

ALTER TABLE "sessions" ADD COLUMN "token" text NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp NOT NULL DEFAULT now() + interval '7 days';
ALTER TABLE "sessions" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "sessions" ADD COLUMN "ip_address" text;
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_token_unique" UNIQUE ("token");
