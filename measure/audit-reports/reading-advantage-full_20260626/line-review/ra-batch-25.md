# Line-by-Line Review — ra-batch-25

**Track:** `reading_advantage_full_review_20260626`
**Reviewer:** Measure Review C (UX and API end-to-end contract)
**Batch:** ra-batch-25
**Files reviewed:** 20
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`
**Changed since baseline:** No (zero diff in scope)

---

## Scope

RPG Battle components (16 files) and Rune Match components (4 files) under:
- `apps/reading-advantage/components/games/vocabulary/rpg-battle/`
- `apps/reading-advantage/components/games/vocabulary/rune-match/`

All files are presentational React components, their tests, or game logic. No route handlers, tRPC routers, or server-side code in this batch.

---

## File-by-File Review

### 1. `rpg-battle/BattleResults.tsx` (65 lines)

**Contract:** Pure presentational. Props: `outcome: "victory" | "defeat"`, `xp: number`, `accuracy: number` (0–1 ratio), `onRestart: () => void`.

- i18n via `useScopedI18n("pages.student.gamesPage")` — consistent with other game components.
- `accuracy` displayed as `Math.round(accuracy * 100)%` — correct for 0–1 ratio input.
- No state, no side effects, no API calls.
- **Verdict:** Clean. No findings.

### 2. `rpg-battle/BattleScene.tsx` (73 lines)

**Contract:** Slot-based layout. Props accept React nodes for player, enemy, health bars, action menu, and battle log. Optional: `backgroundImage`, `turnIndicator`, `floatingTexts`, `streak`.

- `data-testid="battle-stage"` and `data-testid="battle-ui"` — present and testable.
- `backgroundImage` style wraps URL in `linear-gradient()` overlay for darkened backdrop — intentional design choice.
- No `"use client"` directive — acceptable since this component has no client hooks; it is a pure render function receiving nodes.
- **Finding F2.1 (LOW):** Missing `"use client"` directive. While currently harmless (no hooks), this component is imported by client parents. If a future parent forgets `"use client"`, this component will silently break in Next.js App Router. The sibling `BattleSelectionModal.tsx` does include `"use client"`. Recommend adding it for consistency and forward safety.
- **Verdict:** One low-priority finding (F2.1).

### 3. `rpg-battle/BattleScene.test.tsx` (48 lines)

**Contract tested:** `BattleScene` layout and background image rendering.

- **Finding F3.1 (BLOCKER):** Test assertion on line 43 checks `backgroundImage: 'url(/games/rpg-battle/background_forest_clearing.png)'`, but the actual component (line 33) renders `backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), url(/games/rpg-battle/background_forest_clearing.png)'`. The test expectation does not match the implementation. The test would fail if run against the current component code.
- **Verdict:** Contract mismatch — test expects plain `url()`, component wraps in `linear-gradient()` overlay.

### 4. `rpg-battle/BattleSelectionModal.tsx` (181 lines)

**Contract:** Modal dialog with stepped flow: `hero → location → enemy → ready`. Returns `null` when step is `"ready"`.

- Imports `scaleEnemyHealth`, `scaleBattleXp`, `BASE_XP_CAP` from `rpgBattleScaling` — used in `formatEnemyStats()`.
- `BattleSelectionStep` imported from `useRPGBattleStore` — correctly typed as `'hero' | 'location' | 'enemy' | 'ready'`.
- `role="dialog"` with `aria-modal="true"` — accessible.
- Step headers use hardcoded English strings ("Choose your hero", "Choose a location", "Choose an enemy") — not i18n. All other game components use `useScopedI18n`. This is inconsistent.
- **Finding F4.1 (MEDIUM):** Modal step headings are hardcoded English strings (lines 91, 99, 107) while the rest of the game UI uses `useScopedI18n`. This breaks i18n consistency for non-English users.
- **Verdict:** One medium finding (F4.1).

### 5. `rpg-battle/BattleSelectionModal.test.tsx` (88 lines)

**Contract tested:** `BattleSelectionModal` rendering per step and selection callbacks.

- Tests verify heading text, image alt text, button labels, and callback invocation.
- Test for "ready" step correctly verifies no headings render.
- Enemy selection test fires click and checks `onSelectEnemy("elemental")` — matches `BattleEnemyOption.id` type.
- **Verdict:** Clean. No findings.

### 6. `rpg-battle/ComboIndicator.tsx` (36 lines)

**Contract:** Animated combo indicator. Shows when `streak >= 2`. Uses framer-motion.

- `AnimatePresence` wraps motion div — correct pattern.
- Flame icon from lucide-react with bounce animation.
- **Verdict:** Clean. No findings.

### 7. `rpg-battle/EnemySprite.tsx` (17 lines)

**Contract:** Static sprite sheet image. Hardcoded to `/games/rpg-battle/enemy_slime_pose_sheet_3x3.png`.

- Uses `next/image` with `unoptimized` — appropriate for pixel art.
- `alt="Enemy sprite sheet"` — accessible.
- Note: This is a legacy component. The `Sprite.tsx` component is the generalized version used by `BattleSelectionModal` and `StartScreen`. `EnemySprite` appears unused in the reviewed files (replaced by `Sprite` with dynamic `src`).
- **Finding F7.1 (LOW):** `EnemySprite.tsx` and `PlayerSprite.tsx` appear to be legacy static sprite components superseded by the dynamic `Sprite.tsx`. They remain in the directory and have tests, but are not imported by any reviewed file. Potential dead code.
- **Verdict:** One low-priority finding (F7.1).

### 8. `rpg-battle/EnemySprite.test.tsx` (10 lines)

**Contract tested:** `EnemySprite` renders alt text.

- Minimal smoke test. Adequate for a static component.
- **Verdict:** Clean. No findings.

### 9. `rpg-battle/FloatingText.tsx` (46 lines)

**Contract:** Floating text overlay for damage/heal numbers. `FloatingTextItem` has `id`, `text`, `x` (0–100%), `y` (0–100%), `type`.

- `AnimatePresence` with enter/exit animations — correct.
- Position uses percentage-based `left`/`top` — consumers must convert grid coords to screen percentage. RuneMatchGame does this conversion correctly.
- **Verdict:** Clean. No findings.

### 10. `rpg-battle/HealthBar.tsx` (41 lines)

**Contract:** Animated health bar. Props: `current`, `max`, `label`, `tone: 'player' | 'enemy'`.

- Clamps `current` to `[0, max]` — safe.
- `safeMax = Math.max(0, max)` — prevents division by zero.
- `role="progressbar"` with `aria-valuemin`, `aria-valuenow`, `aria-valuemax` — fully accessible.
- Framer-motion animated width.
- **Verdict:** Clean. No findings.

### 11. `rpg-battle/HealthBar.test.tsx` (20 lines)

**Contract tested:** Label display and progressbar ARIA attributes.

- Tests value clamping (120 clamped to 100).
- Tests all three ARIA attributes.
- **Verdict:** Clean. No findings.

### 12. `rpg-battle/PlayerSprite.tsx` (17 lines)

**Contract:** Static player sprite sheet. Hardcoded to hero_male pose sheet.

- Same pattern as `EnemySprite` — legacy static component.
- **Finding F7.1 applies.**
- **Verdict:** See F7.1 above.

### 13. `rpg-battle/PlayerSprite.test.tsx` (10 lines)

**Contract tested:** Smoke test for alt text.

- **Verdict:** Clean. No findings.

### 14. `rpg-battle/Sprite.tsx` (61 lines)

**Contract:** Dynamic sprite sheet renderer. `SpritePose` type defines 9 poses mapped to 3×3 grid positions.

- CSS `backgroundPosition` calculated from `(col-1)/(GRID_SIZE-1)*100%` — correct for 1-indexed grid.
- `imageRendering: 'pixelated'` — appropriate for pixel art.
- `flip` via `scaleX(-1)` — correct horizontal flip.
- `role="img"` with `aria-label={alt}` — accessible.
- **Verdict:** Clean. No findings.

### 15. `rpg-battle/Sprite.test.tsx` (33 lines)

**Contract tested:** Position calculation and horizontal flip.

- Tests `backgroundPosition: '50% 0%'` for "casting" pose (row 1, col 2) — correct: (2-1)/(3-1)*100 = 50%.
- Tests `transform: 'scaleX(-1)'` when `flip` is true.
- **Verdict:** Clean. No findings.

### 16. `rpg-battle/StartScreen.tsx` (388 lines)

**Contract:** Tabbed pre-battle screen with briefing, rankings, and vocabulary tabs.

- Rankings fetch from `/api/v1/games/rpg-battle/ranking` (line 46) — no auth headers, no error status check on response body. The `response.ok` check is present (line 48), which is correct.
- **Finding F16.1 (LOW):** Rankings API call (`fetch("/api/v1/games/rpg-battle/ranking")`) does not include auth headers. If the endpoint requires authentication, this will silently fail with a 401 that is caught by the generic `catch` block and logged to console. No user-facing error is shown for auth failures specifically.
- Vocabulary list is sliced to 50 items (`vocabulary.slice(0, 50)`, line 350) — reasonable cap.
- Rankings list uses `<img>` (line 305) instead of `next/image` for user avatars — inconsistent with the rest of the component which uses `next/image`/`Sprite`. Minor.
- **Finding F16.2 (LOW):** User avatar images in rankings use raw `<img>` tag (line 305) instead of `next/image`. No width/height/alt attributes for layout stability.
- **Verdict:** Two low-priority findings (F16.1, F16.2).

### 17. `rune-match/MonsterSelection.tsx` (68 lines)

**Contract:** Monster selection grid. `MonsterType` from `runeMatchConfig` — 4 types.

- `MONSTER_METADATA` is a complete `Record<MonsterType, ...>` — exhaustive by type system.
- Uses `withBasePath` for image URLs — consistent with other game components.
- Hardcoded English strings ("Choose Your Opponent", "Select a monster...", descriptions) — not i18n. Same pattern as `BattleSelectionModal`.
- **Finding F17.1 (MEDIUM):** All user-facing text in `MonsterSelection.tsx` is hardcoded English (lines 27–28, descriptions in `MONSTER_METADATA`, button text "Battle" on line 59). The rest of the Rune Match game uses `useScopedI18n`. Inconsistent i18n coverage.
- **Verdict:** One medium finding (F17.1).

### 18. `rune-match/MonsterSelection.test.tsx` (49 lines)

**Contract tested:** Monster selection rendering and callback.

- Tests verify all 4 monsters render, stats display correctly, and `onSelect` fires with correct type.
- Uses flexible text matchers (`content.includes(...)`) for stats — robust against text splitting across elements.
- **Verdict:** Clean. No findings.

### 19. `rune-match/RuneMatchGame.tsx` (1203 lines)

**Contract:** Full match-3 game with Konva canvas. State machine: `selection → playing → victory/defeat`.

- **Finding F19.1 (MEDIUM):** Bomb skill button is rendered (lines 848–851, 1138–1144) but has no click handler. The comment `/* No handler yet */` is present. The button displays with a count but clicking it does nothing. Users see an interactive-looking button that is non-functional. This is a partial feature — the bomb count increments on 5+ matches (line 291–296) but there is no way to spend it.
- **Finding F19.2 (LOW):** `RuneMatchGame` exports `RuneMatchGameResult` type with `accuracy` as a number. The victory screen (line 567–568) computes accuracy as `(correctAnswers / totalAttempts) * 100`, producing a 0–100 value. However, the `BattleResults.tsx` component (from rpg-battle) expects accuracy as a 0–1 ratio and multiplies by 100 internally. If any parent component uses the same accuracy display logic for both games, there would be a mismatch. This is a cross-game contract inconsistency.
- **Finding F19.3 (LOW):** The `renderButton` helper function is defined twice — once inside the desktop sidebar IIFE (line 766–833) and once inside the mobile bottom bar IIFE (line 1061–1126). These are near-identical implementations with only spacing constants differing. DRY violation — extracting to a shared helper would reduce maintenance burden.
- Asset loading (lines 192–233) has proper error handling with retry mechanism and user-facing error state.
- ResizeObserver with 200ms polling fallback (lines 406–431) — robust responsive layout.
- Game loop uses `requestAnimationFrame` for floating text and `setInterval` for game timer — appropriate separation.
- **Verdict:** Three findings (F19.1 medium, F19.2 low, F19.3 low).

### 20. `rune-match/RuneMatchGame.test.tsx` (250 lines)

**Contract tested:** `RuneMatchGame` rendering, loading, and monster selection flow.

- Mocks for Konva (`Stage`, `Layer`, `Rect`, `Image`, `Text`, `Group`), lucide-react icons, `konva.Animation`, `Image.prototype.src`, and `ResizeObserver`.
- Tests verify: rendering, loading state, container styling, prop acceptance, monster selection flow, and swap behavior.
- Selection flow test (lines 141–199) properly awaits asset loading, selects Dragon, and verifies monster HP and power word display.
- **Finding F20.1 (LOW):** The test at line 104 checks `container.className` with regex `/aspect-video|h-\[60vh\]/`. The actual component (line 438) renders `h-[60vh]` in the loading state but `h-[80vh]` in the playing state (line 512). The regex `/h-\[60vh\]/` only matches the loading state. If the test runs against the playing state, it would fail. This is fragile coupling to render phase.
- **Verdict:** One low-priority finding (F20.1).

---

## Summary of Findings

| ID | File | Severity | Category | Description |
|----|------|----------|----------|-------------|
| F3.1 | `BattleScene.test.tsx` | **BLOCKER** | Test contract mismatch | Test asserts `backgroundImage: 'url(...)'` but component renders `linear-gradient(...), url(...)`. Test will fail against current implementation. |
| F4.1 | `BattleSelectionModal.tsx` | MEDIUM | i18n consistency | Step headings hardcoded English while other game components use `useScopedI18n`. |
| F17.1 | `MonsterSelection.tsx` | MEDIUM | i18n consistency | All user-facing text hardcoded English while `RuneMatchGame.tsx` uses `useScopedI18n`. |
| F19.1 | `RuneMatchGame.tsx` | MEDIUM | Incomplete feature | Bomb skill button renders with count but has no click handler. Users see a non-functional interactive element. |
| F2.1 | `BattleScene.tsx` | LOW | Forward safety | Missing `"use client"` directive; sibling components include it. |
| F7.1 | `EnemySprite.tsx`, `PlayerSprite.tsx` | LOW | Dead code | Legacy static sprite components appear superseded by dynamic `Sprite.tsx`. |
| F16.1 | `StartScreen.tsx` | LOW | Auth contract | Rankings API call has no auth headers; 401s silently caught without user feedback. |
| F16.2 | `StartScreen.tsx` | LOW | Component consistency | User avatar images use raw `<img>` instead of `next/image`. |
| F19.2 | `RuneMatchGame.tsx` | LOW | Cross-game contract | Accuracy output is 0–100 scale; `BattleResults` expects 0–1 ratio. Potential mismatch if reused. |
| F19.3 | `RuneMatchGame.tsx` | LOW | Code duplication | `renderButton` helper duplicated for desktop and mobile layouts. |
| F20.1 | `RuneMatchGame.test.tsx` | LOW | Test fragility | Regex check `/h-\[60vh\]/` only matches loading state, not playing state (`h-[80vh]`). |

---

## Endpoint Contracts

| Endpoint | Consumer | Auth | Notes |
|----------|----------|------|-------|
| `GET /api/v1/games/rpg-battle/ranking` | `StartScreen.tsx` | None in request | No auth headers sent. Silent failure on 401. |

No tRPC or server-side routes in this batch. All components are client-side.

---

## Cross-Component Contract Consistency

| Interface | Producer | Consumer | Match |
|-----------|----------|----------|-------|
| `BattleSelectionStep` | `useRPGBattleStore.ts` | `BattleSelectionModal.tsx` | OK |
| `BattleEnemyOption.id` | `rpgBattleSelection.ts` | `BattleSelectionModal.tsx`, `StartScreen.tsx` | OK |
| `SpritePose` | `Sprite.tsx` | `BattleSelectionModal.tsx`, `StartScreen.tsx` | OK |
| `FloatingTextItem` | `FloatingText.tsx` | `BattleScene.tsx` | OK |
| `MonsterType` | `runeMatchConfig.ts` | `MonsterSelection.tsx`, `RuneMatchGame.tsx` | OK |
| `RuneMatchGameResult.accuracy` | `RuneMatchGame.tsx` (0–100) | Parent (expects 0–1 ratio) | **MISMATCH** (F19.2) |

---

## No Changes Since Baseline

Zero files in this batch have been modified since the baseline SHA. All findings are pre-existing.

MEASURE_AGENT_RESULT
{"batch_id":"ra-batch-25","reviewer":"measure-review-c-ux-api","files_reviewed":20,"findings":{"blocker":1,"medium":3,"low":7,"info":0},"status":"complete","blockers":["F3.1: BattleScene.test.tsx assertion does not match component's background-image style (linear-gradient overlay)"]}
