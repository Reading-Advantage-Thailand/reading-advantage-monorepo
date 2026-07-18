\set ON_ERROR_STOP on
\if :{?probe_owner}
\else
  \echo 'probe_owner is required'
  \quit 3
\endif

SELECT set_config('reading_advantage.sales_runtime_probe_owner', :'probe_owner', false);

DO $$
DECLARE
  owner text := current_setting('reading_advantage.sales_runtime_probe_owner');
  source_id text := md5('source:' || owner)::uuid::text;
  local_id text := 'sales:' || source_id;
  probe_organization_id uuid := md5('organization:' || owner)::uuid;
  module_id uuid := md5('module:' || owner)::uuid;
  lesson_id uuid := md5('lesson:' || owner)::uuid;
  rubric_id uuid := md5('rubric:' || owner)::uuid;
  scenario_id uuid := md5('scenario:' || owner)::uuid;
BEGIN
  IF owner !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'probe_owner must be a lowercase UUID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM users
     WHERE id IN (source_id, local_id)
        OR username IN (
          '__sales_probe_source__:' || owner,
          '__sales_probe_local__:' || owner
        )
        OR display_username IN (
          '__sales_probe_source__:' || owner,
          '__sales_probe_local__:' || owner
        )
  ) OR EXISTS (
    SELECT 1 FROM company_product_principals mapping
     WHERE mapping.application_key = 'sales'
       AND (
         mapping.company_account_id = source_id::uuid
         OR mapping.organization_id = probe_organization_id
       )
  ) OR EXISTS (
    SELECT 1 FROM accounts WHERE id = '__sales_probe_account__:' || owner
  ) OR EXISTS (
    SELECT 1 FROM sales_modules
     WHERE id = module_id OR slug = '__runtime_probe__:' || owner
  ) OR EXISTS (
    SELECT 1 FROM sales_lessons WHERE id = lesson_id
  ) OR EXISTS (
    SELECT 1 FROM sales_rubrics
     WHERE id = rubric_id OR name = '__runtime_probe__:' || owner
  ) OR EXISTS (
    SELECT 1 FROM sales_roleplay_scenarios WHERE id = scenario_id
  ) THEN
    RAISE EXCEPTION 'Sales runtime probe ownership collision';
  END IF;
END
$$;

BEGIN;
INSERT INTO users (
  id, username, display_username, name, role, school_id, cefr_level
)
SELECT
  md5('source:' || :'probe_owner')::uuid::text,
  '__sales_probe_source__:' || :'probe_owner',
  '__sales_probe_source__:' || :'probe_owner',
  'Sales runtime probe source',
  'ADMIN',
  NULL,
  'N/A';
INSERT INTO users (
  id, username, display_username, name, role, school_id, cefr_level
)
SELECT
  'sales:' || md5('source:' || :'probe_owner')::uuid::text,
  '__sales_probe_local__:' || :'probe_owner',
  '__sales_probe_local__:' || :'probe_owner',
  'Sales runtime probe local',
  'SALES_REP',
  NULL,
  'N/A';
INSERT INTO company_product_principals (
  organization_id, organization_key, company_account_id, application_key,
  local_user_id, role_key
)
SELECT
  md5('organization:' || :'probe_owner')::uuid,
  'internal-company',
  md5('source:' || :'probe_owner')::uuid,
  'sales',
  'sales:' || md5('source:' || :'probe_owner')::uuid::text,
  'SALES_REP';
INSERT INTO accounts (id, user_id, provider_id, password)
SELECT
  '__sales_probe_account__:' || :'probe_owner',
  md5('source:' || :'probe_owner')::uuid::text,
  'credential',
  '$argon2id$probe-only';
INSERT INTO sales_modules (id, slug, title, description, phase, "order")
SELECT
  md5('module:' || :'probe_owner')::uuid,
  '__runtime_probe__:' || :'probe_owner',
  'Runtime probe', 'Runtime probe', 'Foundations', 1;
INSERT INTO sales_lessons (
  id, module_id, title, type, content, "order", review_status
)
SELECT
  md5('lesson:' || :'probe_owner')::uuid,
  md5('module:' || :'probe_owner')::uuid,
  'Runtime probe', 'roleplay', 'Runtime probe', 1, 'approved';
INSERT INTO sales_rubrics (id, name, criteria_json, review_status)
SELECT
  md5('rubric:' || :'probe_owner')::uuid,
  '__runtime_probe__:' || :'probe_owner',
  '[]'::jsonb,
  'approved';
INSERT INTO sales_roleplay_scenarios (
  id, lesson_id, persona_name, persona_role, situation, objective,
  rubric_id, "order"
)
SELECT
  md5('scenario:' || :'probe_owner')::uuid,
  md5('lesson:' || :'probe_owner')::uuid,
  'Runtime probe', 'Runtime probe', 'Runtime probe', 'Runtime probe',
  md5('rubric:' || :'probe_owner')::uuid,
  1;
COMMIT;
