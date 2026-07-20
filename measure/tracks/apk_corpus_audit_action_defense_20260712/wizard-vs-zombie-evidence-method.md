# Wizard vs Zombie — Evidence Collection Method (T4, evidence-collector)

Collector: `evidence-collector-wizard-vs-zombie:t4:2026-07-20`
Baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` (frozen T2 baseline)
Track: `apk_corpus_audit_action_defense_20260712` (Batch A, game #3)
Artifact: `wizard-vs-zombie-claim-ledger.json` — 77 atomic claims, all range-hash verified.

## Method

1. Located every Wizard vs Zombie record in the accepted T2 artifacts:
   - `game-identity-ledger.json` (canonical/catalog identity, two route aliases) at lines 1658-1726.
   - `scene-state-denominator.json` (WizardZombieGame component declaration at line 86; StartScreen at line 59 in RA host; three gamePhase states; two `WizardZombieState.status` states at lib/games/wizardZombie.ts:36).
   - `source-denominator.json` (full file/edge records for the page, both hosts, both API routes, both lib files, and both test files).
   - `asset-file-denominator.json` (8 PNG asset records + 1 vocab fixture + 1 cover + 1 standalone PNG).
   - `historical-source-denominator.json` (both page files classified as `current`).
   - `phase3-reconciliation.json` (canonical-path enumeration for the same 11 asset paths).
   - Cohort assignment confirmed via `accepted-partition-manifest.json` line 46-49 (`Wizard vs Zombie` → `Action and defense`).

2. Extracted all source content with `git show <baseline>:<path>` so claims cite the frozen baseline, not the working tree. Working-tree blobs were verified identical to baseline for the cited files except `apps/advantage-games/src/lib/gameCards.ts` (post-baseline change `d1e9d034`; baseline blob cited). The other 12 cited files (component, lib, page, both API routes, both tests, indicator, e2e, blueprint, audit) all match the working tree.

3. Range-hash convention: SHA-256 of the cited lines each terminated by `\n`, verified against the T2 evidence convention. T2 game-identity-ledger.json line 68 (catalog `id: 'wizard-vs-zombie'` record) is recorded with hash `c0a1d4a5...` which my computation confirms (`hash_range.py` recomputes identical hash for line 68). Every claim's `cited_range_sha256` was recomputed and asserted.

4. Claims were anchored by unique source substrings and resolved to line numbers mechanically; absence claims (withdrawnApkGameIds membership, matchMedia presence, generic defense-template import, XP-multiplier parameter) were machine-checked against full file content.

## Evidence-class breakdown

| class | claims | basis |
|---|---|---|
| current-source | 28 | implementation files at baseline + accepted denominator records |
| asset | 10 | component ASSETS references + accepted asset-denominator metadata |
| test | 8 | five test files across both hosts |
| route | 7 | page and API route files in both hosts |
| mechanic | 24 | lib + component + indicator + page submit + StartScreen |
| state | 5 | gamePhase useState + Difficulty + WizardZombieState.status |
| component | 6 | scene declarations + shared screens + indicator import |
| identity | 9 | catalog + identity-ledger + absent-from-withdrawn-set |
| history | 4 | compliance audit track + mechanic blueprint + RA difficulty divergence |
| negative-fixture | 4 | XP-multiplier injection, generic defense-template, regex-keyword matchMedia, withdrawn-id membership |

Confidence: 70 high, 5 medium (WVZ-ASSET-009 standalone PNG unreferenced; WVZ-MECH-016 floating-text claim; WVZ-NEG-002 has long-range citation that covers the full file), 2 low (WVZ-ASSET-010 mp3 not in T2 denominator; WVZ-NEG-003 absence-style), and the four REJECT-class negative fixtures WVZ-NEG-001/002/003/004.

## Hosts and copies

- Two current hosts:
  - `apps/advantage-games` (canonical) — uses the shared GameStartScreen/GameEndScreen + wizardZombie.ts (3-tier Difficulty). 745-line component.
  - `apps/reading-advantage` (copy with divergences) — keeps a bespoke `StartScreen.tsx` (3-tab briefing/rankings/vocabulary, 4-tier Difficulty including `extreme`), inline briefing overlay (component-ra.tsx 354-480), 817-line component, controller-based API routes (`WizardZombieController.*`), `useAdaptiveDifficulty` is absent and so is `useAdaptiveDifficulty` recording, page back-href is `/` rather than `/student/games`, `useSession` comes from `@reading-advantage/auth-client`.
- `apps/primary-advantage` contains **no** wizard-vs-zombie paths at baseline (`git ls-tree -r <baseline>` enumeration shows zero matches under `apps/primary-advantage/`).
- `apps/www-reading-advantage/` contains `public/images/wizard-vs-zombie.png` (byte-identical to the advantage-games standalone PNG, but **not in the T2 asset denominator**) and `wizard-vs-zombie.mp3` (also **not in the T2 asset denominator**).

## Visible unknowns / flagged items for mapper and reviewer

1. **Denominator-gap candidate (stop-loss observation, count 1).** `apps/www-reading-advantage/wizard-vs-zombie.mp3` and `apps/www-reading-advantage/public/images/wizard-vs-zombie.png` exist at baseline but are absent from the T2 asset-file-denominator (no line match in `grep`). The www PNG is byte-identical to the advantage-games standalone PNG at line 5837. Decision: amend the asset denominator or accept exclusion.
2. **RA test/source mismatch.** `apps/reading-advantage/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.test.tsx` lines 91-103 reference "Arcane Survival" briefing copy and a "Start Survival" button — but the RA component renders a "Game Rules" panel and the StartScreen.tsx uses `t("wizardVsZombie.startGame")` (line 407). The test will fail if the assertion runs against unmocked component.
3. **RA Difficulty divergence.** RA host retains 4-tier Difficulty type with `extreme` (lib/games/wizardZombie.ts line 33) and StartScreen.tsx DIFFICULTY_CONFIG lines 66-87. The advantage-games host uses only `easy|medium|hard`. Compliance audit 2026-04-26 #13 confirmed advantage-games fix but RA host did not adopt it.
4. **Asset duplication.** Apps/advantage-games has two byte-identical copies of every sprite: `public/games/vocabulary/wizard-vs-zombie/*` and `public/games/wizard-vs-zombie/*`. The component only loads the `vocabulary/` paths. The legacy paths may exist for backward compatibility.
5. **Lib diff.** `apps/reading-advantage/lib/games/wizardZombie.ts` is structurally similar but adds the `extreme` tier; the RA component passes difficulty as a prop (page-ra.tsx line 149) while the AG component keeps difficulty as local state.
6. **API completion divergence.** AG completion route is a 6-line factory POST from `createCompleteRoute()` (force-static); RA completion route uses `next-connect` + `protect` middleware + `WizardZombieController.completeGame`. The RA host has additional ranking route not present in AG.

## Negative fixtures

- WVZ-NEG-001 (mechanic): XP-multiplier injection on completion route — must be REJECTED (no parameter exists).
- WVZ-NEG-002 (mechanic): generic defense-template substitution — must be REJECTED (wizard-vs-zombie has its own bespoke 745-line component with shared GameStartScreen/GameEndScreen + wizardZombie.ts).
- WVZ-NEG-003 (mechanic): regex-keyword matchMedia responsive template — must be REJECTED (`matchMedia` does not appear in the component, lib, or indicators; responsive behavior is via Tailwind sm:/md: + useGameDimensions()).
- WVZ-NEG-004 (identity): wizard-vs-zombie is a withdrawn-id — must be REJECTED (mechanical enumeration of the baseline 14-id withdrawnApkGameIds set confirms absence; catalog line 68 status='playable').

## Stop-loss observations

- **SLO-WVZ-1 (denominator-gap candidate):** `apps/www-reading-advantage/wizard-vs-zombie.mp3` and `apps/www-reading-advantage/public/images/wizard-vs-zombie.png` exist at baseline but are absent from the T2 asset-file-denominator. The www PNG is byte-identical to the advantage-games standalone PNG which IS in the denominator (line 5837). Both files are unreferenced from any wizard-vs-zombie source file. Recorded as a denominator-gap candidate for the orchestrator / asset auditor to decide whether to amend the denominator or accept exclusion.

No evidence file under `measure/archive/apk_source_denominator_inventory_20260712/` was modified. No other role's receipts were touched.