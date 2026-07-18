\set ON_ERROR_STOP on

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO sales_legacy_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO sales_legacy_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
  FROM sales_legacy_runtime;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
  FROM sales_legacy_runtime;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public
  FROM sales_legacy_runtime;

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
