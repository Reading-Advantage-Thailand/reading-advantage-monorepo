# Independent Fresh Re-Review: Remediated Task 4 — Advantage Games QC and Compact/Wide Real-Input Proof

- **Track:** `apk_existing_core_cutover_20260727`
- **Task under review:** 4 — "Prove Advantage Games QC plus compact/wide real-input behavior per title" (plan marker `[~]`, in progress)
- **Reviewed at:** 2026-07-28T11:05:00Z
- **Review type:** fresh independent re-review of the remediated state (source review `review-task4-advantage-games-qc.md`, remediation evidence `review-task4-advantage-games-qc-remediation.md`, SHA-256 `c2bdbdeb98dddf140db53e4147b3d2e371d9d83dbf43fae4b0b7dabf372cecf8` — recomputed exact).
- **Reviewer posture:** no prior conclusion trusted. Every hash was recomputed from current bytes; every guard was re-run plus tamper-tested; all package/app gates were re-run with caches bypassed where applicable; an own Playwright probe (not the producer spec) drove real keyboard/pointer/touch at 390x844 and 1440x900 with screenshot and DOM inspection.
- **Owner acceptance:** absent. This review does not grant, imply, or record product-owner acceptance. Task 4 remains in progress.

## 1. Hash Recomputation (all independent, all exact)

### 1.1 Remediation changed-source bindings (4/4 exact)
- `packages/game-cartridges/src/existing-core-cutover-qc.ts` → `6d1730bdb24f3c5effe0bb473d48487fcccf04c0a9964d0311a78d9253347951` ✓
- `packages/game-cartridges/src/existing-core-cutover.red.test.ts` → `b4808c5d1109a183dc44e3ba2f052e8bb00e18e42b6bbfda489ff7fd87021a9f` ✓
- `measure/tests/test_apk_existing_core_cutover_task3_acceptance.py` → `4cd5aba20b82fc888b4136af3c837c28891297185b193cbedb7d41434eeeed44` ✓
- `task4-advantage-games-qc-evidence-v1.json` → `7a9dae4d640f881f76c001be73315b74d07b19258226d01f09390c37adaba058` ✓ (self-binding pinned in the evidence guard — recomputed exact)

### 1.2 Accepted inputs (6/6 exact)
`accepted-semantic-adoption-receipt-v1.json` `e82d42d9…be240` ✓; `t11-owner-extension-acceptance-v1.json` `60fbb63f…215d` ✓; `developer-kit-api.ts` `e45307e3…92d0` (api_version 2.0.0 in source) ✓; `responsive-composition.ts` `f0bd6b69…4515` ✓; `qc-kit.ts` `51324df0…f35e` ✓; `semantic-product-bindings.ts` `937ea020…e121` ✓.

### 1.3 Implementation bindings (11/11 exact)
`package.json` `1041ad5c…fa47` ✓; `ExistingCoreCartridgeQc.tsx` `a5b4d691…80d89` ✓; `ExistingCoreCartridgeQc.test.tsx` `da2affba…827a` ✓; `AdvantageGamesAuthoringQc.tsx` `daef9738…1a31` ✓; `qc/page.tsx` `e16b021e…a202` ✓; `existing-core-cartridges.spec.ts` `120fc8e9…6349` ✓; `standard-pack-qc-preview.json` `0f5935e2…e9ab` ✓; `catalog.ts` `14afe602…9b55b` ✓ (still empty); `index.ts` `1f9fdca4…f8eda` ✓ (no QC root export); plus §1.1's two package files.

### 1.4 Source lineage and acceptance chain (all exact)
`dragonFlight.ts` `c6009a32…14e9` ✓; `dungeonLiberator.ts` `744d170a…b98d` ✓; archived sorcerer-ziggurat `systems.ts` blob `374d8d42…dd8f` ✓; archived astral-mage `state.ts` blob `b93b879f…2df5f` ✓; candidate source `8d33f785…a9d3` ✓; evidence fixture `85d1ff90…dffb` ✓; task-3 acceptance `65ffbaa2…c3b1` ✓; approval message `Approved. Continue` → `4a6bf421…4de7` ✓; readiness receipt `d371fc5d…f1720` ✓; claim ledgers 5/5 exact (DF `84bd9335…083e`, MD v2 `10d974bd…1e45`, DL v3 `f8112af6…e2a2`, SZ v2 `b99ba08b…2c4a`, AM v2 `da7122e8…4eb7e`).

### 1.5 Physical selected-union assets (7/7 exact)
All seven `asset-<hash>.(png|ogg)` files recompute to the recorded digests; filenames match their own content-hash prefixes; zero other files under `public/assets/apk/standard-pack-qc/`.

## 2. Finding-by-Finding Verification of the Remediation

- **M-1 (Medium) — RESOLVED, guard strengthened not weakened.** `test_plan_and_metadata_complete_only_task3` now asserts task 4 contains `- [~]` AND not `- [x]`, and fails closed unless tasks 5/6/7 lines start with `- [ ]`. Independent tamper harness (guard executed against four mutated plans in an isolated mirror): current plan → pass; task 4 `[x]` → fail; task 4 `[ ]` → fail; task 5 `[~]` → fail; task 7 `[x]` → fail. Lawful in-progress is the only accepted state. Suite: 6/6 passed.
- **L-1 (Low) — RESOLVED with exact floor semantics.** QC adapter now applies `Math.max(0, score - 25)` (existing-core-cutover-qc.ts L373), byte-matching the accepted archived astral-mage source (`state.ts` L158, `score: Math.max(0, state.score - 25)`). The package regression test asserts exact floored equality at two wrong-hit points, including the score-0 boundary. Live browser probe confirmed: secondary hit at score 0 → score stays exactly 0. Ziggurat correctly retains its own unfloored `-25` (archived `systems.ts` L151 `score: state.score - 25`).
- **L-2 (Low) — RESOLVED.** Evidence `targeted_tests` now records 4 files / 11 tests with an explicit per-suite breakdown including `StandardPackQc.test.tsx` (4 tests). Independent re-run of exactly those four suites: 4 files / 11 passed.
- **L-3 (Low) — RESOLVED as disclosure; drift class reproduced.** Evidence supersedes the prior scan and documents the `.next/types` regeneration cause. Own fresh `repo-graph scan packages/game-cartridges` reproduced the drift phenomenon: 548 nodes / 619 edges vs the recorded 539/606 (+9/+13), with 258 of 548 nodes in regenerated cross-package `dist/*.d.ts` artifacts. No source file in `advantage-play-kit`, `game-cartridges`, or `advantage-games` was modified after the 2026-07-28T09:54 remediation (mtime-verified), and every pinned source hash still recomputes exactly — the delta is build-artifact regeneration from this review's own `--force` rebuilds, the same disclosed class. Main `graph.db` remains stale (mtime 2026-07-26), consistent with the OS-blocked disclosure.
- **L-4 (Low) — RESOLVED.** `metadata.json` `deviation_notes` now states the suite is 61/61 green and records the remediation entry with `intentional_red_test_count: 0`. Verified: 3 files / 61 passed.

## 3. Quarantine, Bindings, and Mechanics Re-Verification

- **Quarantine:** package root exports (source and rebuilt `dist/index.js`, live `import()`) contain zero QC symbols; `cartridgeCatalog` `[]`, `cartridgeLoaders` `{}`; exports map exposes QC only via the explicit `./qc` subpath; the only app importer of `@reading-advantage/game-cartridges/qc` is `ExistingCoreCartridgeQc.tsx`, rendered only by the static `/qc` route; no production navigation links to `/qc`; zero references to the failed `apk_cross_game_asset_ontology_20260712` ontology in package/app source.
- **Semantic bindings:** receipt mappings == evidence per-title `selected_semantic_keys` == preview-manifest keys == e2e-asserted keys for all five titles, with exact input modes (vocabulary ×2, sentence ×3) and temporal labels (current-source ×3, historical-source-only ×2). Cohort union exactly 7; preview manifest version `2026.07.23`, catalog digest `ac801baee…`, `full_pack_delivered: false`.
- **Deterministic mechanics:** re-derived from accepted sources (dragonFlight L85–121: init 0/0/1, floored `Math.max(1,…)`; useGameStore L9–14/GameEngine L364–420: `MAX_CASTLE_HP` 3, 3/3/3 castles, lowercased equality, correct → combo+1/mana+10/score+10, wrong → combo reset/attempts+1; dungeonLiberator: in-order collect/trail+1/targetIndex+1, out-of-order flee 1500/trail reset) and confirmed live in the browser with exact JSON states (ziggurat 175 after PPS; astral-mage floored 0 mid-state; dragon-flight attempts 2/correct 1/dragon 1; magic-defense score 10/mana 10/combo 1; dungeon-liberator trail reset/fleeing 1).
- **No forbidden asset/provider path:** no full-pack/`standard-pack-release` URLs (0 non-qc-pack asset requests in the browser); no Firebase/AI/storage provider SDKs in the cartridge surface; assets confined to hash-named files under `/assets/apk/standard-pack-qc/`.

## 4. Gate Re-Runs (this review)

- **Measure governance:** task-3 acceptance 6/6; task-4 evidence 7/7; evidence lineage **6/6** (incl. fail-closed negatives); readiness 1/1. Guard tamper harness: 4/4 mutated plans rejected (§2 M-1).
- **game-cartridges** (`--force`): lint ✓, check-types ✓, build ✓ (dist rebuilt; root-export leak check on the built artifact via live import), tests **3 files / 61 passed** ✓.
- **advantage-play-kit** (`--force`): lint/check-types/build/test all ✓ — full **41 files / 238 tests**; named guards (accepted-inputs, accepted-inputs-checker-paths, blocked-scopes, standard-pack-acceptance integration) **4 files / 25 passed**.
- **game-contracts:** **4 files / 40 tests** ✓.
- **advantage-games:** lint **0 errors / 80 pre-existing warnings** (none in task-4 files) ✓; `tsc --noEmit` ✓; targeted suites **4 files / 11 tests** ✓; full Jest **164 files / 1469 passed** ✓ (one pre-existing wall-clock flake in `src/lib/multiplayer/performance-benchmark.test.ts` under parallel CPU contention on one run; passed in isolation twice and in the full bounded-worker rerun — the disclosed flake class, outside the task-4 surface); `next build` ✓ (`/qc` static).
- **Playwright Chromium (producer specs re-run):** `CI=true … tests/e2e/qc/existing-core-cartridges.spec.ts tests/e2e/qc/authoring-qc.spec.ts --project=chromium` → **4 passed** ✓.
- **Independent Playwright probe (own script, real input):** 5 titles × compact 390x844 + wide 1440x900; real keyboard (Enter/KeyX/KeyC), real mouse pointer, real touch in a touch context; exact mechanic-state assertions per title; fixture sweep incl. Thai worst-case with DOM scroll-overflow checks; one-canvas node identity and mechanic-state preservation across resize; completion latch exactly once; zero horizontal overflow; canvas hit-region `elementFromPoint` unobscured; bounded delivery of exactly the 7 hash-named qc-pack assets with zero full-pack requests. **All checks passed** (one self-corrected probe heuristic — see Informational). Screenshots inspected directly at `/tmp/opencode/apk-task4-rereview/shots/` (compact/wide per title + touch; ephemeral): Thai text renders, selected-union panel shows the exact per-title keys and "N of 43075", release identity and required credit displayed.
- **No commit** created (git log verified); `git diff --check` clean; unrelated dirty work untouched.

## 5. Findings

### Critical
None.

### High
None.

### Medium
None. (M-1 verified resolved with a strengthened, tamper-evident guard.)

### Low
- None. (R-1 was a residual documentation count; see Informational for the correction.)

### Informational
- Plan task 2's completed-task narrative still describes the Red-phase state ("retains 20 intentional Red failures"). It is a historical description of the completed Red task; the current-suite statement lives in `metadata.json` `deviation_notes`, which is now accurate (L-4 resolved). No action required.
- Fresh scoped graph scan drifted +9/+13 vs the recorded cartridges scan, concentrated in regenerated cross-package `dist/*.d.ts` from this review's own `--force` rebuilds; no post-remediation source modification exists (mtime-verified). Same disclosed drift class as L-3; main `graph.db` remains stale (2026-07-26), consistent with the OS-blocked disclosure.
- The parallel full-app Jest flake (`performance-benchmark.test.ts`, wall-clock under CPU contention) reproduces the disclosed flake class; it passes in isolation and in the bounded-worker full run, and is outside the task-4 change surface.
- This review's first probe pass flagged magic-defense touch via an over-strict reviewer heuristic (expecting `attempts ≥ 1` or `score ≥ 100`); the DOM showed the exact accepted invariant (`score 10 / mana 10 / combo 1 / attempts 0` — correct translations do not increment attempts in the accepted source). Re-verified exact in a dedicated run. Reviewer-probe artifact, no product defect.
- Evidence `claims` block re-checked field-by-field: no catalog exposure, no Reading/Primary host proof, no tenant-safe persistence, no retirement, no cutover authorization, no broader-cohort acceptance, no commit — all consistent with repository state.
- **R-1 corrected:** the remediation document (`review-task4-advantage-games-qc-remediation.md` §Gate Re-Runs) now states evidence lineage **6/6 passed**; the remediation evidence SHA-256 and this rereport SHA-256 have been rebound in `metadata.json`. No implementation, test, plan task state, or owner acceptance was changed.

## 6. Disposition

**review-pass-progression-hold.** All five prior findings (M-1, L-1, L-2, L-3, L-4) are independently verified resolved without weakened guards: the task-3 acceptance guard is strictly stronger (tamper-evident in four mutated-plan probes); the Astral Mage score floor exactly matches the accepted historical source in code, package tests, and live browser behavior; the evidence suite counts are accurate (4 files / 11 tests) and reproduced; the graph disclosure is reproducible and honestly bounded to artifact drift; the metadata is current. Every hash recomputes exactly; quarantine holds at source, built-artifact, and runtime levels; the selected union is exactly 7 assets; deterministic mechanics match the accepted claim locators; real keyboard/pointer/touch compact/wide proof was independently reproduced with screenshot and DOM inspection. No Low findings remain; only informational notes. Task 4 **remains in progress**; product-owner acceptance is **absent** and not implied.
