ALTER TABLE "campaigns" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "past_topics" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "video_assets" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "video_assets" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "video_assets" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "video_projects" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "video_projects" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "video_projects" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_script_array_check" CHECK (jsonb_typeof("script") = 'array');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.marketing_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "video_projects_updated_at"
BEFORE UPDATE ON "video_projects"
FOR EACH ROW
EXECUTE FUNCTION public.marketing_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "video_assets_updated_at"
BEFORE UPDATE ON "video_assets"
FOR EACH ROW
EXECUTE FUNCTION public.marketing_touch_updated_at();
