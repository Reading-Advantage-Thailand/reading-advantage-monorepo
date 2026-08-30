\set ON_ERROR_STOP on

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO sales_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO sales_runtime;
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
    ) OR table_record.owner_name = 'durable_job_audit_owner' THEN
      RAISE NOTICE 'Skipping runtime revoke for public.% (owner: %)',
        table_record.relname,
        table_record.owner_name;
    ELSE
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %I',
        'public',
        table_record.relname,
        'sales_runtime'
      );
    END IF;
  END LOOP;
END
$$;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM sales_runtime;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM sales_runtime;

GRANT SELECT ON TABLE users TO sales_runtime;
GRANT SELECT ON TABLE company_product_principals TO sales_runtime;
GRANT EXECUTE ON FUNCTION
  sync_sales_company_principal(uuid, text, uuid, text, text)
  TO sales_runtime;
GRANT INSERT ON TABLE audit_events TO sales_runtime;

GRANT SELECT ON TABLE sales_modules TO sales_runtime;
GRANT SELECT, UPDATE ON TABLE sales_lessons TO sales_runtime;
GRANT SELECT, UPDATE ON TABLE sales_rubrics TO sales_runtime;
GRANT SELECT ON TABLE sales_roleplay_scenarios TO sales_runtime;
GRANT SELECT ON TABLE sales_quiz_questions TO sales_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE sales_roleplay_attempts TO sales_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE sales_progress TO sales_runtime;
GRANT SELECT, INSERT ON TABLE sales_conversations TO sales_runtime;
GRANT SELECT, INSERT ON TABLE sales_chat_messages TO sales_runtime;

-- UUID/default-backed Sales relations use no database sequences. Keep future
-- migration objects closed until a reviewed table-specific grant is added.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM sales_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM sales_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM sales_runtime;
