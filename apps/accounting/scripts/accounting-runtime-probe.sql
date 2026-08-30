\set ON_ERROR_STOP on

-- Runtime probe: runs as the accounting_runtime role (least privilege) through
-- the Cloud SQL Auth Proxy. It proves the application query path works, that an
-- audit insert is allowed, that an audit UPDATE and DELETE are denied, and that
-- the runtime role cannot create tables. The inserted probe row is removed by
-- accounting-runtime-probe-cleanup.sql (run as the privileged migration role).

DO $$
DECLARE
  v_audit_id uuid;
  v_denied boolean;
BEGIN
  -- Application query against submissions (SELECT is allowed for the runtime role).
  PERFORM 1 FROM accounting_submissions LIMIT 1;

  -- Audit insert is allowed for the runtime role.
  INSERT INTO accounting_submission_audit_events
    (submission_id, action, actor_account_id, actor_role, reason)
  VALUES
    ('00000000-0000-4000-8000-000000000000', 'submit', '00000000-0000-4000-8000-000000000001', 'STAFF', 'runtime-probe')
  RETURNING id INTO v_audit_id;

  -- UPDATE on the audit table MUST be denied (append-only enforcement).
  v_denied := false;
  BEGIN
    UPDATE accounting_submission_audit_events SET reason = 'x' WHERE id = v_audit_id;
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to UPDATE accounting_submission_audit_events';
  END IF;

  -- DELETE on the audit table MUST be denied (append-only enforcement).
  v_denied := false;
  BEGIN
    DELETE FROM accounting_submission_audit_events WHERE id = v_audit_id;
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to DELETE accounting_submission_audit_events';
  END IF;

  -- Negative DDL probe: the runtime role MUST NOT create tables.
  v_denied := false;
  BEGIN
    CREATE TABLE accounting_runtime_probe_forbidden (id uuid PRIMARY KEY);
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'runtime role was able to CREATE TABLE';
  END IF;

  RAISE NOTICE 'accounting runtime probe passed: audit insert allowed, audit UPDATE/DELETE denied, DDL denied';
END $$;
