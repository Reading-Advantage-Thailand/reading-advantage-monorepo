# Implementation Plan: Legacy Traversal Cutover

## Phase 1: Source/readiness manifests

- [x] Publish exact legacy source manifests for five titles. Source SHA: `1e848bda09b6cfb16c8076447101553a247c4417`.
  Task 1 is complete as evidence-only manifest work. It grants no source availability, adoption, implementation, or cutover authority.
  Historical Task 1 Red evidence is retained as a prior failure record; it is not the current Task 1 result.
  The contract preserves the complete accepted source-path denominator for every title.
  Every entry declares `presence` as `tracked-at-head` or `missing-at-head`.
  Tracked entries require Git tracking, file existence, the current-byte SHA-256, role, classification, locator, and evidence-only disposition.
  Missing entries require the accepted evidence locator and exact path, omit `sha256`, and prove absence and non-tracking at HEAD.
  The focused Green run exits 0 with 13 tests passed.
  Falsifiers cover presence lies, fabricated hashes for missing bytes, omitted missing paths, and implementation or cutover claims from absence.
  Phase 2 remains incomplete. Task 2 is the next executable binding work.
  Historical Red evidence: `task1-source-manifest-red-evidence-20260815.md`.
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

### Phase 2 Red evidence — binding freeze (2026-08-16)

- Phase base: `8c30dc0e138567f4d461b6cb69c10c66a6bb2eaf`.
- Role base: `63da03a0e27e0c696df44f2a0285973b269d1cfd`.
- The Red lease covers the new binding-freeze test, this plan, the Red evidence, and the Red role log.
- The contract requires one strict dossier at `phase2-binding-dossiers/<title_id>.json` for each of the five titles.
- Each dossier binds semantic roles, Asset Contract v2 physical descriptors, the exact source-manifest digest, accepted traversal claim locators, and a closed reuse/ingest/block decision.
- The contract rejects unknown Must-have adoption, stale release identity, missing roles or descriptors, silent fallback, whole-pack delivery, app-local copies, and unsupported owner acceptance.
- Red evidence: `phase2-binding-freeze-red-evidence-20260816.md`.
- The five dossier files are intentionally absent. Phase 2 remains `[~]`; no production or manifest file changed.
- Green attempt: five candidate dossiers were added, but the immutable Red test exposes three stale JSON-pointer bindings. Phase 2 remains `[~]`.
- Green evidence: `phase2-binding-freeze-green-evidence-20260816.md`; the Red contract needs Review A disposition before Green can complete.
- Red remediation: the accepted ledger pointers are `/13` for `SW-MOVE-001`, `/claims/13` for `SGD-RESP-001`, and `/claims/10` for `GRF-CART-001`.
- The Red test now uses those three archive pointers. Accepted archive evidence and all five candidate dossiers remain unchanged.
- The focused remediation run collected 7 tests, passed 4, and retained 3 failures on the unchanged candidate dossier locator values. Phase 2 remains `[~]`.
- Manifest validation passed 13/13. Python readiness passed 9/9 with `python3`; `python` is unavailable in this environment. TypeScript, ESLint, and the scoped diff check passed.
- Prettier still reports the pre-existing plan indentation mismatch. No unrelated plan text was reformatted.
- Red-remediation evidence: `phase2-binding-freeze-red-remediation-evidence-20260816.md`.
- Follow-up Red remediation: `/37` resolves `SW-CART-001`, `/claims/14` resolves `SGD-RESULT-001`, and `/claims/8` resolves `GRF-INPUT-001`.
- The test corrects both Griffin references to `GRF-INPUT-001`. Accepted archive evidence and all five candidate dossiers remain unchanged.
- The follow-up focused run retained only the three frozen candidate-dossier pointer failures. Phase 2 remains `[~]` until the same Green session finalizes that disposition.
