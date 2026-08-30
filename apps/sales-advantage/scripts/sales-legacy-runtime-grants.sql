\set ON_ERROR_STOP on

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO sales_legacy_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO sales_legacy_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT class.relname, pg_get_userbyid(class.relowner) AS owner_name
    FROM pg_class AS class
    INNER JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
    WHERE namespace.nspname = 'public'
      AND class.relkind IN ('r', 'p', 'v', 'm', 'f')
    ORDER BY class.relname
  LOOP
    IF table_record.relname IN (
      'durable_job_audit_events',
      'review_job_adoption_audit_events'
    ) OR table_record.owner_name IN (
      'durable_job_audit_owner',
      'durable_job_queue_runtime'
    ) THEN
      RAISE NOTICE 'Skipping runtime revoke for public.% (owner: %)',
        table_record.relname,
        table_record.owner_name;
    ELSE
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %I',
        'public',
        table_record.relname,
        'sales_legacy_runtime'
      );
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  sequence_record record;
BEGIN
  FOR sequence_record IN
    SELECT
      sequence_class.relname,
      pg_get_userbyid(sequence_class.relowner) AS owner_name,
      attached_table.relname AS attached_table_name,
      pg_get_userbyid(attached_table.relowner) AS attached_table_owner_name
    FROM pg_class AS sequence_class
    INNER JOIN pg_namespace AS namespace
      ON namespace.oid = sequence_class.relnamespace
    LEFT JOIN pg_depend AS dependency
      ON dependency.classid = 'pg_class'::regclass
      AND dependency.objid = sequence_class.oid
      AND dependency.refclassid = 'pg_class'::regclass
      AND dependency.deptype IN ('a', 'i')
    LEFT JOIN pg_class AS attached_table ON attached_table.oid = dependency.refobjid
    WHERE namespace.nspname = 'public'
      AND sequence_class.relkind = 'S'
    ORDER BY sequence_class.relname
  LOOP
    IF sequence_record.owner_name IN (
      'durable_job_audit_owner',
      'durable_job_queue_runtime'
    ) OR sequence_record.attached_table_name IN (
      'durable_job_audit_events',
      'review_job_adoption_audit_events'
    ) OR sequence_record.attached_table_owner_name IN (
      'durable_job_audit_owner',
      'durable_job_queue_runtime'
    ) THEN
      RAISE NOTICE
        'Skipping runtime revoke for public.% (owner: %, attached table: %, attached owner: %)',
        sequence_record.relname,
        sequence_record.owner_name,
        sequence_record.attached_table_name,
        sequence_record.attached_table_owner_name;
    ELSE
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM %I',
        'public',
        sequence_record.relname,
        'sales_legacy_runtime'
      );
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  function_record record;
BEGIN
  FOR function_record IN
    SELECT
      proc.proname,
      pg_get_function_identity_arguments(proc.oid) AS identity_arguments,
      pg_get_userbyid(proc.proowner) AS owner_name
    FROM pg_proc AS proc
    INNER JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.prokind <> 'p'
    ORDER BY proc.proname, identity_arguments
  LOOP
    IF function_record.owner_name IN (
      'durable_job_audit_owner',
      'durable_job_queue_runtime'
    ) THEN
      RAISE NOTICE 'Skipping runtime revoke for public.% (owner: %)',
        function_record.proname,
        function_record.owner_name;
    ELSE
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON FUNCTION %I.%I(%s) FROM %I',
        'public',
        function_record.proname,
        function_record.identity_arguments,
        'sales_legacy_runtime'
      );
    END IF;
  END LOOP;
END
$$;

-- Recovery mode authenticates existing credential rows only. It cannot create
-- accounts, create users, change user roles, or invoke company provisioning.
GRANT SELECT ON TABLE users TO sales_legacy_runtime;
GRANT SELECT ON TABLE company_product_principals TO sales_legacy_runtime;
GRANT SELECT ON TABLE accounts TO sales_legacy_runtime;
GRANT UPDATE (password, updated_at) ON TABLE accounts
  TO sales_legacy_runtime;
GRANT SELECT, INSERT, DELETE ON TABLE sessions TO sales_legacy_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE login_attempts
  TO sales_legacy_runtime;
GRANT INSERT ON TABLE audit_events TO sales_legacy_runtime;

GRANT SELECT ON TABLE sales_modules TO sales_legacy_runtime;
GRANT SELECT, UPDATE ON TABLE sales_lessons TO sales_legacy_runtime;
GRANT SELECT, UPDATE ON TABLE sales_rubrics TO sales_legacy_runtime;
GRANT SELECT ON TABLE sales_roleplay_scenarios TO sales_legacy_runtime;
GRANT SELECT ON TABLE sales_quiz_questions TO sales_legacy_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE sales_roleplay_attempts
  TO sales_legacy_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE sales_progress
  TO sales_legacy_runtime;
GRANT SELECT, INSERT ON TABLE sales_conversations TO sales_legacy_runtime;
GRANT SELECT, INSERT ON TABLE sales_chat_messages TO sales_legacy_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM sales_legacy_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM sales_legacy_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM sales_legacy_runtime;
