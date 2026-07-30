# Implementation Plan: APK Standard-Pack Suitability and Canonical Ingestion

## Phase 1: Dossier and decision contracts

- [x] Define strict Zod schemas for suitability requests, source evidence,
  semantic requirements, physical behavior constraints, candidates, reviewer
  findings, decisions, limitations, provenance, licensing, credit, and release
  bindings.
- [x] Define the closed decision enum: `reuse-canonical`, `ingest-canonical`, or
  `blocked`; reject silent fallback and provisional production use.
- [x] Define hash-bound dossier, ingestion receipt, and accepted-decision manifest
  formats that retain predecessor release and descriptor identities.

## Phase 2: Red tests and review fixtures

- [x] Write failing schema and decision tests for incomplete evidence, unsuitable
  frame/direction behavior, missing credit, stale release hashes, duplicate source
  files, unsafe paths, and unapproved dispositions.
- [x] Create visual/technical comparison fixtures covering a suitable replacement,
  a visually similar but behaviorally incompatible asset, a required ingestion,
  and a title-blocking absence.
- [x] Add ingestion fixtures that fail on missing checksum, provenance, license,
  taxonomy/key, descriptor, source receipt, or additive release evidence.

## Phase 3: Suitability workflow and QC

- [x] Implement deterministic dossier validation and a searchable QC/review view
  that separates semantic intent, physical descriptor, candidate comparison,
  decision, and attribution.
- [x] Implement canonical-pack search and descriptor-aware comparison helpers;
  retain the canonical resolver as the only source of physical entries.
- [x] Implement guards preventing a cohort from consuming a missing, blocked,
  stale, or unaccepted decision.

## Phase 4: Canonical ingestion and additive release

- [~] Implement the approved legacy-ingestion pipeline with checksum, provenance,
  license, credit, taxonomy/key, descriptor, catalog validation, and duplicate
  physical/source-receipt protection. Persisted predecessor indexes and additive
  receipts now revalidate against the exact catalog, ledger, and digest after a
  process restart while retaining literal non-production authorization. Admission now
  binds source-packet documents to selected dossier evidence and descriptor content
  digests to resolver candidates. A durable compare-and-reserve registry, rather
  than process-local state, records the sole successor for each predecessor index
  across restarts. No actual legacy asset, dossier, or release has been ingested.
- [ ] Generate an additive pinned standard-pack release and resolver receipt for
  accepted ingestions without altering historical release records.
- [ ] Publish accepted semantic bindings and selected-union inputs only from
  approved dossiers and the accepted additive release.

## Phase 5: Verification and acceptance

- [ ] Run focused unit, integration, catalog, resolver, materializer, lint,
  type-check, build, coverage, QC/browser, and package-boundary checks; record
  commands and results.
- [ ] Run independent review covering source provenance, licensing, semantic and
  behavior suitability, release integrity, security, test quality, and archive
  disclosures.
- [~] Obtain product-owner acceptance and publish hash-bound decision/release
  records. Do not authorize title migration, cutover, retirement, or deployment.
