CREATE TABLE "primary_avatar_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"dye" text,
	"source" text NOT NULL,
	"catalog_version" text NOT NULL,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_avatar_inventory_item_unique" UNIQUE("school_id","user_id","item_id","dye")
);
--> statement-breakpoint
CREATE TABLE "primary_avatar_loadout" (
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"slot" text NOT NULL,
	"inventory_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_avatar_loadout_school_id_user_id_slot_pk" PRIMARY KEY("school_id","user_id","slot")
);
--> statement-breakpoint
CREATE TABLE "primary_gp_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"source_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "primary_gp_ledger_user_source_unique" UNIQUE("school_id","user_id","source_key")
);
--> statement-breakpoint
ALTER TABLE "primary_avatar_inventory" ADD CONSTRAINT "primary_avatar_inventory_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_avatar_inventory" ADD CONSTRAINT "primary_avatar_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_avatar_loadout" ADD CONSTRAINT "primary_avatar_loadout_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_avatar_loadout" ADD CONSTRAINT "primary_avatar_loadout_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_avatar_loadout" ADD CONSTRAINT "primary_avatar_loadout_inventory_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."primary_avatar_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_gp_ledger" ADD CONSTRAINT "primary_gp_ledger_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_gp_ledger" ADD CONSTRAINT "primary_gp_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "primary_avatar_inventory_item_idx" ON "primary_avatar_inventory" USING btree ("item_id","acquired_at");--> statement-breakpoint
CREATE INDEX "primary_gp_ledger_user_idx" ON "primary_gp_ledger" USING btree ("school_id","user_id","created_at");