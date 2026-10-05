CREATE TABLE "primary_class_quest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"challenge_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"status_at" timestamp DEFAULT now() NOT NULL,
	"starts_at" timestamp NOT NULL,
	"battle_at" timestamp NOT NULL,
	"boss_target" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "primary_class_quest_heartbeat" (
	"school_id" uuid NOT NULL,
	"quest_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"run_id" uuid,
	"present" boolean DEFAULT true NOT NULL,
	"answered" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"hp" integer NOT NULL,
	"damage" integer DEFAULT 0 NOT NULL,
	"power_ups_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_class_quest_heartbeat_school_id_quest_id_user_id_pk" PRIMARY KEY("school_id","quest_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "primary_class_quest_power_up" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"quest_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"goal_key" text NOT NULL,
	"power_up" text NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "primary_class_quest_power_up_goal_unique" UNIQUE("school_id","quest_id","user_id","goal_key")
);
--> statement-breakpoint
ALTER TABLE "primary_class_quest" ADD CONSTRAINT "primary_class_quest_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest" ADD CONSTRAINT "primary_class_quest_class_id_classrooms_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest" ADD CONSTRAINT "primary_class_quest_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest" ADD CONSTRAINT "primary_class_quest_challenge_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."game_challenge_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest_heartbeat" ADD CONSTRAINT "primary_class_quest_heartbeat_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest_heartbeat" ADD CONSTRAINT "primary_class_quest_heartbeat_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest_heartbeat" ADD CONSTRAINT "primary_class_quest_heartbeat_quest_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."primary_class_quest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest_power_up" ADD CONSTRAINT "primary_class_quest_power_up_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest_power_up" ADD CONSTRAINT "primary_class_quest_power_up_quest_id_primary_class_quest_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."primary_class_quest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_class_quest_power_up" ADD CONSTRAINT "primary_class_quest_power_up_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "primary_class_quest_open_unique" ON "primary_class_quest" USING btree ("school_id","class_id") WHERE "primary_class_quest"."status" <> 'done';--> statement-breakpoint
CREATE INDEX "primary_class_quest_class_idx" ON "primary_class_quest" USING btree ("school_id","class_id","created_at");--> statement-breakpoint
CREATE INDEX "primary_class_quest_power_up_user_idx" ON "primary_class_quest_power_up" USING btree ("school_id","quest_id","user_id");