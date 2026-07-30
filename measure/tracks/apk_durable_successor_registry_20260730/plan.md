# Implementation Plan: APK Durable Successor Registry and Release Admission

## Phase 1: Backend contract and red tests

- [x] Define the backend-owned commitment, candidate, receipt, port, error, and
  authorization contracts; retain the play-kit ledger as a portable consumer.
  Strict runtime-contract validation is green; the durable adapter remains out
  of this completed contract slice.
- [x] Add adapter-backed proof for independent-process fork rejection, exact
  retry, rehydration, malformed candidates, secondary uniqueness, and transaction
  failure. Contract/unit coverage is green; the isolated PostgreSQL suite passed
  concurrent fork/restart, secondary-collision, and forced-rollback cases.

## Phase 2: Durable schema and transactional adapter

- [x] Add the global Drizzle schema, generator-backed migration metadata,
  tenant-registry classification, and append-only/uniqueness protections.
  The migration's 0044 journal entry and snapshot were generated from the
  0043 chain; append-only trigger and JSON-projection protections are
  additionally reviewed.
- [x] Implement the PostgreSQL transaction-bound compare-and-reserve adapter
  using DB-owned insert-on-conflict and conflict-row locking rather than process
  memory. Backend validates evidence/digests through a provider-neutral store;
  independent review accepted the final Phase 2 bytes.

## Phase 3: Command, receipt, and release boundary

- [x] Implement the transport-independent backend command with Zod validation,
  authorization, audit/observability metadata, idempotency, and atomic receipt
  persistence. The 0046 receipt-integrity migration binds each receipt to its
  exact registry candidate and rejects contract-invalid or inconsistent JSON;
  full 0044-0046 composition, rollback, and replay proofs are green.
- [x] Define and test the immutable Git-candidate admission boundary so a
  database transaction never claims to publish a Git release. The verifier is
  read-only and hash-binds pre-existing candidate evidence; independent review
  confirmed no Git publication or mutation surface.

## Phase 4: Ledger integration and safeguards

- [b] Wire the durable adapter through the existing ledger registry interface
  without placing business logic in apps, route handlers, or QC components.
  (deferred:phase-4-ledger-integration)
- [b] Add rollback, duplicate, and cross-adapter integration coverage plus
  structured error and audit assertions.
  (deferred:phase-4-integration)

## Phase 5: Verification and bounded closeout

- [b] Run focused backend/database/play-kit tests, tenant coverage, lint,
  type-check, and relevant package builds; record exact commands and results.
  (deferred:phase-4-tests)
- [b] Obtain an independent implementation review and record a bounded
  infrastructure-only decision that explicitly withholds real asset and title
  authorization.
  (deferred:phase-5-verification)
