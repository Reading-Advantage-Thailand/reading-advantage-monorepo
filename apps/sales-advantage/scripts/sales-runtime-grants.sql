\set ON_ERROR_STOP on

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO sales_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO sales_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM sales_runtime;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM sales_runtime;

GRANT SELECT, INSERT ON TABLE users TO sales_runtime;
GRANT UPDATE (role) ON TABLE users TO sales_runtime;
GRANT SELECT, INSERT ON TABLE company_product_principals TO sales_runtime;
GRANT UPDATE (role_key, updated_at) ON TABLE company_product_principals TO sales_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE accounts TO sales_runtime;
GRANT SELECT, INSERT, DELETE ON TABLE sessions TO sales_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE login_attempts TO sales_runtime;
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
