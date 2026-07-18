\set ON_ERROR_STOP on
\if :{?probe_owner}
\else
  \echo 'probe_owner is required'
  \quit 3
\endif

SELECT set_config('reading_advantage.sales_runtime_probe_owner', :'probe_owner', false);

DO $$
DECLARE
  role_record record;
BEGIN
  IF current_user <> 'sales_legacy_runtime' THEN
    RAISE EXCEPTION 'Sales legacy runtime probe requires sales_legacy_runtime';
  END IF;
  SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls,
         rolinherit, rolreplication
    INTO role_record
    FROM pg_roles
   WHERE rolname = current_user;
  IF role_record.rolsuper OR role_record.rolcreaterole
    OR role_record.rolcreatedb OR role_record.rolbypassrls
    OR role_record.rolinherit OR role_record.rolreplication THEN
    RAISE EXCEPTION 'Sales legacy runtime role has forbidden cluster flags';
  END IF;
  IF NOT has_table_privilege(current_user, 'users', 'SELECT')
    OR NOT has_table_privilege(
      current_user, 'company_product_principals', 'SELECT'
    )
    OR NOT has_table_privilege(current_user, 'accounts', 'SELECT')
    OR NOT has_column_privilege(current_user, 'accounts', 'password', 'UPDATE')
    OR NOT has_column_privilege(current_user, 'accounts', 'updated_at', 'UPDATE')
    OR NOT has_table_privilege(current_user, 'sessions', 'SELECT,INSERT,DELETE')
    OR NOT has_table_privilege(
      current_user, 'login_attempts', 'SELECT,INSERT,UPDATE,DELETE'
    )
    OR NOT has_table_privilege(current_user, 'audit_events', 'INSERT') THEN
    RAISE EXCEPTION 'Sales legacy runtime required privileges are incomplete';
  END IF;
  IF has_table_privilege(current_user, 'users', 'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_table_privilege(
      current_user,
      'company_product_principals',
      'INSERT,UPDATE,DELETE,TRUNCATE'
    )
    OR has_table_privilege(current_user, 'accounts', 'INSERT,DELETE,TRUNCATE')
    OR has_table_privilege(current_user, 'accounts', 'UPDATE')
    OR has_column_privilege(current_user, 'accounts', 'user_id', 'UPDATE')
    OR has_column_privilege(current_user, 'accounts', 'provider_id', 'UPDATE')
    OR has_function_privilege(
      current_user,
      'sync_sales_company_principal(uuid,text,uuid,text,text)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Sales legacy runtime retains forbidden provisioning privileges';
  END IF;
END
$$;

BEGIN;
SELECT account_record.id, source_user.id, mapping.local_user_id
  FROM accounts account_record
  JOIN users source_user ON source_user.id = account_record.user_id
  JOIN company_product_principals mapping
    ON mapping.application_key = 'sales'
   AND mapping.company_account_id = source_user.id::uuid
 WHERE account_record.id = '__sales_probe_account__:' || :'probe_owner'
   AND mapping.local_user_id = 'sales:' || source_user.id;
UPDATE accounts
   SET password = password,
       updated_at = now()
 WHERE id = '__sales_probe_account__:' || :'probe_owner';
INSERT INTO sessions (id, token_hash, user_id, expires_at)
SELECT
  '__sales_probe_session__:' || :'probe_owner',
  md5('token-a:' || :'probe_owner') || md5('token-b:' || :'probe_owner'),
  md5('source:' || :'probe_owner')::uuid::text,
  now() + interval '1 minute';
DELETE FROM sessions
 WHERE id = '__sales_probe_session__:' || :'probe_owner';
INSERT INTO login_attempts (identifier, kind)
SELECT '__sales_probe_login__:' || :'probe_owner', 'username'
ON CONFLICT (identifier, kind) DO UPDATE
SET failed_count = login_attempts.failed_count;
DELETE FROM login_attempts
 WHERE identifier = '__sales_probe_login__:' || :'probe_owner'
   AND kind = 'username';
INSERT INTO audit_events (id, actor_user_id, action)
SELECT
  '__sales_legacy_probe_event__:' || :'probe_owner',
  md5('source:' || :'probe_owner')::uuid::text,
  'deployment:legacy_runtime_probe';
ROLLBACK;
