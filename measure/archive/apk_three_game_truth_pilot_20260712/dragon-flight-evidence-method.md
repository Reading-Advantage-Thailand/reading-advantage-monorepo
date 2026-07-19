# Dragon Flight — Evidence Collection Method (T3, evidence-collector)

Collector: `evidence-collector-dragon-flight:t3:2026-07-20`
Baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` (frozen T2 baseline).
Artifact: `dragon-flight-claim-ledger.json` — 225 atomic claims, all range-hash verified.

## Method

1. Located every Dragon Flight record in the accepted T2 artifacts (identity ledger,
   source/scene-state/asset/historical denominators, phase-3 reconciliation) and
   confirmed the pilot assignment in the accepted partition manifest.
2. Extracted all source content with `git show <baseline>:<path>` so claims cite the
   frozen baseline, not the working tree. Working-tree blobs were verified identical
   to baseline for all cited files except `apps/advantage-games/src/lib/gameCards.ts`
   (changed post-baseline by `d1e9d034`); the baseline blob is cited there.
3. Range-hash convention: SHA-256 of the cited lines each terminated by `\n`, verified
   against the T2 evidence convention (gameCards.ts line 61 matches
   `1ee49d43…` under this convention). Every claim's `cited_range_sha256` was
   recomputed and asserted during ledger generation.
4. Claims were anchored by unique source substrings and resolved to line numbers
   mechanically; absence claims (no typing controls, no matchMedia, no RA
   progressbar/adaptive hooks) were machine-checked against full file content.

## Evidence-class breakdown

| class | claims | basis |
|---|---|---|
| current-source | 132 | implementation files at baseline + accepted denominator records |
| asset | 43 | component ASSETS references + accepted asset-denominator metadata lines |
| test | 30 | six test files across both hosts |
| route | 11 | page and API route files in both hosts |
| history | 9 | historical denominator records + historical revision blobs |

Confidence: 217 high, 5 medium (DF-ID-014 primary-advantage absence, DF-CTRL-016 /
DF-RESP-013 absence-style claims, DF-TEST-029 mock-path mismatch, DF-ASSET-036
unreferenced menu image), 3 low (DF-ASSET-037 audio usage unverifiable from source,
plus the two REJECT-class negative fixtures DF-NEG-002/DF-NEG-003).

## Hosts and copies

- Two current hosts: `apps/advantage-games` (canonical) and `apps/reading-advantage`
  (copy with divergences: no adaptive difficulty, mount auto-reset, responsive arrow
  geometry, non-accessible timer bar, controller-backed API routes).
- `apps/primary-advantage` contains **no** dragon-flight paths at baseline
  (full `git ls-tree` enumeration, zero matches). The prompt's mention of a Primary
  Advantage host copy is therefore recorded as an *absence*, not a copy.

## Visible unknowns / flagged items for mapper and reviewer

1. **Denominator-gap candidate (stop-loss observation, count 1).**
   `apps/reading-advantage/server/controllers/dragon-flight-controller.ts` exists at
   baseline and is imported by three in-denominator route files, but has no record in
   the accepted denominator. No ledger claim cites its content (only the importing
   route lines). Discovery auditor / orchestrator must decide whether this is a
   denominator amendment or an accepted exclusion before mapping proceeds.
2. `apps/advantage-games/public/sounds/dragon-flight-adventure.mp3` (6.19 MB) carries
   the game slug but is not referenced from the dragon-flight component; its runtime
   usage is unresolved (low-confidence claim DF-ASSET-037).
3. `apps/advantage-games/public/dragon-flight.png` is unreferenced from dragon-flight
   source (medium-confidence claim DF-ASSET-036).
4. RA page test mocks `@/components/games/dragon-flight/DragonFlightGame`, which does
   not match the page's actual import path (`.../vocabulary/dragon-flight/...`);
   whether the mock intercepts is unresolved (DF-TEST-029).
5. Boss battle is partially presentational: bossHealth/dragonCount drain on a 450 ms
   tick and projectile hits have no mechanical effect; victory is decided purely by
   `dragonCount >= bossPower` at results time (DF-MECH-013, DF-MECH-032, DF-MECH-049).
6. Lib (`selectGate`) and component apply *different* miss penalties (fixed -1 vs
   difficulty penalty); the lib reducer is exercised only by unit tests, the component
   by the runtime (DF-MECH-009 vs DF-MECH-023).
7. The deleted `public/vocab/dragon-flight.json` fixture is byte-identical to the live
   `public/vocab/dragon-rider.json` (shared hash group) — cross-game fixture reuse the
   mapper may need for Abyssal-Well-style history work.
8. No explicit compact/wide responsive contract exists beyond Tailwind `sm:`/`lg:`
   utilities and measured-stage scaling (DF-RESP-013); intentional profile contracts
   remain a Phase 2/3 task.

## Negative fixtures

- DF-NEG-001 (asset): slug-allowlist role assignment — must FAIL (real evidence cited).
- DF-NEG-002 (mechanic): unsupported XP-multiplier injection, no citation — must be REJECTED.
- DF-NEG-003 (asset): directory-only citation — must be REJECTED.

No evidence file under `measure/archive/apk_source_denominator_inventory_20260712/`
was modified. No other role's receipts were touched.
