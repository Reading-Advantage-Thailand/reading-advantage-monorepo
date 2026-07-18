\set ON_ERROR_STOP on
\if :{?repair_manifest}
\else
  \echo 'repair_manifest is required'
  \quit 3
\endif

BEGIN;
SELECT set_config(
  'reading_advantage.sales_source_role_repair_manifest',
  :'repair_manifest',
  true
);

DO $$
DECLARE
  manifest jsonb :=
    current_setting(
      'reading_advantage.sales_source_role_repair_manifest'
    )::jsonb;
  account_id uuid;
  expected_current_role text;
  target_role text;
  mapping_count integer;
  expected_mapping_count integer;
  current_role text;
  affected integer;
BEGIN
  IF jsonb_typeof(manifest) <> 'object'
    OR manifest - ARRAY[
      'accountId', 'expectedCurrentRole', 'targetRole'
    ]::text[] <> '{}'::jsonb
    OR NOT (
      manifest ? 'accountId'
      AND manifest ? 'expectedCurrentRole'
      AND manifest ? 'targetRole'
    ) THEN
    RAISE EXCEPTION 'Sales source-role repair manifest shape is invalid';
  END IF;

  account_id := (manifest->>'accountId')::uuid;
  expected_current_role := manifest->>'expectedCurrentRole';
  target_role := manifest->>'targetRole';
  IF expected_current_role NOT IN ('SALES_REP', 'SALES_ADMIN')
    OR target_role NOT IN ('INTERN', 'STUDENT', 'TEACHER', 'ADMIN') THEN
    RAISE EXCEPTION 'Sales source-role repair manifest roles are invalid';
  END IF;

  SELECT
    count(*)::integer,
    count(*) FILTER (
      WHERE mapping.local_user_id = 'sales:' || account_id::text
    )::integer
    INTO mapping_count, expected_mapping_count
    FROM company_product_principals mapping
   WHERE mapping.application_key = 'sales'
     AND mapping.company_account_id = account_id;
  IF mapping_count <> 1 OR expected_mapping_count <> 1 THEN
    RAISE EXCEPTION 'Sales source-role repair mapping mismatch';
  END IF;

  SELECT role::text
    INTO current_role
    FROM users
   WHERE id = account_id::text
   FOR UPDATE;
  IF current_role IS NULL THEN
    RAISE EXCEPTION 'Sales source-role repair source row is absent';
  END IF;
  IF current_role = target_role THEN
    RETURN;
  END IF;
  IF current_role <> expected_current_role THEN
    RAISE EXCEPTION 'Sales source-role repair current role mismatch';
  END IF;

  UPDATE users
     SET role = target_role::role,
         updated_at = now()
   WHERE id = account_id::text
     AND role::text = expected_current_role;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Sales source-role repair did not update exactly one row';
  END IF;

  INSERT INTO audit_events (
    id, actor_user_id, actor_role, action, target_type, target_id, metadata
  ) VALUES (
    'sales-source-role-repair:' || account_id::text,
    NULL,
    'SYSTEM',
    'sales:legacy_source_role_repaired',
    'user',
    account_id::text,
    jsonb_build_object(
      'applicationKey', 'sales',
      'expectedCurrentRole', expected_current_role,
      'targetRole', target_role,
      'source', 'cloud-build-repair-manifest'
    )
  );
END
$$;

COMMIT;
