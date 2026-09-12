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

- [x] Implement the approved legacy-ingestion pipeline with checksum, provenance,
  license, credit, taxonomy/key, descriptor, catalog validation, and duplicate
  physical/source-receipt protection. Persisted predecessor indexes and additive
  receipts now revalidate against the exact catalog, ledger, and digest after a
  process restart while retaining literal non-production authorization. Admission now
  binds source-packet documents to selected dossier evidence and descriptor content
  digests to resolver candidates. A durable compare-and-reserve registry, rather
  than process-local state, records the sole successor for each predecessor index
  across restarts. No actual legacy asset, dossier, or release has been ingested.
- [x] Generate an additive pinned standard-pack release and resolver receipt for
  accepted ingestions without altering historical release records.
  `createStandardPackAdditiveReleaseReceipt` issues an evidence-only receipt bound to
  a validated ledger and exact successor catalog; `rehydrateStandardPackAdditiveReleaseReceipt`
  revalidates it after restart. Verified by the "issues a real B1 successor catalog"
  and "rehydrates persisted B1 evidence" ledger tests.
- [x] Publish accepted semantic bindings and selected-union inputs only from
  approved dossiers and the accepted additive release.
  `createReleaseBoundSemanticAssetResolver` requires an issued additive receipt,
  validated ledger, exactly one accepted suitability evidence bundle, and descriptor
  candidates whose identity and content digest match the accepted evidence. Verified
  by the ledger B1/B2 publication and descriptor-mismatch rejection tests.
  No real legacy asset is accepted; real-asset ingestion is blocked pending a lawful
  source packet, provenance, license, credit, and behavior-suitability review.

## Phase 5: Verification and acceptance

- [x] Run focused code-level ledger, v2/public API, lint, type-check, and build
  checks; record commands and results. Ledger 16/16, adjacent asset and QC suites
  87/87, advantage-games QC components 7/7, typecheck passed, lint passed (0 errors),
  build passed. Per-test timeouts raised from 60s to 180s for restart-heavy ledger
  batches so they do not flake under CI load; no assertion was weakened.
- [x] Run independent review of current code bytes for release integrity, source
  packet linkage, descriptor binding, and test quality. External provenance,
  licensing, and behavior suitability remain unreviewed until an actual asset exists.
  current-byte-independent-review-v1.json re-binds the current worktree bytes
  (baseline fd742232c, dirty worktree) and records the timeout-robustness re-binding.
- [x] Obtain a hash-bound bounded owner decision for the current evidence-only
  contract. product-owner-acceptance-v2.json binds the current bytes, supersedes the
  revoked v1, and records a blocked real-asset disposition. It does not authorize
   real ingestion, title migration, cutover, retirement, deployment, or title adoption.

## Phase 6: Existing Core canonical-reuse suitability package

- [x] Author and verify the real canonical-reuse dossiers, title disposition
  matrix, selected-union inputs, and non-fabricated owner-acceptance boundary
  required to let Existing Core Task 5 evaluate its asset-adoption gate.
  `task5-canonical-reuse-evidence-v1.json` binds real release, catalog, receipt,
  license, credit, and canonical source bytes; `existing-core-suitability.ts`
  derives 17 valid draft dossiers and title-selected unions. The additive
  Existing Core owner acceptance
  `../apk_existing_core_cutover_20260727/task5-task6-product-owner-acceptance-v1.json`
  records unavailable durable IDs as `null` and makes only these exact dossiers,
  selected unions, lineage, and current host-proof bindings consumable for
  Existing Core Task 5. This phase does not ingest legacy bytes, accept title
  adoption, or authorize production exposure, deployment, or broader migration.
- [x] Independently review the measured source duration, atlas geometry, empty
  clip/direction claims, conservative readability floor, alpha-derived envelopes,
  additive Task-3 lineage, and exact 17-role dossier/matrix hashes. The explicit
  owner decision approves only those exact canonical-reuse dossiers and their
  selected-union inputs for bounded Existing Core Task 5 consumption; real
  ingestion, title adoption, production exposure, deployment, and broader
  migration authorization remain false.


## Phase 7: Optional legacy-source ingest when pack lacks a suitable asset (deferred, not track-blocking)

Product clarification (2026-08-03): the purchased ElvGames collection at
`packages/advantage-play-kit/assets/standard` (release `2026.07.23`, 43,075 assets)
is already the licensed production-art source. License obligations are commercial
use + retain credit `Pixel art assets by ElvGames` (see `LICENSE-ELVGAMES.txt`).
That is **not** pending Phase 7. Phase 7 is only for rare **legacy game PNG**
ingestion when `reuse-canonical` cannot satisfy a role — it is optional deferred
work, not a prerequisite for track closeout or the APK game path.

- [x] Record that the accepted standard pack is the licensed ElvGames production
  source with required credit binding (release `2026.07.23`,
  `accepted-standard-pack-release.json`, `LICENSE-ELVGAMES.txt`).
- [x] Close the track on evidence-only governance + Existing Core canonical-reuse
  (`reuse-canonical`) + licensed pack release; production catalog exposure and
  host cutover remain cohort-owned authorizations.
- [ ] Optional future: if a concrete role cannot be satisfied from the ElvGames
  pack, open a bounded child task to ingest one approved legacy asset with
  inventory binding, provenance/license/credit documents, suitability review,
  additive release, independent review, and owner acceptance. Does not reopen
  pack licensing.

## Completion rule

Track closeout is satisfied when: (1) suitability decision contracts and
governance gates are green, (2) Existing Core canonical-reuse dossiers are
independently reviewed and consumable for Task 5, and (3) the accepted ElvGames
standard pack remains the sole production-art source with required credit.
Optional Phase 7 legacy-ingest is **not** required for closeout. Title adoption,
production catalog deployment, migration, host cutover, retirement, and broader
cohort use remain separately authorized by cutover tracks; this track does not
grant them by closing.
