CREATE TABLE "student_cosmetic_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"quest_id" text NOT NULL,
	"cosmetic_id" text NOT NULL,
	"source_completion_id" uuid NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_cosmetic_unlocks_school_user_quest_unique" UNIQUE("school_id","user_id","quest_id"),
	CONSTRAINT "student_cosmetic_unlocks_school_user_cosmetic_unique" UNIQUE("school_id","user_id","cosmetic_id")
);
--> statement-breakpoint
CREATE TABLE "student_rpg_profiles" (
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"equipped_emblem_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_rpg_profiles_school_id_user_id_pk" PRIMARY KEY("school_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "game_completions" ADD CONSTRAINT "game_completions_school_user_id_unique" UNIQUE("school_id","user_id","id");--> statement-breakpoint
ALTER TABLE "student_cosmetic_unlocks" ADD CONSTRAINT "student_cosmetic_unlocks_owner_fk" FOREIGN KEY ("school_id","user_id") REFERENCES "public"."users"("school_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_cosmetic_unlocks" ADD CONSTRAINT "student_cosmetic_unlocks_completion_fk" FOREIGN KEY ("school_id","user_id","source_completion_id") REFERENCES "public"."game_completions"("school_id","user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_rpg_profiles" ADD CONSTRAINT "student_rpg_profiles_owner_fk" FOREIGN KEY ("school_id","user_id") REFERENCES "public"."users"("school_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_rpg_profiles" ADD CONSTRAINT "student_rpg_profiles_equipped_unlock_fk" FOREIGN KEY ("school_id","user_id","equipped_emblem_id") REFERENCES "public"."student_cosmetic_unlocks"("school_id","user_id","cosmetic_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_cosmetic_unlocks_school_user_idx" ON "student_cosmetic_unlocks" USING btree ("school_id","user_id");
