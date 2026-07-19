# Abyssal Well — Evidence Collection Method

**Role:** evidence-collector-abyssal-well:t3:2026-07-20 (role isolation: this agent holds only the
evidence-collector role for The Abyssal Well in track `apk_three_game_truth_pilot_20260712`)
**Game:** The Abyssal Well (`sentence/abyssal-well`) — disposition `historical/withdrawn`
**Date:** 2026-07-20 · **HEAD at collection:** `da51b4e006cdce175171077e97c86089a38dbd5b`

## 1. Disposition

The current implementation is **deleted**. `current_implementation = 0` claims; every behavioral
claim is historical. Deletion commit:

- **Commit:** `0ee9184728c11188c40b27c23fa649a9b67952dc` — `chore(advantage-games): retire cancelled renderer experiments` (2026-07-11)
- **Parent (evidence revision):** `c76f6af3f62c03979f5073a871e775afd952a070`
- Verified ancestor of HEAD via `git merge-base --is-ancestor`.

## 2. Search methods (per claim `history_search_method`)

1. **path-first-parent** — locate the deletion via
   `git log --all --diff-filter=D -- <path>`, then cite blob content at the first parent
   (`c76f6af3`) with `git show <parent>:<path>`.
2. **name pickaxe** — `git log --all -S 'abyssal' / -S 'AbyssalWell'` and
   `git grep -i abyssal <rev>` across revisions and app trees.
3. **catalog-id** — trace the `abyssal-well` catalog/slug identifier through
   `src/lib/gameCards.ts`, `packages/domain/src/games/schema.ts`, and archived design docs.

## 3. Hash convention

- `blob_sha256` — SHA-256 of the exact blob bytes at the recorded revision.
- `cited_range_sha256` — SHA-256 of the exact bytes of lines `line_start..line_end` inclusive,
  newline terminators preserved.
- Binary blobs (PNG): the whole file is the cited unit; `line_start = line_end = 1` and
  `cited_range_sha256 == blob_sha256`.
- All 15 historical-denominator blob hashes were independently recomputed and match
  `historical-source-denominator.json` exactly.

## 4. Revisions touched (3 distinct)

| Revision | Role |
|---|---|
| `c76f6af3f62c03979f5073a871e775afd952a070` | Deletion parent — primary evidence revision (16 deleted files) |
| `1c44854682b18a2393efd265c2271f824e228a3d` | Monorepo migration — earliest reachable revision (2D react-konva implementation) |
| `da51b4e006cdce175171077e97c86089a38dbd5b` | Current HEAD — current-name matches (domain schema enum, archived spec), orphan cover |

Deletion commit `0ee91847…` is metadata evidence (commit message/scope), not blob-cited.

## 5. Findings summary (for mapper / reviewer)

1. **Ruleset:** final implementation was the "cycling-words" ruleset (Story S5,
   `r3f_rendering_tier_20260708`): all words spawn at once, order derived from translation,
   wrong hits cost lives, rim breaches wrap harmlessly (+15% speed per lap).
2. **Intra-revision inconsistency (High):** at the deletion parent the UI shell
   (`AbyssalWellGame.tsx`) imports `spawnEnemy`/`rotatePlayer`/`enemy.spawnInterval`, which do
   not exist in the logic/config blobs, and the scene/projection layer still uses the pre-S5
   `lane` field model while the logic uses continuous `angle`. The tree could not type-check
   as-is — corroborates "cancelled renderer experiments".
3. **Spec conflicts (recorded, not resolved):** 2026-03-20 design doc XP formula and
   breach-damage rule differ from the final implementation (AW-HIST-031/032/097/098).
4. **Denominator discrepancy (visible unknown):** the E2E spec
   `tests/e2e/games/sentence/abyssal-well.spec.ts` (blob `222a4a7e…`) existed at the deletion
   parent and was deleted by the same commit, but is **absent** from the 15 Abyssal Well records
   in `historical-source-denominator.json` (AW-HIST-076). Collector count: 16 deleted files.
5. **Current-name matches:** `packages/domain/src/games/schema.ts` line 26 still lists
   `"abyssal-well"` in the canonical `gameTypeEnum`; orphan cover
   `public/games/cover/abyssal-well-cover.png` (`b495dce9…`) survives at HEAD referenced only by
   audit docs; archived design doc `measure/archive/abyssal-well-20260320/` and compliance-audit
   track remain in-tree.
6. **Negative copy result:** no Reading/Primary/Science Advantage copy ever existed
   (`-S 'abyssal'` over all refs on those app trees → zero). Marked `history-search-exhausted`.
7. **Audio/data assets:** none at any reachable revision — `history-search-exhausted`, not
   fabricated.

## 6. Negative-evidence fixtures (must fail / must reject)

- `AW-HIST-NEG-001` — asserts current routes exist at HEAD. Verification:
  `git ls-tree -r HEAD -- <abyssal paths>` returns zero paths. **MUST_FAIL.**
- `AW-HIST-NEG-002` — injected "daily-challenge streak XP" mechanic. No evidence in any searched
  revision. **REJECTED.**

## 7. Stop-loss compliance

No fabricated evidence. Absences (pre-monorepo history, audio, cross-app copies) are marked
`history-search-exhausted` with the exact search recorded. One unsupported/false claim stops the
batch — the two negative fixtures exist precisely to prove the gate works.
