\set ON_ERROR_STOP on

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  role_record record;
  owned_relations integer;
  memberships integer;
BEGIN
  SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls,
         rolinherit, rolreplication
    INTO role_record
    FROM pg_roles
   WHERE rolname = current_user;
  IF role_record.rolsuper OR role_record.rolcreaterole OR role_record.rolcreatedb OR role_record.rolbypassrls THEN
    RAISE EXCEPTION 'Sales runtime role has forbidden cluster flags';
  END IF;
  IF role_record.rolinherit OR role_record.rolreplication THEN
    RAISE EXCEPTION 'Sales runtime role must use NOINHERIT and NOREPLICATION';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_database
    WHERE datname = current_database() AND datdba = (SELECT oid FROM pg_roles WHERE rolname = current_user)
  ) THEN
    RAISE EXCEPTION 'Sales runtime role must not own the database';
  END IF;
  SELECT count(*) INTO memberships
    FROM pg_auth_members
   WHERE member = (SELECT oid FROM pg_roles WHERE rolname = current_user);
  IF memberships <> 0 THEN
    RAISE EXCEPTION 'Sales runtime role must not inherit role memberships';
  END IF;
  IF has_schema_privilege(current_user, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Sales runtime role must not CREATE in public schema';
  END IF;
  SELECT count(*) INTO owned_relations
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
     AND c.relname IN (
       'users', 'accounts', 'sessions', 'login_attempts', 'audit_events',
       'company_product_principals',
       'sales_modules', 'sales_lessons', 'sales_rubrics',
       'sales_roleplay_scenarios', 'sales_quiz_questions',
       'sales_roleplay_attempts', 'sales_progress',
       'sales_conversations', 'sales_chat_messages'
     );
  IF owned_relations <> 0 THEN
    RAISE EXCEPTION 'Sales runtime role must not own application relations';
  END IF;
  IF NOT (
    has_table_privilege(current_user, 'users', 'SELECT')
    AND has_table_privilege(current_user, 'users', 'INSERT')
    AND has_column_privilege(current_user, 'users', 'role', 'UPDATE')
  ) THEN missing := array_append(missing, 'users'); END IF;
  IF NOT (
    has_table_privilege(current_user, 'company_product_principals', 'SELECT')
    AND has_table_privilege(current_user, 'company_product_principals', 'INSERT')
    AND has_column_privilege(current_user, 'company_product_principals', 'role_key', 'UPDATE')
    AND has_column_privilege(current_user, 'company_product_principals', 'updated_at', 'UPDATE')
  ) THEN missing := array_append(missing, 'company_product_principals'); END IF;
  IF NOT has_table_privilege(current_user, 'accounts', 'SELECT,INSERT,UPDATE') THEN missing := array_append(missing, 'accounts'); END IF;
  IF NOT has_table_privilege(current_user, 'sessions', 'SELECT,INSERT,DELETE') THEN missing := array_append(missing, 'sessions'); END IF;
  IF NOT has_table_privilege(current_user, 'login_attempts', 'SELECT,INSERT,UPDATE,DELETE') THEN missing := array_append(missing, 'login_attempts'); END IF;
  IF NOT has_table_privilege(current_user, 'audit_events', 'INSERT') THEN missing := array_append(missing, 'audit_events'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_modules', 'SELECT') THEN missing := array_append(missing, 'sales_modules'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_lessons', 'SELECT,UPDATE') THEN missing := array_append(missing, 'sales_lessons'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_rubrics', 'SELECT,UPDATE') THEN missing := array_append(missing, 'sales_rubrics'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_roleplay_scenarios', 'SELECT') THEN missing := array_append(missing, 'sales_roleplay_scenarios'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_quiz_questions', 'SELECT') THEN missing := array_append(missing, 'sales_quiz_questions'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_roleplay_attempts', 'SELECT,INSERT,UPDATE') THEN missing := array_append(missing, 'sales_roleplay_attempts'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_progress', 'SELECT,INSERT,UPDATE') THEN missing := array_append(missing, 'sales_progress'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_conversations', 'SELECT,INSERT') THEN missing := array_append(missing, 'sales_conversations'); END IF;
  IF NOT has_table_privilege(current_user, 'sales_chat_messages', 'SELECT,INSERT') THEN missing := array_append(missing, 'sales_chat_messages'); END IF;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Sales runtime privilege probe failed: %', array_to_string(missing, ', ');
  END IF;
  IF has_table_privilege(current_user, 'users', 'UPDATE')
    OR has_table_privilege(current_user, 'company_product_principals', 'UPDATE')
    OR has_column_privilege(current_user, 'users', 'id', 'UPDATE')
    OR has_column_privilege(current_user, 'users', 'username', 'UPDATE')
    OR has_column_privilege(current_user, 'users', 'school_id', 'UPDATE')
    OR has_column_privilege(current_user, 'company_product_principals', 'organization_id', 'UPDATE')
    OR has_column_privilege(current_user, 'company_product_principals', 'company_account_id', 'UPDATE')
    OR has_column_privilege(current_user, 'company_product_principals', 'local_user_id', 'UPDATE')
    OR has_table_privilege(current_user, 'users', 'DELETE')
    OR has_table_privilege(current_user, 'users', 'TRUNCATE')
    OR has_table_privilege(current_user, 'company_product_principals', 'DELETE')
    OR has_table_privilege(current_user, 'company_product_principals', 'TRUNCATE')
    OR has_table_privilege(current_user, 'audit_events', 'SELECT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(current_user, 'sales_modules', 'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(current_user, 'sales_roleplay_scenarios', 'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(current_user, 'sales_chat_messages', 'UPDATE,DELETE,TRUNCATE') THEN
    RAISE EXCEPTION 'Sales runtime role retains representative forbidden operations';
  END IF;
END
$$;

BEGIN;
INSERT INTO users (id, username, display_username, name, role)
  VALUES ('sales:00000000-0000-0000-0000-000000000060', '__sales_runtime_probe__', '__sales_runtime_probe__', 'Runtime Probe', 'SALES_REP');
INSERT INTO company_product_principals (
  organization_id, organization_key, company_account_id, application_key,
  local_user_id, role_key
)
  VALUES (
    '00000000-0000-0000-0000-000000000059', 'internal-company',
    '00000000-0000-0000-0000-000000000060', 'sales',
    'sales:00000000-0000-0000-0000-000000000060', 'SALES_REP'
  );
SELECT local_user_id, role_key
  FROM company_product_principals
 WHERE organization_id = '00000000-0000-0000-0000-000000000059'
   AND company_account_id = '00000000-0000-0000-0000-000000000060'
   AND application_key = 'sales';
UPDATE users SET role = 'SALES_ADMIN' WHERE id = 'sales:00000000-0000-0000-0000-000000000060';
UPDATE company_product_principals SET role_key = 'SALES_ADMIN', updated_at = now()
 WHERE organization_id = '00000000-0000-0000-0000-000000000059'
   AND company_account_id = '00000000-0000-0000-0000-000000000060'
   AND application_key = 'sales';
INSERT INTO accounts (id, user_id, provider_id, password)
  VALUES ('__sales_runtime_probe_account__', 'sales:00000000-0000-0000-0000-000000000060', 'credential', 'probe-not-a-real-hash');
UPDATE accounts SET updated_at = updated_at WHERE id = '__sales_runtime_probe_account__';
INSERT INTO sessions (id, token_hash, user_id, expires_at)
  VALUES ('__sales_runtime_probe_session__', repeat('0', 64), 'sales:00000000-0000-0000-0000-000000000060', now() + interval '1 minute');
DELETE FROM sessions WHERE id = '__sales_runtime_probe_session__';
INSERT INTO login_attempts (identifier, kind)
  VALUES ('__sales_runtime_probe__', 'username')
  ON CONFLICT (identifier, kind) DO UPDATE SET failed_count = login_attempts.failed_count;
DELETE FROM login_attempts WHERE identifier = '__sales_runtime_probe__';
INSERT INTO audit_events (id, actor_user_id, action)
  VALUES ('__sales_runtime_probe_event__', 'sales:00000000-0000-0000-0000-000000000060', 'deployment:runtime_probe');

UPDATE sales_lessons SET review_status = 'approved' WHERE id = '00000000-0000-0000-0000-000000000052';
UPDATE sales_rubrics SET review_status = 'approved' WHERE id = '00000000-0000-0000-0000-000000000053';
INSERT INTO sales_roleplay_attempts (id, scenario_id, user_id, duration_ms, attempt_number)
  VALUES ('00000000-0000-0000-0000-000000000055', '00000000-0000-0000-0000-000000000054', 'sales:00000000-0000-0000-0000-000000000060', 1, 1);
UPDATE sales_roleplay_attempts SET passed = false WHERE id = '00000000-0000-0000-0000-000000000055';
INSERT INTO sales_progress (id, user_id, lesson_id, status)
  VALUES ('00000000-0000-0000-0000-000000000056', 'sales:00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000052', 'in_progress');
UPDATE sales_progress SET score = 0 WHERE id = '00000000-0000-0000-0000-000000000056';
INSERT INTO sales_conversations (id, user_id, lesson_id, module_id)
  VALUES ('00000000-0000-0000-0000-000000000057', 'sales:00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000051');
INSERT INTO sales_chat_messages (id, conversation_id, role, content)
  VALUES ('00000000-0000-0000-0000-000000000058', '00000000-0000-0000-0000-000000000057', 'user', 'Probe');

UPDATE users
   SET role = 'INTERN'
 WHERE id = 'sales:00000000-0000-0000-0000-000000000060';
UPDATE company_product_principals
   SET role_key = 'REVOKED', updated_at = now()
 WHERE organization_id = '00000000-0000-0000-0000-000000000059'
   AND company_account_id = '00000000-0000-0000-0000-000000000060'
   AND application_key = 'sales';

DO $$
DECLARE
  stored_user_role text;
  stored_mapping_role text;
  stored_local_user_id text;
  duplicate_state text;
BEGIN
  SELECT role::text INTO stored_user_role
    FROM users
   WHERE id = 'sales:00000000-0000-0000-0000-000000000060';
  SELECT role_key, local_user_id
    INTO stored_mapping_role, stored_local_user_id
    FROM company_product_principals
   WHERE organization_id = '00000000-0000-0000-0000-000000000059'
     AND company_account_id = '00000000-0000-0000-0000-000000000060'
     AND application_key = 'sales';
  IF stored_user_role <> 'INTERN'
    OR stored_mapping_role <> 'REVOKED'
    OR stored_local_user_id <> 'sales:00000000-0000-0000-0000-000000000060' THEN
    RAISE EXCEPTION 'Sales role-removal persistence probe failed';
  END IF;

  BEGIN
    INSERT INTO company_product_principals (
      organization_id, organization_key, company_account_id, application_key,
      local_user_id, role_key
    ) VALUES (
      '00000000-0000-0000-0000-000000000061', 'internal-company',
      '00000000-0000-0000-0000-000000000060', 'sales',
      'sales:00000000-0000-0000-0000-000000000060', 'SALES_REP'
    );
    RAISE EXCEPTION 'Cross-organization application/local duplicate was accepted';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS duplicate_state = RETURNED_SQLSTATE;
    IF duplicate_state <> '23505' THEN
      RAISE EXCEPTION 'Expected SQLSTATE 23505, received %', duplicate_state;
    END IF;
  END;
END
$$;

SELECT id FROM sales_quiz_questions LIMIT 0;
ROLLBACK;
