# RPG Battle — Evidence Collection Method (T3 pilot)

- Track: `apk_three_game_truth_pilot_20260712`
- Game: RPG Battle (`vocabulary/rpg-battle`), pilot cohort per accepted partition manifest
- Collector: `evidence-collector-rpg-battle:t3:2026-07-20` (role-isolated; no other T3 role held)
- Source baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`
- Collection-time HEAD: `da51b4e006cdce175171077e97c86089a38dbd5b` (baseline verified as ancestor)

## Inputs (frozen, read-only)

1. `measure/apk-evidence-reconstruction-program.md` — program rules.
2. `measure/tracks/apk_three_game_truth_pilot_20260712/spec.md` — pilot criteria.
3. `measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json`
4. `.../accepted-partition-manifest.json` — RPG Battle in `T3:pilot`.
5. `.../phase3-reconciliation.json` — identity/copy/graph records.
6. `.../source-denominator.json` — 179 records, 60 unique paths, 113 graph edges for `rpg-battle`.
7. `.../scene-state-denominator.json` — 4 scene records, 18 state records, **0 proven transitions**, 6 unresolved `flashTone` write candidates for RPG Battle.
8. `.../asset-file-denominator.json` — 37 RPG Battle candidate files.
9. `.../historical-source-denominator.json` — both page.tsx files classified `current`.
10. `.../game-identity-ledger.json` — canonical identity `vocabulary/rpg-battle`, catalog id `rpg-battle`.

No file under `measure/archive/apk_source_denominator_inventory_20260712/` was modified.
The quarantined failed-track artifact `measure/archive/apk_cross_game_asset_ontology_20260712/mechanic-blueprints/rpg-battle.md`
was treated as negative evidence only and was **not** used as a claim source (program rule, quarantine).

## Hash convention (validated)

- `cited_range_sha256` = SHA-256 of the exact bytes of lines `start..end` inclusive, each line
  terminated by its in-file newline (equivalent to `sed -n 'A,Bp' file | sha256sum`).
  Validated against accepted T2 records before use:
  `BattleScene.tsx:19` → `1a7d6fc7…` and `Sprite.tsx:6` → `eec247fb…` both reproduce exactly.
- `blob_sha256` = SHA-256 of the whole file. Validated: working-tree
  `apps/advantage-games/.../rpg-battle/page.tsx` reproduces denominator blob `1ec182f5…`.
- Binary/data assets use whole-file citation (`citation_kind: binary-whole-file`); the hash is the
  accepted identical-hash-group value from the asset denominator.

## Baseline fidelity

All cited working-tree files were verified byte-identical to the baseline with
`git diff --quiet 23bb5ad5… HEAD -- <path>`. One cited file changed after the baseline:
`apps/advantage-games/src/lib/gameCards.ts` (catalog). Its catalog claim (RPG-ID-001) is therefore
pinned to `git show 23bb5ad5…:apps/advantage-games/src/lib/gameCards.ts` lines 52–59.

## Collection procedure

1. Extracted all RPG Battle records from the six frozen manifests (identity, files, scenes,
   states, transition write candidates, assets, copies, graph edges).
2. Read every implementation file end-to-end: both host `page.tsx` files, `useRPGBattleStore.ts`
   (the multi-state machine), the four `rpgBattle*` libs, all twelve `rpg-battle` components in
   both hosts, both API route sets, `RpgBattleController`, `useSound`, `GameEndScreen`,
   `sampleVocabulary`, and all 18 test files.
3. Wrote one atomic claim per fact; every claim carries a separately stated interpretation and a
   bounded confidence. Line citations were machine-asserted (`expect()` checks in the generator
   fail loudly on drift) and range hashes recomputed by an independent verification pass after
   generation (6 spot re-derivations across categories: all MATCH).
4. Negative claims (no mana, no defend action, no custom keyboard handlers, no resize listener,
   no audio files, dead `heal` floating-text variant, dead `defend` pose, unused
   PlayerSprite/EnemySprite) were each verified by an explicit grep/enumeration command recorded
   on the claim.
5. Executed both hosts' RPG Battle test suites at HEAD `da51b4e0`:
   - `apps/advantage-games`: `npx jest "rpg" --silent` → **17 suites / 65 tests, all pass**.
   - `apps/reading-advantage`: `npx jest "rpg-battle"` → **3 failed suites**
     (`BattleResults.test.tsx` and `page.test.tsx` fail to parse — "Jest encountered an unexpected
     token"; `BattleScene.test.tsx` runs but its background-image test fails on a stale
     `/games/rpg-battle/…` path expectation vs the component's `linear-gradient`-wrapped
     `/games/vocabulary/rpg-battle/…` URL) — 1 failed test, 19 passed, 11 suites total.
     Recorded as RPG-TEST-021; not silently waived.

## Multi-state findings (denominator vs collected)

- Denominator state coverage: 9 `SpritePose` literals × 2 hosts, 0 proven transitions.
- Collected distinct named state vocabularies (each with exact line evidence):
  `BattleStatus` (4), `BattleTurn` (2), `BattlePose`/`SpritePose` (9, duplicated store/component),
  `BattleAttackPower`/`ActionPower` (2), `BattleSelectionStep` (4), `BattleLogEntry.type` (3),
  `FlashTone` (2), `FloatingTextItem.type` (4, one dead), `TabType` (3), plus page-local boolean
  states (`showStartScreen`, `showResults`, `isLoading`, `error`, `inputLocked`,
  `revealedTranslation`). 47 distinct state claims; 22 transition claims (incl. the 6 unresolved
  denominator write candidates, confirmed at their exact lines).

## Negative-evidence fixtures (must fail)

- `RPG-NEG-001` — fabricated mana-system mechanic, no evidence: expected **REJECTED**.
- `RPG-NEG-002` — true claim cited against a directory: expected **REJECTED** (directory citation).
- `RPG-NEG-003` — asset role assigned by slug allowlist (`*_pose_sheet_3x3.png` → `battle-sprite`):
  expected **FAILED** (banned shortcut).

## Visible unknowns / findings handed to later roles

1. `apps/advantage-games` has **no** `/api/v1/games/rpg-battle/ranking` route, yet its StartScreen
   rankings tab fetches it (RPG-ID-011, RPG-CTL-009) — the tab degrades to its empty state in the
   standalone app. Browser audit should confirm the observed behavior.
2. Reading-advantage test surface is partially broken at collection HEAD (RPG-TEST-021): two
   suites unparseable by the RA jest config, one stale-path assertion. Truth-test author should
   treat RA suite outcomes as unreliable rather than as mechanic evidence.
3. `PlayerSprite.tsx`/`EnemySprite.tsx` are unreferenced (dead code) and reference
   `/games/rpg-battle/…` asset paths that do not exist under `reading-advantage/public`
   (RPG-ASSET-041).
4. `MAX_TURNS = 12` is not enforced as a turn limit — it only feeds the XP formula (RPG-MECH-002).
5. The rankings enemy selector is fixed `grid-cols-4` at all widths (RPG-RESP-003) — compact-width
   crowding is plausible but unverified without browser evidence.
6. Resource ceilings were not supplied by the orchestrator prompt; actual usage is declared in the
   receipt and the missing-ceiling condition is flagged rather than silently waived.
