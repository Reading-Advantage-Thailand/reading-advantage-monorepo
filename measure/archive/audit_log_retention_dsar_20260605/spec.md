# Specification: Audit Log Retention + DSAR Bulk Export

## Overview

Two compliance capabilities that sit directly on top of the append-only `audit_events`
table delivered by `audit_log_infrastructure_20260603`:

1. **Retention** — a 7-year (FERPA) retention window with a periodic, idempotent cleanup
   job that deletes `audit_events` rows older than the window. Append-only `REVOKE
   UPDATE, DELETE` means the cleanup job must run as a privileged role; the deletion path
   is the *only* sanctioned mutation and is itself audited.
2. **DSAR bulk export** — a GDPR/FERPA Data Subject Access Request endpoint that, given a
   subject (user id or email), gathers all audit events and profile/activity records for
   that subject into a single downloadable archive (JSON + a human-readable manifest),
   ADMIN-only and tenant-scoped.

## Problem

District procurement and GDPR/FERPA compliance require both (a) a defensible data
lifecycle (data is not kept forever) and (b) the ability to answer "what do you hold
about this person, and prove it." The audit-log track established the *write* side; this
track establishes the *lifecycle* and *read-out* sides. Without retention, `audit_events`
grows unbounded and violates data-minimization principles. Without DSAR export, the
organization cannot satisfy a subject access request within the statutory window.

## Why

- **FERPA**: education records have a defined retention obligation; 7 years is the policy
  chosen for this monorepo (configurable via env).
- **GDPR Art. 15 (right of access) + Art. 17 (right to erasure)**: a subject can request
  a copy of their data and, separately, deletion. This track delivers Art. 15 (access)
  and the retention half of Art. 17 (time-bounded deletion); subject-initiated erasure is
  out of scope (see below).
- Builds entirely on already-committed infrastructure (`audit_events`,
  `recordAuditEvent`, the ADMIN-only `/api/admin/audit-events` pattern).

## Functional Requirements

### FR-1: Retention Policy Configuration
- Add `AUDIT_RETENTION_DAYS` to the validated env surface (default `2557` ≈ 7 years).
- Add a `.refine` rule: must be a positive integer ≥ 365 (refuse footgun short windows).
- Document the policy in `packages/auth/README.md` and a new
  `docs/compliance/retention.md`.

### FR-2: Privileged Cleanup Path
- Because `audit_events` has `REVOKE UPDATE, DELETE` for the app role, deletion must run
  under a dedicated migration/maintenance role (the same role that owns DDL).
- Add `packages/auth/src/audit-retention.ts` exporting
  `purgeExpiredAuditEvents(now = new Date()): Promise<{ deleted: number }>` that issues a
  batched `DELETE ... WHERE created_at < now() - interval` with `LIMIT 5000` per batch,
  looping until no rows remain, using a direct (non-pooled, privileged) connection.
- The purge run itself records an `audit:retention_purge` event (count, window, actor =
  `system`) **after** the batch completes, via `recordAuditEvent`.

### FR-3: Periodic Cleanup Job
- Add a scheduler entry (mirror `lib/platform/session-cleanup.ts`) that runs
  `purgeExpiredAuditEvents` daily at a low-traffic hour.
- Idempotent; safe to run concurrently (advisory lock via `pg_try_advisory_lock` so two
  replicas don't double-run).

### FR-4: DSAR Export Domain Function
- Add `packages/domain/src/audit/dsar.ts` (or extend `packages/domain/src/audit/`)
  exporting `exportSubjectData(tenant, subjectRef): Promise<DsarBundle>` where
  `subjectRef = { userId } | { email }`.
- `DsarBundle` collects: the user profile, all `audit_events` where the subject is actor
  or target, and the subject's activity/progress rows (scoped to the science-advantage
  domain modules already migrated). Tenant-scoped via `createTenantDB`.
- Guarded by `assertCan(actor, 'audit:read:all')` (the permission added in commit
  `5eb0171`) plus an explicit `dsar:export` permission key (add to `packages/auth`).

### FR-5: DSAR Export Endpoint
- Add `GET /api/admin/dsar/export?userId=...` (or `?email=...`), ADMIN-only, Zod-validated
  query (exactly one of `userId`/`email`).
- Returns `application/zip` (or `application/json` with `?format=json`) containing
  `manifest.md` (human-readable summary: who, when, what categories, counts) +
  `audit-events.json` + `profile.json` + `activity.json`.
- The export action is itself audited as `dsar:export` (actor = requesting admin,
  target = subject).

### FR-6: Rate + Size Guards
- DSAR export is bounded: stream/paginate `audit_events` (do not load all rows into
  memory); cap a single export at a configurable row ceiling and return `413` with a
  guidance message if exceeded (operator can raise the ceiling).

## Non-Functional Requirements
- The cleanup job must never delete rows inside the retention window (off-by-one and
  timezone correctness covered by tests at the boundary).
- Export must be tenant-isolated: an admin in school A cannot export a subject in school B.
- `pnpm turbo run {test,build,check-types} --filter=@reading-advantage/auth
  --filter=@reading-advantage/domain --filter=science-advantage` exits 0.

## Acceptance Criteria
1. `AUDIT_RETENTION_DAYS` is validated env (default 2557; `.refine` ≥ 365).
2. `purgeExpiredAuditEvents` deletes only rows older than the window, in batches, under a
   privileged connection, and records an `audit:retention_purge` event.
3. Daily scheduled job runs the purge under an advisory lock.
4. `exportSubjectData(tenant, subjectRef)` returns a tenant-scoped bundle gated by
   `assertCan(... 'dsar:export')`.
5. `GET /api/admin/dsar/export` returns a zip/JSON archive; ADMIN-only; Zod-validated.
6. The export action is audited as `dsar:export`.
7. Tests: boundary retention (row at window-1 day kept, window+1 day purged); advisory
   lock prevents concurrent double-run; cross-tenant export denied; export-too-large
   returns 413; export bundle round-trips (manifest counts == file counts).
8. Quality gates green (test/build/check-types) for the four filtered packages/app.

## Out of Scope
- **Subject-initiated erasure** (GDPR Art. 17 "right to be forgotten" on demand) — audit
  events are append-only and legally retained; erasure of *profile* data is a separate
  track with its own legal-hold rules.
- **Real-time audit-event streaming** to a SIEM — soft-depends on
  `observability_stack_20260603`; this track is batch-only.
- Retention for tables other than `audit_events` (sessions, login_attempts have their own
  cleanup) — separate, already-tracked.
- A UI for DSAR export — endpoint only; admin console wiring is a follow-up.

## Constraints & Risks
- **Risk: running DELETE against an append-only table.** Mitigation: the privileged
  connection is the *only* path; it is exercised exclusively by the purge function, which
  is itself audited. Document the role separation.
- **Risk: DSAR export is a PII egress point.** Mitigation: ADMIN-only, tenant-scoped,
  audited, size-capped, and uses the same `safeMetadata` redaction posture for any nested
  metadata that should not leave the system.
- **Risk: timezone/off-by-one in retention boundary.** Mitigation: store + compare in UTC
  (`withTimezone: true`); explicit boundary tests.

## References
- `measure/archive/audit_log_infrastructure_20260603/` (the table + helpers this builds on)
- `packages/db/src/schema/audit.ts`, `packages/auth/src/audit.ts` (committed `87b2432`)
- `packages/auth` permission `audit:read:all` (commit `5eb0171`)
- `lib/platform/session-cleanup.ts` (periodic-job template)
- `measure/tracks/rate_limiter_v2_20260603/` (Postgres-backed cleanup + advisory-lock pattern)
- AGENTS.md §9 (Observability) + §5 (Database / tenancy)
