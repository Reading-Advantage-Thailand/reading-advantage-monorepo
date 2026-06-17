-- =====================================================================
-- Migration 0021: Marketing Tables (drizzle045_major_migration)
-- Creates campaign management, video project tracking, and settings
-- tables for the marketing/video pipeline.
--
-- See: packages/db/src/schema/marketing.ts
-- =====================================================================

-- Enums
CREATE TYPE "campaign_type" AS ENUM ('video', 'infocard');
--> statement-breakpoint
CREATE TYPE "campaign_status" AS ENUM ('draft', 'in-progress', 'complete', 'archived');
--> statement-breakpoint
CREATE TYPE "app" AS ENUM ('reading-advantage', 'primary-advantage', 'storytime', 'math-advantage', 'science-advantage', 'stem-advantage', 'zhongwen-advantage', 'tutor-advantage');
--> statement-breakpoint
CREATE TYPE "asset_type" AS ENUM ('image', 'voiceover', 'clip');
--> statement-breakpoint
CREATE TYPE "asset_status" AS ENUM ('pending', 'generated', 'approved', 'rejected');
--> statement-breakpoint
CREATE TYPE "video_project_status" AS ENUM ('draft', 'in-progress', 'complete');
--> statement-breakpoint

-- Campaigns table
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "campaign_type" NOT NULL,
  "app" "app" NOT NULL,
  "name" text NOT NULL,
  "status" "campaign_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Video projects table
CREATE TABLE IF NOT EXISTS "video_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "topic" text NOT NULL,
  "script" jsonb,
  "status" "video_project_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Video assets table
CREATE TABLE IF NOT EXISTS "video_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "scene_index" text NOT NULL,
  "type" "asset_type" NOT NULL,
  "url" text,
  "prompt" text,
  "status" "asset_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Past topics table
CREATE TABLE IF NOT EXISTS "past_topics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app" "app" NOT NULL,
  "topic" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Settings table
CREATE TABLE IF NOT EXISTS "settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL
);
--> statement-breakpoint

-- Foreign keys
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "video_projects"("id") ON DELETE cascade;
--> statement-breakpoint

-- Indexes
CREATE INDEX IF NOT EXISTS "campaigns_app_idx" ON "campaigns" ("app");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_projects_campaign_idx" ON "video_projects" ("campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_assets_project_idx" ON "video_assets" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "past_topics_app_idx" ON "past_topics" ("app");
