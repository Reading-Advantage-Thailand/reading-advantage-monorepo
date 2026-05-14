-- Manual migration: Add phase column to codecamp_modules
-- Created for codecamp-advantage curriculum track (Phase 1)

ALTER TABLE "codecamp_modules" ADD COLUMN "phase" text DEFAULT 'A' NOT NULL;
