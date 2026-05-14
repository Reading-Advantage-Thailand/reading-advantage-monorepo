-- Add github_username to users table for GitHub integration
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_username" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_github_username_unique" ON "users" ("github_username");
