# Reading License Control-Plane Migration

## Overview

Prove a safe Reading-first licensing workflow from CRM customer or trial through
central subscription management to product-local school and license enforcement.
Reading is the preferred pilot because existing licenses are expired and schools
are not currently relying on active access.

The migration preserves historical identifiers and reporting, never reactivates
expired access implicitly, and keeps Reading's local database authoritative for
runtime checks during the pilot.

## Stories

### Story S1: Establish Reading migration truth
**As a** platform operator
**I want** verified deployment and data inventories before licensing changes
**So that** the pilot operates on the actual production source and records

**Acceptance Criteria:**
- Given Reading's current standalone deployment source, When the pilot begins, Then the authoritative source/revision and monorepo cutover or synchronization decision is recorded and verified.
- Given production schools, licenses, users, license associations, demo records, and reporting references, When inventory runs, Then counts, statuses, expirations, relationships, and deterministic fingerprints are captured without mutation.
- Given the claim that all licenses are expired and schools are inactive, When preflight runs, Then it proves or disproves the claim and blocks unsafe assumptions.
- Given the stale/incompatible repository graph, When source migration planning starts, Then a successful current-schema graph rebuild and exact license caller inventory exist.

**Estimate:** M
**Priority:** Must

### Story S2: Import expired license history
**As a** company operator
**I want** historical Reading customers and licenses represented centrally
**So that** renewals start with context without changing current access

**Acceptance Criteria:**
- Given an expired Reading license, When imported, Then it maps deterministically to customer organization, school site, historical subscription, and local provisioning identifiers with `EXPIRED` status.
- Given ambiguous owners, duplicate school names, missing contacts, or inconsistent dates, When import runs, Then records require explicit disposition rather than automatic merging.
- Given import reruns, When source data is unchanged, Then results are idempotent and mappings are not duplicated.
- Given imported history, When compared before and after, Then Reading users, schools, licenses, reports, and access state are unchanged.

**Estimate:** M
**Priority:** Must

### Story S3: Provision Reading access
**As a** company operator
**I want** demos, school trials, and subscriptions provisioned through one Reading adapter
**So that** access is consistent and auditable

**Acceptance Criteria:**
- Given the recurring shared demo, When its daily generation runs, Then central operations receives status/local IDs/run evidence without treating it as a prospect or storing raw credentials.
- Given a school trial, When provisioned, Then the Reading adapter creates or updates the local school/license with exact dates and seat limit and records the central mapping.
- Given a new or renewed paid subscription, When provisioned, Then the same adapter applies approved access without reusing an unrelated expired license implicitly.
- Given retries, concurrent requests, or partial failure, When provisioning runs, Then it is idempotent, transactional where required, visible, and safely retryable.
- Given central operations downtime, When a Reading request runs, Then Reading continues enforcing the last accepted local license state.

**Estimate:** L
**Priority:** Must

### Story S4: Cut over license administration
**As a** company owner
**I want** Company Admin to be the sole writer for new and renewed Reading licenses
**So that** CRM, subscription, and product access records cannot drift

**Acceptance Criteria:**
- Given accepted pilot evidence, When cutover occurs, Then legacy Reading license create/edit paths are disabled or read-only while reporting remains available.
- Given cutover or rollback, When writer authority changes, Then a fail-closed writer fence/epoch permits exactly one of central or legacy mutation paths, never both.
- Given in-flight legacy writes or concurrent revisions, When the handoff begins, Then writes drain or reconcile and deterministic fingerprints match before central mutation is enabled.
- Given rollback, When legacy mutation is restored, Then central writes are fenced off first and post-handoff fingerprints are reconciled before traffic proceeds.
- Given an authorized Company Admin, When creating a trial or subscription, Then Company Admin shows provisioning outcome and links to the Reading school/license.
- Given an ordinary employee or public user, When attempting central or legacy license administration, Then access is denied before mutation.
- Given one synthetic and one owner-approved real workflow, When end-to-end verification runs, Then customer/trial/subscription, local access, expiration, seat limit, audit, and rollback evidence agree.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- No production mutation before backup, source identity, migration ledger,
  inventory fingerprint, and rollback evidence are accepted.
- Existing persisted data and report references require explicit compatibility;
  move-don't-copy and no-dual-writer rules apply at cutover.
- Product provisioning uses a provider-neutral adapter and capability contracts,
  not direct app database access from Company Admin UI.
- Real PostgreSQL tests cover migration, mapping, idempotency, transactions,
  concurrency, and rollback.
- Every central/local mapping and provisioning mutation is auditable and
  secret-safe.

## Track-Level Acceptance Criteria

- Production truth confirms the pilot is safe before mutation.
- Existing expired licenses are visible centrally but remain expired locally.
- Shared demo health, one school trial, and one paid-subscription fixture use the
  same reviewed Reading provisioning adapter.
- Company Admin becomes the sole administrative writer for new/renewed Reading
  licenses while Reading remains locally authoritative at runtime.
- Rollback restores the prior application revision and writer path without
  deleting central history or changing credentials.
- Transition evidence proves one active writer epoch throughout forward cutover,
  concurrent deployment, and reverse-order rollback.

## Out of Scope

- Primary or Science migration.
- Automatically reactivating expired licenses or merging ambiguous schools.
- Replacing Reading's runtime license checks with synchronous central checks.
- Student/teacher authentication migration, billing, payments, or commissions.
- General Reading route/domain remediation outside exact licensing callers.
