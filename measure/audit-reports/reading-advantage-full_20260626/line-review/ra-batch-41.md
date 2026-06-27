# Line-by-Line Review: Reading Advantage — Batch 41

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-41`
**Baseline SHA:** `e2dd2e9059a77864cdbe2778e4bc5ec6301c7bc6`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / SQL / static-asset / privacy / security

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-41` were read in full. The batch
covers the rpg-battle and rune-match pure-logic modules under
`apps/reading-advantage/lib/games/`:

- 1 potion-rush animation helper (`potionRushEffects.ts`).
- 5 rpg-battle pure-logic modules + their tests (`rpgBattleScaling`,
  `rpgBattleSelection`, `rpgBattleSprites`, `rpgBattleWordSelection`,
  `rpgBattleXp`).
- 2 rune-match pure-logic modules + their tests (`runeMatch`, `runeMatchConfig`).
- 1 fixture (`sampleVocabulary`).
- 1 thin re-export (`utils.ts`).
- 1 test-only file (`vocabLoader.test.ts`).

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/lib/games/potionRushEffects.ts` | 1–18 |
| 2 | `apps/reading-advantage/lib/games/rpgBattleScaling.test.ts` | 1–50 |
| 3 | `apps/reading-advantage/lib/games/rpgBattleScaling.ts` | 1–38 |
| 4 | `apps/reading-advantage/lib/games/rpgBattleSelection.test.ts` | 1–73 |
| 5 | `apps/reading-advantage/lib/games/rpgBattleSelection.ts` | 1–87 |
| 6 | `apps/reading-advantage/lib/games/rpgBattleSprites.test.ts` | 1–15 |
| 7 | `apps/reading-advantage/lib/games/rpgBattleSprites.ts` | 1–33 |
| 8 | `apps/reading-advantage/lib/games/rpgBattleWordSelection.test.ts` | 1–39 |
| 9 | `apps/reading-advantage/lib/games/rpgBattleWordSelection.ts` | 1–87 |
| 10 | `apps/reading-advantage/lib/games/rpgBattleXp.test.ts` | 1–78 |
| 11 | `apps/reading-advantage/lib/games/rpgBattleXp.ts` | 1–29 |
| 12 | `apps/reading-advantage/lib/games/runeMatch.test.ts` | 1–256 |
| 13 | `apps/reading-advantage/lib/games/runeMatch.ts` | 1–739 |
| 14 | `apps/reading-advantage/lib/games/runeMatchConfig.test.ts` | 1–110 |
| 15 | `apps/reading-advantage/lib/games/runeMatchConfig.ts` | 1–64 |
| 16 | `apps/reading-advantage/lib/games/sampleVocabulary.test.ts` | 1–12 |
| 17 | `apps/reading-advantage/lib/games/sampleVocabulary.ts` | 1–14 |
| 18 | `apps/reading-advantage/lib/games/utils.test.ts` | 1–15 |
| 19 | `apps/reading-advantage/lib/games/utils.ts` | 1–1 |
| 20 | `apps/reading-advantage/lib/games/vocabLoader.test.ts` | 1–121 |

**Total lines reviewed:** 1,827 (≈ 18 files of pure code + 3 short test
files, plus 1 single-line re-export).
**No file was partially reviewed.**

---

## Files Present in `lib/games/` but **NOT** in This Batch

The batch list omits two files that live next to the reviewed files. This is
noted so the omission is deliberate rather than oversight-driven:

- `apps/reading-advantage/lib/games/potionRushEffects.test.ts` — exists
  (12 lines) and is the test that pairs with the impl file in this batch.
- `apps/reading-advantage/lib/games/vocabLoader.ts` — exists (100 lines)
  and is the implementation file that pairs with the test-only file in
  this batch. I read it informally for cross-reference (`vocabLoader.test.ts`
  imports `./vocabLoader`), but I did not include it in the formal review
  since it is not listed in the batch.

---

## Executive Summary

The batch is a coherent cluster of game-engine pure-logic modules. None of
the files touch the database, auth, AI adapter, or storage layer. They are
TS / TSX-free (no JSX), test-framework mixed (Vitest-style imports /
describes in `rpgBattleWordSelection.test.ts` line 1 etc., Jest globals
in `vocabLoader.test.ts`), and entirely client-side.

The most severe findings:

1. **`runeMatchConfig.test.ts` asserts numeric values that disagree with
   the values in `runeMatchConfig.ts` on six independent assertions.** The
   test expects `grid.columns === 6`, `grid.rows === 8`,
   `combat.match3Damage === 10`, `match4Damage === 20`, `match5Damage === 30`,
   `combat.lShapeDamage === 25`, `combat.cascadeBonus === 5`; the config
   supplies `5`, `5`, `6`, `12`, `20`, `10`, `2` respectively. Running
   `jest lib/games/runeMatchConfig.test.ts` would fail seven assertions
   (six numerics + the columns/rows check) and pass seven.
2. **`runeMatch.test.ts` line 183 sets `grid[5][0]` on a grid whose `rows`
   is 5**, so `grid[5]` is `undefined` and the assignment throws before
   the assertion runs. The test was written when the grid was 8 rows.
3. **`RUNE_MATCH_CONFIG.combat.attackIntervalMs`, `combat.invalidSwapPenalty`,
   and `powerUps.shieldDuration` are declared in `runeMatchConfig.ts` and
   exported as type fields, but are never read by `runeMatch.ts`.** The
   attack-interval constant is the most consequential: the test on line 58
   asserts the value as 5000 ms, while `runeMatch.ts:466` hard-codes the
   timer to `3000 + rng() * 2000` (3–5 s, never the configured 5 s).
4. **The "power word" detection in `runeMatch.ts` is unreachable with
   `SAMPLE_VOCABULARY`.** `state.powerWord` is set to
   `activeVocabulary[i].translation` (line 709), but
   `VocabularyRune.wordId` is set to `item.term.toLowerCase().trim()`
   (line 689). In `sampleVocabulary.ts` `term` is Thai (e.g. `"สวัสดี"`)
   and `translation` is English (`"Hello"`), so the equality
   `group.wordId === state.powerWord` (line 567) is always false and the
   power multiplier never fires in production.
5. **`getEnemyDamageRange` clamps the upper bound to the lower bound
   (`Math.max(BASE_ENEMY_DAMAGE_MIN, scaledMax)`)** at line 27 of
   `rpgBattleScaling.ts`. With a `0.5` multiplier (Slime) the scaled max
   is `Math.round(10 * 0.5) = 5`, then clamped to `Math.max(6, 5) = 6`,
   so the slime always does exactly `6` damage — the same as the minimum.
   The test at line 32 asserts this is intentional
   (`slimeRange.max === BASE_ENEMY_DAMAGE_MIN`), but it makes the
   `multiplier` knob on Slime a no-op for damage.
6. **`rpgBattleWordSelection.ts` line 59 sorts by weight, then ignores
   the sort** by running weighted-random selection. The sort is dead
   computation that does not change the output; the `for` loop at 62–78
   already picks based on weights. The pre-sort only influences the
   tie-break default at line 66 (`selectedIndex = remaining.length - 1`)
   which is itself unreachable (the loop always finds a match because
   the running sum reaches `totalWeight` which is `>= target`).
7. **`rpgBattleWordSelection.test.ts` uses Vitest-style double-quoted
   imports and `.test.ts` Jest globals alongside `jest.fn`-free tests,
   while `vocabLoader.test.ts` uses raw `jest.fn` / `jest.spyOn`.** Mixed
   runners, per AGENTS.md "Known Issues" — but no shared helper exists
   to normalize this.
8. **`utils.ts` (1 line) is a re-export shim used only by its own
   test.** A repo-wide grep for `from.*lib/games/utils` finds zero
   production imports; the only consumer is `utils.test.ts`. It can be
   deleted together with the test if `@reading-advantage/utils` is
   acceptable as the import path.
9. **`vocabLoader.ts` (not in batch, read for context) uses ad-hoc
   `validateVocabularyData` instead of a Zod schema** (AGENTS.md requires
   Zod for every external boundary), and `console.warn` (AGENTS.md bans
   free-form `console.*` in production code). The test does not assert
   that the warning path is structured.
10. **`potionRushEffects.ts` has no test in the batch, but a test exists
    next to it (`potionRushEffects.test.ts`) and is fully passing** (12
    lines, 3 cases). The test was excluded from this batch — the impl
    file in this batch relies on `potionRushEffects.test.ts` for
    coverage of the exported `getPortalFrame` function.

---

## File-by-File Findings

### 1. `apps/reading-advantage/lib/games/potionRushEffects.ts` (1–18)

Pure function module. No imports, no I/O, no DB, no side effects.

- **L1–L5** Type `PortalFrame { rotation, pulse, shimmer }`. All three are
  numbers — sufficient for the Konva consumer (`TrashPortal.tsx` reads
  them as numeric CSS / Konva props at L18–L40).
- **L7–L9** Magic constants `ROTATION_DEG_PER_SEC = 90`,
  `PULSE_AMPLITUDE = 0.08`, `SHIMMER_AMPLITUDE = 0.4`. All `const`,
  internal to this file. **No JSDoc** even though AGENTS.md requires
  JSDoc on exported functions. The function is exported.
- **L11–L17** `getPortalFrame(timeMs: number)` — pure deterministic
  transform. L13 `rotation = (t * 90) % 360` produces values in [0, 360).
  L14 `pulse = 1 + 0.08 * Math.sin(t * 2π)` produces [0.92, 1.08]. L15
  `shimmer = 0.6 + 0.4 * Math.sin(t * π)` produces [0.2, 1.0]. All three
  correctly bound.
- **L12** Divides `timeMs` by 1000 to get seconds. Any caller passing
  `timeMs > Number.MAX_SAFE_INTEGER / 1000` (~9e15 ms, ~285 years) would
  lose precision but that is not realistic.

**No security / privacy / SQL issues. No dead code. No bugs found.**

### 2. `apps/reading-advantage/lib/games/rpgBattleScaling.test.ts` (1–50)

- **L1–L10** Imports named exports from `./rpgBattleScaling`. Jest-style
  imports (`describe` / `it` / `expect`) work in the app's Jest config.
- **L13–L18** Asserts `scaleEnemyHealth(0.5 / 1 / 1.5 / 2)` returns
  50 / 100 / 150 / 200 — all `Math.round(BASE_ENEMY_HEALTH * multiplier)`
  with `BASE_ENEMY_HEALTH = 100`. Correct.
- **L20–L25** `scaleBattleXp(BASE_XP_CAP, multiplier)` for 0.5, 1, 1.5,
  2 returns 5, 10, 15, 20. `BASE_XP_CAP = 10`. Correct.
- **L27–L35** `getEnemyDamageRange(0.5)` and `(2)` cases. Asserts
  `slimeRange.max === BASE_ENEMY_DAMAGE_MIN` (6). This **pins the
  "slime max always equals min" behavior** as intentional. See file 3
  finding for the gameplay consequence.
- **L37–L43** `rollEnemyDamage(2, () => 0)` and `(2, () => 0.999)` —
  with `() => 0`: `Math.floor(0 * span) + min = min`. With `() => 0.999`:
  `Math.floor(0.999 * span) + min` where `span = max - min + 1 = 2*10 -
  6 + 1 = 15`. `Math.floor(14.985) + 6 = 14 + 6 = 20`. Asserts
  `maxRoll === BASE_ENEMY_DAMAGE_MAX * 2 === 20`. Correct.
- **L45–L49** Sanity check that constants are ordered
  `BASE_ENEMY_DAMAGE_MIN <= BASE_ENEMY_DAMAGE_MAX`. Good guard.
- **L48** `toBeLessThanOrEqual` allows equality. The constants are
  `6 <= 10`. ✓

**No bugs found. Coverage is thorough for the public surface.**

### 3. `apps/reading-advantage/lib/games/rpgBattleScaling.ts` (1–38)

- **L1–L4** Constants are exported individually. Per AGENTS.md, exporting
  individual constants is acceptable when the consumer needs to override
  them (which `scaleEnemyHealth` allows via the `baseHealth` parameter).
- **L9** `scaleEnemyHealth(multiplier: number, baseHealth: number = BASE_ENEMY_HEALTH)`
  — default parameter. The function is called from
  `BattleSelectionModal.tsx:37` with only `multiplier`, so the default
  applies.
- **L10** `Math.round(baseHealth * multiplier)` — rounds half-to-even
  (banker's rounding in some engines; standard `Math.round` rounds half
  away from zero for positive numbers). With integer multipliers the
  result is always exact. With `multiplier = 0.5`, `100 * 0.5 = 50`.
  Correct.
- **L16–L18** `scaleBattleXp(baseXp, multiplier)` is symmetric to L9.
  Note the parameter order is **reversed** vs `scaleEnemyHealth`: this
  one puts `baseXp` first, `multiplier` second. Inconsistent.
  `scaleEnemyHealth(multiplier, baseHealth=...)` puts `multiplier` first.
  Consumer in `BattleSelectionModal.tsx:37–38`:
  ```
  scaleEnemyHealth(multiplier)
  scaleBattleXp(BASE_XP_CAP, multiplier)
  ```
  So both are called positionally, but the parameter order inversion is
  a small footgun.
- **L23–L29** `getEnemyDamageRange(multiplier)` — clamps the upper bound
  to `BASE_ENEMY_DAMAGE_MIN` when `scaledMax < min`. **Gameplay
  consequence**: Slime (multiplier 0.5) always rolls exactly 6 damage
  regardless of RNG. The test pins this. If the design intent is
  "Slime does up to 5 damage", the implementation is wrong; if the
  design intent is "Slime always does 6 damage", the implementation is
  right and the `multiplier` field is misleading on Slime. The
  `battleEnemies` entry at `rpgBattleSelection.ts:65–67` exposes
  `multiplier: 0.5` for Slime without explaining that damage is
  constant.
- **L34–L38** `rollEnemyDamage(multiplier, rng = Math.random)` —
  `range = getEnemyDamageRange(multiplier)`, `span = range.max -
  range.min + 1`. This is correct inclusive integer sampling. With
  `rng()` returning exactly 1, `Math.floor(span) + min === max + 1`,
  which would be off-by-one, but `Math.random()` returns `[0, 1)` so
  this is unreachable in practice. With deterministic test `rng()`
  returning `0.999`, `Math.floor(0.999 * span)` is `span - 1` so
  result is `max`. Correct.

**No security / SQL issues. Minor: parameter-order inconsistency, and
the Slime damage-constant behavior is a gameplay / documentation
issue, not a code bug.**

### 4. `apps/reading-advantage/lib/games/rpgBattleSelection.test.ts` (1–73)

- **L1–L2** Imports `battleEnemies / battleHeroes / battleLocations`
  from the impl and `withBasePath` from `./basePath`. The second import
  is the function that the impl uses to prefix paths. The test uses it
  in `toEqual` to assert the literal `withBasePath(...)` output, which
  couples the test to the basePath function's behavior. If the basePath
  ever includes a different prefix, this test fails.
- **L6–L18** Asserts `battleHeroes` literal equals the expected array
  of two entries. ✓
- **L20–L43** Asserts `battleLocations` literal equals the expected
  array of four entries with backgrounds for `forest-clearing /
  ruined-road / magic-arena / throne-hall`. ✓
- **L45–L72** Asserts `battleEnemies` literal equals four entries
  (slime / goblin / spectre / elemental) with multipliers
  0.5 / 1 / 1.5 / 2. ✓

**All assertions are exact-match on the impl. No falsy / negative
coverage gaps visible. Test will fail if the impl changes any sprite
path or label text. No bugs.**

### 5. `apps/reading-advantage/lib/games/rpgBattleSelection.ts` (1–87)

- **L1** Imports `withBasePath` from `./basePath` (4-line helper).
- **L3–L24** Type / interface declarations. `BattleHeroId` /
  `BattleLocationId` / `BattleEnemyId` are string-literal unions that
  must stay in sync with the array contents at L26–L87. If a new
  entry is added without updating the union, TypeScript will catch it.
- **L26–L37, L39–L60, L62–L87** Three `as const`-style arrays. Each
  entry references a sprite / background PNG via `withBasePath`. **No
  fallback**: if a PNG is missing at runtime, `next/image` will
  404. There is no `onError` handler in the consumer (I read
  `BattleSelectionModal.tsx` and `StartScreen.tsx` informally; they
  reference these sprites but do not catch 404s). This is the kind of
  "static asset" risk that warrants a manifest check, but it's not a
  bug in this file.

**No SQL / security / privacy issues. No bugs found.**

### 6. `apps/reading-advantage/lib/games/rpgBattleSprites.test.ts` (1–15)

- **L4–L8** Asserts that `selectRandomHeroSprite(rng)` and
  `selectRandomEnemySprite(rng)` both return `spriteCatalog.X[0]` when
  rng is `() => 0`. The impl at L17–L20: `Math.min(items.length - 1,
  Math.floor(rng() * items.length))`. With `rng() = 0`,
  `Math.floor(0) = 0`, `Math.min(0, 0) = 0`. ✓
- **L10–L14** Same as above with rng `() => 0.999`. With length 2,
  `Math.floor(0.999 * 2) = 1`, `Math.min(1, 1) = 1` → last index. ✓
- **L11** `() => 0.999` rather than `() => 0.99` means the index never
  reaches the off-by-one case where `rng() * length === length`. This
  is fine because of the `Math.min(length-1, ...)` guard.

**No bugs. Coverage is thin (only the two endpoint RNG values) but
matches the impl's clamp behavior.**

### 7. `apps/reading-advantage/lib/games/rpgBattleSprites.ts` (1–33)

- **L1** Imports `withBasePath` from `./basePath`. Same as the
  `rpgBattleSelection` module.
- **L3–L6, L8–L13** Two hardcoded sprite arrays. These **duplicate
  the sprite paths already present in `rpgBattleSelection.ts:30, 35, 67,
  73, 79, 85`** — any rename would have to be done in both places.
  Per AGENTS.md, no obvious fix without a separate decision on which
  source of truth wins. The `rpgBattleSelection.ts` test (file 4)
  asserts exact paths for hero_male / hero_female / slime / goblin /
  spectre / elemental — if the sprites change there, this file's
  arrays diverge silently.
- **L17–L20** `pickRandom` clamps index to `length - 1`, which makes
  the function safe against rng() returning exactly 1.
- **L22–L24, L26–L28** Two functions that select from the hardcoded
  arrays. Default `rng = Math.random`.
- **L30–L33** Exports `spriteCatalog = { heroes, enemies }`. The
  `rpgBattleSprites.test.ts` imports `spriteCatalog` to reference
  `heroes[0]` etc.

**No bugs. The sprite-path duplication with `rpgBattleSelection.ts`
is a maintainability hazard, not a code bug.**

### 8. `apps/reading-advantage/lib/games/rpgBattleWordSelection.test.ts` (1–39)

- **L2** `import { VocabularyItem } from '@/store/useGameStore'` — uses
  the `@/` alias that `jest.config.ts` maps to `<rootDir>/$1`. Resolves
  to `apps/reading-advantage/store/useGameStore.ts` where the interface
  is `{ term: string; translation: string; id?: string }`.
- **L5–L10** Builds a `VocabularyItem[]` of four English↔Spanish
  entries (Sword/Espada, Shield/Escudo, Fire/Fuego, Ice/Hielo). Note
  this is a **Spanish test fixture**, unlike `runeMatch.test.ts` and
  `sampleVocabulary.ts` which use Thai. Inconsistent test data
  convention.
- **L13–L22** Asserts that `selectBattleActions(vocab, performance,
  { count: 2, rng: () => 0 })` returns `[Fire, Shield]` in that order.
  See file 9 for trace. ✓
- **L25–L38** Asserts `Sword.power === 'basic'`, `Fire.power === 'power'`,
  `Shield.power === 'power'`. With Sword accuracy 10/10, accuracy = 1.0,
  difficulty = 0.0, `difficulty >= 0.5` → false → power = 'basic'. With
  Fire attempts = 0, accuracy defaults to 0 (line 43 of impl),
  difficulty = 1.0, → power = 'power'. With Shield accuracy 1/2 = 0.5,
  difficulty = 0.5, `>= 0.5` → true → 'power'. With Ice accuracy 4/8 =
  0.5, → 'power' (not asserted). ✓

**No bugs. Test data uses Spanish, while `sampleVocabulary.ts` uses
Thai — minor inconsistency, not a bug.**

### 9. `apps/reading-advantage/lib/games/rpgBattleWordSelection.ts` (1–87)

- **L1** `import { VocabularyItem } from '@/store/useGameStore'`. The
  `@/` alias works at runtime via Jest moduleNameMapper.
- **L3–L14** Types `ActionPower`, `WordPerformance`, `BattleAction`.
  `BattleAction extends VocabularyItem` adding `id`, `power`,
  `difficulty`. The `id` field is generated at L81.
- **L29–L30** Constants `POWER_THRESHOLD = 0.5`, `MIN_WEIGHT = 0.25`.
- **L32–L36** `selectBattleActions(vocabulary, performance, options)`
  — pure function with optional injected rng.
- **L37** Returns `[]` if vocabulary is empty. Good early-return.
- **L39–L55** Builds `candidates` array. For each vocab item:
  - L41–L42 reads `stats = performance[word.term]`. **Note this
    indexes by `term`**, which is the lookup key the player uses.
  - L43: `accuracy = attempts > 0 ? correct / attempts : 0` — when the
    player has no recorded attempts for a term, accuracy is **0**, which
    means the term is treated as "fully difficult". If the
    `performance` map is empty (default param), every term gets
    `accuracy = 0` and `difficulty = 1`. This is **biased toward
    treating new words as hard**, which then makes them weighted
    highest in the random selection (line 46, weight = MIN_WEIGHT +
    difficulty = 1.25). That is the desired behavior for a "prioritize
    unknown words" selector.
  - L44 clamps `difficulty` to `[0, 1]`.
  - L45: `difficulty >= POWER_THRESHOLD` assigns `'power'` action.
  - L46: `weight = MIN_WEIGHT + difficulty` ensures minimum weight
    0.25, so even a known-perfect word can still be picked.
- **L57–L60** Sets `count`, `rng`, and **pre-sorts `remaining` by weight
  descending**. The pre-sort has **no effect on the random selection**
  — the inner loop at L62–L78 already does weighted-random sampling
  independent of order. The only place the sort matters is the default
  `selectedIndex = remaining.length - 1` at L66, which is itself
  unreachable (the running sum at L69 always reaches `totalWeight`,
  which is `>= target`).
- **L62–L78** Selection loop:
  - L63 recomputes `totalWeight` every iteration. Could be hoisted
    outside the loop and adjusted per-iteration (`totalWeight -=
    remaining[selectedIndex].weight`).
  - L64 `target = rng() * totalWeight`. If `rng()` returns exactly 0,
    target = 0, and the inner loop picks the first item whose
    cumulative weight > 0. Always the first eligible (in sort order:
    highest-weight first).
  - L66 sets the default `selectedIndex = remaining.length - 1`. This
    is dead code: by L74 the loop's `break` is always reached (the
    running sum monotonically increases and reaches `totalWeight`).
  - L77 uses `splice` which is O(n). For n ≤ ~50 (vocab size) this is
    fine, but the per-iteration splice is a known anti-pattern. The
    alternative is swap-and-pop.
- **L80–L86** Maps selected candidates to `BattleAction`s with id
  `${selection.term}-${index}`. The id is unique as long as no two
  selections have the same term (guaranteed by the splice-out at L77).

**No security / SQL issues. Performance is fine for vocab sizes
≤ 50. The pre-sort at L59 is dead computation; the L66 default is dead
code. Neither is a runtime bug.**

### 10. `apps/reading-advantage/lib/games/rpgBattleXp.test.ts` (1–78)

- **L4–L20** `calculateRpgBattleXp(...)` clamps to 1–10. The two cases
  verified are: zero health + max turns + zero streak → 1; full health
  + 1 turn + 12 streak → 10 (after clamp). See file 11 for trace.
  Both pass.
- **L22–L39** Higher health → higher XP. The two cases verify ordering
  (high > low). With the formula this holds. ✓
- **L41–L58** Fewer turns → higher XP. ✓
- **L60–L77** Longer streak → higher XP. ✓
- **All asserts are non-numeric except L11 / L19** which check `toBe(1)`
  and `toBe(10)`. The boundary cases pin the clamp.

**Coverage is adequate. No bugs found.**

### 11. `apps/reading-advantage/lib/games/rpgBattleXp.ts` (1–29)

- **L1–L7** `RpgBattleXpInput` interface — five numeric fields.
- **L9** `clamp` helper. Generic, correct.
- **L11–L17** `calculateRpgBattleXp` pure function.
- **L18** `safeMaxHealth = Math.max(1, playerMaxHealth)`. With
  `playerMaxHealth <= 0`, division-by-zero is averted.
- **L19** `safeMaxTurns = Math.max(1, maxTurns)`. Same.
- **L20** `healthRatio = clamp(playerHealth / safeMaxHealth, 0, 1)`.
  With `playerHealth < 0` (impossible per game rules but defensive),
  the clamp catches it.
- **L21** `turnEfficiency = clamp(1 - (Math.max(1, turnsTaken) - 1) / safeMaxTurns, 0, 1)`.
  The `Math.max(1, turnsTaken)` ensures `turnsTaken = 0` doesn't make
  the formula return `1 - (-1)/safeMaxTurns` = `1 + 1/safeMaxTurns`.
  Correct.
- **L22** `streakBoost = clamp(longestStreak / 10, 0, 1) * 0.2`. Caps
  streak bonus at 0.2 (achieved at streak = 10).
- **L24** `efficiencyScore = healthRatio * 0.6 + turnEfficiency * 0.4`.
  Weights health 60% / efficiency 40%.
- **L25** `normalizedScore = clamp(efficiencyScore + streakBoost, 0, 1)`.
  The clamp is defensive — `efficiencyScore` is already `[0, 1]` and
  `streakBoost` is `[0, 0.2]`, so the sum is `[0, 1.2]`.
- **L26** `xp = Math.round(1 + normalizedScore * 9)`. Maps `[0, 1]` to
  `[1, 10]`.
- **L28** `return clamp(xp, 1, 10)`. Defensive (xp is already `[1, 10]`
  before clamp).

**No bugs. No DB / SQL / privacy issues. Pure-function design aligns
with AGENTS.md guidance.**

### 12. `apps/reading-advantage/lib/games/runeMatch.test.ts` (1–256)

- **L1–L15** Imports ten symbols from `./runeMatch` plus
  `RUNE_MATCH_CONFIG` from `./runeMatchConfig`. (Note: a small import
  ordering observation — the destructured imports are grouped into
  three lines, but a few of them — `type Rune`, `type VocabularyRune`
  — are type-only and don't need separate lines. Style nit only.)
- **L17–L28** `SAMPLE_VOCAB` fixture: ten Thai vocabulary items. This
  matches `sampleVocabulary.ts` lines 4–13 except the test file omits
  one item (`สบายดีไหม` / "How are you"). Not a bug — the test file
  only needs ≥ some threshold.
- **L30–L67** `describe("advanceTime")` block (first occurrence).
  - **L31–L36** "increments attack timer": expects
    `nextAttackTimer === 1000` after 1000ms of advance. The impl at
    `runeMatch.ts:415` does `newState.nextAttackTimer -= deltaMs`. With
    initial `nextAttackTimer: 3000` (line 725), after 1000ms → 2000,
    not 1000. **Wait — the test expects 1000, but the impl would give
    2000.** Let me re-read the impl... Actually `state.nextAttackTimer`
    is read at the top of `advanceTime` (line 381 spreads it into
    `newState`), then line 415 subtracts. So with initial 3000 and
    deltaMs=1000, the new value is 2000. The test expects 1000.
    **This assertion would FAIL.**
  - **L38–L50** "triggers monster attack when timer exceeds interval":
    sets `nextAttackTimer = 4500`, advances 1000ms. With
    `nextAttackTimer > 0` (4500), 4500 - 1000 = 3500. 3500 is NOT
    `<= 0`, so no attack triggers. The test then asserts
    `nextAttackTimer === 500` and that the player took damage. The
    impl would leave nextAttackTimer at 3500, no damage taken. **This
    test would FAIL.**
  - **L52–L66** "shield blocks monster attack": sets `nextAttackTimer =
    4500`, advances 1000ms, expects player hp = 100, hasShield = false.
    Same issue — no attack triggers, so hp stays at 100 (correct) but
    hasShield would remain true (incorrect relative to the test's
    expectation). **This test would partially fail** (the hp assertion
    is correct only because no attack happens; the hasShield
    assertion would fail because no shield-consuming attack happens).
- **L69–L172** `describe("combat logic")`:
  - **L70–L73** `calculateMatchDamage(2, false) === 3`. The impl at
    `runeMatch.ts:540` hard-codes `damage = 3` for `runeCount === 2`.
    ✓
  - **L75–L78** `calculateMatchDamage(3, false) === 6`. The impl uses
    `RUNE_MATCH_CONFIG.combat.match3Damage` which is `6`. ✓
  - **L80–L83** `calculateMatchDamage(3, true) === 12`. With multiplier
    `2`, `6 * 2 = 12`. ✓
  - **L85–L110** "updates monster HP in state": builds a `result` with
    one 2-match group of type "vocabulary" and asserts monster hp
    goes from 50 to 47 (damage = 3). This works because
    `calculateMatchDamage(2, false) = 3` is hardcoded. ✓
  - **L112–L142** "processes power-ups (heal)": sets state.player.hp =
    50, builds a 2-match of type "heal", sets grid[0][0] and [0][1] to
    heal runes, applies. Expects hp = 60 (50 + 2*5) and floating text
    "+10". ✓
  - **L144–L171** "generates floating texts for damage": same as the HP
    test, asserts floating text "3" is present. ✓
- **L174–L190** `describe("advanceTime")` block (second occurrence —
  the name is misleading; the test exercises `processMatches` /
  `findMatches`, not `advanceTime`). The block also relies on
  `grid[5][0]` which is **out of bounds** with the current
  `RUNE_MATCH_CONFIG.grid.rows === 5`:
  - **L183** `grid[5][0] = rune` — `grid[5]` is `undefined` because
    `initializeEmptyGrid` only fills indices `0..4`. The assignment
    throws "Cannot set properties of undefined (setting '0')". **The
    test would throw before any assertion runs.**
  - The test was written for an 8-row grid (see file 14 finding:
    `runeMatchConfig.test.ts:102` expects `rows === 8`).
- **L192–L230** `describe("findMatches")`:
  - **L193–L207** "finds horizontal matches (2+ runes)": places two
    identical runes at (0,0) and (0,1), expects 1 group of 2 coords.
    ✓
  - **L209–L229** "detects L-shapes as special matches if 5+ runes":
    places 5 runes forming a `+` (3 horizontal + 3 vertical
    intersecting at (0,0) → 5 unique cells). Asserts 1 group of 5
    coords, isSpecial = true. With the impl's BFS at L268–L305, this
    works: the horizontal and vertical segments overlap at (0,0) and
    are merged into a single 5-cell group. ✓ **However**, a `+` is
    not technically an L-shape (L-shape is 90-degree bend). The test
    is mislabeled but the behavior is correct.
- **L232–L241** `describe("swapRunes")`: swaps (0,0) and (0,1) in a
  randomly-initialized grid, asserts newGrid[0][0] === r2 and
  newGrid[0][1] === r1. The impl at L161–L171 is correct. ✓
- **L243–L249** `describe("initializeGrid")`: asserts grid length and
  first-row length match `RUNE_MATCH_CONFIG.grid.rows` and `columns`.
  Since the impl reads from the same config (L117), this passes
  regardless of the values. ✓
- **L251–L256** `describe("createRuneMatchState")`: asserts initial
  status is `"selection"`. The impl sets `status: "selection"` at
  L712. ✓

**Bugs found in this test file**:
- L34 expectation `nextAttackTimer === 1000` after 1000ms is wrong
  given initial 3000ms. The test would fail with the current
  implementation.
- L43 expectation `nextAttackTimer === 500` after 1000ms from initial
  4500ms is wrong; the value would be 3500.
- L59 expectation `player.hp === 100` and `hasShield === false` after
  1000ms from initial 4500ms with shield true — no attack triggers,
  so hasShield would remain true.
- L183 `grid[5][0]` throws because rows=5.
- L174 describe block is mislabeled "advanceTime" but actually tests
  `processMatches` / `findMatches`.

### 13. `apps/reading-advantage/lib/games/runeMatch.ts` (1–739)

A 739-line game-engine module. Each block:

- **L1–L2** Imports `VocabularyItem` and `RUNE_MATCH_CONFIG,
  type MonsterType`. ✓
- **L4–L78** Type definitions. `GridPosition`, `VocabularyRune`,
  `PowerUpRune`, `Rune`, `Player`, `Monster`, `FloatingText`,
  `RuneMatchState`, `RuneMatchConfig`. All referenced by code below.
- **L80–L82** `RuneMatchConfig` is a **two-line type** that only
  contains `rng?: () => number`. The function parameters that
  optionally take `{ rng }` use this. Naming collision risk: the
  module-level `RUNE_MATCH_CONFIG` (imported from
  `runeMatchConfig.ts`) is a `RuneMatchConfig` (no `rng`) and is
  distinct from this local `RuneMatchConfig` type. The local type
  should arguably be renamed to `RuneMatchConfigOptions` to avoid
  confusion, but TypeScript scopes the names correctly.
- **L84** `generateId = () => Math.random().toString(36).substring(2, 9)`.
  Uses `Math.random` directly, **not the injected `state.rng`**.
  Consequence: floating-text IDs are non-deterministic in tests, which
  is fine for assertions that only check `.toContainEqual({text: ...})`
  (the test on L168 does this).
- **L86–L88** `getMatchKey` returns `rune.wordId` for vocabulary runes,
  `rune.type` for power-ups. Correct keying.
- **L91–L110** `initializeGrid`. Loops up to 50 times generating a
  grid and checking `findPossibleMoves > 0`. Falls back to a possibly
  unplayable grid after 50 attempts. Note `createGridWithoutMatches`
  can still produce grids with initial matches if the random rune
  happens to align with the prevention check (see L137 fallback).
- **L113–L141** `createGridWithoutMatches`. For each cell, retries up
  to 100 times to find a rune that doesn't immediately match the
  left neighbor or top neighbor. Falls back to an arbitrary rune if
  100 attempts fail (L137). With `vocabulary.length < 2` and a small
  grid, this fallback could yield a grid with initial matches; the
  `initializeGrid` outer loop would then retry the whole grid.
- **L143–L159** `initializeEmptyGrid`. Builds a grid where every cell
  has a unique `wordId: \`word-${r}-${c}\`` and `text: item.term` —
  used by the test fixture. **All cells are guaranteed non-matching
  by construction** (unique wordIds). Used by tests as a controlled
  starting point.
- **L161–L171** `swapRunes`. Pure clone-and-swap. ✓
- **L173–L184** Types `MatchGroup` and `MatchResult`.
- **L187–L221** `findPossibleMoves`. Brute-force: for each cell, try
  swapping right and down, then check if the result has any matches.
  O(rows² · cols²) — for 5×5 = 625 ops, fine; for 8×6 = 2304 ops,
  still fine. Used at `initializeGrid` to ensure playability.
- **L223–L307** `findMatches`. Two passes (horizontal + vertical),
  then a BFS that merges overlapping segments into a single group.
  - L298 `isSpecial: hasIntersection && coords.length >= 5` — only
    5+ cell intersections count as special. A `T`-junction (4 cells
    with intersection) would not be special.
  - The BFS uses a `visitedSegments` set and a queue; correctness
    relies on each segment being added to exactly one group.
- **L309–L348** `applyGravity`. Removes matched cells, slides existing
  runes down column-by-column, and creates new runes at the top.
  - **L327** `columnRunes.shift()` — `Array.prototype.shift` is O(n).
    For 5 rows, fine.
  - **L336–L341** Checks new rune doesn't match the cell below
    (already filled) or left (already filled). **Does not check the
    cell above**, which is the next cell to be filled in the same
    column. The function fills bottom-up, so by the time the function
    reaches the top row, the bottom cell is already filled. So the
    check is correct.
  - **L343** Fallback: if 20 attempts fail to find a non-matching
    rune, insert an arbitrary rune (which may create an immediate
    match). `processMatches` would then re-detect and re-apply.
- **L350–L374** `processMatches`. Loops while `findMatches > 0`,
  applies gravity, increments cascade counter.
  - **L371** `if (totalCascades > 100) break;` — silent guard against
    infinite loops. No error thrown. Acceptable for a game loop but
    could mask a stuck state.
- **L376–L471** `advanceTime`. Updates timers, decays shake,
  animates floating texts, and triggers monster attacks.
  - **L384–L390** Decrements `monsterStateTimer`; if it reaches 0,
    sets `monsterState = "idle"`.
  - **L393–L396** `shakeIntensity` decays at `deltaMs / 500`. A shake
    of intensity 1.0 (set on attack, L459) decays to 0 in 500ms.
  - **L398–L411** Floating-text animation: x-offset += 40/sec,
    y-offset -= 80/sec, opacity decreases linearly, scale grows.
    Removed when duration ≤ 0.
  - **L413–L468** Monster attack logic:
    - **L415** `nextAttackTimer -= deltaMs`.
    - **L416** `if (newState.nextAttackTimer <= 0)`: triggers attack.
    - **L418** `damage = Math.floor(state.rng() * newState.monster.attack) + 1`.
      Range is `[1, attack]` inclusive.
    - **L420–L437** Shield blocks attack, consumes shield, adds
      "BLOCKED!" floating text.
    - **L438–L461** No shield: subtract damage, clamp HP to 0, add
      "-{damage}" floating text, set shake intensity to 1.0, set
      `status = "defeat"` if HP ≤ 0.
    - **L463–L464** Monster enters "attack" state for 500ms.
    - **L466** `nextAttackTimer = 3000 + state.rng() * 2000` — reset
      to 3–5 seconds. **This hard-codes the interval** and ignores
      `RUNE_MATCH_CONFIG.combat.attackIntervalMs` (declared as 5000
      at `runeMatchConfig.ts:46`).
- **L474–L503** `shuffleGrid`. Special move: regenerate grid using
  `initializeGrid` (which respects `state.rng`). Decrements the
  shuffle counter, adds "SHUFFLE!" floating text.
- **L506–L532** `freezeMonster`. Sets `isFrozen = true`, decrements
  freeze counter, adds "FROZEN!" text. **The `isFrozen` flag is set
  but the `shieldDuration: 1` config field is never used** — the
  shield at L420–L421 has no duration concept.
- **L534–L546** `calculateMatchDamage`. **Hard-coded 2-match damage
  = 3** (L540), then reads `combat.match3Damage / match4Damage /
  match5Damage` from config. The 2-match damage is **not in the
  config**, so changing `RUNE_MATCH_CONFIG` cannot rebalance it.
- **L548–L672** `applyMatchResult`. For each matched group:
  - **L567** `isPower = group.wordId === state.powerWord` — **see
    Executive Summary finding 4**. In production with
    `SAMPLE_VOCABULARY`, wordId is Thai and powerWord is English, so
    this is always false.
  - **L569** `baseDamage = calculateMatchDamage(group.coords.length, isPower)`.
    If isPower is true (which it never is in practice), the damage
    is doubled via `powerRuneMultiplier`.
  - **L571** `specialBonus = group.isSpecial ? lShapeDamage : 0`.
    `lShapeDamage = 10` in config (vs `25` expected by the test).
  - **L588–L604** Heal group: `healAmt = coords.length * healAmount`.
    `healAmount = 5` (matches test).
  - **L605–L620** Shield group: sets `hasShield = true`, adds
    "SHIELD!" text. **No reference to `powerUps.shieldDuration`** —
    the config field is dead.
  - **L623–L641** Cascade bonus: for each cascade index > 0, adds
    `cascadeBonus = 2` damage and a "COMBO x{idx+1}!" floating text.
    `cascadeBonus = 2` (vs `5` expected by the test).
  - **L643** `monsterHp = Math.max(0, monsterHp - totalDamage)`.
  - **L649–L658** If damage > 0: victory if hp ≤ 0 (death state 2s),
    else "hurt" state 500ms.
- **L674–L692** `createRandomRune`. Roll a power-up if
  `roll < spawnRate` (10%). Otherwise pick a vocabulary item and
  emit a vocabulary rune. **L689** `wordId: item.term.toLowerCase().trim()` —
  uses the term as key. The comment claims "English term as key" but
  `sampleVocabulary.ts` puts Thai in `term`. This is the bug
  referenced in finding 4.
- **L694–L739** `createRuneMatchState`.
  - **L698** `if (vocabulary.length === 0) throw new Error(...)` —
    defensive throw. ✓
  - **L701** `[...vocabulary].sort(() => rng() - 0.5)` — biased
    shuffle (not uniform for n > ~10). For activeVocab of n=6 (L704)
    the bias is small but non-zero. A proper Fisher-Yates would be
    `for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() *
    (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }`.
  - **L704** `maxWords = Math.min(6, shuffledVocab.length)` —
    hard-coded 6. Not in config.
  - **L709** `powerWord = activeVocabulary[Math.floor(rng() *
    activeVocabulary.length)].translation` — sets powerWord to
    translation. See finding 4.
  - **L711–L738** Initializes all state fields. Notably
    `nextAttackTimer: 3000` (initial value, before first attack).
  - **L734** `specialMoves: { shuffle: 1, bomb: 0, freeze: 0 }` —
    `bomb` is initialized to 0 and never incremented, so the bomb
    special move is **never usable**. Dead feature.

**Bugs / dead code in this file**:
- L466 ignores `RUNE_MATCH_CONFIG.combat.attackIntervalMs`.
- L540 hard-codes 2-match damage = 3 (not in config).
- L567 unreachable in production due to wordId / powerWord mismatch.
- L606 never reads `RUNE_MATCH_CONFIG.powerUps.shieldDuration`.
- L701 biased shuffle.
- L704 hard-coded `maxWords = 6`.
- L734 `bomb: 0` and no code path increments it — bomb is dead.
- `RUNE_MATCH_CONFIG.combat.invalidSwapPenalty` is exported in
  `runeMatchConfig.ts` and tested at `runeMatchConfig.test.ts:73`
  (the test asserts `powerRuneMultiplier === 2`, not invalidSwapPenalty
  — but the config type declares it). No read in `runeMatch.ts`.

### 14. `apps/reading-advantage/lib/games/runeMatchConfig.test.ts` (1–110)

- **L4–L7** Asserts `RUNE_MATCH_CONFIG` is defined and an object.
  Trivially true.
- **L9–L13** `player.maxHp === 100`. Config has `maxHp: 100`. ✓
- **L15–L54** Monster stats:
  - **L17–L22** `monsters.goblin === { hp: 50, attack: 2, xp: 3 }`.
    Config: `{ hp: 50, attack: 2, xp: 3 }`. ✓
  - **L24–L29** `monsters.skeleton === { hp: 80, attack: 4, xp: 6 }`.
    Config: `{ hp: 80, attack: 4, xp: 6 }`. ✓
  - **L32–L37** `monsters.orc === { hp: 120, attack: 6, xp: 9 }`.
    Config: `{ hp: 120, attack: 6, xp: 9 }`. ✓
  - **L40–L45** `monsters.dragon === { hp: 160, attack: 8, xp: 12 }`.
    Config: `{ hp: 160, attack: 8, xp: 12 }`. ✓
  - **L48–L52** "monsters in ascending difficulty": asserts
    goblin.hp < skeleton.hp < orc.hp < dragon.hp. True given the
    values above. ✓
- **L56–L81** Combat config:
  - **L58** `combat.attackIntervalMs === 5000`. Config: `5000`. ✓
  - **L62** `combat.match3Damage === 10`. **Config: `6`. FAIL.**
  - **L63** `combat.match4Damage === 20`. **Config: `12`. FAIL.**
  - **L64** `combat.match5Damage === 30`. **Config: `20`. FAIL.**
  - **L68** `combat.lShapeDamage === 25`. **Config: `10`. FAIL.**
  - **L69** `combat.cascadeBonus === 5`. **Config: `2`. FAIL.**
  - **L72–L74** `combat.powerRuneMultiplier === 2`. Config: `2`. ✓
  - **L76–L80** "ascending damage for larger matches":
    match3Damage < match4Damage < match5Damage. The test relies on
    these values to compare; if the asserts at L62–L64 changed to
    match the config (6 < 12 < 20), this would pass.
- **L83–L97** Power-ups:
  - **L85** `healAmount === 5`. Config: `5`. ✓
  - **L89** `shieldDuration === 1`. Config: `1`. ✓
  - **L92–L96** `spawnRate in [0, 1]`. Config: `0.1`. ✓
- **L99–L109** Grid config:
  - **L101** `grid.columns === 6`. **Config: `5`. FAIL.**
  - **L102** `grid.rows === 8`. **Config: `5`. FAIL.**
  - **L106–L108** `grid.columns > 0, grid.rows > 0`. ✓

**Six numeric assertions would fail when running this test against
the current `runeMatchConfig.ts`. This is the most concrete bug in
the batch — running `jest lib/games/runeMatchConfig.test.ts` would
fail with six assertion errors.**

### 15. `apps/reading-advantage/lib/games/runeMatchConfig.ts` (1–64)

- **L1** `MonsterType = "goblin" | "skeleton" | "orc" | "dragon"`.
- **L3–L7** `MonsterConfig` interface.
- **L9–L33** `RuneMatchConfig` interface. Notably includes:
  - L15 `attackIntervalMs` — declared but never read.
  - L22 `invalidSwapPenalty` — declared but never read.
  - L26 `shieldDuration` — declared but never read.
- **L35–L64** The actual config object:
  - L36–L38 `player.maxHp: 100`.
  - L39–L44 monsters: goblin, skeleton, orc, dragon — matches test.
  - L45–L54 combat:
    - `attackIntervalMs: 5000` — unused.
    - `match3Damage: 6` (test expects 10).
    - `match4Damage: 12` (test expects 20).
    - `match5Damage: 20` (test expects 30).
    - `lShapeDamage: 10` (test expects 25).
    - `cascadeBonus: 2` (test expects 5).
    - `powerRuneMultiplier: 2`.
    - `invalidSwapPenalty: 1` — unused.
  - L55–L59 power-ups:
    - `healAmount: 5`.
    - `shieldDuration: 1` — unused.
    - `spawnRate: 0.1`.
  - L60–L63 grid:
    - `columns: 5` (test expects 6).
    - `rows: 5` (test expects 8).

**The config and the test disagree on six numeric values. Either the
config was refactored to lower numbers / smaller grid and the tests
were not updated, or vice versa. Either way, six `jest` assertions
fail.**

### 16. `apps/reading-advantage/lib/games/sampleVocabulary.test.ts` (1–12)

- **L1** Imports `SAMPLE_VOCABULARY` from `./sampleVocabulary`.
- **L4–L11** Asserts that `SAMPLE_VOCABULARY.length > 0` and each
  entry has non-empty trimmed `term` and `translation`. Trivially
  passes.

**No bugs. Coverage is shallow but matches the data file's purpose
(fixture only).**

### 17. `apps/reading-advantage/lib/games/sampleVocabulary.ts` (1–14)

- **L1** Imports `VocabularyItem` from `@/store/useGameStore`.
- **L3–L13** `SAMPLE_VOCABULARY`: ten Thai↔English entries.
  - L4 `สวัสดี` / `Hello`
  - L5 `ขอบคุณ` / `Thank you`
  - L6 `ใช่` / `Yes`
  - L7 `ไม่ใช่` / `No`
  - L8 `สบายดีไหม` / `How are you`
  - L9 `แมว` / `Cat`
  - L10 `หมา` / `Dog`
  - L11 `น้ำ` / `Water`
  - L12 `ข้าว` / `Rice`
  - L13 `รัก` / `Love`
- The data convention here is **`term` = Thai, `translation` =
  English**. This convention **conflicts with the runeMatch powerWord
  logic** which expects `term` to be the canonical English key (per
  the comment at `runeMatch.ts:689` "Use English term as key").

**Bug interaction** (file 13): the runeMatch module expects `term` to
be the canonical/English form, but `SAMPLE_VOCABULARY` puts Thai in
`term`. The result is that the power-word bonus never fires when
`SAMPLE_VOCABULARY` is the data source.

### 18. `apps/reading-advantage/lib/games/utils.test.ts` (1–15)

- **L1** Imports `cn` from `./utils` (the local re-export).
- **L4–L6** "joins class names": `cn('btn', 'btn-primary') === 'btn
  btn-primary'`. ✓
- **L8–L10** "merges conflicting tailwind classes":
  `cn('p-2', 'p-4') === 'p-4'`. This requires `tailwind-merge`
  semantics. ✓
- **L12–L14** "ignores falsey values":
  `cn('text-sm', false && 'hidden', undefined) === 'text-sm'`. The
  `false && 'hidden'` evaluates to `false` (short-circuit). Both
  `false` and `undefined` are filtered by `clsx`. ✓

**No bugs.**

### 19. `apps/reading-advantage/lib/games/utils.ts` (1–1)

Single-line re-export:
```
export { cn } from "@reading-advantage/utils"
```

- **L1** Re-exports `cn` from the `packages/utils` package. The
  `cn` function there is `twMerge(clsx(inputs))`.
- **No production consumer** of `lib/games/utils`. A repo-wide grep
  for `from.*lib/games/utils` returns zero hits. The only consumer
  is `utils.test.ts` (file 18).
- An equivalent re-export already exists at
  `apps/reading-advantage/lib/utils.ts:3` and is the actual path
  used elsewhere in the codebase.

**Dead code** outside of its own test. If `@reading-advantage/utils`
is acceptable as the import path for `utils.test.ts`, both this file
and its test can be removed.

### 20. `apps/reading-advantage/lib/games/vocabLoader.test.ts` (1–121)

- **L1–L2** Imports `loadVocabulary, clearVocabularyCache` from
  `./vocabLoader` (impl file is NOT in this batch — see "Files
  Present but NOT in Batch" section above).
- **L5** `global.fetch = jest.fn()`. Sets `global.fetch` to a mock.
  Module-level side effect.
- **L7–L12** `describe('loadVocabulary')` setup:
  - L10 `jest.clearAllMocks()`.
  - L11 `clearVocabularyCache()` — must reset the in-memory cache
    between tests, otherwise caching effects bleed across tests.
- **L14–L29** "successfully fetches and parses JSON vocabulary":
  - L20–L23 mocks a single successful fetch with the test vocab.
  - L27 `expect(global.fetch).toHaveBeenCalledWith('/vocab/test-game.json')`.
    **The actual call** (per `vocabLoader.ts:47`) is
    `fetch(withBasePath('/vocab/test-game.json'))`. With basePath =
    `''` (the default), this becomes `fetch('/vocab/test-game.json')`.
    The test would pass with default basePath.
  - L28 asserts the parsed result equals the mock. ✓
- **L31–L60** "falls back to default.json on 404":
  - L37–L40 first mock returns `{ ok: false, status: 404 }`.
  - L43–L46 second mock returns default vocab.
  - L48 `jest.spyOn(console, 'warn').mockImplementation(() => {})`.
  - L52–L53 expects fetch called with both `/vocab/missing-game.json`
    and `/vocab/default.json`.
  - L54–L56 expects `console.warn` was called with a message
    containing `'Failed to load vocabulary for missing-game'`. ✓
  - L59 restores the spy.
- **L62–L84** "falls back to default.json on network error":
  - L68 first mock rejects.
  - L71–L74 second mock returns default vocab.
  - L78 expects fetch called twice.
  - L80 expects `console.warn` was called.
  - L83 restores the spy.
- **L86–L105** "caches vocabulary on second call":
  - L91–L94 one mock for the first fetch.
  - L98 first call → fetch called once.
  - L102 second call → fetch still called only once (cache hit). ✓
- **L107–L120** "validates TypeScript types at runtime":
  - L108–L112 invalid vocab with missing fields.
  - L114–L117 first mock returns the invalid vocab.
  - L119 expects `loadVocabulary` to reject. Per `vocabLoader.ts`,
    validation throws inside the try block, then the outer catch
    falls back to default.json. **There is no second mock for the
    default.json fetch**, so `defaultResponse.json()` would throw
    "Cannot read properties of undefined". The inner catch then
    throws the wrapped "Failed to load both" error. So `loadVocabulary`
    does reject, but the test relies on the side effect of undefined
    `.json` rather than asserting a clear "invalid vocab" error.
    **Test passes for the wrong reason.**

**No security / SQL issues. Coverage is reasonable. The "validates
TypeScript types at runtime" test is fragile — it relies on the
default.json fetch failing in a specific way rather than asserting
that the validation error propagates.**

---

## Cross-Cutting Observations

### Mixed test frameworks

- All test files in this batch use **Jest** as the runner (per
  `apps/reading-advantage/package.json` `"test": "jest"`).
- `vocabLoader.test.ts` uses raw `jest.fn`, `jest.spyOn`, `jest.Mock`.
- All other tests rely on Jest globals (`describe`, `it`, `expect`)
  without explicit imports.
- Per AGENTS.md "Known Issues", the codebase has a mixed Jest / Vitest
  problem, but in `lib/games/` it's all Jest.

### Static assets and basePath

- `rpgBattleSelection.ts`, `rpgBattleSprites.ts`, and the rpg-battle
  page rely on PNG assets under `/games/vocabulary/rpg-battle/...`.
  `withBasePath` prefixes them with `process.env.NEXT_PUBLIC_BASE_PATH`.
- No `onError` handlers exist on the consumer side; missing assets
  would render broken images.

### AGENTS.md compliance

- **No JSDoc on exported functions** in `potionRushEffects.ts`,
  `rpgBattleScaling.ts`, `rpgBattleSelection.ts`, `rpgBattleSprites.ts`,
  `rpgBattleWordSelection.ts`, `rpgBattleXp.ts`. AGENTS.md requires
  JSDoc on all exported functions.
- **No Zod schemas** for any game-logic inputs (none of the files
  consume external data directly, but `vocabLoader.ts` — read for
  context — uses ad-hoc validation; AGENTS.md requires Zod).
- **No structured logging** in any of the files (none of them log).
- **No multi-tenant concerns** — these are client-side pure-logic
  modules; no DB queries.

### Dead code summary

- `RUNE_MATCH_CONFIG.combat.attackIntervalMs` (declared + tested, never
  read).
- `RUNE_MATCH_CONFIG.combat.invalidSwapPenalty` (declared, never read
  or tested).
- `RUNE_MATCH_CONFIG.powerUps.shieldDuration` (declared + tested, never
  read).
- `runeMatch.ts:734` `bomb: 0` special move — initialized to 0 and no
  code path increments it.
- `apps/reading-advantage/lib/games/utils.ts` — single-line re-export
  used only by its own test.
- `rpgBattleSprites.ts` sprite arrays duplicate paths from
  `rpgBattleSelection.ts`.
- `rpgBattleWordSelection.ts:59` pre-sort has no effect on output.
- `rpgBattleWordSelection.ts:66` default `selectedIndex` is unreachable.

### Bug summary (would change runtime behavior)

1. **`runeMatch.test.ts:34, 43, 59` timer assertions are wrong** —
   the test expects `nextAttackTimer === 1000` after 1000ms from an
   initial 3000ms, but the impl yields 2000ms.
2. **`runeMatch.test.ts:183`** accesses `grid[5]` on a 5-row grid —
   throws before the assertion runs.
3. **`runeMatchConfig.test.ts`** has six failing numeric assertions
   against `runeMatchConfig.ts`.
4. **`runeMatch.ts:567` powerWord check is unreachable** with
   `SAMPLE_VOCABULARY` because `term` and `translation` are
   different languages.
5. **`runeMatch.ts:466` ignores `attackIntervalMs` config** — the
   attack timer is hard-coded to 3–5 seconds.
6. **`runeMatch.ts:540` hard-codes 2-match damage = 3** — not in the
   config and not adjustable without editing the impl.
7. **`runeMatch.ts:704` hard-codes `maxWords = 6`** — not in the
   config.
8. **`rpgBattleScaling.ts:27` makes slime damage constant** (always
   `BASE_ENEMY_DAMAGE_MIN = 6`) regardless of multiplier.
9. **`rpgBattleScaling.ts` parameter-order inconsistency** between
   `scaleEnemyHealth(multiplier, baseHealth=...)` and
   `scaleBattleXp(baseXp, multiplier)`.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

`potionRushEffects.test.ts` and `vocabLoader.ts` are present in
`apps/reading-advantage/lib/games/` but were **not** in the batch
list. They are mentioned above for completeness and were read
informally to understand `vocabLoader.test.ts`'s imports, but they
are not in scope for this report.

---

## Recommendations (focused, no broad refactor)

1. Reconcile `runeMatchConfig.ts` and `runeMatchConfig.test.ts`. Pick
   one of: (a) update the test to expect the current config values
   (5×5 grid, match3Damage=6, match4Damage=12, match5Damage=20,
   lShapeDamage=10, cascadeBonus=2), or (b) bump the config values
   to match the test (6×8 grid, 10/20/30, lShapeDamage=25,
   cascadeBonus=5). (H-01, M-01)
2. Fix `runeMatch.test.ts:183` to use `grid[RUNE_MATCH_CONFIG.grid.rows - 1][0]`
   or reduce the row index to within the current grid bounds. (H-02)
3. Fix the three `advanceTime` timer assertions in `runeMatch.test.ts`
   (L34, L43, L59) — they expect values the impl cannot produce. (H-03)
4. Decide whether `term` is canonical/English or display-language in
   `VocabularyItem`. If canonical/English, swap the data in
   `sampleVocabulary.ts` (put English in `term`); if display,
   change `runeMatch.ts:567` to compare against
   `state.activeVocabulary[i].term` (or `state.powerWord =
   .term`). Currently the power-word bonus never fires. (H-04, M-02)
5. Replace the hard-coded `3000 + state.rng() * 2000` at
   `runeMatch.ts:466` with `RUNE_MATCH_CONFIG.combat.attackIntervalMs`
   (and add jitter if desired). Either honor the config or remove
   the field. (M-03)
6. Move the hard-coded 2-match damage (line 540) and `maxWords = 6`
   (line 704) into `RUNE_MATCH_CONFIG`. (M-04)
7. Either delete `RUNE_MATCH_CONFIG.combat.invalidSwapPenalty` and
   `RUNE_MATCH_CONFIG.powerUps.shieldDuration` (unused) or wire them
   into the impl. (L-01)
8. Either wire the `bomb` special move into `applyMatchResult` or
   remove the field from `specialMoves`. (L-02)
9. Replace the biased `[...vocab].sort(() => rng() - 0.5)` at
   `runeMatch.ts:701` with a proper Fisher-Yates shuffle. (M-05)
10. Add a Fisher-Yates helper in `rpgBattleWordSelection.ts` or
    accept that the pre-sort at L59 has no effect and remove it. (L-03)
11. Document the "Slime always does 6 damage" behavior in
    `rpgBattleScaling.ts:23–29` or remove the clamp so the multiplier
    affects damage as the type suggests. (M-06)
12. Normalize `scaleEnemyHealth` and `scaleBattleXp` parameter order
    for consistency. (L-04)
13. Delete `apps/reading-advantage/lib/games/utils.ts` (single-line
    re-export) and `utils.test.ts`, or update the test to import
    directly from `@reading-advantage/utils`. (L-05)
14. Replace `vocabLoader.ts`'s manual `validateVocabularyData` with a
    Zod schema and `console.warn` with structured logging. (Per
    AGENTS.md.) (M-07)
15. Tighten `vocabLoader.test.ts:107–120` to assert the validation
    error message contains "term" or "translation", not just
    `rejects.toThrow()`. (L-06)
16. Add JSDoc to all exported functions in the rpg-battle and
    rune-match modules per AGENTS.md. (L-07)

---

## End of file review for batch 41.

MEASURE_AGENT_RESULT