CREATE TABLE "primary_avatar_profile" (
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"class_preset" text NOT NULL,
	"tints" jsonb NOT NULL,
	"catalog_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_avatar_profile_school_id_user_id_pk" PRIMARY KEY("school_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "primary_avatar_profile" ADD CONSTRAINT "primary_avatar_profile_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_avatar_profile" ADD CONSTRAINT "primary_avatar_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;