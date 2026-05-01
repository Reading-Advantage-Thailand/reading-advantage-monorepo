# Game Fidelity Checklist

Derived from `vocab-game-builder` skill requirements. Use this checklist when auditing games developed after Spellweaver's Run.

---

## A. File Structure

- [ ] Game logic file exists: `src/lib/games/[gameName].ts`
- [ ] Config file exists: `src/lib/games/[gameName]Config.ts`
- [ ] Component file exists: `src/components/games/{type}/[game-name]/[GameName]Game.tsx`
- [ ] Component index exists: `src/components/games/{type}/[game-name]/index.ts`
- [ ] Page file exists: `src/app/[locale]/(student)/student/games/{type}/[game-name]/page.tsx`
- [ ] Sentences API route exists: `src/app/api/v1/games/[game-name]/sentences/route.ts`
- [ ] Complete API route exists: `src/app/api/v1/games/[game-name]/complete/route.ts`

---

## B. Architecture

- [ ] Game logic is pure functions (no React/side effects in `.ts` file)
- [ ] State is a plain object; no class instances
- [ ] `createXxxState()` factory function exists and is exported
- [ ] `tickXxx()` / update function exists and accepts state + inputs, returns new state
- [ ] Config is defined in a separate `[gameName]Config.ts` with `GAME_WIDTH`, `GAME_HEIGHT`, and a `XXX_CONFIG` object
- [ ] Game component uses `useInterval` hook for the game loop (not `setInterval` directly)
- [ ] Game component uses `useState` for game state (no global stores in component)
- [ ] Game component does NOT import from `@/store/useGameStore` (store access is page-level only)

---

## C. Prop Contracts

- [ ] For **sentence games**: component prop is `sentences: SentenceItem[]` (not `vocabulary`)
- [ ] For **vocabulary games**: component prop is `vocabulary: VocabularyItem[]`
- [ ] `onComplete` callback accepts `{ xp: number; accuracy: number }`
- [ ] `Difficulty` type is imported from `@/store/useGameStore` only at page level if needed, not passed as prop (or is handled internally)

---

## D. Page Structure

- [ ] Page uses `dynamic()` import with `{ ssr: false }` for the game component
- [ ] Page fetches sentences/vocabulary from the game's API route using `useCurrentLocale()`
- [ ] Page handles `NO_SENTENCES` and `INSUFFICIENT_SENTENCES` warnings with user-friendly UI
- [ ] Page calls `useGameStore((state) => state.setLastResult)` on completion
- [ ] Page POSTs to `/api/v1/games/[game-name]/complete` on completion
- [ ] Page shows a loading spinner (`Loader2`) while fetching
- [ ] Page has a back link to `/student/games`

---

## E. API Routes

- [ ] Sentences/vocabulary route uses `createSentencesRoute` or `createVocabularyRoute` factory **OR** returns equivalent `{ sentences, warning }` shape
- [ ] Complete route uses `createCompleteRoute` factory **OR** returns a valid JSON response
- [ ] Both routes export `export const dynamic = "force-static"`

---

## F. Mobile-First / UI

- [ ] Canvas dimensions reference `GAME_WIDTH` / `GAME_HEIGHT` from config (390×844 baseline)
- [ ] Component uses `containerRef` + `ResizeObserver` (or equivalent) to scale canvas to fit screen
- [ ] All touch targets are ≥ 44×44px
- [ ] All in-game text is **legible at 390×844** — vocabulary/sentence text large enough to read without zooming (typically ≥ 18px at base resolution; scale with canvas)
- [ ] HUD labels (score, health, timer) are not so small they require squinting on a phone
- [ ] Portrait orientation is the primary layout
- [ ] `GameStartScreen` shared component is used for the start screen
- [ ] `GameEndScreen` shared component is used for the end/results screen

---

## G. Tests & Performance

- [ ] Game logic test file exists: `src/lib/games/__tests__/[gameName].test.ts`
  *(Note: some older games have tests at `src/lib/games/[gameName].test.ts` — these are acceptable but should be co-located in `__tests__/` for new games)*
- [ ] Config test file exists (verifies constant values and structure)
- [ ] `createXxxState()` is tested
- [ ] `tickXxx()` / update logic is tested for **real behavior** — actual state transitions, not just mocks returning mocks. Tests must assert meaningful outcomes (positions change, health decreases, words collected, win/lose triggers correctly)
- [ ] Win condition, lose condition, and XP/scoring are each covered by at least one test
- [ ] Tests do NOT over-mock: game logic is pure TS, so no mocking needed — call the functions directly
- [ ] Test coverage for game logic file is **>80%**
- [ ] **Tick rate**: game loop interval is ≤ 50ms (≥ 20 FPS) — preferably 33ms (30 FPS). Verify `useInterval` call in the component.

---

## H. Game Registry

- [ ] Game is registered in `src/lib/gameCards.ts`
- [ ] `type` field is correct: `'vocabulary'` or `'sentence'`
- [ ] `status` is `'playable'`
- [ ] Cover image exists at `/public/games/cover/[game-name]-cover.png`

---

## Scoring

| Grade | Criteria |
|-------|----------|
| ✅ Pass | All required items checked |
| ⚠️ Warn | Minor deviations (e.g. test location, non-factory API route) |
| ❌ Fail | Missing tests, broken architecture, coverage <80%, missing files |

---

## Games Under Audit

| Game | Type | Logic Tests | Config Tests | Component | Page | API Routes | Registry | Status |
|------|------|-------------|--------------|-----------|------|------------|----------|--------|
| Shadow Gate Dungeon | sentence | ✅ (flat) | ✅ (flat) | ✅ | ✅ | ✅ | ✅ | ✅ Pass |
| Rune Forge Chamber | sentence | ✅ (flat) | ✅ (flat) | ✅ | ✅ | ✅ | ✅ | ✅ Pass |
| Village Guardian | sentence | ✅ (__tests__) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Pass |
| Labyrinth of the Goblin King | sentence | ✅ (__tests__) | ✅ (__tests__) | ✅ | ✅ | ✅ | ✅ | ✅ Pass |
| The Abyssal Well | sentence | ✅ (__tests__) | ✅ (__tests__) | ✅ | ✅ | ✅ | ✅ | ✅ Pass |
| Archer's Revenge | vocabulary | ✅ (flat) | ✅ (flat) | ✅ | ✅ | ✅ | ✅ | ✅ Pass |
| Griffin Sky-Joust | sentence | ❌ not built | ❌ not built | ❌ | ❌ | ❌ | ❌ | Out of scope (Phase 4) |
| Realm Carver | sentence | ❌ not built | ❌ not built | ❌ | ❌ | ❌ | ❌ | Out of scope (Phase 4) |
