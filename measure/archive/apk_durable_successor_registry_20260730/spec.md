# Specification: APK Durable Successor Registry and Release Admission

## Overview

Implement an authoritative, database-backed successor commitment registry for
the APK standard-pack ingestion ledger. The registry prevents independently
constructed processes from assigning different successors to the same valid
predecessor index. It is an evidence-infrastructure capability, not an asset
admission decision or product release authorization.

## Functional Requirements

- FR-1: Define a transport-independent backend module with Zod input/output
  contracts and a StandardPackSuccessorRegistryPort that represents a canonical
  predecessor-index commitment and its release-candidate identity.
- FR-2: Add a Drizzle-owned, global PostgreSQL persistence model and reviewed
  migration for immutable successor commitments. The model must uniquely
  constrain predecessor-index digests and successor-batch digests and must be
  classified as EXEMPT in the tenant registry because a canonical standard pack
  is global rather than school-scoped.
- FR-3: Implement transactional compare-and-reserve semantics: the first valid
  commitment is atomically recorded; a byte-identical retry returns the
  recorded commitment; a different successor for the same predecessor is
  rejected deterministically, including across independently constructed
  adapters and process restarts.
- FR-4: Implement a backend command/service that validates a ledger admission,
  reserves the successor, and persists the correlated immutable admission
  receipt in one database transaction. The command must expose structured
  conflict and invalid-evidence errors, authorization policy, audit metadata,
  idempotency identity, and structured observability fields.
- FR-5: Admit only a pre-existing immutable Git candidate revision whose
  candidate, descriptor, source-packet, predecessor, successor, and
  commitment digests are supplied and verified. The backend must not claim to
  atomically write a Git release from a database transaction.
- FR-6: Adapt the backend persistence implementation to the existing play-kit
  StandardPackIngestionLedgerSuccessorRegistry boundary without moving
  ingestion business rules into an app, route handler, or QC component.
- FR-7: Preserve append-only commitments and receipts. A conflict, retry, or
  failed validation must not silently overwrite a prior admission or create an
  orphan successor reservation.

## Non-Functional Requirements

- All exported functions, types, schemas, and adapters include JSDoc; all
  external inputs are runtime-validated with Zod.
- The authoritative operation uses a database transaction and database
  uniqueness/locking rather than an in-memory read-then-write map.
- New database access is owned by packages/db; domain command logic is owned
  by packages/backend; apps remain thin consumers.
- Tests cover concurrency, restart rehydration, exact retry, divergent retry,
  transaction rollback, authorization, and malformed evidence.
- The implementation is provider-neutral above the PostgreSQL/Drizzle adapter
  and emits no real asset, source packet, dossier, selected union, or
  production-release acceptance.

## Acceptance Criteria

- Two independently constructed registry adapters sharing one database cannot
  reserve different successors for the same predecessor index.
- An exact retry is idempotent; a divergent retry provides a structured
  conflict and retains the original commitment.
- A fresh adapter process reads the original commitment and rejects a fork.
- The migration creates the required uniqueness and append-only protection, and
  the tenant-registry coverage test classifies the table intentionally.
- The backend command rolls back all durable admission state if ledger
  validation or receipt persistence fails.
- A candidate references an immutable revision and hash-bound evidence but no
  code path writes, accepts, publishes, or exposes a canonical Git release.
- Focused unit/integration tests, lint, type-check, and relevant builds pass,
  with independent review evidence recorded before the track is marked
  complete.

## Out of Scope

- Creating a real suitability dossier, reviewing source provenance, licensing,
  credit, or behavior suitability.
- Importing or modifying standard-pack assets, materializing a selected union,
  or generating a production resolver receipt.
- Product-owner acceptance of a real asset or authorization for ingestion,
  title adoption, migration, cutover, retirement, deployment, or catalog
  exposure.
- Reading/Primary host proof and Advantage Games QC presentation changes.
