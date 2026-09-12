CREATE TABLE "game_challenge_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"creation_key" uuid,
	"title" text NOT NULL,
	"game_id" text NOT NULL,
	"game_version" text NOT NULL,
	"content_mode" text NOT NULL,
	"content_locale" text NOT NULL,
	"content_json" jsonb NOT NULL,
	"seed" bigint NOT NULL,
	"difficulty" text NOT NULL,
	"modality_json" jsonb NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"target" integer NOT NULL,
	"teacher_participation_enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_challenge_definitions_school_id_id_unique" UNIQUE("school_id","id"),
	CONSTRAINT "game_challenge_definitions_creator_creation_key_unique" UNIQUE("school_id","created_by_user_id","creation_key"),
	CONSTRAINT "game_challenge_definitions_dates_check" CHECK ("game_challenge_definitions"."starts_at" < "game_challenge_definitions"."expires_at"),
	CONSTRAINT "game_challenge_definitions_seed_check" CHECK ("game_challenge_definitions"."seed" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "game_challenge_definitions_target_check" CHECK ("game_challenge_definitions"."target" BETWEEN 1 AND 1000000),
	CONSTRAINT "game_challenge_definitions_content_mode_check" CHECK ("game_challenge_definitions"."content_mode" IN ('vocabulary', 'sentence')),
	CONSTRAINT "game_challenge_definitions_content_locale_check" CHECK ("game_challenge_definitions"."content_locale" = 'th'),
	CONSTRAINT "game_challenge_definitions_difficulty_check" CHECK ("game_challenge_definitions"."difficulty" IN ('easy', 'medium', 'hard', 'extreme')),
	CONSTRAINT "game_challenge_definitions_content_json_check" CHECK (jsonb_typeof("game_challenge_definitions"."content_json") = 'object'),
	CONSTRAINT "game_challenge_definitions_modality_json_check" CHECK (jsonb_typeof("game_challenge_definitions"."modality_json") = 'object')
);
--> statement-breakpoint
CREATE TABLE "game_challenge_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_challenge_runs_owner_unique" UNIQUE("school_id","id","challenge_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "game_challenge_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"completion_id" uuid NOT NULL,
	"contributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_challenge_contributions_school_completion_unique" UNIQUE("school_id","completion_id"),
	CONSTRAINT "game_challenge_contributions_school_challenge_user_unique" UNIQUE("school_id","challenge_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "game_challenge_definitions" ADD CONSTRAINT "game_challenge_definitions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_definitions" ADD CONSTRAINT "game_challenge_definitions_class_id_classrooms_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_definitions" ADD CONSTRAINT "game_challenge_definitions_creator_fk" FOREIGN KEY ("school_id","created_by_user_id") REFERENCES "public"."users"("school_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_runs" ADD CONSTRAINT "game_challenge_runs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_runs" ADD CONSTRAINT "game_challenge_runs_challenge_fk" FOREIGN KEY ("school_id","challenge_id") REFERENCES "public"."game_challenge_definitions"("school_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_runs" ADD CONSTRAINT "game_challenge_runs_user_fk" FOREIGN KEY ("school_id","user_id") REFERENCES "public"."users"("school_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_contributions" ADD CONSTRAINT "game_challenge_contributions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_contributions" ADD CONSTRAINT "game_challenge_contributions_run_fk" FOREIGN KEY ("school_id","run_id","challenge_id","user_id") REFERENCES "public"."game_challenge_runs"("school_id","id","challenge_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_challenge_contributions" ADD CONSTRAINT "game_challenge_contributions_completion_fk" FOREIGN KEY ("school_id","user_id","completion_id") REFERENCES "public"."game_completions"("school_id","user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_challenge_definitions_school_class_window_idx" ON "game_challenge_definitions" USING btree ("school_id","class_id","starts_at","expires_at");--> statement-breakpoint
CREATE INDEX "game_challenge_runs_school_challenge_user_idx" ON "game_challenge_runs" USING btree ("school_id","challenge_id","user_id");--> statement-breakpoint
CREATE INDEX "game_challenge_runs_expiry_idx" ON "game_challenge_runs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "game_challenge_contributions_school_challenge_idx" ON "game_challenge_contributions" USING btree ("school_id","challenge_id","contributed_at");
