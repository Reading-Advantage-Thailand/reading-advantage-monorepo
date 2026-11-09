\set ON_ERROR_STOP on

-- Runtime probe: runs as the accounting_runtime role (least privilege) through
-- the Cloud SQL Auth Proxy. It proves the application query path works, that an
-- audit insert is allowed, that an audit UPDATE and DELETE are denied, and that
-- the runtime role cannot create tables. The inserted probe row is removed by
-- accounting-runtime-probe-cleanup.sql (run as the privileged migration role).

\if :{?probe_owner_id}
\else
  \echo 'probe_owner_id is required' >&2
  \quit 2
\endif

SELECT set_config('accounting.probe_owner_id', :'probe_owner_id', false);

DO $$
DECLARE
  v_submission_id uuid := gen_random_uuid();
  v_audit_id uuid;
  v_denied boolean;
  v_probe_owner_id uuid := current_setting('accounting.probe_owner_id')::uuid;
  v_intake_id uuid := gen_random_uuid();
  v_close_id uuid := gen_random_uuid();
  v_close_audit_id uuid;
  v_lease_id uuid := gen_random_uuid();
BEGIN
  -- Exercise the application insert, update, and select path.
  INSERT INTO accounting_submissions
    (id, kind, payee, category, amount_minor, currency, evidence_reference,
     scope_company_id, submitted_by_account_id, idempotency_key)
  VALUES
    (v_submission_id, 'expense', 'Runtime probe', 'probe', '1', 'THB',
     'private-evidence://runtime-probe/evidence', v_probe_owner_id,
     v_probe_owner_id, 'runtime-probe-' || v_probe_owner_id::text);
  UPDATE accounting_submissions
     SET status = 'approved'
   WHERE id = v_submission_id;
  PERFORM 1
    FROM accounting_submissions
   WHERE id = v_submission_id AND status = 'approved';

  -- Audit insert is allowed for the runtime role.
  INSERT INTO accounting_submission_audit_events
    (submission_id, action, actor_account_id, actor_role, reason)
  VALUES
    (v_submission_id, 'submit', v_probe_owner_id, 'STAFF', 'runtime-probe')
  RETURNING id INTO v_audit_id;

  -- UPDATE on the audit table MUST be denied (append-only enforcement).
  v_denied := false;
  BEGIN
    UPDATE accounting_submission_audit_events SET reason = 'x' WHERE id = v_audit_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to UPDATE accounting_submission_audit_events';
  END IF;

  -- DELETE on the audit table MUST be denied (append-only enforcement).
  v_denied := false;
  BEGIN
    DELETE FROM accounting_submission_audit_events WHERE id = v_audit_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to DELETE accounting_submission_audit_events';
  END IF;

  -- Intake document insert and update (pending to parsed).
  INSERT INTO accounting_intake_documents
    (id, drive_file_id, drive_folder_id, source_month, document_type, status,
     scope_company_id)
  VALUES
    (v_intake_id, 'runtime-probe', 'runtime-probe', '2026-11', 'receipt',
     'pending', v_probe_owner_id);
  UPDATE accounting_intake_documents
     SET status = 'parsed'
   WHERE id = v_intake_id;
  PERFORM 1
    FROM accounting_intake_documents
   WHERE id = v_intake_id AND status = 'parsed';

  -- Monthly close insert and update (open to signed).
  INSERT INTO accounting_monthly_closes
    (id, period_month, status, opened_by_account_id, scope_company_id)
  VALUES
    (v_close_id, '2026-11', 'open', v_probe_owner_id, v_probe_owner_id);
  UPDATE accounting_monthly_closes
     SET status = 'signed'
   WHERE id = v_close_id;
  PERFORM 1
    FROM accounting_monthly_closes
   WHERE id = v_close_id AND status = 'signed';

  -- Close audit insert is allowed for the runtime role.
  INSERT INTO accounting_monthly_close_audit_events
    (close_id, action, actor_account_id, actor_role, reason)
  VALUES
    (v_close_id, 'monthly-close-open', v_probe_owner_id, 'CEO', 'runtime-probe')
  RETURNING id INTO v_close_audit_id;

  -- UPDATE on the close audit table MUST be denied (append-only enforcement).
  v_denied := false;
  BEGIN
    UPDATE accounting_monthly_close_audit_events SET reason = 'x' WHERE id = v_close_audit_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to UPDATE accounting_monthly_close_audit_events';
  END IF;

  -- DELETE on the close audit table MUST be denied (append-only enforcement).
  v_denied := false;
  BEGIN
    DELETE FROM accounting_monthly_close_audit_events WHERE id = v_close_audit_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to DELETE accounting_monthly_close_audit_events';
  END IF;

  -- Intake lease insert and update (claim and renew).
  INSERT INTO accounting_intake_leases
    (id, queue_name, lease_token, worker_id, lease_expires_at, scope_company_id)
  VALUES
    (v_lease_id, 'runtime-probe', 'runtime-probe-token', 'runtime-probe',
     now() + interval '1 minute', v_probe_owner_id);
  UPDATE accounting_intake_leases
     SET worker_id = 'runtime-probe-renewed'
   WHERE id = v_lease_id;
  PERFORM 1
    FROM accounting_intake_leases
   WHERE id = v_lease_id AND worker_id = 'runtime-probe-renewed';

  -- Negative DDL probe: the runtime role MUST NOT create tables.
  v_denied := false;
  BEGIN
    CREATE TABLE accounting_runtime_probe_forbidden (id uuid PRIMARY KEY);
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to CREATE TABLE';
  END IF;

  RAISE NOTICE 'accounting runtime probe passed: intake and close writes allowed, audit insert allowed, audit and close audit UPDATE/DELETE denied, DDL denied';
END $$;
