CREATE TABLE "primary_legacy_id_map" (
	"table_name" text NOT NULL,
	"legacy_id" text NOT NULL,
	"new_id" uuid NOT NULL,
	CONSTRAINT "primary_legacy_id_map_table_name_legacy_id_pk" PRIMARY KEY("table_name","legacy_id")
);
--> statement-breakpoint
CREATE INDEX "primary_legacy_id_map_new_id_idx" ON "primary_legacy_id_map" USING btree ("table_name","new_id");