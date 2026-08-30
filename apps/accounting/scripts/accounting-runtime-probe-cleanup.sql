\set ON_ERROR_STOP on

-- Privileged cleanup for the runtime probe. Run as the accounting_migration role
-- (or another role with DELETE on the audit table) after the runtime probe. The
-- runtime role cannot DELETE, so cleanup runs through the direct connection.
DELETE FROM accounting_submission_audit_events WHERE reason = 'runtime-probe';
