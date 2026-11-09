CREATE TABLE "accounting_intake_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drive_file_id" text NOT NULL,
	"drive_folder_id" text NOT NULL,
	"source_month" text NOT NULL,
	"document_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submission_id" uuid,
	"duplicate_of_submission_id" uuid,
	"evidence_reference" text,
	"extraction" text,
	"failure_reason" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"sighting_count" integer DEFAULT 1 NOT NULL,
	"evidence_byte_size" integer,
	"is_history" boolean DEFAULT false NOT NULL,
	"history_source" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scope_company_id" uuid NOT NULL,
	CONSTRAINT "accounting_intake_documents_document_type_check" CHECK ("accounting_intake_documents"."document_type" IN ('receipt', 'tax-invoice', 'bank-statement', 'payroll-sheet', 'withholding-certificate', 'payment-voucher-sheet', 'cloud-invoice', 'openai-invoice')),
	CONSTRAINT "accounting_intake_documents_status_check" CHECK ("accounting_intake_documents"."status" IN ('pending', 'parsed', 'failed', 'duplicate')),
	CONSTRAINT "accounting_intake_documents_extraction_check" CHECK ("accounting_intake_documents"."extraction" IS NULL OR "accounting_intake_documents"."extraction" IN ('human', 'local-text', 'model')),
	CONSTRAINT "accounting_intake_documents_source_month_check" CHECK ("accounting_intake_documents"."source_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "accounting_intake_documents_history_source_check" CHECK (("accounting_intake_documents"."is_history" = false AND "accounting_intake_documents"."history_source" IS NULL) OR ("accounting_intake_documents"."is_history" = true AND "accounting_intake_documents"."history_source" IN ('drive-folder', 'drive-modified-date'))),
	CONSTRAINT "accounting_intake_documents_evidence_byte_size_check" CHECK ("accounting_intake_documents"."evidence_byte_size" IS NULL OR "accounting_intake_documents"."evidence_byte_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "accounting_intake_leases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_name" text NOT NULL,
	"lease_token" text NOT NULL,
	"worker_id" text NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scope_company_id" uuid NOT NULL,
	CONSTRAINT "accounting_intake_leases_queue_name_check" CHECK (char_length("accounting_intake_leases"."queue_name") between 1 and 128 AND "accounting_intake_leases"."queue_name" ~ '[^[:space:]]'),
	CONSTRAINT "accounting_intake_leases_expiry_check" CHECK ("accounting_intake_leases"."lease_expires_at" > "accounting_intake_leases"."claimed_at")
);
--> statement-breakpoint
CREATE TABLE "accounting_monthly_close_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"close_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_account_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounting_monthly_close_audit_events_action_check" CHECK ("accounting_monthly_close_audit_events"."action" IN ('monthly-close-open', 'monthly-close-sign', 'monthly-close-lock'))
);
--> statement-breakpoint
CREATE TABLE "accounting_monthly_closes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_month" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"report_evidence_reference" text,
	"opened_by_account_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signed_by_account_id" uuid,
	"signed_by_role" text,
	"signed_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"scope_company_id" uuid NOT NULL,
	CONSTRAINT "accounting_monthly_closes_status_check" CHECK ("accounting_monthly_closes"."status" IN ('open', 'signed', 'locked')),
	CONSTRAINT "accounting_monthly_closes_period_month_check" CHECK ("accounting_monthly_closes"."period_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "accounting_monthly_closes_locked_at_check" CHECK ("accounting_monthly_closes"."status" <> 'locked' OR "accounting_monthly_closes"."locked_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX "accounting_intake_documents_scope_company_status_idx" ON "accounting_intake_documents" USING btree ("scope_company_id","status");--> statement-breakpoint
CREATE INDEX "accounting_intake_documents_evidence_byte_size_idx" ON "accounting_intake_documents" USING btree ("scope_company_id","evidence_byte_size");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_intake_documents_scope_company_file_idx" ON "accounting_intake_documents" USING btree ("scope_company_id","drive_file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_intake_leases_scope_company_queue_idx" ON "accounting_intake_leases" USING btree ("scope_company_id","queue_name");--> statement-breakpoint
CREATE INDEX "accounting_monthly_close_audit_events_close_created_idx" ON "accounting_monthly_close_audit_events" USING btree ("close_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_monthly_closes_scope_company_month_idx" ON "accounting_monthly_closes" USING btree ("scope_company_id","period_month");