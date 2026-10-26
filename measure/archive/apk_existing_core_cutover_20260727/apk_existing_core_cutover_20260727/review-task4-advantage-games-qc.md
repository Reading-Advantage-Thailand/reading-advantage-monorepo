# Independent Fresh-Source Review: Task 4 — Advantage Games QC and Compact/Wide Real-Input Proof

- **Track:** `apk_existing_core_cutover_20260727`
- **Task under review:** 4 — "Prove Advantage Games QC plus compact/wide real-input behavior per title" (plan marker `[~]`, in progress)
- **Reviewed at:** 2026-07-28T10:05:00Z
- **Reviewer posture:** independent fresh-source review. The producer narrative was not trusted. Every receipt, evidence, source, asset, and archived-blob hash was recomputed from current bytes; every changed file was inspected; package/app gates were re-run with caches bypassed; Playwright Chromium was driven independently with real keyboard/pointer/touch at 390x844 and 1440x900, and screenshots/DOM were inspected directly.
- **Owner acceptance:** absent. This review does not grant, imply, or record product-owner acceptance. Task 4 remains in progress.

## 1. Hash Recomputation (all recomputed independently)

### 1.1 Evidence self-binding
- `task4-advantage-games-qc-evidence-v1.json` recomputed SHA-256: `92db3b446e68234e1a9482c8b570518ece6caf685b9fc39440a9364690eb558b` — matches the value pinned in `measure/tests/test_apk_existing_core_cutover_task4_qc_evidence.py`. **Exact.**

### 1.2 Accepted inputs (6/6 exact)
- `accepted-semantic-adoption-receipt-v1.json` → `e82d42d9…be240` ✓
- `t11-owner-extension-acceptance-v1.json` → `60fbb63f…215d` ✓
- `developer-kit-api.ts` → `e45307e3…92d0` ✓ (api_version 2.0.0 confirmed in source)
- `responsive-composition.ts` → `f0bd6b69…4515` ✓
- `qc-kit.ts` → `51324df0…f35e` ✓
- `semantic-product-bindings.ts` → `937ea020…e121` ✓

### 1.3 Implementation bindings (11/11 exact)
`existing-core-cutover-qc.ts` `50a5be3f…fc61` ✓; `existing-core-cutover.red.test.ts` `2bc42002…60ab` ✓; `game-cartridges/package.json` `1041ad5c…fa47` ✓; `ExistingCoreCartridgeQc.tsx` `a5b4d691…80d89` ✓; `ExistingCoreCartridgeQc.test.tsx` `da2affba…827a` ✓; `AdvantageGamesAuthoringQc.tsx` `daef9738…1a31` ✓; `qc/page.tsx` `e16b021e…a202` ✓; `existing-core-cartridges.spec.ts` `120fc8e9…6349` ✓; `standard-pack-qc-preview.json` `0f5935e2…e9ab` ✓; `catalog.ts` `14afe602…9b55b` ✓ (remained empty — verified); `index.ts` `1f9fdca4…f8eda` ✓ (QC registry not exported from root — verified).

### 1.4 Source lineage (all exact)
- `dragonFlight.ts` current `c6009a32…14e9` ✓; `dungeonLiberator.ts` current `744d170a…b98d` ✓.
- Sorcerer-ziggurat archived blob (`git show 1a21fb95…:…/sorcerer-ziggurat/systems.ts`) → `374d8d42…dd8f` ✓.
- Astral-mage archived blob (`git show c378c3cc…:…/target-action/state.ts`) → `b93b879f…2df5f` ✓.
- Magic-defense exclusion of `magicDefenseConfig.ts` is justified: T4 claims cite `useGameStore.ts` and `GameEngine.tsx`, not the config module. Verified against the claim ledger locators.
- Task-3 acceptance chain: `task3-product-owner-acceptance-v1.json` `65ffbaa2…c3b1` ✓; candidate source `8d33f785…a9d3` ✓; evidence fixture `85d1ff90…dffb` ✓; approval message `Approved. Continue` → `4a6bf421…4de7` ✓; readiness receipt `d371fc5d…f1720` ✓.

### 1.5 Claim ledgers (5/5 exact)
Dragon Flight `84bd9335…083e` ✓; Magic Defense v2 `10d974bd…1e45` ✓; Dungeon Liberator v3 `f8112af6…e2a2` ✓ (DL-COLL/DL-TRANS claims retained from v2 artifact, present); Sorcerer-ziggurat v2 `b99ba08b…2c4a` ✓ (SZ-HIST claims in `governing_claim_fields`); Astral-mage v2 `da7122e8…4eb7e` ✓ (AM-HIST-004/005/006 present with exact paths/lines).

### 1.6 Physical selected-union assets (7/7 exact)
All seven `asset-*.png/.ogg` files under `apps/advantage-games/public/assets/apk/standard-pack-qc/` recompute to the recorded digests and are named by their own content hash prefix. ✓

## 2. Quarantine: QC Registry Cannot Leak

- **Package root:** `src/index.ts` exports only `catalog` and semantic-candidate symbols; zero QC symbols. Verified in source and in the **built** `dist/index.js`; a live `import()` of the built root confirms no QC-named export, `cartridgeCatalog` `[]`, `cartridgeLoaders` `{}`.
- **Exports map:** `package.json` exposes QC only through the explicit `./qc` subpath; `.` and `./catalog` contain no QC surface.
- **Production catalog/loaders:** `catalog.ts` returns `[]`/`{}` with `CartridgeId = never`; unchanged at the reviewed hash.
- **App consumption:** only `ExistingCoreCartridgeQc.tsx` imports `@reading-advantage/game-cartridges/qc`; it is rendered only by the `/qc` route. No production navigation or page links to `/qc` (grep-verified).
- **Failed ontology:** no reference to `apk_cross_game_asset_ontology_20260712` in any package/app source; references exist only in quarantine guards (`test_apk_existing_core_cutover_evidence_lineage.py` fails closed on it) and historical archives. `failed_ontology_consumed: false` confirmed.

## 3. Task-3 Bindings and Selected-Union Exactness

Receipt mappings == candidate `roleStateRequirements` == `OWNER_APPROVED_CANONICAL_BINDINGS` (7 role/state pairs) == per-title `selectedSemanticKeys` (sorted, deduplicated, Set-size-checked) == preview-manifest keys == e2e-asserted keys, for all five titles, including temporal labels (`current-source` ×3, `historical-source-only` ×2) and input modes (vocabulary ×2, sentence ×3). Cohort union = exactly 7 keys; preview manifest version `2026.07.23`; release identity in `accepted-standard-pack-release.ts` (version, catalog digest `ac801baee…`, assetCount 43 075, `accepted-cartridge-selected-union-only`) matches the receipt. `full_pack_delivered: false` confirmed in browser (§5).

## 4. Title-Specific Deterministic Mechanics vs Accepted Claim Locators

Independently re-derived from source, not from the producer's test names:

- **Dragon Flight** (DF-MECH-003/007/008/009/010, `dragonFlight.ts` L85–121): init attempts 0/correct 0/dragon 1; attempts +1 every selection; correctAnswers only on `correctSide`; dragonCount +1 / floored −1; no-op when not running. QC adapter matches exactly, including the `Math.max(1, …)` floor.
- **Magic Defense** (MD-MECH-003/005/008/017/018/022): `MAX_CASTLE_HP = 3` (useGameStore L9), `DEFAULT_CASTLES` 3/3/3 (L10–14), lowercased translation equality (GameEngine L337–340), correct → combo+1/mana+10/score+10, wrong → combo reset/totalAttempts+1, `endGame` → `status='game-over'` (L104). Matches.
- **Dungeon Liberator** (DL-COLL-001/002, DL-TRANS-001/002): in-order prisoner → collected, trail+1, targetIndex+1; out-of-order → flees 1500 ms, trail reset; victory only when `trail.length === words.length` (portal-before-all-words is correctly a no-op); `advanceToNextLevel` → level+1, one monster appended, trail/targetIndex reset. Matches.
- **Sorcerer's Ziggurat** (SZ-HIST-005/006/007/009, archived systems.ts): nonadjacent → unchanged state; legal wrong → attempts+1, score−25; correct → +100, token/node advance, lit append; origin init; fire-once completion guard. Matches.
- **Astral Mage** (AM-HIST-004/005/006, archived state.ts): inactive hit → unchanged; wrong visible token → attempts+1, score deduction; correct → +100, deactivates only the stable target, ordered progress +1. Matches, with one numeric nuance recorded as Finding L-1.

Live-browser mechanics matched the same semantics (e.g., ziggurat score 175 = 100+100−25 after primary/primary/secondary; astral-mage 100/1/1 after one correct hit; dragon-flight attempts 3/correct 2/dragon 2 after the same sequence).

## 5. Independent Playwright Chromium Verification (assertions not trusted)

Producer specs re-run: `CI=true playwright test tests/e2e/qc/existing-core-cartridges.spec.ts tests/e2e/qc/authoring-qc.spec.ts --project=chromium` → **4 passed** (matches evidence: 4 tests, 2 task-4).

Independent probe (own script, real input, screenshots inspected at `/tmp/opencode/apk-task4-review/shots/`, ephemeral):

| Title | compact 390x844 | wide 1440x900 | keyboard | pointer | touch | one-canvas | state preserved | completion ×1 | overflow | assets |
|---|---|---|---|---|---|---|---|---|---|---|
| dragon-flight | ✓ profile+0 issues | ✓ | ✓ 1 | ✓ 2 | ✓ 1 | ✓ same node | ✓ | ✓ 1 after 2×C | ✓ 0 both | 3 keys ✓ |
| magic-defense | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 4 keys ✓ |
| dungeon-liberator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 4 keys ✓ |
| sorcerer-ziggurat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 3 keys ✓ |
| astral-mage | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 3 keys ✓ |

- Fixture text (english-short, english-long worst-case, thai-short, thai-long worst-case): no scroll overflow in any title at both viewports; Thai text renders on canvas and in DOM (screenshot-verified).
- Bounded delivery: exactly **7 distinct** `/assets/apk/standard-pack-qc/asset-<hash>.(png|ogg)` URLs fetched across all five titles; zero full-pack/`standard-pack-release` URLs.
- No horizontal overflow at 390x844 or 1440x900; no element obscures the canvas hit regions (pointer/touch landed and incremented the correct modality counters; screenshots show unobstructed canvas).
- Probe artifacts: first-pass image-completeness and elementFromPoint checks were probe timing artifacts (no polling / off-viewport sampling); e2e polling and the screenshots confirm images loaded and targets unobscured. No product defect.

## 6. Gate Re-Runs (caches bypassed where applicable)

- game-cartridges: lint ✓, check-types ✓ (both `--force`), build ✓ (dist rebuilt; root-export leak check on built artifact), tests **3 files / 61 passed** ✓, coverage **96.38 / 88.88 / 100 / 97.89** ✓ — all exact matches to evidence.
- advantage-games: lint **0 errors / 71 pre-existing warnings** (none in task-4 files) ✓; `tsc --noEmit` ✓; targeted suites **4 files / 11 tests** ✓; full Jest **164 files / 1469 passed** ✓ (one `hauntedLibrary` wall-clock flake on the first parallel run passed in isolation and in a clean full rerun — the contention class the evidence disclosed); `next build` ✓ (`/qc` static).
- advantage-play-kit: 41 files / 238 tests ✓. game-contracts: 4 files / 40 tests ✓.
- Measure guards: task-4 evidence 7/7 ✓; evidence lineage (incl. fail-closed negatives) ✓; readiness ✓; task-3 acceptance **5/6 — see Finding M-1**.
- React Doctor `--scope changed`: **100/100, 0 issues** ✓.
- Graph: main `graph.db` remains stale (2026-07-26; evidence honestly discloses the blocked incremental update). Scoped fresh scans reproduced: cartridges **539 nodes / 606 edges** (exact match); app **9012 / 10993** vs recorded 9001 / 10983 — delta isolated to regenerated `.next/types` build artifacts after rebuild, not source drift (Finding L-3). Doc audit on the fresh cartridges graph: zero undocumented functions/interfaces/type aliases in the QC module.
- Full 56-task Turbo gate was **not** re-run end-to-end (cost); every constituent gate covering the change surface was re-run individually and passed. No commit was created (git log verified); unrelated dirty work (primary-advantage chart, backend/db job harness, `.opencode` state) was left untouched.

## 7. Findings

### Critical
None.

### High
None.

### Medium
- **M-1 — Task-3 acceptance guard now fails against the authorized task-4 start.** `measure/tests/test_apk_existing_core_cutover_task3_acceptance.py::test_plan_and_metadata_complete_only_task3` hard-asserts plan task 4 is `- [ ]`; the plan correctly shows `- [~]` (task 3's acceptance explicitly authorized beginning task 4). The guard was not relaxed when task 4 began, so the track's own guard suite currently fails 1/6 — inconsistent with the evidence's guard-pass claims. The plan state is right; the guard is stale. Remediation: relax the assertion to permit `[~]` while continuing to reject `[x]` (no completion claim), then re-run the suite. Does not undermine the task-4 evidence itself, which is hash-exact and behaviorally verified.

### Low
- **L-1 — Astral-mage QC wrong-hit score is not floored at zero.** The accepted historical source applies `Math.max(0, score - 25)`; the QC adapter subtracts 25 unbounded (diverges only at score 0; the package test asserts only `toBeLessThan`, so the nuance is unobserved). Claim text ("deducted score") remains satisfied; ziggurat correctly matches its own unfloored history.
- **L-2 — Targeted-test labeling undercounts the touched scope.** Evidence records `targeted_tests: 3 files / 7 tests`; the task also modified `StandardPackQc.test.tsx` (4 tests). The 3-file/7-test statement is true but incomplete — the four touched suites total 11 tests, all passing.
- **L-3 — App graph counts drifted +11 nodes / +10 edges** versus the recorded scan (9012/10993 vs 9001/10983), isolated to regenerated `.next/types` declaration files after rebuild; main `graph.db` remains unrefreshed (disclosed as OS-blocked). Explainable artifact drift, not source drift.
- **L-4 — Metadata `deviation_notes` is stale relative to the current suite.** It still states "the full Game Cartridges suite intentionally retains 20 Red failures"; the suite is now 61/61 green (the Red file became the task-4 Green QC suite). Historical context, but reads as current state.

### Informational
- Dungeon-liberator `enter-portal-before-all-words`, ziggurat `select-nonadjacent-node`, and astral-mage `hit-inactive-target` are intentional no-ops in the adapters, matching accepted source semantics (portal without full trail, nonadjacent selection, inactive target all return unchanged state).
- jest-haste-map duplicate-mock warning stems from the `.next/standalone` build artifact, not source.
- Evidence `status: complete-with-disclosures` and the claims block were checked field-by-field: no Reading/Primary host proof, no tenant-safe persistence, no retirement, no cutover authorization, no broader-cohort acceptance, no commit — all consistent with repository state.

## 8. Disposition

**review-pass-progression-hold.** The task-4 implementation and evidence are substantively verified: every hash recomputes exactly; quarantine holds at source, built-artifact, and runtime levels; semantic bindings and the 7-asset selected union are exact; deterministic mechanics match the accepted claim locators in source and in live browser behavior; real-input compact/wide proof was independently reproduced with screenshots. No Critical or High findings. Task 4 **remains in progress**; product-owner acceptance is **absent** and not implied. Recommended before any owner-acceptance request: remediate M-1 (guard relaxation), and consider L-1/L-2/L-4 tidy-ups.
