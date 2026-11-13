CREATE TABLE "accounting_year_file_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intake_document_id" uuid NOT NULL,
	"form_type" text NOT NULL,
	"filing_kind" text NOT NULL,
	"period_kind" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"tax_year" integer NOT NULL,
	"facts" jsonb NOT NULL,
	CONSTRAINT "accounting_year_file_facts_form_type_check" CHECK ("accounting_year_file_facts"."form_type" IN ('wht-filing-pnd1', 'wht-filing-pnd1a', 'wht-filing-pnd3', 'wht-filing-pnd53', 'corporate-tax-pnd50', 'year-end-financial-statement', 'general-ledger', 'dbd-filing-sbor3')),
	CONSTRAINT "accounting_year_file_facts_filing_kind_check" CHECK ("accounting_year_file_facts"."filing_kind" IN ('form', 'attachment', 'receipt', 'statement')),
	CONSTRAINT "accounting_year_file_facts_period_kind_check" CHECK ("accounting_year_file_facts"."period_kind" IN ('month', 'year'))
);
--> statement-breakpoint
ALTER TABLE "accounting_intake_documents" DROP CONSTRAINT "accounting_intake_documents_document_type_check";--> statement-breakpoint
ALTER TABLE "accounting_intake_documents" DROP CONSTRAINT "accounting_intake_documents_history_source_check";--> statement-breakpoint
ALTER TABLE "accounting_intake_documents" ADD COLUMN "duplicate_of_intake_document_id" uuid;--> statement-breakpoint
ALTER TABLE "accounting_year_file_facts" ADD CONSTRAINT "accounting_year_file_facts_intake_document_id_accounting_intake_documents_id_fk" FOREIGN KEY ("intake_document_id") REFERENCES "public"."accounting_intake_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_year_file_facts_intake_document_idx" ON "accounting_year_file_facts" USING btree ("intake_document_id");--> statement-breakpoint
ALTER TABLE "accounting_intake_documents" ADD CONSTRAINT "accounting_intake_documents_document_type_check" CHECK ("accounting_intake_documents"."document_type" IN ('receipt', 'tax-invoice', 'bank-statement', 'payroll-sheet', 'withholding-certificate', 'payment-voucher-sheet', 'cloud-invoice', 'openai-invoice', 'wht-filing-pnd1', 'wht-filing-pnd1a', 'wht-filing-pnd3', 'wht-filing-pnd53', 'corporate-tax-pnd50', 'year-end-financial-statement', 'general-ledger', 'dbd-filing-sbor3'));--> statement-breakpoint
ALTER TABLE "accounting_intake_documents" ADD CONSTRAINT "accounting_intake_documents_history_source_check" CHECK (("accounting_intake_documents"."is_history" = false AND "accounting_intake_documents"."history_source" IS NULL) OR ("accounting_intake_documents"."is_history" = true AND "accounting_intake_documents"."history_source" IN ('drive-folder', 'drive-modified-date', 'document')));