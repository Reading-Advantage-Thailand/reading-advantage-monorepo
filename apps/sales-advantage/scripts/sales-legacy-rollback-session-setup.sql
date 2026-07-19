\set ON_ERROR_STOP on
\if :{?probe_session_id}
\else
  \echo 'probe_session_id is required'
  \quit 3
\endif
\if :{?session_token_hash}
\else
  \echo 'session_token_hash is required'
  \quit 3
\endif
\if :{?repair_manifest}
\else
  \echo 'repair_manifest is required'
  \quit 3
\endif

BEGIN;
SELECT set_config(
  'reading_advantage.sales_rollback_probe_session_id',
  :'probe_session_id',
  true
);
SELECT set_config(
  'reading_advantage.sales_rollback_probe_token_hash',
  :'session_token_hash',
  true
);
SELECT set_config(
  'reading_advantage.sales_rollback_probe_manifest',
  :'repair_manifest',
  true
);

DO $$
DECLARE
  probe_session_id text := current_setting(
    'reading_advantage.sales_rollback_probe_session_id'
  );
  token_hash text := current_setting(
    'reading_advantage.sales_rollback_probe_token_hash'
  );
  manifest jsonb := current_setting(
    'reading_advantage.sales_rollback_probe_manifest'
  )::jsonb;
  account_id uuid;
  expected_role text;
  target_role text;
  observed_role text;
  completed_audit_count integer;
  mapping_count integer;
BEGIN
  IF probe_session_id !~
    '^__sales_rollback_probe__:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Sales rollback probe session id is invalid';
  END IF;
  IF token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Sales rollback probe token hash is invalid';
  END IF;
  IF jsonb_typeof(manifest) <> 'object'
    OR manifest - ARRAY[
      'accountId', 'expectedCurrentRole', 'targetRole'
    ]::text[] <> '{}'::jsonb
    OR NOT (
      manifest ? 'accountId'
      AND manifest ? 'expectedCurrentRole'
      AND manifest ? 'targetRole'
    ) THEN
    RAISE EXCEPTION 'Sales rollback probe manifest shape is invalid';
  END IF;

  account_id := (manifest->>'accountId')::uuid;
  expected_role := manifest->>'expectedCurrentRole';
  target_role := manifest->>'targetRole';
  IF expected_role NOT IN ('SALES_REP', 'SALES_ADMIN')
    OR target_role NOT IN ('INTERN', 'STUDENT', 'TEACHER', 'ADMIN') THEN
    RAISE EXCEPTION 'Sales rollback probe manifest roles are invalid';
  END IF;

  SELECT source_user.role::text
    INTO observed_role
    FROM users source_user
   WHERE source_user.id = account_id::text;
  IF observed_role = target_role THEN
    SELECT count(*)::integer
      INTO completed_audit_count
      FROM audit_events
     WHERE id = 'sales-source-role-repair:' || account_id::text
       AND actor_user_id IS NULL
       AND actor_role = 'SYSTEM'
       AND action = 'sales:legacy_source_role_repaired'
       AND target_type = 'user'
       AND target_id = account_id::text
       AND metadata->>'applicationKey' = 'sales'
       AND metadata->>'expectedCurrentRole' = expected_role
       AND metadata->>'targetRole' = target_role
       AND metadata->>'source' = 'cloud-build-repair-manifest';
    IF completed_audit_count <> 1 THEN
      RAISE EXCEPTION
        'Sales rollback probe completed repair evidence mismatch';
    END IF;
  ELSIF observed_role IS DISTINCT FROM expected_role THEN
    RAISE EXCEPTION 'Sales rollback probe source role mismatch';
  END IF;

  SELECT count(*)::integer
    INTO mapping_count
    FROM company_product_principals mapping
   WHERE mapping.application_key = 'sales'
     AND mapping.company_account_id = account_id
     AND mapping.local_user_id = 'sales:' || account_id::text
     AND mapping.role_key = expected_role;
  IF mapping_count <> 1 THEN
    RAISE EXCEPTION 'Sales rollback probe mapping mismatch';
  END IF;
  IF EXISTS (SELECT 1 FROM sessions WHERE id = probe_session_id) THEN
    RAISE EXCEPTION 'Sales rollback probe session collision';
  END IF;

  INSERT INTO sessions (id, token_hash, user_id, expires_at, user_agent)
  VALUES (
    probe_session_id,
    token_hash,
    account_id::text,
    now() + interval '5 minutes',
    'cloud-build-sales-legacy-rollback-probe'
  );
END
$$;
COMMIT;
