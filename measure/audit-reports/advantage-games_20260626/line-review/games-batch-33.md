# Line-by-Line Review — games-batch-33

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-33`
**Scope source:** `/tmp/opencode/games-batch-33` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited.
**Finding ID scheme:** `F-GAMES-B33-###`
**Severity scale:** Critical / High / Medium / Low / Info

This batch is **infrastructure/shared-runtime**, not a single game. It covers:
- **Multiplayer end-game UI** — `PodiumScreen` (final rankings/XP), `ScoreboardOverlay` (live round HUD), plus a `mobile-viewport` test and their RTL tests.
- **Mobile touch controls** — `DPad` (5-button d-pad) and `VirtualDPad` (analog joystick), plus a DPad test.
- **shadcn/ui primitives** copied into the app — `alert`, `avatar`, `button`, `card`, `dialog`, `input`, `scroll-area`, `tabs`, plus button/card/input tests.
- **Accessibility settings** — `useAccessibilitySettings` test (hook + types read for context).

Because these are shared/importable building blocks, findings emphasize i18n, touch-target sizing, accessibility (keyboard/SR/reduced-motion), test fidelity, and duplication risk when imported into Reading/Primary.

For context (read-only, findings anchored to batch files): `src/hooks/useAccessibilitySettings.ts`, `src/types/accessibility.ts`, `src/lib/utils` (`cn`).

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `multiplayer/PodiumScreen.test.tsx` | Test | RTL, mocked callbacks |
| 2 | `multiplayer/PodiumScreen.tsx` | Component | Final rankings + XP bonus |
| 3 | `multiplayer/ScoreboardOverlay.test.tsx` | Test | RTL |
| 4 | `multiplayer/ScoreboardOverlay.tsx` | Component | Live round HUD overlay |
| 5 | `multiplayer/mobile-viewport.test.ts` | Test | Tautological string asserts |
| 6 | `ui/DPad.test.tsx` | Test | RTL, DOM-order dependent |
| 7 | `ui/DPad.tsx` | Component | 5-button directional pad |
| 8 | `ui/VirtualDPad.tsx` | Component | Analog joystick (memoized) |
| 9 | `ui/alert.tsx` | Component | shadcn alert |
| 10 | `ui/avatar.tsx` | Component | Radix avatar wrapper |
| 11 | `ui/button.test.tsx` | Test | RTL, data attrs + asChild |
| 12 | `ui/button.tsx` | Component | shadcn button (cva) |
| 13 | `ui/card.test.tsx` | Test | RTL, data-slot |
| 14 | `ui/card.tsx` | Component | shadcn card set |
| 15 | `ui/dialog.tsx` | Component | Radix dialog wrapper |
| 16 | `ui/input.test.tsx` | Test | RTL, attrs |
| 17 | `ui/input.tsx` | Component | shadcn input |
| 18 | `ui/scroll-area.tsx` | Component | Radix scroll-area |
| 19 | `ui/tabs.tsx` | Component | Radix tabs |
| 20 | `hooks/useAccessibilitySettings.test.ts` | Test | Jest, localStorage mock |

Note: `VirtualDPad.tsx`, `alert.tsx`, `avatar.tsx`, `dialog.tsx`, `scroll-area.tsx`, and `tabs.tsx` have **no test file in this batch** (and none found alongside). `useAccessibilitySettings.ts` itself is not in this batch (only its test is); the implementation was read for context.

---

## Findings

### F-GAMES-B33-001 · High · `mobile-viewport.test.ts` is tautological — verifies nothing
`mobile-viewport.test.ts:9-65` — Every assertion compares a literal to itself or to a hand-typed number, e.g. `expect('max-w-md').toBe('max-w-md')` (lines 11-12, 17-18, 23-24), `{ size: 44 } … toBeGreaterThanOrEqual(44)` (lines 33-39), `{ size: 14 } … toBeGreaterThanOrEqual(14)` (lines 56-63). No component is rendered, no DOM is measured, no viewport is set, and the `beforeEach` clears mocks that never exist (lines 4-7). This test passes unconditionally regardless of whether `PodiumScreen`/`ScoreboardOverlay`/`LobbyScreen` actually fit a 390px viewport or meet touch-target minimums. It provides false assurance for exactly the mobile-readiness property the track cares about and should be replaced with real render+measure assertions (or deleted).

### F-GAMES-B33-002 · High · Touch-target claim contradicts actual `Button` sizing
`mobile-viewport.test.ts:32-39` asserts "Start Game" / "Leave Room" are `min-h-11 = 44px`. But `PodiumScreen.tsx:136,140` render `<Button>` with the **default** size, which is `h-10` (40px) per `button.tsx:24`. ScoreboardOverlay's "Hide" is a bare `<button>` with only `text-sm` (`ScoreboardOverlay.tsx:63-68`) — well under 44px. So the real interactive controls in this batch are 40px (or smaller), below the 44px Apple HIG / Material minimum the test claims to enforce. Either the buttons need `size="lg"` / explicit `min-h-11`, or the test is documenting a target that the code does not meet. This is a concrete mobile/age-appropriate-UX defect (young learners, imprecise taps).

### F-GAMES-B33-003 · High · DPad buttons have no accessible name and no keyboard operation
`DPad.tsx:42-97` — All five buttons render only an SVG arrow / a `DROP` `<span>` with **no `aria-label`**, so screen readers announce empty buttons (the test author even comments on this at `DPad.test.tsx:9-11`). Worse, movement is driven exclusively by `onMouseDown`/`onTouchStart` + `onMouseUp`/`onTouchEnd` (lines 44-96); there are **no `onKeyDown`/`onKeyUp` handlers**, so a keyboard or switch-access user pressing Enter/Space fires a synthetic click that never produces the held-direction `onInput({dx,dy})`/release sequence. The d-pad is effectively pointer-only and inaccessible to keyboard/AT users. For an importable, age-appropriate control surface this is a significant accessibility gap.

### F-GAMES-B33-004 · High · Hardcoded English strings in shared multiplayer/control UI (i18n gap)
These components are presented as reusable runtime, yet hardcode English copy, blocking clean import into the localized Reading/Primary shells:
- `PodiumScreen.tsx:73` "Game Over!", `:74` "{n} rounds completed", `:85` "Winner", `:88` "{score} points", `:89` "(+{xp} XP)", `:96` "Final Rankings", `:114` "Position {n}", `:121` "+{xp} XP", `:138` "Play Again", `:142` "Leave Room".
- `ScoreboardOverlay.tsx:52` "Round {n}/{m}", `:67` "Hide".

None use the `useScopedI18n`/locale system that other batches (e.g. `BattleResults`) use. Non-English learners get English end-game and HUD text. (Contrast with batch-31 F-GAMES-B31-009 — same defect class recurring across the app.)

### F-GAMES-B33-005 · Medium · `reduceMotion` accessibility setting exists but animated components ignore it
`useAccessibilitySettings.test.ts:43,50,105,110,188` exercises a `reduceMotion` flag (and `accessibility.ts:5,14` defines it), but the heavily-animated components in this same batch never consult it: `PodiumScreen.tsx:58-144` runs entrance springs, scale-in, and staggered row animations; `ScoreboardOverlay.tsx:42-114` runs slide/scale `AnimatePresence` and a per-score color pulse; `DPad`/`VirtualDPad` use transitions. There is no `prefers-reduced-motion` media query and no read of `settings.reduceMotion`. Motion-sensitive and young learners get unmitigated animation despite a setting that advertises otherwise. The flag is plumbed but unwired — a latent accessibility regression.

### F-GAMES-B33-006 · Medium · `VirtualDPad` can latch input "on" — no touch-cancel / pointer-leave-from-document handling
`VirtualDPad.tsx:86-97` binds `onTouchEnd`/`onMouseUp`/`onMouseLeave` to clear input, but there is **no `onTouchCancel`** handler. On mobile, the OS can fire `touchcancel` (incoming call, system gesture, scroll takeover) without `touchend`; when that happens `handleEnd` never runs, `active` stays true, and the last `{dx,dy}` keeps being applied — the avatar keeps moving with no finger down. Similarly, a `mouseup` occurring off-element after the pointer already left is only caught by `onMouseLeave`. For a mobile-first game this is a real "stuck movement" risk. Add `onTouchCancel={handleEnd}` and consider window-level listeners while active.

### F-GAMES-B33-007 · Medium · `VirtualDPad` reads `e.touches[0]` without guarding empty touch list
`VirtualDPad.tsx:69,78` — `handleTouchStart`/`handleTouchMove` index `e.touches[0].clientX` directly. If `touches` is empty (multi-touch edge cases, or `changedTouches`-only events on some browsers), this throws and can crash the game frame. Guard with `if (!e.touches.length) return` (and prefer `changedTouches` semantics where appropriate). Browser-compatibility hardening for the primary touch control.

### F-GAMES-B33-008 · Medium · `VirtualDPad` is untested; `DPad` test is brittle and shallow
`VirtualDPad.tsx` (the analog joystick that the deadzone/snapping math at lines 31-55 lives in) has **no test** — the non-trivial geometry (deadzone <5px, 0.2/0.8 axis thresholds producing fractional `dx`/`dy` for diagonals) is entirely unverified. `DPad.test.tsx` covers only one button via positional DOM order (`buttons[0]`, lines 19-23) with the author admitting uncertainty in comments (lines 9-17); it never tests DROP, release on the other four buttons, or accessibility. The two primary input controls of the game runtime are effectively unguarded.

### F-GAMES-B33-009 · Medium · Connection / rank status conveyed by color alone
`ScoreboardOverlay.tsx:91-95` shows connection state purely as a green vs gray dot (`bg-green-500`/`bg-gray-300`) with no text, `aria-label`, or icon; `:82-84` and `PodiumScreen.tsx:43-53` distinguish rank tiers by background color only. Color-only status fails WCAG 1.4.1 (use of color) and is invisible to color-blind learners and screen readers. The test even asserts the color-only pattern (`ScoreboardOverlay.test.tsx:147-149`), locking it in. Add a textual/`aria` connection label.

### F-GAMES-B33-010 · Medium · `PodiumScreen` ranking assumes unique, gap-free `position` values
`PodiumScreen.tsx:27-28` sorts by `position` and treats `sortedPlayers[0]` as the sole winner; `:104,109` color/icon strictly switch on `position === 1|2|3`. There is no tie handling: if two players share `position: 1` (a plausible scoreboard tie), one is silently dropped from the "Winner" announcement and both render identical gold styling with no tie indication. Scoring/leaderboard correctness depends on the (undocumented) precondition that the host always pre-resolves ties into distinct 1..N positions. This contract is neither validated (no Zod/guard) nor tested.

### F-GAMES-B33-011 · Medium · Duplicated shadcn primitive set increases import/runtime conflict risk
`alert.tsx`, `avatar.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `scroll-area.tsx`, `tabs.tsx` are a full local copy of shadcn primitives living inside `advantage-games`. The track goal is importing these games into Reading/Primary, which ship their **own** shadcn copies. Importing a game that transitively pulls this app's `button.tsx` (with app-specific tokens like `bg-primary`, `border-border`) yields duplicated components, divergent design tokens, and potential class/CSS-variable collisions. For a shared runtime, UI primitives should come from a shared `@reading-advantage/ui` package, not be re-vendored per app. (Architectural/importability risk, not a single-line bug.)

### F-GAMES-B33-012 · Low · `dialog.tsx` mixes icon libraries (Radix icons vs lucide)
`dialog.tsx:5` imports `Cross2Icon` from `@radix-ui/react-icons`, while the rest of the batch (`PodiumScreen.tsx:3`, `ScoreboardOverlay.tsx:3`, `DPad.tsx:4`) uses `lucide-react`. Pulling a second icon dependency for a single close glyph bloats the bundle and is inconsistent. Standardize on lucide (`X`).

### F-GAMES-B33-013 · Low · Card/Alert titles are non-semantic for heading hierarchy
`card.tsx:31-39` renders `CardTitle` as a `<div>` (no heading role), while `alert.tsx:39` hardcodes `AlertTitle` to `<h5>`. Neither adapts to surrounding document outline: card titles provide no landmark for AT navigation, and a fixed `h5` can produce an invalid heading skip (h1→h5) wherever an alert appears. Minor a11y/semantics issue in shared primitives.

### F-GAMES-B33-014 · Low · `ScoreboardOverlay` exit animation is dead due to early `return null`
`ScoreboardOverlay.tsx:39` returns `null` when `!isVisible`, and the root `motion.div` declares `exit={{...}}` (line 45) but is **not** wrapped in an `AnimatePresence` at this level (the `AnimatePresence` at line 73 only wraps the player rows). Because the component unmounts itself via the early return rather than via presence tracking, the overlay's own exit animation never plays. Either lift visibility control to an `AnimatePresence` in the parent or drop the misleading `exit` prop.

### F-GAMES-B33-015 · Low · `formatTime` does not guard negative/NaN seconds
`ScoreboardOverlay.tsx:33-37` — `formatTime(seconds)` assumes a non-negative integer. A negative `timeRemaining` (clock overrun / late tick) renders e.g. `-1:-5` style garbage, and a fractional value renders a fractional `mins`. Clamp to `Math.max(0, Math.floor(seconds))`. Low impact but visible to learners during round timers.

### F-GAMES-B33-016 · Low · `DPad` DROP button never clears on pointer release; potential double-stop on others
`DPad.tsx:67-73` — the center DROP button binds only `onTouchStart`/`onMouseDown` (cast pulse via `setTimeout`, lines 28-30) with **no** `onTouchEnd`/`onMouseUp`; relies entirely on the 100ms timer. Meanwhile directional buttons bind both `onMouseUp` **and** `onMouseLeave` to `handleEnd` (lines 47-48 etc.), so a quick release that also leaves the element fires `onInput({0,0})` twice. Neither is fatal, but the asymmetric/duplicated input dispatch is fragile for a control that drives gameplay.

### F-GAMES-B33-017 · Low · Decorative icons not hidden from assistive tech
`PodiumScreen.tsx:33-39,71,109,137,141` and `ScoreboardOverlay.tsx:51,56,100` render lucide icons (Trophy/Crown/Medal/Star/Timer/TrendingUp/RotateCcw/LogOut) with no `aria-hidden="true"`. Lucide renders inline `<svg>`; without `aria-hidden` some AT may announce them or their stray titles, adding noise to the otherwise text-labeled rankings. Mark purely decorative icons `aria-hidden`.

### F-GAMES-B33-018 · Low · `useAccessibilitySettings` writes to localStorage on mount; test couples to call index
`useAccessibilitySettings.test.ts:134-135` reads `localStorageMock.setItem.mock.calls[1][1]`, hard-coding the assumption that the **first** `setItem` (index 0) is the mount-time write. This reflects a real behavior in the hook (`useAccessibilitySettings.ts:34-36` runs `saveToStorage` in a `[settings]` effect that fires on initial mount), so the hook persists default settings even when the user changed nothing — an unnecessary write that can clobber a concurrently-written value and makes tests positionally brittle. Consider skipping the initial save (e.g. a `didMount` ref) and asserting via the last call instead of a fixed index.

### F-GAMES-B33-019 · Info · Primitive tests are minimal (variants/sizes/disabled uncovered)
`button.test.tsx:4-24` checks default data-attrs and `asChild` only — none of the 6 variants, 6 sizes, `disabled`, or focus-ring behavior. `card.test.tsx` checks `data-slot` strings only (no `CardAction`). `input.test.tsx` checks three attributes. These are smoke tests; they will not catch a regression in `buttonVariants` sizing (directly relevant to F-GAMES-B33-002) or disabled handling. Acceptable for vendored primitives but worth noting given the touch-size dependency.

### F-GAMES-B33-020 · Info · `PodiumScreen` "XP for top 3" framing is implicit, driven by data not rank
`PodiumScreen.tsx:120` shows the per-row XP badge whenever `player.xpBonus > 0`, and the test (`PodiumScreen.test.tsx:73-86`) frames this as "XP bonuses for top 3" / "not for 4th place". The component does **not** gate on rank — it gates on `xpBonus > 0`; the "top 3 only" behavior is entirely a property of the mock data (4th place happens to have `xpBonus: 0`). If the host ever awards a non-zero participation XP to lower ranks, the UI will show it and the test's intent ("top 3") silently diverges from behavior. The XP-eligibility rule should live in one documented place (the scoring model), not be implied by test fixtures.

---

## Cross-Cutting Observations (read-only, not defects on a single line)

- **Scoring/XP/leaderboards:** `PodiumScreen` and `ScoreboardOverlay` are purely presentational over host-supplied `players[]` (`score`, `position`, `xpBonus`, `wordsCollected`, `isConnected`). They embed no scoring math — good for a shared runtime — but they also encode display rules (winner = position 1, XP shown when >0, top-1 highlight by sort index) that depend on undocumented host contracts (see F-GAMES-B33-010, -020). No Zod validation of the inbound player shape at this boundary.
- **Progress/importability:** None of these components emit progress events; they are leaf UI. The blocker for Reading/Primary import is i18n (F-GAMES-B33-004) and the duplicated primitive set (F-GAMES-B33-011), not data flow.
- **Performance:** `VirtualDPad` is correctly `memo`-wrapped with a `useRef` callback to avoid re-renders (`VirtualDPad.tsx:9,13-14`) — good. `ScoreboardOverlay` re-keys the score `<span>` on `player.score` (line 104) to retrigger the pulse, which remounts a tiny node — cheap. Framer-motion staggers in `PodiumScreen` are bounded by player count.
- **Mobile/browser:** `touch-none select-none` and `onContextMenu` suppression are present on both controls (`DPad.tsx:33,38`, `VirtualDPad.tsx:88,96`) — sensible for touch. Main gaps are touch-cancel (F-GAMES-B33-006) and touch-list guards (F-GAMES-B33-007).
- **Accessibility theme:** A reduce-motion setting exists and is well-tested at the hook level, but is not consumed anywhere in this batch's animated UI (F-GAMES-B33-005); combined with color-only status (F-GAMES-B33-009) and inaccessible d-pad (F-GAMES-B33-003), the shared runtime's a11y posture is weaker than the settings surface implies.

---

## Limitations

- **Read-only:** No source was executed, built, or edited; findings are from static reading. Test pass/fail status was not verified by running Jest/Vitest.
- **Context files not in batch** (`useAccessibilitySettings.ts`, `accessibility.ts`, `lib/utils`) were inspected only to anchor findings; they receive no findings here.
- **`LobbyScreen`** is referenced by `mobile-viewport.test.ts:9-13` but is **not** in this batch and was not reviewed; the test's claims about it are unverifiable here and are flagged only as tautological (F-GAMES-B33-001).
- Whether the host that mounts `PodiumScreen`/`ScoreboardOverlay` pre-resolves ties, supplies localized strings, or honors `reduceMotion` could not be confirmed without reviewing the multiplayer container (out of batch).
- Runtime touch/joystick behavior (deadzone feel, latch on `touchcancel`, diagonal fractional output) was reasoned about from source, not exercised on a device.

---

## Scope Confirmation

- Report exists at the required path and covers **all 20 files** listed in `/tmp/opencode/games-batch-33`.
- Every file appears in the Files Reviewed table; findings are line-anchored with severities and `F-GAMES-B33-###` IDs.
- This is a line-by-line review artifact only. **No acceptance or closeout claims are made**; gate decisions remain with the track owner.
