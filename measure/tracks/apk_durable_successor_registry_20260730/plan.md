# Implementation Plan: APK Durable Successor Registry and Release Admission

## Phase 1: Backend contract and red tests

- [x] Define the backend-owned commitment, candidate, receipt, port, error, and
  authorization contracts; retain the play-kit ledger as a portable consumer.
  Strict runtime-contract validation is green; the durable adapter remains out
  of this completed contract slice.
- [~] Add red tests for independent-process fork rejection, exact retry,
  rehydration, malformed candidates, and transaction failure. The provider
  boundary and multi-process cases are explicitly deferred as Phase 2 test
  specifications until a real database adapter exists.

## Phase 2: Durable schema and transactional adapter

- [b] Add the global Drizzle schema, reviewed migration, tenant-registry
  classification, and append-only/uniqueness protections.
  (deferred:phase-1-tests)
- [b] Implement the PostgreSQL transaction-bound compare-and-reserve adapter
  using insert-on-conflict and conflict-row locking rather than process memory.
  (deferred:phase-2-schema)

## Phase 3: Command, receipt, and release boundary

- [b] Implement the transport-independent backend command with Zod validation,
  authorization, audit/observability metadata, idempotency, and atomic receipt
  persistence.
  (deferred:phase-2-adapter)
- [b] Define and test the immutable Git-candidate admission boundary so a
  database transaction never claims to publish a Git release.
  (deferred:phase-3-command)

## Phase 4: Ledger integration and safeguards

- [b] Wire the durable adapter through the existing ledger registry interface
  without placing business logic in apps, route handlers, or QC components.
  (deferred:phase-3-boundary)
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
