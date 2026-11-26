# Implementation Plan: Reading License Control-Plane Migration

## Dependencies and Preconditions

- Depends on accepted customer/subscription/provisioning contracts from
  `customer_licensing_crm_20260722` Phases S1-S3.
- Do not mutate production until Reading deployment authority, current graph,
  backups, database identity/ledger, inventory fingerprint, and rollback are
  independently accepted.

## Phase S1: Establish Reading migration truth
_Story ref: spec.md#story-s1_

- [b] Task: Rebuild/query the repository graph and inventory every Reading/shared license schema, route, controller, report, session, demo, and test caller. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Define production source/deploy authority, database identity, ledger, backup, inventory, fingerprint, inactivity, and all-expired proof contracts. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Write read-only preflight tests/scripts that fail closed on unexpected source, active licenses/schools, relationship drift, or incomplete denominator. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Run preflight against approved production access, publish reconciled evidence, and decide monorepo deployment cutover before implementation. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S1: Establish Reading migration truth' (Protocol in workflow.md) (deferred:customer_licensing_crm_20260722-s3-acceptance)

## Phase S2: Import expired license history
_Story ref: spec.md#story-s2_

- [b] Task: Define deterministic Reading school/license-to-customer/site/subscription mapping and explicit ambiguity dispositions. (deferred:reading_license_control_plane_migration_20260722-s1-acceptance)
- [b] Task: Write Red unit and isolated PostgreSQL tests for expired imports, duplicate names, missing contacts, date conflicts, reruns, fingerprints, and no-access mutation. (deferred:reading_license_control_plane_migration_20260722-s1-acceptance)
- [b] Task: Implement dry-run, approval manifest, idempotent import, resume, and rollback through reviewed adapters. (deferred:reading_license_control_plane_migration_20260722-s1-acceptance)
- [b] Task: Reconcile pre/post counts and fingerprints, run affected DB/backend/Reading tests, update graph/docs, and accept only zero implicit reactivations. (deferred:reading_license_control_plane_migration_20260722-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S2: Import expired license history' (Protocol in workflow.md) (deferred:reading_license_control_plane_migration_20260722-s1-acceptance)

## Phase S3: Provision Reading access
_Story ref: spec.md#story-s3_

- [b] Task: Freeze Reading adapter contracts for shared demo reporting, school trial creation/extension/expiry, paid subscription create/renew/expire, and local mappings. (deferred:reading_license_control_plane_migration_20260722-s2-acceptance)
- [b] Task: Write Red PostgreSQL concurrency/failure tests for idempotency, duplicate schools/licenses, partial rollback, expired-license reuse rejection, and local-runtime continuity. (deferred:reading_license_control_plane_migration_20260722-s2-acceptance)
- [b] Task: Implement the adapter and central provisioning orchestration without moving Reading runtime checks. (deferred:reading_license_control_plane_migration_20260722-s2-acceptance)
- [b] Task: Prove daily demo reporting, one synthetic school trial, and paid-subscription fixtures with exact local IDs and secret-safe evidence. (deferred:reading_license_control_plane_migration_20260722-s2-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S3: Provision Reading access' (Protocol in workflow.md) (deferred:reading_license_control_plane_migration_20260722-s2-acceptance)

## Phase S4: Cut over license administration
_Story ref: spec.md#story-s4_

- [b] Task: Define a fail-closed writer fence/epoch plus ordered drain, reconciliation, authorization, read-only legacy UI, reporting preservation, production rollout, observation, and reverse-order rollback contracts. (deferred:reading_license_control_plane_migration_20260722-s3-and-small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Write Red route/UI/deployment/concurrency tests proving central writes remain blocked until legacy writes are fenced and drained, only one writer epoch can be active, fingerprints reconcile, rollback fences central before restoring legacy, Company Admin succeeds, and ordinary users are denied. (deferred:reading_license_control_plane_migration_20260722-s3-and-small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Make Company Admin the sole writer for new/renewed licenses while preserving legacy reports and local enforcement. (deferred:reading_license_control_plane_migration_20260722-s3-and-small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Deploy exact monorepo source, run synthetic and owner-approved end-to-end workflows, observe, complete independent acceptance, and archive. (deferred:reading_license_control_plane_migration_20260722-s3-and-small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S4: Cut over license administration' (Protocol in workflow.md) (deferred:reading_license_control_plane_migration_20260722-s3-and-small_company_admin_privileges_20260722-s1-acceptance)
