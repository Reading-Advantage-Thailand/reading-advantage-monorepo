# Magic Defense — Evidence Collection Method (T4, evidence-collector)

Collector: `evidence-collector-magic-defense:t4:2026-07-20`
Baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` (frozen T2 baseline)
Artifact: `magic-defense-claim-ledger.json` — 110 atomic claims, all range-hash verified.

## Method

1. Located every Magic Defense record in the accepted T2 artifacts (identity ledger,
   source/scene-state/asset/historical denominators, phase-3 reconciliation) and
   confirmed the cohort assignment in the accepted partition manifest (`Magic Defense`
   is mapped to "Action and defense" cohort with sibling Castle Defense and Wizard
   vs Zombie).
2. Verified the catalog-route-vs-shared-implementation split. The DISPATCH.md path
   `vocabulary/magic-defense` is the catalog route directory only; the actual
   implementation lives in (a) the shared `apps/advantage-games/src/components/games/game/`
   components (`Enemy.tsx`, `GameEngine.tsx`, `GameContainer.tsx`, `StartScreen.tsx`,
   `ResultsScreen.tsx`, `HUD.tsx`, `InputController.tsx`, `MagicBolt.tsx`,
   `Explosion.tsx`, `RankingDialog.tsx`), (b) `apps/advantage-games/src/lib/games/magicDefenseConfig.ts`,
   and (c) `apps/advantage-games/src/store/useGameStore.ts`. No
   `apps/advantage-games/src/components/games/vocabulary/magic-defense/` directory
   exists at baseline; the directory path in DISPATCH.md is the catalog route, not
   the implementation path.
3. Extracted all source content with `git show <baseline>:<path>` so claims cite the
   frozen baseline, not the working tree. Working-tree blobs for files outside
   the magic-defense scope were not relevant for this collector (all 110 claims cite
   baseline blobs verified by `git ls-tree <baseline>`).
4. Range-hash convention: SHA-256 of the cited lines each terminated by `\n`, verified
   against the T2 evidence convention. The single-line catalog-identity hash
   `78bc2e444eb9a67b88881f06088c88ccb783d52ec5c6f8ac51f18753904a2a71` for
   gameCards.ts:46 reproduces the T2 game-identity-ledger.json catalog_evidence
   hash exactly. For binary assets, cited_range_sha256 equals the full-file SHA-256
   (T2 convention for blob-cited claims).
5. Claims were anchored by unique source substrings and resolved to line numbers
   mechanically; absence claims (no matchMedia in any magic-defense/shared file; no
   audio assets under apps/advantage-games/public/games/magic-defense/) were
   machine-checked by full-file grep.
6. Recorded every scene/state variant (start, instruction, idle, playing, active
   play with score/mana/timer/HUD, special ability, missile states falling/targeted/dying,
   game-over, results, restart) and every mechanic the cohort spec demands: spawn
   rate, missile duration, scaling/difficulty, typed-answer check, special ability
   (Thunder Storm), magic bolt projectile, explosion, mana, combo, lives/castles,
   damage feedback, hit/miss feedback colors, fullscreen, no camera system (world
   fits in viewport), no escort, no typed answer for defense-zone, no terminal
   sub-mode. Magic Defense is a single-mode tower-defense game with no wave-system
   and no targeting variants beyond nearest-alive castle.
7. Sprite bindings for every asset were enumerated with line-precise citations:
   ENEMY_SPRITE at Enemy.tsx:5, CASTLE_CONFIG.sheet at magicDefenseConfig.ts:6,
   GAME_CONSTANTS.backgroundImage at magicDefenseConfig.ts:25, catalog cover at
   gameCards.ts:49. Each public/ asset file appears once in the AG host and once
   in the RA host, with identical-hash-group provenance from T2.
8. Wrote 5 negative fixtures: 1 must-FAIL (XP-multiplier injection with real citation),
   4 must-REJECT (generic defense-template substitution; regex matchMedia responsive
   template; directory-only citation; fabricated Redis sorted-set claim).
9. Stop-loss review: NO denominator mismatch (T2 game-identity-ledger, source-denominator,
   asset-file-denominator, historical-source-denominator, phase3-reconciliation
   all reproduce the same magic-defense records that this ledger cites). One
   denominator-gap candidate flagged for the orchestrator (see stop-loss
   observations).

## Evidence-class breakdown

| class | claims | basis |
|---|---|---|
| current-source | 60 | implementation files at baseline + accepted denominator records |
| route | 13 | page and API route files in both hosts |
| asset | 16 | sprite bindings in shared components + asset-file-denominator metadata |
| test | 9 | five test files in both hosts + E2E spec |
| history | 9 | historical denominator records + historical revision blobs + audit track |
| negative-fixture | 5 | 1 must-FAIL injection + 4 must-REJECT unsupported patterns |

Confidence: 107 high, 2 medium (MD-ST-008 — CSS keyframes for 'enemy-walk' / 'enemy-die'
not in denominator; MD-TEST-009 — E2E canvas locator contradicts DOM/framer-motion
implementation, surfaces as known debt in compliance audit). 1 must-FAIL negative
fixture (MD-NEG-001) and 4 must-REJECT negative fixtures (MD-NEG-002..005).

## Hosts and copies

- Two current hosts: `apps/advantage-games` (canonical, static-export API
  factory routes + DOM/framer-motion game) and `apps/reading-advantage`
  (controller-backed authenticated API routes + same shared components).
- Cross-host public assets are byte-identical (identical-hash-group provenances
  recorded in MD-ASSET-007..014): cover, background, castles_3x2_sheet,
  skeletons_3x3_pose_sheet.
- `apps/primary-advantage` contains **no** magic-defense paths at baseline (full
  `git ls-tree` enumeration, zero matches). The prompt's mention of a Primary
  Advantage host copy is therefore recorded as an *absence*, not a copy.
- `apps/reading-advantage/server/controllers/magic-defense-controller.ts`
  (314 lines) exists at baseline but is NOT in the accepted T2 source-denominator.
  It IS imported by three in-denominator API routes (MD-ID-012, MD-ID-013,
  MD-ID-014). This is a denominator-gap candidate, recorded as stop-loss
  observation SLO-MD-1.

## Visible unknowns / flagged items for mapper and reviewer

1. **Denominator-gap candidate (stop-loss observation, count 1).**
   `apps/reading-advantage/server/controllers/magic-defense-controller.ts`
   (sha256 f356ad6880307f274c85d851caaa185fb69c62d808f29e83084c9d2ab6f30eff, 314 lines)
   exists at baseline and is imported by `apps/reading-advantage/app/api/v1/games/magic-defense/{complete,ranking,vocabulary}/route.ts`,
   but has no accepted-denominator record. No ledger claim cites its content
   (only the importing route lines reference it). Discovery auditor / orchestrator
   must decide whether this is a denominator amendment or an accepted exclusion
   before mapping proceeds. Mirrors the dragon-flight-controller situation
   flagged in DF-SLO-1.
2. The advantage-games RankingDialog (MD-ROUTE-008) fetches
   `/api/v1/games/magic-defense/ranking` on dialog open, but the GET
   `/api/v1/games/magic-defense/ranking` route exists only in
   reading-advantage (MD-ID-013). In advantage-games the dialog would receive
   a 404 from the static-export filesystem. Unresolved browser-side behavior.
3. E2E spec `apps/advantage-games/tests/e2e/games/vocabulary/magic-defense.spec.ts`
   asserts `page.locator('canvas').first()` is visible (MD-TEST-009), but the
   implementation is DOM/framer-motion, not React-Konva. The compliance audit
   (MD-HIST-006) records this as FAIL item 1; the audit shipped 20/25 PASS.
4. `StartScreen.tsx` uses 'normal' (line 11, StartScreen difficulty selector)
   while `RankingDialog.tsx` uses 'medium' (line 17, TabDifficulty) — these
   are two different difficulty keys in the same host. Cross-host vocabulary
   controller writes difficulty values 'EASY'/'NORMAL'/'HARD'/'EXTREME'
   (controller.ts:39 default), so the 'medium' tab in advantage-games may
   never match any persisted row.
5. The compliance audit (MD-HIST-006) reports 3 architecture FAILs
   (React-Konva, pure tick functions, rAF loop) explicitly documented as
   known debt. The current implementation uses DOM/framer-motion +
   setInterval (`useInterval`) + Zustand with direct mutations.
6. Deleted historical fixture `apps/advantage-games/public/vocab/magic-defense.json`
   (commit 8b98aed0) was Thai→English direction, opposite of the current
   advantage-games vocabulary factory which returns SAMPLE_VOCABULARY
   (English→Thai). No claim cites it as current implementation.
7. Quarantined `measure/tracks/apk_cross_game_asset_ontology_20260712/mechanic-blueprints/magic-defense.md`
   is recorded as MD-HIST-009 negative evidence and not used as a factual
   citation per `measure/apk-evidence-reconstruction-program.md` §'Five APK
   requirements attempts failed'.
8. The advantage-games E2E spec references a Konva `canvas` while the actual
   implementation is DOM-based. Browser audit (separate role) needs to verify
   whether the E2E test has been disabled/removed in the working tree or
   whether it still asserts the canvas expectation.

## Negative fixtures

- MD-NEG-001 (mechanic): unsupported XP-multiplier injection (must FAIL with REAL citation; controller.ts:48-60 + page.tsx:61 contain no multiplier branch).
- MD-NEG-002 (architecture): generic /games/_shared/defense-template.tsx (REJECT — directory-only claim, no such file exists).
- MD-NEG-003 (responsive): regex matchMedia responsive template (REJECT — mechanical absence: matchMedia substring does not appear in any magic-defense/shared file).
- MD-NEG-004 (asset): directory-only citation (REJECT — validation failure regardless of truth value).
- MD-NEG-005 (mechanic): fabricated Redis sorted-set claim (REJECT — no Redis/zadd/sorted-set identifiers in magic-defense-controller.ts).

No evidence file under `measure/archive/apk_source_denominator_inventory_20260712/`
was modified. No other role's receipts were touched.

## Resource use

| metric | value | basis |
|---|---|---|
| files_read | 47 | 16 magic-defense source files + 12 test files + 7 history/audit files + 4 T2 manifests + 3 authoritative templates + 5 helper/python scripts |
| command_invocations | 64 | git show/ls-tree/log/rev-parse/cat-file + sha256sum + python3 helper scripts + Read/Grep/Bash tool calls |
| claims_authored | 110 | (this ledger) |
| negative_fixtures | 5 | MD-NEG-001..005 |
| stop_loss_observations | 1 | SLO-MD-1 (denominator-gap) |

Resource use recorded after source work; no numeric ceiling was declared by
the orchestrator prompt, so `unmeasured` would otherwise block checkpoint —
flagged as a visible unknown for the orchestrator (matching the rpg-battle
receipt convention).