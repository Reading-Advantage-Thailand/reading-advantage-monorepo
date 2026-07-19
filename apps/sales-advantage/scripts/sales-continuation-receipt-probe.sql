\set ON_ERROR_STOP on
\if :{?repair_manifest}
\else
  \echo 'repair_manifest is required'
  \quit 3
\endif

BEGIN TRANSACTION READ ONLY;
SELECT set_config('reading_advantage.sales_continuation_receipt_manifest', :'repair_manifest', true);
DO $$
DECLARE
  manifest jsonb := current_setting('reading_advantage.sales_continuation_receipt_manifest')::jsonb;
  account_id uuid := (manifest->>'accountId')::uuid;
  receipt_count integer;
  observed_role text;
BEGIN
  SELECT role::text INTO observed_role FROM users WHERE id = account_id::text;
  IF observed_role IS DISTINCT FROM manifest->>'targetRole' THEN
    RAISE EXCEPTION 'Sales continuation targetRole was not applied';
  END IF;

  SELECT count(*)::integer INTO receipt_count
    FROM audit_events
   WHERE id = 'sales-source-role-repair:' || account_id::text
     AND actor_user_id IS NULL
     AND actor_role = 'SYSTEM'
     AND action = 'sales:legacy_source_role_repaired'
     AND target_type = 'user'
     AND target_id = account_id::text
     AND metadata = jsonb_build_object(
       'applicationKey', 'sales',
       'expectedCurrentRole', manifest->>'expectedCurrentRole',
       'targetRole', manifest->>'targetRole',
       'source', 'cloud-build-repair-manifest',
       'manifestSha256', '6329c846ac119a0af9fa43747879b042c211b4b79e5ad8a98822940fd29b5980',
       'releaseBuildId', 'f5063222-76bd-4b73-a151-3f7994827e09',
       'releaseCommitSha', '597241dedf712ea6a2350346fefa0459f3e1d23c'
     );
  IF receipt_count <> 1 THEN
    RAISE EXCEPTION 'Sales continuation exact original-release receipt count(*) <> 1';
  END IF;
END
$$;
ROLLBACK;
