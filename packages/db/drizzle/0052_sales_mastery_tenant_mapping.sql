CREATE TABLE "sales_mastery_tenant_mappings" (
	"application_key" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"organization_key" text NOT NULL,
	"mastery_tenant_key" uuid NOT NULL,
	"source_tenant_key" text NOT NULL,
	"provisioned_by" text NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_mastery_tenant_mappings_application_organization_unique" UNIQUE("application_key","organization_id"),
	CONSTRAINT "sales_mastery_tenant_mappings_mastery_tenant_unique" UNIQUE("mastery_tenant_key"),
	CONSTRAINT "sales_mastery_tenant_mappings_source_tenant_unique" UNIQUE("source_tenant_key"),
	CONSTRAINT "sales_mastery_tenant_mappings_application_key_check" CHECK ("application_key" = 'sales'),
	CONSTRAINT "sales_mastery_tenant_mappings_source_tenant_key_check" CHECK ("source_tenant_key" = 'sales:' || "organization_id"::text),
	CONSTRAINT "sales_mastery_tenant_mappings_namespace_check" CHECK ("mastery_tenant_key" <> 'c0deca00-0000-4000-8000-000000000001'::uuid),
	CONSTRAINT "sales_mastery_tenant_mappings_nonblank_check" CHECK ("organization_key" ~ '[^[:space:]]' AND "provisioned_by" ~ '[^[:space:]]' AND "request_id" ~ '[^[:space:]]')
);
--> statement-breakpoint
ALTER TABLE "sales_mastery_tenant_mappings" ADD CONSTRAINT "sales_mastery_tenant_mappings_mastery_tenant_fk" FOREIGN KEY ("mastery_tenant_key") REFERENCES "schools"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX "sales_mastery_tenant_mappings_organization_idx" ON "sales_mastery_tenant_mappings" USING btree ("organization_id","organization_key");
--> statement-breakpoint
CREATE TABLE "sales_mastery_projection_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_key" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"organization_key" text NOT NULL,
	"mastery_tenant_key" uuid NOT NULL,
	"source_tenant_key" text NOT NULL,
	"learner_principal_id" text NOT NULL,
	"source_application" text NOT NULL,
	"source_attempt_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"graph_release" text NOT NULL,
	"bindings_digest" text NOT NULL,
	"rubric_version" text NOT NULL,
	"request_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"payload_digest" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_mastery_projection_outbox_tenant_idempotency_unique" UNIQUE("mastery_tenant_key","idempotency_key"),
	CONSTRAINT "sales_mastery_projection_outbox_tenant_attempt_unique" UNIQUE("mastery_tenant_key","source_attempt_id"),
	CONSTRAINT "sales_mastery_projection_outbox_application_key_check" CHECK ("application_key" = 'sales'),
	CONSTRAINT "sales_mastery_projection_outbox_source_application_check" CHECK ("source_application" = 'sales-advantage'),
	CONSTRAINT "sales_mastery_projection_outbox_source_tenant_key_check" CHECK ("source_tenant_key" = 'sales:' || "organization_id"::text),
	CONSTRAINT "sales_mastery_projection_outbox_graph_release_check" CHECK ("graph_release" = 'knowledge-space-sales-mastery-v1.0.0'),
	CONSTRAINT "sales_mastery_projection_outbox_bindings_digest_check" CHECK ("bindings_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sales_mastery_projection_outbox_payload_digest_check" CHECK ("payload_digest" ~ '^sha256:[0-9a-f]{64}$'),
	CONSTRAINT "sales_mastery_projection_outbox_nonblank_check" CHECK ("organization_key" ~ '[^[:space:]]' AND "source_tenant_key" ~ '[^[:space:]]' AND "learner_principal_id" ~ '[^[:space:]]' AND "source_attempt_id" ~ '[^[:space:]]' AND "idempotency_key" ~ '[^[:space:]]' AND "rubric_version" ~ '[^[:space:]]' AND "request_id" ~ '[^[:space:]]' AND "correlation_id" ~ '[^[:space:]]')
);
--> statement-breakpoint
ALTER TABLE "sales_mastery_projection_outbox" ADD CONSTRAINT "sales_mastery_projection_outbox_mastery_tenant_fk" FOREIGN KEY ("mastery_tenant_key") REFERENCES "schools"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "sales_mastery_projection_outbox" ADD CONSTRAINT "sales_mastery_projection_outbox_mapping_fk" FOREIGN KEY ("application_key","organization_id") REFERENCES "sales_mastery_tenant_mappings"("application_key","organization_id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX "sales_mastery_projection_outbox_organization_idx" ON "sales_mastery_projection_outbox" USING btree ("organization_id","learner_principal_id","created_at");
--> statement-breakpoint
CREATE TABLE "sales_mastery_projection_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outbox_id" uuid NOT NULL,
	"mastery_tenant_key" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"learner_principal_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"commit_id" text NOT NULL,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_mastery_projection_receipts_outbox_unique" UNIQUE("outbox_id"),
	CONSTRAINT "sales_mastery_projection_receipts_tenant_idempotency_unique" UNIQUE("mastery_tenant_key","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "sales_mastery_projection_receipts" ADD CONSTRAINT "sales_mastery_projection_receipts_outbox_fk" FOREIGN KEY ("outbox_id") REFERENCES "sales_mastery_projection_outbox"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "sales_mastery_projection_receipts" ADD CONSTRAINT "sales_mastery_projection_receipts_mastery_tenant_fk" FOREIGN KEY ("mastery_tenant_key") REFERENCES "schools"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX "sales_mastery_projection_receipts_organization_idx" ON "sales_mastery_projection_receipts" USING btree ("organization_id","learner_principal_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.sales_mastery_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Sales Mastery projection records are append-only';
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.sales_mastery_reject_mutation() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER sales_mastery_tenant_mappings_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.sales_mastery_tenant_mappings
FOR EACH STATEMENT EXECUTE FUNCTION public.sales_mastery_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER sales_mastery_projection_outbox_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.sales_mastery_projection_outbox
FOR EACH STATEMENT EXECUTE FUNCTION public.sales_mastery_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER sales_mastery_projection_receipts_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.sales_mastery_projection_receipts
FOR EACH STATEMENT EXECUTE FUNCTION public.sales_mastery_reject_mutation();
