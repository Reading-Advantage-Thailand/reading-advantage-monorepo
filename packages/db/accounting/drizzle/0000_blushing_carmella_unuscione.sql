CREATE TABLE "accounting_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"payee" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount_minor" text NOT NULL,
	"currency" char(3) NOT NULL,
	"settled_thb_amount_minor" text,
	"evidence_reference" text NOT NULL,
	"scope_company_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by_account_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounting_submissions_kind_check" CHECK ("accounting_submissions"."kind" IN ('expense', 'bill')),
	CONSTRAINT "accounting_submissions_payee_check" CHECK (char_length("accounting_submissions"."payee") between 1 and 256 AND "accounting_submissions"."payee" ~ '[^[:space:]]'),
	CONSTRAINT "accounting_submissions_category_check" CHECK (char_length("accounting_submissions"."category") between 1 and 128 AND "accounting_submissions"."category" ~ '[^[:space:]]'),
	CONSTRAINT "accounting_submissions_description_check" CHECK ("accounting_submissions"."description" IS NULL OR (char_length("accounting_submissions"."description") between 1 and 1024 AND "accounting_submissions"."description" ~ '[^[:space:]]')),
	CONSTRAINT "accounting_submissions_amount_minor_check" CHECK ("accounting_submissions"."amount_minor" ~ '^[0-9]+$'),
	CONSTRAINT "accounting_submissions_currency_check" CHECK ("accounting_submissions"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "accounting_submissions_settled_thb_amount_minor_check" CHECK ("accounting_submissions"."settled_thb_amount_minor" IS NULL OR "accounting_submissions"."settled_thb_amount_minor" ~ '^[1-9][0-9]*$'),
	CONSTRAINT "accounting_submissions_settled_thb_currency_check" CHECK (("accounting_submissions"."currency" = 'THB' AND "accounting_submissions"."settled_thb_amount_minor" IS NULL) OR ("accounting_submissions"."currency" <> 'THB' AND "accounting_submissions"."settled_thb_amount_minor" IS NOT NULL)),
	CONSTRAINT "accounting_submissions_evidence_reference_check" CHECK ("accounting_submissions"."evidence_reference" ~ '^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[A-Za-z0-9._~-]+)+$' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/../%' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/./%' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/..' AND "accounting_submissions"."evidence_reference" NOT LIKE '%/.'),
	CONSTRAINT "accounting_submissions_status_check" CHECK ("accounting_submissions"."status" = 'pending')
);
--> statement-breakpoint
CREATE INDEX "accounting_submissions_scope_company_status_idx" ON "accounting_submissions" USING btree ("scope_company_id","status");--> statement-breakpoint
CREATE INDEX "accounting_submissions_submitted_by_idx" ON "accounting_submissions" USING btree ("submitted_by_account_id");