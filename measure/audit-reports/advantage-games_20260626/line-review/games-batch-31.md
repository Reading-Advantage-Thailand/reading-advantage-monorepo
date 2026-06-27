# Line-by-Line Review — games-batch-31

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-31`
**Scope source:** `/tmp/opencode/games-batch-31` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited.
**Finding ID scheme:** `F-GAMES-B31-###`
**Severity scale:** Critical / High / Medium / Low / Info

This batch spans three games:
- **enchanted-library** — one progress panel component, one pure input-mapping helper + its test.
- **paladins-twin-soul** — the full Konva game component, its test, and a barrel `index.ts`.
- **rpg-battle** — a set of presentational battle UI subcomponents (`ActionMenu`, `BattleEffects`, `BattleLog`, `BattleResults`, `BattleScene`, `BattleSelectionModal`, `ComboIndicator`) and one sprite test.

To review meaningfully, the following non-batch files were read-only inspected for context (findings are anchored to batch files): `src/hooks/useDirectionalInput.ts`, `src/lib/games/paladinsTwinSoulConfig.ts`, `src/lib/games/paladinsTwinSoul.ts` (`calculateXP`), `src/components/games/vocabulary/rpg-battle/EnemySprite.tsx`, and `src/locales/en.ts` (i18n keys).

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `enchanted-library/VocabularyProgress.tsx` | Component | Grimoire side panel |
| 2 | `enchanted-library/enchantedLibraryInput.test.ts` | Test | Jest, pure fn |
| 3 | `enchanted-library/enchantedLibraryInput.ts` | Logic | dx/dy → directional map |
| 4 | `paladins-twin-soul/PaladinsTwinSoulGame.test.tsx` | Test | Mocked Konva/hooks |
| 5 | `paladins-twin-soul/PaladinsTwinSoulGame.tsx` | Component | Full game loop |
| 6 | `paladins-twin-soul/index.ts` | Barrel | `export *` |
| 7 | `rpg-battle/ActionMenu.test.tsx` | Test | RTL |
| 8 | `rpg-battle/ActionMenu.tsx` | Component | Translation input |
| 9 | `rpg-battle/BattleEffects.test.tsx` | Test | RTL |
| 10 | `rpg-battle/BattleEffects.tsx` | Component | Shake/flash wrapper |
| 11 | `rpg-battle/BattleLog.test.tsx` | Test | RTL |
| 12 | `rpg-battle/BattleLog.tsx` | Component | Battle log list |
| 13 | `rpg-battle/BattleResults.test.tsx` | Test | RTL |
| 14 | `rpg-battle/BattleResults.tsx` | Component | Outcome card (i18n) |
| 15 | `rpg-battle/BattleScene.test.tsx` | Test | RTL |
| 16 | `rpg-battle/BattleScene.tsx` | Component | Layout shell |
| 17 | `rpg-battle/BattleSelectionModal.test.tsx` | Test | RTL |
| 18 | `rpg-battle/BattleSelectionModal.tsx` | Component | Hero/loc/enemy picker |
| 19 | `rpg-battle/ComboIndicator.tsx` | Component | Streak badge |
| 20 | `rpg-battle/EnemySprite.test.tsx` | Test | RTL (placeholder sprite) |

Note: `EnemySprite.tsx` itself is **not** in this batch (only its `.test.tsx` is, file #20). It was read for context only; findings on the component proper are deferred to whichever batch owns it.

---

## Findings

### F-GAMES-B31-001 · High · Hardcoded SPA navigation breaks importability into Reading/Primary
`PaladinsTwinSoulGame.tsx:349-351` — `onExit` does `window.location.href = "/student/games"`. This is a hard full-page navigation to an advantage-games-specific route. When this game is imported into Reading or Primary (a stated readiness goal), `/student/games` may not exist or may live under a different locale/base path, sending the learner to a 404 and discarding any in-app router state. Exit navigation should be injected via prop/callback (e.g. an `onExit` passed from the host) rather than hardcoded. Compare `onComplete`, which is correctly a prop.

### F-GAMES-B31-002 · High · Difficulty selection is dead code — always "medium"
`PaladinsTwinSoulGame.tsx:32` — `const [selectedDifficulty] = useState<"easy" | "medium" | "hard">("medium")`. There is no setter and no UI control anywhere in the component to change it, so `createPaladinsTwinSoulState(vocabulary, { difficulty: selectedDifficulty })` (line 50) is permanently locked to medium. The difficulty axis advertised by the state factory is unreachable. For a graded learning platform this removes per-learner difficulty adaptation. Either wire a selector on the start screen or remove the unused type union to avoid implying a capability that does not exist.

### F-GAMES-B31-002b · Low · `consumeCast` / `setVirtualInput` from `useDirectionalInput` are unused
`PaladinsTwinSoulGame.tsx:40` destructures only `{ input: keyboardInput }`. The hook exposes `consumeCast`/`setVirtualInput` (confirmed in `useDirectionalInput.ts` and mocked at `PaladinsTwinSoulGame.test.tsx:10-11`), and the game uses only horizontal `dx` (auto-fire shoot). The test mock provides `consumeCast`/`setVirtualInput` that the component never calls — harmless but signals drift between the mock contract and actual usage. Confirm the "cast" channel is intentionally unused here.

### F-GAMES-B31-003 · Medium · XP hard-capped at 10 with no difficulty term — scoring fidelity loss
`paladinsTwinSoul.ts:282-299` (`calculateXP`, invoked at `PaladinsTwinSoulGame.tsx:141-147` and again at `337-343`) returns `Math.min(10, baseXP + bonus)` and ignores difficulty entirely. Two consequences for the shared scoring/XP model: (a) a learner who correctly answers more than ~10 words gets no additional XP, flattening the reward curve; (b) because difficulty is hardcoded medium (F-GAMES-B31-002) and `calculateXP` has no difficulty multiplier, this game's XP is not comparable to rpg-battle's difficulty-scaled XP (`scaleBattleXp` in `BattleSelectionModal.tsx:9,38`). Cross-game XP normalization is unproven. `calculateXP` is computed twice (lines 141 and 337) with identical args — extract to a memo/single source to avoid divergence.

### F-GAMES-B31-004 · Medium · `onComplete` discards score and word-level mastery
`PaladinsTwinSoulGame.tsx:148` reports only `{ xp, accuracy }`. The state carries `score`, `wave`, `correctAnswers`, `totalAttempts`, and per-word data, none of which reaches the host. Reading/Primary progress tracking typically needs per-word mastery and raw counts to update a learner model; an `{xp, accuracy}` tuple is insufficient for importability into a progress system. The `GameEndScreen` shows `score` (line 336) but the host callback never receives it.

### F-GAMES-B31-005 · Medium · Brittle test asserts exact Konva `Rect` count (27)
`PaladinsTwinSoulGame.test.tsx:68` — `expect(await screen.findAllByTestId("konva-rect")).toHaveLength(27)`. This couples the test to an incidental render count (HUD boxes + enemy grid + bullets + player). Any cosmetic layout change (adding a frame, changing enemy rows/cols in config) breaks the test without indicating a real regression. It also asserts nothing about scoring, input handling, win/lose transitions, XP, or `onComplete` — the behaviors that actually matter. Coverage here is shallow (3 render-only cases); no test exercises `tickPaladinsTwinSoul`, the `onComplete` payload, or the difficulty path.

### F-GAMES-B31-006 · Medium · DPad/keyboard velocity uses `||`, blocking deliberate stop
`PaladinsTwinSoulGame.tsx:43-46` — `x: dpadVelocity.x || keyboardInput.dx`. Because `0 || x === x`, a learner who releases the DPad (dpad x → 0) while a keyboard key is still logically considered will fall through to keyboard input, and a learner cannot hold the DPad at neutral (0) to override an active keyboard `dx`. On touch devices the DPad is the only control, so this is mostly latent, but the `||` fallback is a fragile input-merge for a mobile-first game. Prefer an explicit "last active source wins" or additive/clamped merge.

### F-GAMES-B31-007 · Medium · `VocabularyProgress` uses array index as React key
`VocabularyProgress.tsx:58` — `key={i}` on the vocabulary rows. Items also carry a stable `item.term` (already used in `data-testid` on line 60 and as the progress map key on line 55). If the vocabulary list is ever reordered or filtered, index keys cause incorrect DOM reuse and star-state mismatch. Use `key={item.term}`.

### F-GAMES-B31-008 · Low · Duplicate `data-testid="star"` on two elements
`VocabularyProgress.tsx:73,78` — both `Star` icons share `data-testid="star"`. Duplicate test IDs defeat `getByTestId` (it throws on multiples) and force `getAllByTestId`, and the `data-filled` attribute is the only differentiator. Combined with the fact that **there is no test file for `VocabularyProgress`** at all (component is untested), the test hooks exist but are unused. Prefer indexed IDs (`star-1`, `star-2`) and add a unit test.

### F-GAMES-B31-009 · Medium · Hardcoded English strings in shared/importable UI (i18n gap)
Multiple batch components hardcode English copy, which blocks clean import into the localized Reading/Primary shells:
- `VocabularyProgress.tsx:43` "My Grimoire", `:88` "Collect all words twice!".
- `PaladinsTwinSoulGame.tsx:161-176` game title, subtitle, all instruction text, pro tip, control labels, start button.
- `PaladinsTwinSoulGame.tsx:334-335` end-screen title/subtitle.
- `ActionMenu.tsx:52-53,70,79,92` "Actions", "Type the translation", "Power/Basic", "Type translation...", "Cast".
- `BattleLog.tsx:12-13,18` "Battle Log", "Latest actions", "No actions yet.".
- `BattleSelectionModal.tsx:92-112` "Choose your hero", "Cosmetic choice only.", "Choose a location", "Background only.", "Choose an enemy", "Stronger foes grant more XP.".

Contrast `BattleResults.tsx:4,19-21,45,51,59` which correctly uses `useScopedI18n("pages.student.gamesPage")` and keys confirmed present in `en.ts:729-733`. The inconsistency means part of the rpg-battle UI is localized and part is not. This is a portability/accessibility defect for non-English learners.

### F-GAMES-B31-010 · Medium · Selection modal lacks focus trap, Escape, and labelled dialog
`BattleSelectionModal.tsx:82-86` sets `role="dialog" aria-modal="true"` but: no `aria-labelledby`/`aria-label` pointing at the heading (`h2` on lines 91/99/107 has no `id`), no focus trapping, no initial-focus management, no Escape-to-close, and no close affordance. Screen-reader and keyboard users get a modal that announces nothing and does not constrain focus. For an age-appropriate, accessible learning game this is a meaningful a11y gap. The test (`BattleSelectionModal.test.tsx`) does not assert any of these (it checks headings/images/buttons only), so the gap is unguarded.

### F-GAMES-B31-011 · Low · Background image injected via unsanitized `url()` interpolation
`BattleScene.tsx:33` (`url(${backgroundImage})`) and `BattleSelectionModal.tsx:148` (`backgroundImage: url(${location.background})`). Both interpolate a string directly into a CSS `url()`. Inputs are currently internal constants (`battleLocations`, fixed `/games/...` paths), so risk is low today, but if these props ever carry server/learner-derived values they enable CSS injection / data exfiltration. Note `BattleScene.test.tsx:42` asserts the raw substring appears in `backgroundImage`, locking in the unsanitized pattern. Recommend `CSS.escape`-style guarding or constraining to a known asset map.

### F-GAMES-B31-012 · Low · Animations ignore `prefers-reduced-motion`
`ComboIndicator.tsx:22-24` uses `animate-pulse` and `animate-[bounce_1s_infinite]`; `BattleEffects.tsx:28` runs a continuous shake `x: [0,-8,8,-6,6,0]`; `VocabularyProgress.tsx` and `PaladinsTwinSoulGame` rely on framer-motion springs. None gate on `prefers-reduced-motion`. For young learners and motion-sensitive users (vestibular), persistent bounce/pulse/shake should be reduced or disabled when the OS setting is on. There is an `useAccessibilitySettings` hook in use (`PaladinsTwinSoulGame.tsx:19,29`) for text/touch sizing but it is not consulted for motion.

### F-GAMES-B31-013 · Low · `EnemySprite` is a hardcoded placeholder sprite (asset/readiness)
`EnemySprite.test.tsx` (file #20) only asserts the alt text "Enemy sprite sheet" renders. The component (context read of `EnemySprite.tsx:7-14`) hardcodes `/games/rpg-battle/enemy_slime_pose_sheet_3x3.png`, `unoptimized`, with no `pose`/`enemyId` prop — yet `BattleSelectionModal` lets users choose among multiple enemies (elemental, etc.) with distinct sprites. The static `EnemySprite` cannot reflect the selected enemy, indicating either an unfinished component or two parallel sprite systems (`Sprite` vs `EnemySprite`). Test asserts the placeholder, not the real per-enemy rendering. Asset wiring for selected enemies is unverified.

### F-GAMES-B31-014 · Low · Test relies on `consumeCast` mock + RAF loop without fake timers
`PaladinsTwinSoulGame.test.tsx` mocks `requestAnimationFrame`-driven hooks implicitly (Konva mocked, but the RAF game loop in `PaladinsTwinSoulGame.tsx:81-94` still schedules real `requestAnimationFrame`). The three tests transition to "playing" and then unmount without advancing time, so the loop's `tickPaladinsTwinSoul` path is effectively untested and a stray RAF may fire after assertions. No `jest.useFakeTimers()` / `act` around the loop. Low risk (jsdom), but the loop logic — the heart of the game — has zero assertion coverage here.

### F-GAMES-B31-015 · Info · `enchantedLibraryInput` test misses zero/neutral and `cast` defaulting cases
`enchantedLibraryInput.ts:6-10` returns all-false on `dx===0,dy===0` and coerces `cast` via `Boolean(input.cast)`. `enchantedLibraryInput.test.ts` covers a left/down case and a diagonal case but does **not** assert the neutral `{dx:0,dy:0}` → all-false result nor the `cast: undefined → false` coercion. The function is simple and correct, but the stated `cast?: boolean` optionality (per `InputVector` in `useDirectionalInput.ts`) is the most defect-prone path and is untested. Add the neutral and undefined-cast cases.

### F-GAMES-B31-016 · Info · `ActionMenu` double focus mechanism
`ActionMenu.tsx:34-38` focuses via `useEffect` on `!disabled`, and `:83` also sets `autoFocus={!disabled}`. Two independent focus triggers can fight on mount and on prop change. The test (`ActionMenu.test.tsx:57-83`) validates the effect-based refocus-on-enable, but `autoFocus` is redundant and, with SSR/hydration, `autoFocus` is unreliable. Keep one mechanism (the ref/effect) and drop `autoFocus`.

### F-GAMES-B31-017 · Info · `BattleLog` uses index in key for live log
`BattleLog.tsx:31` — `key={`${entry.type}-${index}`}`. For an append-only `role="log"` (line 20) this is usually fine, but if entries are ever prepended/trimmed the index reuse can misalign animation/state. The `aria-live="polite"` + `role="log"` here is a good a11y pattern and worth replicating in the modal (see F-GAMES-B31-010).

### F-GAMES-B31-018 · Info · `paladins-twin-soul/index.ts` `export *` barrel
`index.ts:1` — `export * from "./PaladinsTwinSoulGame"`. Wildcard re-export also surfaces the `PaladinsTwinSoulGameProps` interface and any future internal exports, widening the public surface unintentionally. Prefer a named export (`export { PaladinsTwinSoulGame } from "./PaladinsTwinSoulGame"`) for a clean importable boundary into Reading/Primary.

---

## Cross-Cutting Observations (read-only, not defects on a single line)

- **Performance:** `PaladinsTwinSoulGame.tsx:152-155` recomputes `scale` and uses `ResizeObserver` correctly; `clampedDelta = Math.min(delta, 50)` (line 84) guards against tab-switch frame spikes — good. Star field (lines 193-202) regenerates 20 `Circle`s each render keyed by index; acceptable.
- **Mobile/browser:** `touch-none` and responsive `h-[75vh]`/`md:aspect-video` containers are present (`PaladinsTwinSoulGame.tsx:159,185`); `VirtualDPad` overlay provided (line 326). Konva `Stage` sized from measured dimensions — sound for portrait-first.
- **Shared runtime:** rpg-battle subcomponents are cleanly presentational (props-in, no store coupling except `BattleLog`/`BattleResults`/`BattleSelectionModal` importing store/i18n types), which aids reuse. `BattleSelectionModal` correctly labels stat scaling via `scaleEnemyHealth`/`scaleBattlexp` shared helpers — its XP scaling is difficulty-aware, unlike paladins (see F-GAMES-B31-003).
- **Age-appropriate UX:** copy is friendly and themed; the main risks are the i18n gaps (F-GAMES-B31-009) and motion (F-GAMES-B31-012).

---

## Limitations

- **Read-only:** No source was executed, built, or edited; findings are from static reading. Test pass/fail status was not verified by running Jest/Vitest.
- **Context files not in batch** (`useDirectionalInput.ts`, `paladinsTwinSoulConfig.ts`, `paladinsTwinSoul.ts`, `EnemySprite.tsx`, `en.ts`) were inspected only to anchor findings; they receive no findings here and may merit their own review.
- **`FloatingText`, `Sprite`, `PlayerSprite`, `HealthBar`, `StartScreen`, `useRPGBattleStore`** are referenced by batch files (e.g. `BattleScene.tsx:3-4`, `BattleSelectionModal.tsx:6,17`) but are **not** in this batch and were not reviewed; integration correctness of those imports is assumed, not verified.
- Runtime behavior of the Konva game loop and `tickPaladinsTwinSoul` was reasoned about from source, not exercised; dynamic defects (timing, collision, capture mechanics) are out of scope for a static line review.
- I18n key existence was spot-checked for `BattleResults` only; other locale completeness (es/zh/etc.) was not audited.

---

## Scope Confirmation

- Report exists at the required path and covers **all 20 files** listed in `/tmp/opencode/games-batch-31`.
- Every file appears in the Files Reviewed table; findings are line-anchored with severities and `F-GAMES-B31-###` IDs.
- This is a line-by-line review artifact only. **No acceptance or closeout claims are made**; gate decisions remain with the track owner.
