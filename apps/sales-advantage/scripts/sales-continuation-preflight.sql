\set ON_ERROR_STOP on
\if :{?repair_manifest}
\else
  \echo 'repair_manifest is required'
  \quit 3
\endif
\if :{?repair_manifest_sha256}
\else
  \echo 'repair_manifest_sha256 is required'
  \quit 3
\endif

BEGIN TRANSACTION READ ONLY;
SELECT set_config('reading_advantage.sales_continuation_manifest', :'repair_manifest', true);
SELECT set_config('reading_advantage.sales_continuation_manifest_sha256', :'repair_manifest_sha256', true);

DO $$
DECLARE
  manifest jsonb := current_setting('reading_advantage.sales_continuation_manifest')::jsonb;
  manifest_sha256 text := current_setting('reading_advantage.sales_continuation_manifest_sha256');
  account_id uuid;
  expected_current_role text;
  target_role text;
  mapping_count integer;
  observed_role text;
  receipt_count integer;
BEGIN
  IF manifest_sha256 <> '6329c846ac119a0af9fa43747879b042c211b4b79e5ad8a98822940fd29b5980' THEN
    RAISE EXCEPTION 'Sales continuation repair manifest digest mismatch';
  END IF;
  IF jsonb_typeof(manifest) <> 'object'
    OR manifest - ARRAY['accountId', 'expectedCurrentRole', 'targetRole']::text[] <> '{}'::jsonb
    OR NOT (manifest ? 'accountId' AND manifest ? 'expectedCurrentRole' AND manifest ? 'targetRole') THEN
    RAISE EXCEPTION 'Sales continuation repair manifest shape mismatch';
  END IF;
  account_id := (manifest->>'accountId')::uuid;
  expected_current_role := manifest->>'expectedCurrentRole';
  target_role := manifest->>'targetRole';

  SELECT count(*)::integer INTO mapping_count
    FROM company_product_principals
   WHERE application_key = 'sales'
     AND company_account_id = account_id
     AND local_user_id = 'sales:' || account_id::text;
  IF mapping_count <> 1 THEN
    RAISE EXCEPTION 'Sales continuation principal mapping mismatch';
  END IF;

  SELECT role::text INTO observed_role FROM users WHERE id = account_id::text;
  IF observed_role IS DISTINCT FROM expected_current_role THEN
    RAISE EXCEPTION 'Sales continuation expectedCurrentRole mismatch';
  END IF;

  SELECT count(*)::integer INTO receipt_count
    FROM audit_events
   WHERE id = 'sales-source-role-repair:' || account_id::text;
  IF receipt_count <> 0 THEN
    RAISE EXCEPTION 'Sales continuation completed repair receipt already exists';
  END IF;

  IF target_role NOT IN ('INTERN', 'STUDENT', 'TEACHER', 'ADMIN') THEN
    RAISE EXCEPTION 'Sales continuation targetRole mismatch';
  END IF;
END
$$;
ROLLBACK;
