\set ON_ERROR_STOP on

-- Privileged cleanup for the runtime probe. Run as the accounting_migration role
-- (or another role with DELETE on the audit table) after the runtime probe. The
-- runtime role cannot DELETE, so cleanup runs through the direct connection.
\if :{?probe_owner_id}
\else
  \echo 'probe_owner_id is required' >&2
  \quit 2
\endif

DELETE FROM accounting_submission_audit_events
 WHERE actor_account_id = :'probe_owner_id'::uuid
   AND reason = 'runtime-probe';
DELETE FROM accounting_submissions
 WHERE scope_company_id = :'probe_owner_id'::uuid
   AND submitted_by_account_id = :'probe_owner_id'::uuid
   AND idempotency_key = 'runtime-probe-' || :'probe_owner_id';
