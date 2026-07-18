\set ON_ERROR_STOP on

DO $$
DECLARE
  role_record record;
BEGIN
  SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication,
         rolbypassrls, rolinherit,
         EXISTS(SELECT 1 FROM pg_auth_members WHERE member = pg_roles.oid) AS has_memberships
    INTO role_record
    FROM pg_roles WHERE rolname = current_user;
  IF role_record.rolsuper OR role_record.rolcreatedb OR role_record.rolcreaterole
     OR role_record.rolreplication OR role_record.rolbypassrls
     OR role_record.rolinherit OR role_record.has_memberships THEN
    RAISE EXCEPTION 'Accounts runtime role has cluster or inherited authority';
  END IF;
  IF pg_get_userbyid((SELECT datdba FROM pg_database WHERE datname = current_database())) = current_user THEN
    RAISE EXCEPTION 'Accounts runtime role must not own the database';
  END IF;
  IF has_schema_privilege(current_user, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Accounts runtime role must not create schema objects';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public' AND relation.relkind IN ('r', 'p')
      AND pg_get_userbyid(relation.relowner) = current_user
  ) THEN
    RAISE EXCEPTION 'Accounts runtime role must not own identity relations';
  END IF;
END $$;

BEGIN;
INSERT INTO company_login_attempts (
  correlation_id, normalized_username_hash, ip_hash, outcome, latency_ms
) VALUES (
  '10000000-0000-4000-8000-000000000001', repeat('a', 64), repeat('b', 64),
  'INVALID_CREDENTIALS', 1
);
INSERT INTO company_identity_audit_events (
  correlation_id, actor_type, operation, outcome, metadata
) VALUES (
  '10000000-0000-4000-8000-000000000002', 'SYSTEM',
  'identity:runtime-probe', 'SUCCEEDED', '{"source":"cloud-build"}'::jsonb
);
DO $$
BEGIN
  BEGIN
    UPDATE company_identity_audit_events
       SET outcome = 'FAILED'
     WHERE correlation_id = '10000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'Runtime role unexpectedly updated immutable audit evidence';
  EXCEPTION
    WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
    NULL;
  END;
END $$;
ROLLBACK;
