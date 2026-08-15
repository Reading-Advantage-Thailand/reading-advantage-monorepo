# Implementation Plan: Legacy Traversal Cutover

## Phase 1: Source/readiness manifests

- [x] Publish exact legacy source manifests for five titles. Source SHA: `1e848bda09b6cfb16c8076447101553a247c4417`.
  Evidence-only Task 1 Red remains active. The contract preserves the complete accepted source-path denominator for every title.
  Every entry declares `presence` as `tracked-at-head` or `missing-at-head`.
  Tracked entries require Git tracking, file existence, the current-byte SHA-256, role, classification, locator, and evidence-only disposition.
  Missing entries require the accepted evidence locator and exact path, omit `sha256`, and prove absence and non-tracking at HEAD.
  The focused Red run exits 1 with 13 tests: 8 passed and 5 failed only on missing exact per-title legacy source manifests.
  Falsifiers cover presence lies, fabricated hashes for missing bytes, omitted missing paths, and implementation or cutover claims from absence.
  Task 2 remains blocked by the Asset Contract v2 product-owner receipt and suitability evidence. See `task1-source-manifest-red-evidence-20260815.md`.
  Red command: `./node_modules/.bin/vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — exit 1; 13 tests, 8 passed, 5 missing-manifest failures.
  Strict-set coverage rejects empty, duplicate, extra, omitted, wrong-hash, generated, and unbound paths, plus presence, role, classification, locator, and disposition drift.
  Static checks passed: direct TypeScript, ESLint, Prettier, and the exact staged-path diff check.

## Phase 2: Binding freeze and Red cartridge contracts

- [~] Consume accepted Asset Contract v2 and suitability/ingestion records; freeze each title's semantic roles, physical behavior descriptors, legacy source manifests, and reuse/ingest/block decisions before implementation.
  Next executable binding work per test-strategy.md Phase 2. Product-owner receipt for the binding freeze is still required before Green.
- [~] Write failing mechanic, responsive composition, and educational-invariant tests per title.
  Next executable Red work per test-strategy.md Phase 3; each test must name its accepted-evidence falsification condition.
- [b] Build each cartridge using current public APK APIs and approved semantic bindings. deferred:green-role-after-phase-3-red-review
- [b] Run Advantage Games QC with compact/wide, resize, input, and selected-output checks. deferred:phase-4-cartridge-green
- [b] Run Reading and Primary host proofs for loading, authoritative completion, persistence, replay, and navigation. deferred:phase-5-qc-evidence
- [b] Retire only exact proven legacy paths and validate callers, selected outputs, and copied-asset guards. deferred:phase-6-host-proof-and-retirement-disposition
- [b] Obtain independent review and product-owner acceptance. deferred:product-owner
