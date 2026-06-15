-- Drop pre-unified-auth tables (replaced by Drizzle-based auth in @reading-advantage/auth)
DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "verification_tokens" CASCADE;
--> statement-breakpoint

-- Add SYSTEM role for cross-tenant admin operations
ALTER TYPE "role" ADD VALUE 'SYSTEM';
--> statement-breakpoint

-- ─── users table: migrate from JWT-era schema to unified auth schema ───

ALTER TABLE "users" ADD COLUMN "username" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_username" text;
--> statement-breakpoint

-- Email is optional in unified auth (username is the primary identifier)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint

-- Add uniqueness constraints for username-based auth
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_display_username_unique" UNIQUE ("display_username");
--> statement-breakpoint

-- Remove JWT-era columns no longer used
ALTER TABLE "users" DROP COLUMN "password";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "firebase_uid";
--> statement-breakpoint

-- ─── accounts table: replace OAuth/JWT columns with provider-based auth ───

ALTER TABLE "accounts" DROP COLUMN "type";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "provider";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "provider_account_id";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "expires_at";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "token_type";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "scope";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "id_token";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "session_state";
--> statement-breakpoint

ALTER TABLE "accounts" ADD COLUMN "provider_id" text NOT NULL DEFAULT 'credential';
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "password" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "access_token_expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "refresh_token_expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_provider_unique" UNIQUE ("user_id", "provider_id");
--> statement-breakpoint

-- ─── sessions table: replace JWT session_token with unified token ───

ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_session_token_unique";
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "session_token";
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "expires";
--> statement-breakpoint

ALTER TABLE "sessions" ADD COLUMN "token" text NOT NULL DEFAULT gen_random_uuid()::text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp NOT NULL DEFAULT now() + interval '7 days';
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ip_address" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;
--> statement-breakpoint

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_token_unique" UNIQUE ("token");
--> statement-breakpoint
