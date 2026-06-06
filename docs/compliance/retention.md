# Audit Log Retention Policy

This document describes the audit log retention policy for the Reading Advantage
platform, including the compliance rationale and technical configuration.

## Retention Window

Audit events are retained for **2557 days** (approximately **7 years**) by
default. This window satisfies the FERPA record-keeping requirement that
educational institutions maintain access logs for at least 5 years, with an
additional safety margin.

The retention period is configurable via the `AUDIT_RETENTION_DAYS` environment
variable. See the [auth package README](../../packages/auth/README.md) for
configuration details.

## Minimum Floor

The retention period has a hard minimum of **365 days** (1 year). The schema
validation in `@reading-advantage/auth` rejects any value below this floor at
parse time. This guard exists to prevent accidental data loss — an operator
who sets `AUDIT_RETENTION_DAYS=30` will see a schema error rather than
silently losing 11 months of audit history.

## FERPA Compliance

The Family Educational Rights and Privacy Act (FERPA) requires educational
agencies to maintain records that document access to student education records.
The 7-year default retention window ensures that:

- Audit trails covering access to student data are available for the full
  FERPA record-retention period.
- Institutions subject to state-level retention mandates that exceed the
  federal 5-year minimum are covered without additional configuration.
- The automated purge job (`audit:retention_purge`) removes expired rows
  using a privileged database connection, keeping the table size bounded
  while preserving compliance.

## Purge Mechanism

Expired audit events are deleted by a periodic job that runs daily during
low-traffic hours. The purge uses batched DELETE statements against a
privileged database connection (the app role cannot delete from `audit_events`
directly). Each purge run records an `audit:retention_purge` event with the
deleted count for operational visibility.
