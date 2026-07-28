# Implementation Plan: APK Standard-Pack Suitability and Canonical Ingestion

## Phase 1: Dossier and decision contracts

- [ ] Define strict Zod schemas for suitability requests, source evidence,
  semantic requirements, physical behavior constraints, candidates, reviewer
  findings, decisions, limitations, provenance, licensing, credit, and release
  bindings.
- [ ] Define the closed decision enum: `reuse-canonical`, `ingest-canonical`, or
  `blocked`; reject silent fallback and provisional production use.
- [ ] Define hash-bound dossier, ingestion receipt, and accepted-decision manifest
  formats that retain predecessor release and descriptor identities.

## Phase 2: Red tests and review fixtures

- [ ] Write failing schema and decision tests for incomplete evidence, unsuitable
  frame/direction behavior, missing credit, stale release hashes, duplicate source
  files, unsafe paths, and unapproved dispositions.
- [ ] Create visual/technical comparison fixtures covering a suitable replacement,
  a visually similar but behaviorally incompatible asset, a required ingestion,
  and a title-blocking absence.
- [ ] Add ingestion fixtures that fail on missing checksum, provenance, license,
  taxonomy/key, descriptor, source receipt, or additive release evidence.

## Phase 3: Suitability workflow and QC

- [ ] Implement deterministic dossier validation and a searchable QC/review view
  that separates semantic intent, physical descriptor, candidate comparison,
  decision, and attribution.
- [ ] Implement canonical-pack search and descriptor-aware comparison helpers;
  retain the canonical resolver as the only source of physical entries.
- [ ] Implement guards preventing a cohort from consuming a missing, blocked,
  stale, or unaccepted decision.

## Phase 4: Canonical ingestion and additive release

- [ ] Implement the approved legacy-ingestion pipeline with checksum, provenance,
  license, credit, taxonomy/key, descriptor, catalog validation, and duplicate
  physical/source-receipt protection.
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
- [ ] Obtain product-owner acceptance and publish hash-bound decision/release
  records. Do not authorize title migration, cutover, retirement, or deployment.
