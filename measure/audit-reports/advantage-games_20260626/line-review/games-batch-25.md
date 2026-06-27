# Line-by-Line Review — games-batch-25

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-25`
**Scope source:** `/tmp/opencode/games-batch-25` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch mixes Next.js **API route handlers** under `apps/advantage-games/src/app/api/v1/games/**` (14 files: 6 games × `complete`/`sentences`/`vocabulary` plus 2 shadow-gate co-located tests), a **dev preview page** + test (`/dev/game-screens`), the app **favicon**, **globals.css**, and the **root layout** + test. All route files are thin wrappers delegating to the shared factory layer in `src/lib/games/api/` (`createCompleteRoute`, `createSentencesRoute`, `createVocabularyRoute`). To review the wrappers meaningfully, the shared factories (`completeRoute.ts`, `sentencesRoute.ts`, `vocabularyRoute.ts`, `rankingRoute.ts`, `types.ts`), the sample-data modules (`sampleSentences.ts`, `sampleVocabulary.ts`), the factory test suite (`completeRoute.test.ts`), the `VocabularyItem` store type, and the `GameStartScreen`/`GameEndScreen` components used by the dev page were read-only inspected for context. Shared-runtime findings are attributed to the wrapper files that import that behavior, since the wrappers are this batch's deliverables.
**Finding ID scheme:** `F-GAMES-B25-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type | Summary |
|---|------|------|---------|
| 1 | `api/v1/games/rune-match/complete/route.ts` | route (POST) | `createCompleteRoute()` + `force-static` |
| 2 | `api/v1/games/rune-match/vocabulary/route.ts` | route (GET) | `createVocabularyRoute(SAMPLE_VOCABULARY)` + `force-static` |
| 3 | `api/v1/games/shadow-gate-dungeon/complete/route.test.ts` | test | 1 test for complete POST |
| 4 | `api/v1/games/shadow-gate-dungeon/complete/route.ts` | route (POST) | `createCompleteRoute()` + `force-static` |
| 5 | `api/v1/games/shadow-gate-dungeon/sentences/route.test.ts` | test | 1 test for sentences GET |
| 6 | `api/v1/games/shadow-gate-dungeon/sentences/route.ts` | route (GET) | `createSentencesRoute(SAMPLE_SENTENCES)` + `force-static` |
| 7 | `api/v1/games/spellweavers-run/complete/route.ts` | route (POST) | `createCompleteRoute()` + `force-static` |
| 8 | `api/v1/games/spellweavers-run/sentences/route.ts` | route (GET) | `createSentencesRoute(SAMPLE_SENTENCES)` + `force-static` |
| 9 | `api/v1/games/storm-castle-tower/complete/route.ts` | route (POST) | `createCompleteRoute()` + `force-static` |
| 10 | `api/v1/games/storm-castle-tower/sentences/route.ts` | route (GET) | `createSentencesRoute(SAMPLE_SENTENCES)` + `force-static` |
| 11 | `api/v1/games/village-guardian/complete/route.ts` | route (POST) | `createCompleteRoute()` + `force-static` |
| 12 | `api/v1/games/village-guardian/sentences/route.ts` | route (GET) | `createSentencesRoute(SAMPLE_SENTENCES)` + `force-static` |
| 13 | `api/v1/games/wizard-vs-zombie/complete/route.ts` | route (POST) | `createCompleteRoute()` + `force-static` |
| 14 | `api/v1/games/wizard-vs-zombie/vocabulary/route.ts` | route (GET) | `createVocabularyRoute(SAMPLE_VOCABULARY)` + `force-static` |
| 15 | `app/dev/game-screens/page.test.tsx` | test | 2 tests for dev preview page |
| 16 | `app/dev/game-screens/page.tsx` | page (client) | Dev-only unified screens preview |
| 17 | `app/favicon.ico` | asset | 1024×1024 PNG, 1.12 MB (binary) |
| 18 | `app/globals.css` | styles | Tailwind v4 theme + sprite keyframes |
| 19 | `app/layout.test.tsx` | test | 2 tests for RootLayout |
| 20 | `app/layout.tsx` | layout | Root HTML/body, fonts, metadata |

---

## Cross-File Verification Performed (read-only)

- All 6 `complete/route.ts` (files 1,4,7,9,11,13) and all `sentences`/`vocabulary` routes (files 2,6,8,10,12,14) are pure re-exports of the shared factory output. Confirmed by direct read.
- `createCompleteRoute()` body verified in `src/lib/games/api/completeRoute.ts` (25 lines); `createSentencesRoute`/`createVocabularyRoute` in their respective files; `types.ts` for the `CompleteRequest`/`*Response` contracts; `rankingRoute.ts` for the empty-leaderboard constant.
- `SAMPLE_SENTENCES` = 10 entries (Thai translations); `SAMPLE_VOCABULARY` = 25 entries (Thai terms, English translations). Confirmed.
- `VocabularyItem` defined in `src/store/useGameStore.ts:3-7` = `{ term, translation, id? }`. Sentences and vocabulary share this type. Confirmed.
- Dev page imports `GameStartScreen`/`GameEndScreen`; `GameEndScreen` renders its title as `<h2>` (`GameEndScreen.tsx:127`); page provides an `<h1 className="sr-only">` (`page.tsx:43`). Test queries `getByRole('heading', { name: /victory!/i })` — matches the `<h2>`. Confirmed consistent.
- `globals.css` has no `@media (prefers-reduced-motion)` block; sprite animations (`enemy-walk`, `dragon-flight-intro`) loop `infinite`. Confirmed via grep.
- `app/dev/game-screens/page.tsx` has no `NODE_ENV`/`notFound()` production guard. Confirmed via grep.
- favicon.ico is a 1024×1024 RGB PNG renamed `.ico`, 1,122,143 bytes. Confirmed via `file`.

---

## Shared-Runtime Findings (apply to multiple route files in this batch)

These are the highest-impact findings because the wrappers duplicate the same shared behavior. Each is anchored to the shared factory and the wrapper files that pull it in. Consistent with prior batches (cf. B23-001..009).

### F-GAMES-B25-001 · Critical · `createCompleteRoute()` trusts client-supplied XP — files 1,4,7,9,11,13

`completeRoute.ts:9,12`: the handler reads `xp` straight from the request body and returns it verbatim as `xpEarned` (`const xpEarned = xp ?? Math.floor(correctAnswers * accuracy)`). No validation, no clamping, no server-side recomputation, no authentication. A client can POST `{ "xp": 1000000, "correctAnswers": 1000, "totalAttempts": 1000 }` (the exact case enshrined by the factory test at `completeRoute.test.ts:233-246`) and the server echoes 1,000,000 XP as earned. For a scoring/XP/leaderboard system this is a cheating vector and data-integrity defect inherited by every `complete` wrapper in this batch (files 1,4,7,9,11,13). When wired to real persistence (today mock — see F-GAMES-B25-003) this becomes a live exploit. Server-authoritative XP must recompute from validated `correctAnswers`/`accuracy`/`difficulty` and reject any client `xp`.

### F-GAMES-B25-002 · High · No Zod/runtime validation at the request boundary — files 1,4,7,9,11,13

`completeRoute.ts:8` does `const body: CompleteRequest = await request.json()` with a bare type assertion. This violates AGENTS.md ("Runtime validation is required at all external boundaries. Do not rely solely on TypeScript types"). Consequences:
- A malformed/empty body makes `request.json()` throw uncaught → unhandled 500 with stack trace, not a structured error. No `try/catch`.
- `correctAnswers`/`totalAttempts` are never checked to be finite, non-negative numbers. `Math.floor(correctAnswers * accuracy)` with `NaN`/negative/`Infinity` yields `NaN`/negative/`Infinity` XP and still returns `status: 200`.
- `accuracy` from the body is received but never used — the handler recomputes accuracy locally (`completeRoute.ts:11`), so the contract field is misleading.
All six `complete` wrappers inherit this; the fix belongs in the shared factory.

### F-GAMES-B25-003 · High · `complete` routes are mocks — not importable into Reading/Primary — files 1,4,7,9,11,13

`completeRoute.ts:13` returns `activityId = \`mock-activity-${Date.now()}\`` with message "Game completed successfully" and **no DB write, no `schoolId` scoping, no user association, no audit event, no XP persistence**. Acceptable for a standalone demo, but none of these six endpoints can be imported into Reading/Primary as-is: those apps require multi-tenant `schoolId`-scoped persistence and a real activity record (monorepo AGENTS.md multi-tenancy + audit rules). The mock contract (`xpEarned`, `activityId`) matches no documented Reading/Primary completion schema, so cross-app importability is unproven. Readiness blocker silently inherited by the thin wrappers.

### F-GAMES-B25-004 · Medium · `dynamic = "force-static"` on POST mutation routes is semantically wrong — files 1,4,7,9,11,13

Every `complete` route exports `export const dynamic = "force-static"` on a handler exposing only `POST` (file 1 line 2; file 4 line 7; file 7 line 3; file 9 line 3; file 11 line 6; file 13 line 2). `force-static` statically renders/caches responses; POST route handlers cannot be statically generated and are always dynamic. At best dead/misleading; at worst it interferes with build-time route analysis. The factory also advertises `dynamic: 'force-static'` (`completeRoute.ts:6`) which the wrappers never consume — they re-declare their own module-level `dynamic`. Resolve to `force-dynamic` (or remove) for mutation endpoints.

### F-GAMES-B25-005 · Medium · Difficulty never affects scoring/XP — files 1,4,7,9,11,13

`CompleteRequest` declares `difficulty?: Difficulty` (`types.ts:26`) and the factory test passes `difficulty: 'hard'` (`completeRoute.test.ts:192`), but `completeRoute.ts` never reads `difficulty` in XP computation. Easy/normal/hard/extreme yield identical XP for identical answers. Same "difficulty is cosmetic" defect class flagged in prior batches; here at the scoring layer shared by all six `complete` wrappers. Difficulty-based XP multipliers are a standard expectation for difficulty progression/age-appropriate pacing; their absence undercuts the difficulty selector across every game in this batch.

### F-GAMES-B25-006 · Medium · Unused/dead contract fields in `CompleteRequest` — files 1,4,7,9,11,13

`types.ts:27-31` declares `score`, `gameTime`, `dragonCount`, `bossPower`, `victory`, none consumed by `completeRoute.ts`. These per-game completion fields are silently ignored; clients sending `victory`/`score` get no behavior difference. For importability this is a contract-clarity risk — a Reading/Primary integrator reading the type would expect them to matter.

### F-GAMES-B25-007 · Medium · `activityId` uniqueness relies on `Date.now()` — files 1,4,7,9,11,13

`completeRoute.ts:13` builds the id from `Date.now()` only. Two completions in the same millisecond (concurrent submissions) produce identical `activityId`s. The factory test (`completeRoute.test.ts:52-71`) only avoids collision by sleeping 2ms, acknowledging the risk. A real implementation needs a UUID or DB-generated id. Low runtime impact today (mock), medium for importability.

### F-GAMES-B25-008 · Low · Unused `NextResponse` import in two route wrappers — files 4,6

`shadow-gate-dungeon/complete/route.ts:1` and `shadow-gate-dungeon/sentences/route.ts:1` both `import { NextResponse } from "next/server";` but never reference it (the factory builds responses internally). Dead imports; absent from the equivalent rune-match/spellweavers/storm-castle/village-guardian/wizard-vs-zombie wrappers, so this is an inconsistency unique to the shadow-gate pair. Lint/dead-code concern only.

### F-GAMES-B25-009 · Low · Import-statement ordering after `export` in several wrappers — files 1,2,13,14

`rune-match/complete/route.ts` places `export const dynamic` (line 2) between two imports (lines 1 and 3 in the vocabulary variant); `rune-match/vocabulary/route.ts:1-3`, `wizard-vs-zombie/complete/route.ts:1-2`, and `wizard-vs-zombie/vocabulary/route.ts:1-3` interleave `export const dynamic` with `import` statements. Hoisting makes this functionally harmless, but it is stylistically inconsistent with the `spellweavers-run`/`storm-castle-tower` wrappers that group imports first. Convention/readability only.

### F-GAMES-B25-010 · Low · Sentence payloads reuse `VocabularyItem` `{term,translation}` — files 6,8,10,12

`createSentencesRoute` is typed `(sentences: VocabularyItem[])` (`sentencesRoute.ts:4`) and the sentence wrappers feed `SAMPLE_SENTENCES` whose entries are `{ term, translation }` (`sampleSentences.ts:3-13`). A "sentence" is modeled as a vocabulary term, conflating word-level and sentence-level content contracts. Reading/Primary sentence content typically carries richer fields (audio, id, difficulty band); the shared type under-models sentences and may not map cleanly on import.

---

## Sample-Data Findings

### F-GAMES-B25-011 · Medium · Hardcoded Thai sample content shipped as the live data source — files 2,6,8,10,12,14

The vocabulary and sentence wrappers in this batch import `SAMPLE_VOCABULARY` / `SAMPLE_SENTENCES`, which are static Thai/English fixtures (`sampleVocabulary.ts:3-29`, `sampleSentences.ts:3-13`). Combined with `force-static`, every game in this batch serves the same fixed 25 Thai words / 10 Thai sentences to every learner regardless of class, level, or locale. This is demo content, not a per-learner content source. For Reading/Primary importability there is no hook to inject real learner vocabulary; the locale (Thai) is also hardcoded and not driven by user settings. Readiness gap for the content/difficulty/progression pipeline.

### F-GAMES-B25-012 · Low · `<5` insufficient-content branch is unreachable with current samples — files 2,6,8,10,12,14

`sentencesRoute.ts:21-29` and `vocabularyRoute.ts:22-30` emit `INSUFFICIENT_*` / `NO_*` warnings for `<5` and `0` item lists, but the wrappers always pass the 10- and 25-item constants, so these branches never fire at runtime in this batch. The guard logic only exists in the factory tests, not in any live path here. When real (possibly small) learner content is wired in this becomes relevant; today it is dead in this batch and untested at the wrapper level.

---

## Dev Page Findings (file 16) + its test (file 15)

### F-GAMES-B25-013 · Medium · `/dev/game-screens` has no production guard — file 16

`page.tsx:32` exports a default route component with no `NODE_ENV`/`notFound()` gate (confirmed via grep). The route `app/dev/game-screens` will be built and served in production, exposing an internal QA preview (with `onStart={() => setMode('victory')}` shortcuts and fake stats) to end users. Dev/QA scaffolding should be excluded from production builds or guarded. Low security impact, but inappropriate UX surface for an age-appropriate student app.

### F-GAMES-B25-014 · Low · Hardcoded Spanish sample data inconsistent with app's Thai content — file 16

`page.tsx:13-18` uses Spanish translations (`El caballero defiende el castillo.`) while the live sample data (files referenced above) is Thai. The dev preview misrepresents the actual content locale a reviewer would see in-game. Cosmetic/consistency only since it is a preview harness.

### F-GAMES-B25-015 · Low · Dev preview start button advances straight to a victory screen — file 16

`page.tsx:99` wires `onStart={() => setMode('victory')}`. The preview never exercises an actual game loop; clicking "Start Game" jumps to the victory end screen. This is acceptable for a static-screens preview but means the page provides no coverage of gameplay/scoring/runtime behavior — its test (file 15) only asserts that two static screens render. Reviewers should not read this page as evidence of game readiness.

### F-GAMES-B25-016 · Info · Dev page test is shallow but valid — file 15

`page.test.tsx` (2 tests) asserts the start-screen heading/button render and that clicking "End: Victory" shows the `Victory!` heading. The `getByRole('heading', { name: /victory!/i })` query correctly matches `GameEndScreen`'s `<h2>` (`GameEndScreen.tsx:127`). Tests are accurate but cover only static rendering and mode toggling — no scoring, XP, accuracy, or accessibility assertions. Adequate for a preview harness; not a substitute for game-logic tests.

---

## Co-located Route Test Findings (files 3, 5)

### F-GAMES-B25-017 · Medium · shadow-gate complete test sends `xpEarned` in the request, which the handler ignores — file 3

`shadow-gate-dungeon/complete/route.test.ts:6-11` posts a body containing `xpEarned: 10` (alongside `accuracy`, `correctAnswers`, `totalAttempts`). But `createCompleteRoute()` reads `xp` from the body, not `xpEarned` (`completeRoute.ts:9`). So the test's `xpEarned: 10` is silently ignored; the returned `xpEarned` is the computed `Math.floor(8 * 0.8) = 6`. The test only asserts `data.xpEarned` is *defined* (line 17), so it passes despite the field-name mismatch — masking a real client/contract confusion (`xp` vs `xpEarned`). The test gives false confidence about the request shape.

### F-GAMES-B25-018 · Low · shadow-gate route tests use loose `Request`-typed stubs and weak assertions — files 3,5

`route.test.ts:5-12` casts a hand-rolled `{ json }` object `as unknown as Request`, and `sentences/route.test.ts:4-9` only checks `sentences` is defined, length `>0`, and `status === 200`. Neither test validates content shape (`term`/`translation`), error/edge behavior, the insufficient-content warnings, or response headers. They are smoke tests duplicating coverage already present in the shared factory suite (`completeRoute.test.ts`), adding little. Only shadow-gate has co-located route tests in this batch; the other five games' routes (files 1,2,7,8,9,10,11,12,13,14) have **no co-located tests** — confirmed by the batch file list. Coverage is inconsistent across games.

### F-GAMES-B25-019 · Info · Test runner mismatch risk (`describe`/`it` globals) — files 3,5,15,19

Files 3, 5, 15, 19 use Jest-style globals (`describe`/`it`/`jest.mock`). The monorepo standard is Vitest for `packages/` and Jest for legacy apps (AGENTS.md "Testing"). `advantage-games` appears to run Jest (file 19 uses `jest.mock`). No defect if the app's runner is Jest; flagged only so reviewers confirm the runner before relying on these tests. Not verified here (no test execution performed).

---

## Layout / Styles / Asset Findings (files 17, 18, 20) + layout test (file 19)

### F-GAMES-B25-020 · Medium · Placeholder boilerplate metadata ("Create Next App") — file 20 + file 19

`layout.tsx:15-18` ships `title: "Create Next App"` / `description: "Generated by create next app"` — unmodified Next.js scaffolding. This is the document title users see in tabs/bookmarks and what search/social previews surface. `layout.test.tsx:11-12` *asserts* these exact placeholder strings, so the test locks in the boilerplate and would fail a proper fix. Readiness/branding defect; the test actively entrenches it.

### F-GAMES-B25-021 · Medium · `globals.css` defines no `prefers-reduced-motion` fallback for infinite sprite animations — file 18

`globals.css:117-191` defines `enemy-walk` (0.75s `infinite`), `dragon-flight-intro` (1s `infinite`), and `enemy-die`. None are wrapped in `@media (prefers-reduced-motion: reduce)` (confirmed via grep). Continuously looping animations with no reduced-motion opt-out are an accessibility concern (vestibular sensitivity) — relevant for a young-learner audience and for WCAG 2.3.3 / 2.2.2. Add a reduced-motion query that pauses or removes these animations.

### F-GAMES-B25-022 · Medium · Pure black/white theme tokens risk excessive contrast & broken non-color affordances — file 18

`globals.css:51-52,57-58,63-64` sets `--background: oklch(0 0 0)` (pure black), `--foreground: oklch(1 0 0)` (pure white), and makes `--primary` == `--accent` == white with black foreground. `:root` and `.dark` are identical (lines 49-103) so there is effectively no light theme. Pure-black/pure-white maximal contrast can cause halation/eye strain (an accessibility consideration), and primary/accent being indistinguishable means interactive emphasis relies solely on layout, not color. For an age-appropriate UI a softer, differentiated palette is preferable. Medium UX/accessibility note.

### F-GAMES-B25-023 · High · favicon.ico is a 1.12 MB 1024×1024 PNG mislabeled `.ico` — file 17

`app/favicon.ico` is 1,122,143 bytes — a 1024×1024 8-bit RGB **PNG**, not an ICO container (confirmed via `file`). Next.js serves `app/favicon.ico` as the site icon on every page load. Shipping a >1 MB image as a favicon is a real performance/bandwidth defect (favicons should be a few KB, typically ≤64×64 multi-resolution `.ico`), and the format/extension mismatch can break browsers/tools that expect a true ICO. On mobile/low-bandwidth (the app's mobile-first target) this is a meaningful regression. Replace with a properly sized, optimized icon.

### F-GAMES-B25-024 · Low · layout sets `lang="en"` with no i18n hook; content locale is Thai — file 20

`layout.tsx:31` hardcodes `<html lang="en">`, but the served sample content is Thai (F-GAMES-B25-011). For mixed-locale content there is no per-locale `lang` handling. Minor accessibility/SEO note; relevant if these games are imported into the multi-locale Reading/Primary apps.

### F-GAMES-B25-025 · Info · layout test asserts structure via fragile internal `.props` traversal — file 19

`layout.test.tsx:16-28` invokes `RootLayout(...)` as a plain function and walks `element.props.children` to assert `html`→`body` and className substrings. This couples the test to React's internal element shape rather than rendered output (`@testing-library` would be more robust) and, combined with F-GAMES-B25-020, asserts the placeholder metadata. Works today; brittle to refactors.

---

## Severity Summary

| Severity | IDs | Count |
|----------|-----|-------|
| Critical | 001 | 1 |
| High | 002, 003, 023 | 3 |
| Medium | 004, 005, 006, 010(↓Low), 011, 013, 017, 020, 021, 022 | 9 |
| Low | 008, 009, 010, 012, 014, 015, 018, 024 | 8 |
| Info | 016, 019, 025 | 3 |

(ID 010 listed once as Low.)

**Highest-priority items:** F-GAMES-B25-001 (client-trusted XP, cheating vector), F-GAMES-B25-003 (mock completion — not importable into Reading/Primary), F-GAMES-B25-023 (1.12 MB favicon performance defect), F-GAMES-B25-020 (placeholder metadata locked in by test).

---

## Limitations

- **Read-only, static review.** No code was edited, no tests were run, no build/lint/typecheck executed. Test pass/fail and runtime behavior were inferred from source, not observed.
- **Shared-runtime attribution.** The 14 route files are thin re-exports; substantive findings derive from the shared factories in `src/lib/games/api/` (read for context but not part of this batch's file list). Findings are attributed to the wrapper files that import the behavior.
- **No verification of how these endpoints are consumed** by the game UIs (the actual gameplay/scoring/runtime components were not in this batch beyond the dev-page imports), so claims about importability, mobile/browser behavior, and end-to-end scoring rest on the route/contract layer only.
- **Cross-batch deduplication not exhaustively reconciled.** Several findings mirror prior batches (notably B23-001..009); IDs here are batch-local (`F-GAMES-B25-###`).
- **Favicon binary** inspected via `file` metadata only, not visually rendered.
- **No acceptance or closeout determination is made.** This report documents findings for the line-review phase only; gate/acceptance decisions are out of scope.
