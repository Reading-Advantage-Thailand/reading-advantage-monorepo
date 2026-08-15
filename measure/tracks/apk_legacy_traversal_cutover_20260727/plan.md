# Implementation Plan: Legacy Traversal Cutover

## Phase 1: Source/readiness manifests

- [~] Confirm accepted crosswalk/readiness coverage and publish exact legacy manifests for five titles.
  Evidence-only Task 1 Red starts here. The contract requires exact accepted source-path sets, normalized Git-tracked paths, current-byte SHA-256 hashes, roles, classifications, locators, and evidence-only dispositions.
  The focused Red run passes seven support and mutation checks, and fails only on five missing exact per-title legacy source manifests.
  Task 2 remains blocked by the Asset Contract v2 product-owner receipt and suitability evidence. See `task1-source-manifest-red-evidence-20260815.md`.
  Red command: `./node_modules/.bin/vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — exit 1; 12 tests, 7 passed, 5 missing-manifest failures.
  Strict-set coverage rejects empty, duplicate, extra, omitted, wrong-hash, generated, and unbound paths, plus role, classification, locator, and disposition drift.
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
