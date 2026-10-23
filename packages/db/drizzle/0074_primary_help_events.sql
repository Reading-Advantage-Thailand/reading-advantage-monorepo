CREATE TABLE "primary_help_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"event" text NOT NULL,
	"video_id" text,
	"route_pattern" text NOT NULL,
	"source" text,
	"matched" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "primary_help_events" ADD CONSTRAINT "primary_help_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "primary_help_events_created_idx" ON "primary_help_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "primary_help_events_school_created_idx" ON "primary_help_events" USING btree ("school_id","created_at");