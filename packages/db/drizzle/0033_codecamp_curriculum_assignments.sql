CREATE TABLE "codecamp_curriculum_assignments" (
	"user_id" text PRIMARY KEY NOT NULL,
	"curriculum_version" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "codecamp_curriculum_assignments" ADD CONSTRAINT "codecamp_curriculum_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
