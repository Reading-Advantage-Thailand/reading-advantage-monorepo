\set ON_ERROR_STOP on
\if :{?probe_owner}
\else
  \echo 'probe_owner is required'
  \quit 3
\endif

SELECT set_config('reading_advantage.sales_runtime_probe_owner', :'probe_owner', false);

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  role_record record;
  owned_relations integer;
  memberships integer;
BEGIN
  IF current_user <> 'sales_runtime' THEN
    RAISE EXCEPTION 'Sales runtime probe requires sales_runtime';
  END IF;
  IF current_setting('reading_advantage.sales_runtime_probe_owner')
    !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'probe_owner must be a lowercase UUID';
  END IF;
  SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls,
         rolinherit, rolreplication
    INTO role_record
    FROM pg_roles
   WHERE rolname = current_user;
  IF role_record.rolsuper OR role_record.rolcreaterole
    OR role_record.rolcreatedb OR role_record.rolbypassrls THEN
    RAISE EXCEPTION 'Sales runtime role has forbidden cluster flags';
  END IF;
  IF role_record.rolinherit OR role_record.rolreplication THEN
    RAISE EXCEPTION 'Sales runtime role must use NOINHERIT and NOREPLICATION';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_database
     WHERE datname = current_database()
       AND datdba = (SELECT oid FROM pg_roles WHERE rolname = current_user)
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
    FROM pg_class relation_record
    JOIN pg_namespace namespace_record
      ON namespace_record.oid = relation_record.relnamespace
   WHERE namespace_record.nspname = 'public'
     AND relation_record.relowner =
       (SELECT oid FROM pg_roles WHERE rolname = current_user);
  IF owned_relations <> 0 THEN
    RAISE EXCEPTION 'Sales runtime role must not own application relations';
  END IF;

  IF NOT has_table_privilege(current_user, 'users', 'SELECT') THEN
    missing := array_append(missing, 'users');
  END IF;
  IF NOT has_table_privilege(
    current_user, 'company_product_principals', 'SELECT'
  ) THEN
    missing := array_append(missing, 'company_product_principals');
  END IF;
  IF NOT has_function_privilege(
    current_user,
    'sync_sales_company_principal(uuid,text,uuid,text,text)',
    'EXECUTE'
  ) THEN
    missing := array_append(missing, 'sync_sales_company_principal');
  END IF;
  IF NOT has_table_privilege(current_user, 'audit_events', 'INSERT') THEN
    missing := array_append(missing, 'audit_events');
  END IF;
  IF NOT has_table_privilege(current_user, 'sales_modules', 'SELECT') THEN
    missing := array_append(missing, 'sales_modules');
  END IF;
  IF NOT has_table_privilege(current_user, 'sales_lessons', 'SELECT,UPDATE') THEN
    missing := array_append(missing, 'sales_lessons');
  END IF;
  IF NOT has_table_privilege(current_user, 'sales_rubrics', 'SELECT,UPDATE') THEN
    missing := array_append(missing, 'sales_rubrics');
  END IF;
  IF NOT has_table_privilege(current_user, 'sales_roleplay_scenarios', 'SELECT') THEN
    missing := array_append(missing, 'sales_roleplay_scenarios');
  END IF;
  IF NOT has_table_privilege(current_user, 'sales_quiz_questions', 'SELECT') THEN
    missing := array_append(missing, 'sales_quiz_questions');
  END IF;
  IF NOT has_table_privilege(
    current_user, 'sales_roleplay_attempts', 'SELECT,INSERT,UPDATE'
  ) THEN
    missing := array_append(missing, 'sales_roleplay_attempts');
  END IF;
  IF NOT has_table_privilege(
    current_user, 'sales_progress', 'SELECT,INSERT,UPDATE'
  ) THEN
    missing := array_append(missing, 'sales_progress');
  END IF;
  IF NOT has_table_privilege(
    current_user, 'sales_conversations', 'SELECT,INSERT'
  ) THEN
    missing := array_append(missing, 'sales_conversations');
  END IF;
  IF NOT has_table_privilege(
    current_user, 'sales_chat_messages', 'SELECT,INSERT'
  ) THEN
    missing := array_append(missing, 'sales_chat_messages');
  END IF;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Sales runtime privilege probe failed: %',
      array_to_string(missing, ', ');
  END IF;

  IF has_table_privilege(current_user, 'users', 'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(
      current_user,
      'company_product_principals',
      'INSERT,UPDATE,DELETE,TRUNCATE'
    )
    OR has_table_privilege(
      current_user, 'accounts', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
    )
    OR has_table_privilege(
      current_user, 'sessions', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
    )
    OR has_table_privilege(
      current_user, 'login_attempts', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
    )
    OR has_table_privilege(current_user, 'audit_events', 'SELECT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(current_user, 'sales_modules', 'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(current_user, 'sales_roleplay_scenarios', 'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(current_user, 'sales_chat_messages', 'UPDATE,DELETE,TRUNCATE') THEN
    RAISE EXCEPTION 'Sales runtime role retains representative forbidden operations';
  END IF;
END
$$;

BEGIN;
SELECT local_user_id, user_role::text, mapping_role_key
  FROM sync_sales_company_principal(
    md5('organization:' || :'probe_owner')::uuid,
    'internal-company',
    md5('source:' || :'probe_owner')::uuid,
    'Sales runtime probe local',
    'SALES_ADMIN'
  );
SELECT local_user_id, role_key
  FROM company_product_principals
 WHERE application_key = 'sales'
   AND company_account_id = md5('source:' || :'probe_owner')::uuid;

INSERT INTO audit_events (id, actor_user_id, action)
SELECT
  '__sales_runtime_probe_event__:' || :'probe_owner',
  'sales:' || md5('source:' || :'probe_owner')::uuid::text,
  'deployment:runtime_probe';
UPDATE sales_lessons
   SET review_status = 'approved'
 WHERE id = md5('lesson:' || :'probe_owner')::uuid;
UPDATE sales_rubrics
   SET review_status = 'approved'
 WHERE id = md5('rubric:' || :'probe_owner')::uuid;
INSERT INTO sales_roleplay_attempts (
  id, scenario_id, user_id, duration_ms, attempt_number
)
SELECT
  md5('attempt:' || :'probe_owner')::uuid,
  md5('scenario:' || :'probe_owner')::uuid,
  'sales:' || md5('source:' || :'probe_owner')::uuid::text,
  1,
  1;
UPDATE sales_roleplay_attempts
   SET passed = false
 WHERE id = md5('attempt:' || :'probe_owner')::uuid;
INSERT INTO sales_progress (id, user_id, lesson_id, status)
SELECT
  md5('progress:' || :'probe_owner')::uuid,
  'sales:' || md5('source:' || :'probe_owner')::uuid::text,
  md5('lesson:' || :'probe_owner')::uuid,
  'in_progress';
UPDATE sales_progress
   SET score = 0
 WHERE id = md5('progress:' || :'probe_owner')::uuid;
INSERT INTO sales_conversations (id, user_id, lesson_id, module_id)
SELECT
  md5('conversation:' || :'probe_owner')::uuid,
  'sales:' || md5('source:' || :'probe_owner')::uuid::text,
  md5('lesson:' || :'probe_owner')::uuid,
  md5('module:' || :'probe_owner')::uuid;
INSERT INTO sales_chat_messages (id, conversation_id, role, content)
SELECT
  md5('message:' || :'probe_owner')::uuid,
  md5('conversation:' || :'probe_owner')::uuid,
  'user',
  'Runtime probe';
SELECT local_user_id, user_role::text, mapping_role_key
  FROM sync_sales_company_principal(
    md5('organization:' || :'probe_owner')::uuid,
    'internal-company',
    md5('source:' || :'probe_owner')::uuid,
    'Sales runtime probe local',
    'REVOKED'
  );
SELECT id FROM sales_quiz_questions LIMIT 0;
ROLLBACK;
