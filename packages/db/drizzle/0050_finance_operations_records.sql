CREATE TABLE IF NOT EXISTS public.finance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  school_id text,
  record_id text NOT NULL,
  amount_minor text NOT NULL,
  currency text NOT NULL,
  source_system text NOT NULL,
  source_version text NOT NULL,
  source_record_id text NOT NULL,
  import_batch_id text NOT NULL,
  payload_digest text NOT NULL,
  evidence_reference text NOT NULL,
  supersedes_record_id text,
  correction_reason text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_records_company_id_check CHECK (company_id ~ '[^[:space:]]'),
  CONSTRAINT finance_records_record_id_check CHECK (record_id ~ '[^[:space:]]'),
  CONSTRAINT finance_records_school_id_check CHECK (school_id IS NULL OR school_id ~ '[^[:space:]]'),
  CONSTRAINT finance_records_source_system_check CHECK (source_system ~ '[^[:space:]]'),
  CONSTRAINT finance_records_source_version_check CHECK (source_version ~ '[^[:space:]]'),
  CONSTRAINT finance_records_source_record_id_check CHECK (source_record_id ~ '[^[:space:]]'),
  CONSTRAINT finance_records_import_batch_id_check CHECK (import_batch_id ~ '[^[:space:]]'),
  CONSTRAINT finance_records_amount_minor_check CHECK (amount_minor ~ '^(0|[1-9][0-9]*|-[1-9][0-9]*)$'),
  CONSTRAINT finance_records_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT finance_records_payload_digest_check CHECK (payload_digest ~ '^[a-f0-9]{64}$'),
  CONSTRAINT finance_records_evidence_reference_check CHECK (
    evidence_reference ~ '^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[A-Za-z0-9._~-]+)+$'
    AND evidence_reference NOT LIKE '%/../%'
    AND evidence_reference NOT LIKE '%/./%'
    AND evidence_reference NOT LIKE '%/..'
    AND evidence_reference NOT LIKE '%/.'
  ),
  CONSTRAINT finance_records_correction_pair_check CHECK ((supersedes_record_id IS NULL) = (correction_reason IS NULL)),
  CONSTRAINT finance_records_correction_distinct_check CHECK (supersedes_record_id IS NULL OR supersedes_record_id <> record_id),
  CONSTRAINT finance_records_correction_reason_check CHECK (correction_reason IS NULL OR correction_reason ~ '[^[:space:]]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX finance_records_company_record_company_scope_unique
  ON finance_records (company_id, record_id)
  WHERE school_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX finance_records_company_record_school_scope_unique
  ON finance_records (company_id, school_id, record_id)
  WHERE school_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX finance_records_company_source_company_scope_unique
  ON finance_records (company_id, source_system, source_version, source_record_id)
  WHERE school_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX finance_records_company_source_school_scope_unique
  ON finance_records (company_id, school_id, source_system, source_version, source_record_id)
  WHERE school_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.finance_record_success_audit_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  company_id text NOT NULL,
  school_id text,
  actor_subject_id text NOT NULL,
  operation text NOT NULL,
  object_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  request_id text NOT NULL,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_record_success_audit_outbox_event_id_check CHECK (event_id ~ '[^[:space:]]'),
  CONSTRAINT finance_record_success_audit_outbox_company_id_check CHECK (company_id ~ '[^[:space:]]'),
  CONSTRAINT finance_record_success_audit_outbox_school_id_check CHECK (school_id IS NULL OR school_id ~ '[^[:space:]]'),
  CONSTRAINT finance_record_success_audit_outbox_actor_subject_id_check CHECK (actor_subject_id ~ '[^[:space:]]'),
  CONSTRAINT finance_record_success_audit_outbox_operation_check CHECK (operation IN ('financial-record:import', 'financial-record:append-correction')),
  CONSTRAINT finance_record_success_audit_outbox_object_id_check CHECK (object_id ~ '[^[:space:]]'),
  CONSTRAINT finance_record_success_audit_outbox_request_id_check CHECK (request_id ~ '[^[:space:]]'),
  CONSTRAINT finance_record_success_audit_outbox_correlation_id_check CHECK (correlation_id ~ '[^[:space:]]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX finance_record_success_audit_outbox_event_unique
  ON public.finance_record_success_audit_outbox (event_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.finance_records_validate_supersession()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.supersedes_record_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.finance_records AS superseded
     WHERE superseded.company_id = NEW.company_id
       AND superseded.school_id IS NOT DISTINCT FROM NEW.school_id
       AND superseded.record_id = NEW.supersedes_record_id
     FOR KEY SHARE
  ) THEN
    RAISE EXCEPTION 'Finance correction references a missing or out-of-scope superseded record';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.finance_records_validate_supersession() FROM PUBLIC;
--> statement-breakpoint
DROP TRIGGER IF EXISTS finance_records_validate_supersession ON public.finance_records;
CREATE TRIGGER finance_records_validate_supersession
BEFORE INSERT ON public.finance_records
FOR EACH ROW
EXECUTE FUNCTION public.finance_records_validate_supersession();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.finance_records_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'finance_records is append-only';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.finance_records_reject_mutation() FROM PUBLIC;
--> statement-breakpoint
DROP TRIGGER IF EXISTS finance_records_append_only ON public.finance_records;
CREATE TRIGGER finance_records_append_only
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.finance_records
FOR EACH STATEMENT
EXECUTE FUNCTION public.finance_records_reject_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.finance_record_success_audit_outbox_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'finance_record_success_audit_outbox is append-only';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.finance_record_success_audit_outbox_reject_mutation() FROM PUBLIC;
--> statement-breakpoint
DROP TRIGGER IF EXISTS finance_record_success_audit_outbox_append_only
  ON public.finance_record_success_audit_outbox;
CREATE TRIGGER finance_record_success_audit_outbox_append_only
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.finance_record_success_audit_outbox
FOR EACH STATEMENT
EXECUTE FUNCTION public.finance_record_success_audit_outbox_reject_mutation();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.finance_records FROM app_user';
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.finance_record_success_audit_outbox FROM app_user';
  END IF;
END
$$;
