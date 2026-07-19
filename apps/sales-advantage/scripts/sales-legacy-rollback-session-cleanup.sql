\set ON_ERROR_STOP on
\if :{?probe_session_id}
\else
  \echo 'probe_session_id is required'
  \quit 3
\endif

BEGIN;
SELECT set_config(
  'reading_advantage.sales_rollback_probe_session_id',
  :'probe_session_id',
  true
);

DELETE FROM sessions
 WHERE id = current_setting(
   'reading_advantage.sales_rollback_probe_session_id'
 )
   AND user_agent = 'cloud-build-sales-legacy-rollback-probe';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM sessions
     WHERE id = current_setting(
       'reading_advantage.sales_rollback_probe_session_id'
     )
       AND user_agent = 'cloud-build-sales-legacy-rollback-probe'
  ) THEN
    RAISE EXCEPTION 'Sales rollback probe cleanup failed';
  END IF;
END
$$;
COMMIT;
