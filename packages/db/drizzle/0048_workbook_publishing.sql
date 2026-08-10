CREATE TABLE "workbook_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"status" text NOT NULL,
	"source_app" text NOT NULL,
	"source_id" text NOT NULL,
	"source_revision" text NOT NULL,
	"content_hash" text NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workbook_drafts_status_check" CHECK ("workbook_drafts"."status" in ('draft','in_review','published','superseded','revoked')),
	CONSTRAINT "workbook_drafts_revision_check" CHECK ("workbook_drafts"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "workbook_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"published_by" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_by_edition_id" uuid,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "workbook_editions_draft_version_unique" UNIQUE("draft_id","version"),
	CONSTRAINT "workbook_editions_idempotency_unique" UNIQUE("tenant_id","idempotency_key"),
	CONSTRAINT "workbook_editions_version_check" CHECK ("workbook_editions"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "workbook_publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"draft_id" uuid NOT NULL,
	"edition_id" uuid,
	"event_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"detail_json" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workbook_publication_events_type_check" CHECK ("workbook_publication_events"."event_type" in ('draft_created','submitted_for_review','returned_to_draft','published','superseded','revoked'))
);
--> statement-breakpoint
ALTER TABLE "workbook_editions" ADD CONSTRAINT "workbook_editions_draft_id_workbook_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."workbook_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workbook_drafts_tenant_idx" ON "workbook_drafts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workbook_drafts_source_idx" ON "workbook_drafts" USING btree ("source_app","source_id");--> statement-breakpoint
CREATE INDEX "workbook_editions_tenant_idx" ON "workbook_editions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workbook_publication_events_tenant_idx" ON "workbook_publication_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workbook_publication_events_draft_idx" ON "workbook_publication_events" USING btree ("draft_id");