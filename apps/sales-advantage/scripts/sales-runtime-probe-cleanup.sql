\set ON_ERROR_STOP on
\if :{?probe_owner}
\else
  \echo 'probe_owner is required'
  \quit 3
\endif

SELECT set_config('reading_advantage.sales_runtime_probe_owner', :'probe_owner', false);

BEGIN;
DO $$
DECLARE
  owner text := current_setting('reading_advantage.sales_runtime_probe_owner');
  source_id text := md5('source:' || owner)::uuid::text;
  local_id text := 'sales:' || source_id;
BEGIN
  IF owner !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'probe_owner must be a lowercase UUID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM users
     WHERE id = source_id
       AND username <> '__sales_probe_source__:' || owner
  ) OR EXISTS (
    SELECT 1 FROM users
     WHERE id = local_id
       AND username <> '__sales_probe_local__:' || owner
  ) OR EXISTS (
    SELECT 1 FROM sales_modules
     WHERE id = md5('module:' || owner)::uuid
       AND slug <> '__runtime_probe__:' || owner
  ) OR EXISTS (
    SELECT 1 FROM sales_rubrics
     WHERE id = md5('rubric:' || owner)::uuid
       AND name <> '__runtime_probe__:' || owner
  ) THEN
    RAISE EXCEPTION 'Sales runtime probe cleanup ownership mismatch';
  END IF;
END
$$;

DELETE FROM company_product_principals
 WHERE application_key = 'sales'
   AND company_account_id = md5('source:' || :'probe_owner')::uuid
   AND organization_id = md5('organization:' || :'probe_owner')::uuid
   AND local_user_id =
     'sales:' || md5('source:' || :'probe_owner')::uuid::text;
DELETE FROM users
 WHERE id IN (
   md5('source:' || :'probe_owner')::uuid::text,
   'sales:' || md5('source:' || :'probe_owner')::uuid::text
 )
   AND username IN (
     '__sales_probe_source__:' || :'probe_owner',
     '__sales_probe_local__:' || :'probe_owner'
   );
DELETE FROM sales_modules
 WHERE id = md5('module:' || :'probe_owner')::uuid
   AND slug = '__runtime_probe__:' || :'probe_owner';
DELETE FROM sales_rubrics
 WHERE id = md5('rubric:' || :'probe_owner')::uuid
   AND name = '__runtime_probe__:' || :'probe_owner';
COMMIT;
