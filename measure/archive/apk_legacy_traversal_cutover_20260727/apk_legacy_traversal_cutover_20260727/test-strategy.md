# Test Strategy: APK Legacy Traversal Rebuild and Cutover

Track: `apk_legacy_traversal_cutover_20260727`
Role base: `0aaefbe6db43e08dae39cc2311c28fe958031b63`
Status: Task 1 evidence-only manifest work is complete. Phase 2 remains incomplete.

## Scope of record

Five titles only: Dragon Rider, Spellweaver's Run, Shadow Gate Dungeon,
Labyrinth of the Goblin King, Griffin Rider's Escape. No scope expansion.

Accepted inputs:

- Task 1 evidence-only manifest `task1-source-readiness-manifest-v1.json` (records completed evidence-only manifest work; it grants no downstream authority).
- Accepted readiness receipt `d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720`.
- Phase-1 denominator crosswalk `eb395d3d365115696fc31359406a4e9f126604ca159ea8358a0eb8931c8c5f57`.
- Identity ledger `a31c99650bf1abd6623e64b2e9a23c4c481ce970036b52cfbe08c74b1c09c407`.
- Traversal Batch A manifest `f5a215f44815c79025e86e97a3217d7a85c4a33db86f80db2909f30dd3a9caa3`.
- Traversal Batch B manifest `41243b620fb02c413bd7ed2887d59905a02036299ce763b11f70499d63ea99af`.
- Asset Contract v2 (accepted archive track `apk_asset_contract_v2_20260728`) and standard-pack release `2026.07.23`.
- EVLGames licensing is settled; no license re-litigation in this track.

Archive resolution rule: `archive_preferred_path` is the only consumable local
path. Receipt-declared paths are reconciliation text only.

## Title-by-title binding table

| Title | title_id | assignment_index | source_identity_id | identity_record_index | Evidence binding |
|-------|----------|------------------|--------------------|-----------------------|------------------|
| Dragon Rider | `dragon-rider` | 11 | `vocabulary/dragon-rider` | 21 | Batch A |
| Spellweaver's Run | `spellweavers-run` | 13 | `catalog/spellweavers-run` | 8 | Batch A |
| Shadow Gate Dungeon | `shadow-gate-dungeon` | 14 | `sentence/shadow-gate-dungeon` | 17 | Batch B |
| Labyrinth of the Goblin King | `labyrinth-goblin-king` | 15 | `sentence/labyrinth-goblin-king` | 14 | Batch B |
| Griffin Rider's Escape | `griffin-riders-escape` | 16 | `catalog/griffin-riders-escape` | 2 | Batch B |

Binding rule: each title's crosswalk locator pair (`/assignments/<n>` plus
`/identity_records/<n>`) must resolve exactly before any semantic adoption test
runs. A binding test must fail on byte drift of any bound input.

## Phase plan

Phases map one-to-one to plan tasks 1–8.

### Phase 1 — Source/readiness manifests (Task 1, `[x]` evidence-only work complete)

- Historical Red evidence: `task1-source-manifest-red-evidence-20260815.md`; it records the five missing-manifest failures before Green.
- Green result: all five source manifests validate; the focused suite exits 0 with 13 passed tests.
- Completion boundary: the manifests record source evidence only. Missing source paths remain `missing-at-head`, and no adoption or cutover claim is granted.
- Closeout gate: independent review of the manifests plus product-owner receipt for downstream use.
- Fixtures: bound archive JSON files; synthetic drifted copies as negative fixtures.
- Mocks: none. The contract reads archive bytes directly.
- Falsifier: any title whose locator pair resolves against mutated bytes invalidates the gate.
- Risk: low.
- Anti-pattern defenses: A3 (labeled-integer parse of five resolved locators, not a digit regex); A4 (zero resolved titles fails, never vacuous-pass); A9 (archive-preferred path resolution); A15 (receipt reissued after any byte change).

### Phase 2 — Binding freeze (Task 2, `[~]` next executable)

- Red command: `pnpm vitest run packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` (to be authored).
- Red target: per-title semantic roles, physical behavior descriptors, legacy source manifests, and reuse/ingest/block decisions validate against Asset Contract v2 before implementation exists.
- Green gate: five accepted suitability dossiers exist; each dossier separates semantic intent, physical descriptor, and reuse/ingest/block outcome; zero unknown Must-have roles adopted.
- Closeout gate: independent review plus product-owner acceptance of the binding freeze.
- Fixtures: accepted Asset Contract v2 descriptors; canonical standard-pack catalog digest `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`.
- Mocks: none for contract validation. No live gameplay claim at this phase.
- Falsifier: a dossier that adopts a role without accepted suitability evidence fails the gate.
- Risk: medium.
- Anti-pattern defenses: A5 (no plan text claims dossier acceptance before the receipt exists); A6 (registry note stays `[~]`/`[ ]` truth); A10 (generated bindings refreshed after structural change).

### Phase 3 — Red mechanics, responsive, and learning tests (Task 3, `[~]` next executable)

- Red command per title: `pnpm vitest run packages/game-cartridges/src/legacy-traversal-<title_id>.mechanics.test.ts packages/game-cartridges/src/legacy-traversal-<title_id>.responsive.test.ts packages/game-cartridges/src/legacy-traversal-<title_id>.learning.test.ts`.
- Red target: each failing test names the accepted evidence claim it preserves: the title's distinct traversal/learning loop, its responsive composition contract, and its educational invariant.
- Green gate: n/a at Red. Red proof requires each test to fail for the named missing behavior, not for a syntax or import error.
- Closeout gate: Red review confirms every test has a falsification condition tied to source evidence.
- Fixtures: accepted Batch A/B claim locators; responsive contract cells from the shared kit; deterministic seed inputs.
- Mocks: renderer and host adapters mocked at the cartridge ABI boundary only. No mock stands in for a learning invariant.
- Falsifier: a test that passes without the cartridge or fails for an unrelated reason is rejected and rewritten.
- Risk: medium.
- Anti-pattern defenses: A3 (labeled counts of responsive cells); A4 (a suite with zero executed assertions fails); A7 (exclusion filters limited to paths and policy markers); A14 (detector commands use `rg -n` only).

### Phase 4 — Green cartridges (Task 5 in plan numbering 4, `[b]`)

- Red command: the Phase 3 suites must fail before implementation begins.
- Green gate per title: `pnpm vitest run packages/game-cartridges/src/legacy-traversal-<title_id>.*.test.ts` exits 0 using only current public APK APIs and approved semantic bindings.
- Closeout gate: cartridge uses no app-local asset copies and no whole-pack default delivery; selected-union materialization only.
- Fixtures: canonical resolver with accepted release `2026.07.23`; fail-closed resolution fixtures.
- Mocks: none inside the cartridge boundary; adapter seams only.
- Falsifier: any direct provider SDK import, app-local asset copy, or unbound role fails the package guard.
- Risk: high.
- Anti-pattern defenses: A1 (no substring signal in gate scripts); A5 (Green claim only after exit 0); A16 (single shared master tree; no worktree isolation).

### Phase 5 — Advantage Games QC (Task 5, `[b]`)

- Red command: `pnpm --filter vocabulary-games test -- traversal-cutover-qc` (QC harness suite, to be authored).
- Live QC paths: `apps/advantage-games/tests/e2e/games/legacy-traversal-<title_id>.qc.spec.ts` per title (to be authored), driven against the running app.
- Green gate: compact and wide compositions pass; real-input resize QC passes; selected-output proof shows the exact materialized asset set per title.
- Closeout gate: hash-bound QC evidence receipt per title, mirroring the core-cohort Task 4 pattern.
- Fixtures: deterministic viewport matrix (compact, wide, resize transitions); synthetic input events.
- Mocks: none for input or rendering. Live canvas behavior required.
- Live-behavior proof: browser-driven resize and input runs produce recorded evidence; artifact-only assertions do not satisfy this phase.
- Falsifier: a resize run that drops the canvas, mis-scales a responsive cell, or selects a non-canonical output fails.
- Risk: high.
- Anti-pattern defenses: A3 (labeled cell counts); A4 (zero executed resize runs fails); A7 (narrow exclusion filters).

### Phase 6 — Reading and Primary host proofs (Task 6, `[b]`)

- Red command: `pnpm vitest run packages/game-cartridges/src/legacy-traversal-host-proof.test.ts` plus host Playwright specs `apps/reading-advantage/tests/e2e/games/legacy-traversal-<title_id>.host-proof.spec.ts` (to be authored) and `apps/primary-advantage/tests/e2e/games/legacy-traversal-<title_id>.host-proof.spec.ts` (to be authored).
- Existing host regression commands (files already present; run with each phase-6 change):
  - `pnpm --filter reading-advantage test -- apps/reading-advantage/__tests__/host-proof-game-client.test.tsx`
  - `pnpm --filter reading-advantage test -- apps/reading-advantage/__tests__/api/host-proof-games-completions.test.ts`
  - `pnpm --filter primary-advantage test -- apps/primary-advantage/lib/__tests__/api/host-proof-games-completions.test.ts`
- Green gate: each title loads in Reading and Primary hosts; completion is authoritative server-side; persistence, replay, and navigation pass.
- Closeout gate: concurrent-completion idempotency proof per host; Kimi WebBridge and Playwright evidence receipts, mirroring core-cohort Task 5 artifacts.
- Fixtures: seeded student session; deterministic completion payload.
- Mocks: none for persistence. Live host runtime against the real completion path required.
- Live-behavior proof: replay after reload must restore persisted state; navigation away and back must not double-count completion.
- Falsifier: a completion recorded only client-side, or a replay that grants duplicate XP, fails the gate.
- Risk: high. Primary has live users; the 2026-10-11 cutover floor applies to any production exposure.
- Anti-pattern defenses: A5 (host-proof claims only with passing evidence receipts); A6 (no registry overstatement); A15 (fresh receipts after any fix).

### Phase 7 — Exact retirement (Task 7, `[b]`)

- Red command: `pnpm vitest run packages/game-cartridges/src/legacy-traversal-retirement.test.ts` (to be authored).
- Green gate: only exact proven legacy paths are removed; caller enumeration is complete; selected outputs still resolve; copied-asset guards pass.
- Closeout gate: exact retirement disposition artifact per title, mirroring the core-cohort Task 6 pattern, plus independent review.
- Fixtures: forensic path records from `apk_existing_asset_candidate_audit_20260712`; caller graph snapshots.
- Mocks: none. Live deletion in the shared master tree only after the disposition is accepted.
- Falsifier: deletion of any path not bound to a proven legacy record, or any surviving caller, fails the gate.
- Risk: critical. Destructive operation; stop on any missing capability, mapping, or host gate.
- Anti-pattern defenses: A9 (archive-aware path resolution); A13 (no stale track dirs after closeout); A16 (single tree; retirement never staged in a worktree).

### Phase 8 — Reviews, acceptance, and closeout (Task 8, `[b]`)

- Red command: n/a. Review phase.
- Green gate: independent review with zero unresolved Critical, High, or Medium findings across all five titles.
- Closeout gate: product-owner acceptance event; final acceptance audit; closeout moves the track to `measure/archive/` and removes the active dir.
- Falsifier: any unresolved Critical/High/Medium finding or missing owner acceptance blocks closeout.
- Risk: medium.
- Anti-pattern defenses: A2 (publish-style gates require explicit acceptance evidence); A8 (marker vocabulary `[~]/[x]/[b]` only); A11 (no permanent `deferred:review-execution`); A12 (catalog guard references verified); A13 (archive move verified).

## Review applicability

- Security review: applicable at Phases 6–7 (authenticated host completion, idempotency, destructive retirement).
- UX/API review: applicable at Phases 4–6 (cartridge ABI, host integration, responsive behavior).
- Adversarial testing: applicable at Phases 3–7 (drifted-input fixtures, duplicate completion, unbound role adoption, over-broad deletion).
- Browser review: applicable at Phases 5–6 (live resize, input, persistence, replay); environment-gated browser work follows the cohort disclosure pattern.

## Commands reference

- Per-title suites: `pnpm vitest run packages/game-cartridges/src/legacy-traversal-<title_id>.*.test.ts`
- Package gate: `pnpm --filter @reading-advantage/advantage-play-kit test`
- QC harness: `pnpm --filter vocabulary-games test -- traversal-cutover-qc`
- Live QC specs: `apps/advantage-games/tests/e2e/games/legacy-traversal-<title_id>.qc.spec.ts` (to be authored)
- Host proofs: Playwright specs `apps/reading-advantage/tests/e2e/games/legacy-traversal-<title_id>.host-proof.spec.ts` (to be authored) and `apps/primary-advantage/tests/e2e/games/legacy-traversal-<title_id>.host-proof.spec.ts` (to be authored) plus Kimi WebBridge receipts.
- Existing host regression commands:
  - `pnpm --filter reading-advantage test -- apps/reading-advantage/__tests__/host-proof-game-client.test.tsx`
  - `pnpm --filter reading-advantage test -- apps/reading-advantage/__tests__/api/host-proof-games-completions.test.ts`
  - `pnpm --filter primary-advantage test -- apps/primary-advantage/lib/__tests__/api/host-proof-games-completions.test.ts`
- Aggregate suite: `pnpm turbo run test` may remain intentionally red from pre-existing failures. Phase gates never depend on the aggregate; each phase gate lists its own targeted command and exit code. Known aggregate reds must be labeled pre-existing with an owner.

## Leases and file ownership

- This strategy owns only `measure/tracks/apk_legacy_traversal_cutover_20260727/test-strategy.md`.
- Phase roles must declare per-artifact leases before editing. No product source edit is authorized by this strategy.
- A16 applies: one shared master worktree; coordination through explicit file ownership.

## Artifact tests vs live-behavior tests

- Artifact/documentation tests (Phases 1–2, 8) validate evidence bytes, hashes, schemas, and receipts. They do not assert runtime behavior.
- Live-behavior tests (Phases 4–7) execute cartridges, hosts, resize runs, persistence, and deletion. A green artifact test never substitutes for a red live-behavior gate.

## Architecture guardrails and changed-contract risks

- Cartridges consume only current public APK APIs and the accepted canonical resolver.
- No app-local asset copies; no whole-pack default delivery; selected-union materialization only.
- Business logic stays out of UI layers; host integration uses existing completion/persistence ports.
- Changed-contract risks: Asset Contract v2 descriptor evolution, host completion ABI drift, and responsive-contract unblocking. Each requires an additive contract revision and fresh Red tests before adoption.

## Stop-loss conditions

Stop affected work on any missing capability, mapping, suitability dossier, or
host gate. Bound-byte drift or a revoked predecessor invalidates the Task 1
manifest and halts downstream phases.

## Immutable phase_base_sha capture point

Immediately after the commit that lands this strategy, the plan markers, and
`orchestration/strategy-role.log`, the orchestrator must record the new commit
SHA as the immutable `phase_base_sha` for this track revision. The capture
command is `git rev-parse HEAD` run after that commit returns. No SHA is
embedded here, because any pre-commit value would predate the committed
strategy and violate A15-style provenance freshness.
