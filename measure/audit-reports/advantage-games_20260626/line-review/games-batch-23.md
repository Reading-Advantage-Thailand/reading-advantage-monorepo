# Line-by-Line Review — games-batch-23

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-23`
**Scope source:** `/tmp/opencode/games-batch-23` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is entirely Next.js **API route handlers** under `apps/advantage-games/src/app/api/v1/games/**` plus one co-located route test. All 19 route files are thin wrappers that delegate to the shared factory layer in `src/lib/games/api/` (`createVocabularyRoute`, `createSentencesRoute`, `createCompleteRoute`, `createRankingRoute`). To review the wrappers meaningfully, the shared factories (`completeRoute.ts`, `vocabularyRoute.ts`, `sentencesRoute.ts`, `rankingRoute.ts`, `types.ts`), the sample data modules (`sampleVocabulary.ts`, `sampleSentences.ts`), and the factory test suites were read-only inspected. Findings about shared behavior are attributed to the wrapper files that import that behavior, since the wrappers are this batch's deliverables.
**Finding ID scheme:** `F-GAMES-B23-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Game | Endpoint | Factory used |
|---|------|------|----------|--------------|
| 1 | `archers-revenge/vocabulary/route.test.ts` | archers-revenge | vocabulary (test) | — |
| 2 | `archers-revenge/vocabulary/route.ts` | archers-revenge | vocabulary | `createVocabularyRoute(SAMPLE_VOCABULARY)` |
| 3 | `castle-defense/complete/route.ts` | castle-defense | complete | `createCompleteRoute()` |
| 4 | `castle-defense/sentences/route.ts` | castle-defense | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |
| 5 | `devourer-slime/complete/route.ts` | devourer-slime | complete | `createCompleteRoute()` |
| 6 | `devourer-slime/sentences/route.ts` | devourer-slime | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |
| 7 | `dragon-flight/complete/route.ts` | dragon-flight | complete | `createCompleteRoute()` |
| 8 | `dragon-flight/ranking/route.ts` | dragon-flight | ranking | `createRankingRoute()` |
| 9 | `dragon-flight/vocabulary/route.ts` | dragon-flight | vocabulary | `createVocabularyRoute(SAMPLE_VOCABULARY)` |
| 10 | `dragon-rider/complete/route.ts` | dragon-rider | complete | `createCompleteRoute()` |
| 11 | `dragon-rider/vocabulary/route.ts` | dragon-rider | vocabulary | `createVocabularyRoute(SAMPLE_VOCABULARY)` |
| 12 | `dungeon-liberator/complete/route.ts` | dungeon-liberator | complete | `createCompleteRoute()` |
| 13 | `dungeon-liberator/ranking/route.ts` | dungeon-liberator | ranking | `createRankingRoute()` |
| 14 | `dungeon-liberator/sentences/route.ts` | dungeon-liberator | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |
| 15 | `enchanted-library/complete/route.ts` | enchanted-library | complete | `createCompleteRoute()` |
| 16 | `enchanted-library/vocabulary/route.ts` | enchanted-library | vocabulary | `createVocabularyRoute(SAMPLE_VOCABULARY)` |
| 17 | `griffin-riders-escape/complete/route.ts` | griffin-riders-escape | complete | `createCompleteRoute()` |
| 18 | `griffin-riders-escape/sentences/route.ts` | griffin-riders-escape | sentences | `createSentencesRoute([...inline...])` |
| 19 | `griffin-sky-joust/complete/route.ts` | griffin-sky-joust | complete | `createCompleteRoute()` |
| 20 | `griffin-sky-joust/sentences/route.ts` | griffin-sky-joust | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |

---

## Cross-Batch Verification Performed (read-only)

- All 19 `route.ts` files compile down to imports from `@/lib/games/api` + an `export const dynamic = "force-static"` + re-export of the factory's `GET`/`POST`. Confirmed by direct read.
- Only **1 of 20** files is a test (`archers-revenge/vocabulary/route.test.ts`). The other 18 game-endpoint wrappers have **no co-located tests**. Confirmed via directory listing across all nine game dirs.
- Factory behavior verified by reading `completeRoute.ts`, `vocabularyRoute.ts`, `sentencesRoute.ts`, `rankingRoute.ts`, `types.ts`.
- `SAMPLE_VOCABULARY` has 25 entries; `SAMPLE_SENTENCES` has 10 entries. Confirmed.
- `createRankingRoute()` always returns the hardcoded `EMPTY_RANKINGS` constant. Confirmed (`rankingRoute.ts:4-9,16`).
- `griffin-riders-escape/sentences` is the only sentences route in the batch that inlines its own data instead of importing `SAMPLE_SENTENCES`. Confirmed.

---

## Shared-Runtime Findings (apply to multiple files in this batch)

These are the highest-impact findings because the wrappers are duplications of the same shared behavior. Each is anchored to the shared factory and to the wrapper files that pull it in.

### F-GAMES-B23-001 · Critical · `createCompleteRoute()` trusts client-supplied XP — files 3,5,7,10,12,15,17,19

`completeRoute.ts:9-12`: the handler reads `xp` straight from the request body and returns it as `xpEarned` (`const xpEarned = xp ?? Math.floor(correctAnswers * accuracy)`). There is **no validation, no clamping, no server-side recomputation, and no authentication**. Any client can POST `{ "xp": 1000000, "correctAnswers": 1000, "totalAttempts": 1000 }` (exactly the case the test at `completeRoute.test.ts:233-246` enshrines) and the server will echo 1,000,000 XP back as earned. For a scoring/XP/leaderboard system this is a cheating vector and a data-integrity defect. Every `complete` wrapper in this batch (files 3, 5, 7, 10, 12, 15, 17, 19) inherits it. When these routes are wired to real persistence (today they are mocks — see F-GAMES-B23-003), this becomes a live exploit. Server-authoritative XP requires recomputation from validated `correctAnswers`/`accuracy`/`difficulty` and rejection of a client `xp` field.

### F-GAMES-B23-002 · High · No Zod / runtime validation at the request boundary — files 3,5,7,10,12,15,17,19

`completeRoute.ts:8` does `const body: CompleteRequest = await request.json()` with a bare type assertion. AGENTS.md ("Contracts and Validation": *"Runtime validation is required at all external boundaries. Do not rely solely on TypeScript types"*) is violated. Consequences:
- A malformed or empty body makes `request.json()` throw, which is uncaught → unhandled 500 with a stack trace, not a structured error. There is no `try/catch`.
- `correctAnswers`/`totalAttempts` are never checked to be finite, non-negative numbers. `Math.floor(correctAnswers * accuracy)` with `NaN`/negative/`Infinity` inputs yields `NaN`/negative/`Infinity` XP and still returns `status: 200`.
- `accuracy` in the body is received but never used (the handler recomputes accuracy locally at `completeRoute.ts:11`), so the contract field is misleading.
All eight `complete` wrappers inherit this. The fix belongs in the shared factory.

### F-GAMES-B23-003 · High · `complete` routes are mocks — not importable into Reading/Primary — files 3,5,7,10,12,15,17,19

`completeRoute.ts:13` returns `activityId = \`mock-activity-${Date.now()}\`` and the message "Game completed successfully" with **no database write, no `schoolId` scoping, no user association, no audit event**. There is no progress/XP persistence at all. This is acceptable for a standalone demo but means none of these eight endpoints can be imported into Reading/Primary as-is — those apps require multi-tenant `schoolId`-scoped persistence and a real activity record (per the monorepo AGENTS.md multi-tenancy and audit rules). The mock contract (`xpEarned`, `activityId`) also does not match any documented Reading/Primary completion schema, so cross-app importability is unproven. This is a readiness blocker that the thin wrappers silently inherit.

### F-GAMES-B23-004 · High · `ranking` endpoints always return empty leaderboards — files 8,13

`rankingRoute.ts:4-9,16` returns the constant `EMPTY_RANKINGS` ({easy:[],normal:[],hard:[],extreme:[]}) for every request. `dragon-flight/ranking/route.ts` and `dungeon-liberator/ranking/route.ts` therefore expose a **permanently empty leaderboard**. Combined with `export const dynamic = "force-static"` (file 8 line 2, file 13 line 2), the empty payload is baked in at build time and can *never* reflect real scores even if a backend existed. The leaderboard feature is non-functional. There is no test in this batch covering ranking behavior either.

### F-GAMES-B23-005 · Medium · `dynamic = "force-static"` on POST routes is semantically wrong — files 3,5,7,10,12,15,17,19

Every `complete` route exports `export const dynamic = "force-static"` (e.g. file 3 line 2, file 19 line 6) on a handler that exposes only `POST`. `force-static` is a directive for statically rendering/caching responses; POST route handlers cannot be statically generated and are always dynamic. At best the directive is dead/misleading; at worst it interacts poorly with build-time route analysis. The factory itself also advertises `dynamic: 'force-static'` (`completeRoute.ts:6`) but the wrappers re-declare their own module-level `dynamic` (the factory's is never consumed). This is an inconsistency across the shared runtime that should be resolved to `force-dynamic` (or removed) for mutation endpoints.

### F-GAMES-B23-006 · Medium · Difficulty never affects scoring/XP — files 3,5,7,10,12,15,17,19

`CompleteRequest` declares `difficulty?: Difficulty` (`types.ts:26`) and the test at `completeRoute.test.ts:185-199` passes `difficulty: 'hard'`, but `completeRoute.ts` **never reads `difficulty`** in the XP computation. So easy/normal/hard/extreme all yield identical XP for identical answers. This is the same "difficulty is cosmetic" defect class flagged in prior batches (cf. B15-019), now at the scoring layer shared by all eight `complete` wrappers. Difficulty-based XP multipliers are a normal expectation for difficulty progression and age-appropriate pacing; their absence undercuts the difficulty selector across every game in this batch.

### F-GAMES-B23-007 · Medium · Unused / dead contract fields in `CompleteRequest` — files 3,5,7,10,12,15,17,19

`types.ts:27-31` declares `score`, `gameTime`, `dragonCount`, `bossPower`, `victory` on `CompleteRequest`, none of which are consumed by `completeRoute.ts`. These game-specific fields imply per-game completion semantics that the shared mock does not honor. The contract over-promises; clients sending `victory`/`score` get no behavior difference. For importability this is a contract-clarity risk: a Reading/Primary integrator reading the type would expect these to matter.

### F-GAMES-B23-008 · Medium · `activityId` uniqueness relies on `Date.now()` — files 3,5,7,10,12,15,17,19

`completeRoute.ts:13` builds the id from `Date.now()` only. Two completions in the same millisecond (concurrent submissions, common under load) produce identical `activityId`s. The test at `completeRoute.test.ts:52-71` only avoids collision by sleeping 2ms — i.e. the test design itself acknowledges the collision risk. A real implementation needs a UUID or DB-generated id. Low runtime impact today (mock), medium for importability.

### F-GAMES-B23-009 · Medium · `VocabularyItem` reused for sentence payloads — sentence contract conflation — files 4,6,14,18,20

`sentencesRoute.ts:8` types its payload as `sentences: VocabularyItem[]` and `SAMPLE_SENTENCES` is declared `VocabularyItem[]` (`sampleSentences.ts:3`). Sentences and vocabulary share the exact `{term, translation}` shape with no distinguishing type. This is the cross-app `VocabularyItem` vs `SentenceItem` divergence repeatedly flagged in prior batches (cf. B15-006/B15-020). For importability into Reading/Primary, where sentence content may carry richer metadata (audio, timing, source passage), the flattened contract is a real integration risk, not cosmetic. All five sentence wrappers in this batch inherit it.

### F-GAMES-B23-010 · Low · Static Thai-only sample content shipped as game data — files 2,4,6,9,11,14,16,18,20

Every vocabulary/sentence wrapper serves hardcoded Thai↔English sample data (`sampleVocabulary.ts`, `sampleSentences.ts`, and the inline list in file 18). With `dynamic = "force-static"` this content is frozen at build time and identical for every user — there is no per-user/per-lesson vocabulary wiring. Functionally fine for a demo, but it means these endpoints cannot yet serve a learner's actual word list, which is the core value proposition when imported into Reading/Primary. The locale is hardcoded to Thai, with no i18n/locale parameterization.

### F-GAMES-B23-011 · Medium · 18 of 20 wrappers have no tests — files 3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20

Only `archers-revenge/vocabulary/route.test.ts` exists. AGENTS.md ("Testing": *"Write tests for all new backend code"*) is not met for the remaining 18 endpoint wrappers. The shared factories do have unit tests (`completeRoute.test.ts`, `vocabularyRoute.test.ts`, etc.), which mitigates the *factory* logic risk, but each wrapper independently chooses its data source and `dynamic` export, and those wiring decisions (e.g. file 18's inline data, file 19's misplaced `dynamic`) are untested. No wrapper-level test asserts the correct factory was wired to the correct data.

---

## Per-File Findings

### File 1 — `archers-revenge/vocabulary/route.test.ts`

**F-GAMES-B23-012 · Medium · route.test.ts:3,7**
The test imports and asserts `dynamic` from `./route` (`expect(dynamic).toBe("force-static")`), but `route.ts` only re-exports `GET` (file 2 line 8) — it does **not** export `dynamic` as a named symbol that the test destructures via `import { GET, dynamic }`. `route.ts:4` declares `export const dynamic = "force-static"`, so the named export does exist; however the test couples to an implementation detail (the literal string) rather than behavior. If the project later switches `complete`-style routes to `force-dynamic` or removes the directive, this assertion breaks without any real regression. Low-value, brittle assertion.

**F-GAMES-B23-013 · Medium · route.test.ts:14-16**
The test hardcodes `expect(data.vocabulary).toEqual(SAMPLE_VOCABULARY)` AND `toHaveLength(25)` AND `toBeGreaterThanOrEqual(15)`. The `toHaveLength(25)` assertion makes the test brittle: any edit to `SAMPLE_VOCABULARY` (adding/removing a word) breaks this game's test for no behavioral reason. The three overlapping assertions are also redundant (`toEqual(SAMPLE_VOCABULARY)` already pins length). This is the *only* endpoint test in the batch, and it tests a trivial pass-through rather than any game-specific behavior, giving a false sense of coverage.

**F-GAMES-B23-014 · Info · route.test.ts (whole file)**
The test asserts the route serves the shared sample vocabulary but does not assert the success `message`/`warning` branch logic in any game-specific way (that lives in the factory test). Net: this file adds little beyond the factory's own suite. Noted as low signal rather than a defect.

### File 2 — `archers-revenge/vocabulary/route.ts`

**F-GAMES-B23-015 · Info · route.ts:1-8**
Clean canonical wrapper: import factory, declare `dynamic`, re-export `GET`. This is the reference shape the other wrappers should match. No defect; cited as the baseline for the import-ordering/`dynamic`-placement inconsistencies below. (Inherits F-GAMES-B23-010 for static Thai data.) Note: archers-revenge has a `complete` endpoint but **no `ranking` endpoint**, unlike dragon-flight/dungeon-liberator — see F-GAMES-B23-021.

### File 3 — `castle-defense/complete/route.ts`
Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect beyond shared behavior.

### File 4 — `castle-defense/sentences/route.ts`

**F-GAMES-B23-016 · Low · route.ts:1-3 (import ordering)**
`export const dynamic = "force-static"` (line 2) is placed **between** two imports (line 1 `createSentencesRoute`, line 3 `SAMPLE_SENTENCES`). A statement interleaved among imports is non-idiomatic and will trip `import/first` / import-ordering lint rules. Same pattern in files 11 and 14. (Inherits F-GAMES-B23-009, -010, -011.)

### File 5 — `devourer-slime/complete/route.ts`
Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 6 — `devourer-slime/sentences/route.ts`
Clean ordering (imports grouped, then `dynamic`). Inherits F-GAMES-B23-009, -010, -011. No file-specific defect.

### File 7 — `dragon-flight/complete/route.ts`
Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 8 — `dragon-flight/ranking/route.ts`
Inherits F-GAMES-B23-004 (empty leaderboard) and F-GAMES-B23-011 (untested). The `force-static` directive here actively guarantees the leaderboard can never populate (see F-GAMES-B23-004).

### File 9 — `dragon-flight/vocabulary/route.ts`
Clean canonical wrapper (matches file 2). Inherits F-GAMES-B23-010, -011. No file-specific defect.

### File 10 — `dragon-rider/complete/route.ts`
Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 11 — `dragon-rider/vocabulary/route.ts`

**F-GAMES-B23-017 · Low · route.ts:1-3 (import ordering)**
Same interleaved-`dynamic`-between-imports pattern as file 4 (`dynamic` on line 2, second import on line 3). Lint/style inconsistency. Inherits F-GAMES-B23-010, -011.

### File 12 — `dungeon-liberator/complete/route.ts`
Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 13 — `dungeon-liberator/ranking/route.ts`
Inherits F-GAMES-B23-004 (empty leaderboard) and F-GAMES-B23-011. Same as file 8.

### File 14 — `dungeon-liberator/sentences/route.ts`

**F-GAMES-B23-018 · Low · route.ts:1-3 (import ordering)**
Same interleaved-`dynamic`-between-imports pattern as files 4 and 11. Inherits F-GAMES-B23-009, -010, -011.

### File 15 — `enchanted-library/complete/route.ts`
Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 16 — `enchanted-library/vocabulary/route.ts`

**F-GAMES-B23-019 · Low · route.ts:1-3 (import ordering)**
Same interleaved-`dynamic`-between-imports pattern. Inherits F-GAMES-B23-010, -011.

### File 17 — `griffin-riders-escape/complete/route.ts`
Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 18 — `griffin-riders-escape/sentences/route.ts`

**F-GAMES-B23-020 · Medium · route.ts:5-16 (inlined data diverges from shared `SAMPLE_SENTENCES`)**
This is the **only** sentences route in the batch that inlines its own 10-sentence array instead of importing `SAMPLE_SENTENCES`. Consequences: (a) content drift — this game serves a different sentence set than castle-defense/devourer-slime/dungeon-liberator/griffin-sky-joust, with no shared source of truth; (b) the sentences mix difficulty levels and lengths ("The cat sits on the mat" vs "Brave heroes fight the dragon") with no leveling metadata; (c) the array is hardcoded in a route handler, the wrong layer for content. If the shared sample is the intended demo content, this divergence is an inconsistency; if per-game content is intended, it argues even more strongly for a typed `SentenceItem` content module rather than literals in a route file. Inherits F-GAMES-B23-009, -010, -011.

### File 19 — `griffin-sky-joust/complete/route.ts`

**F-GAMES-B23-021 · Low · route.ts:3-6 (export ordering)**
Unique ordering in the batch: `const { POST } = createCompleteRoute()` (line 3), then `export { POST }` (line 5), then `export const dynamic = "force-static"` placed **last** (line 6) — after the re-export rather than before the handler binding. Functionally equivalent (hoisting), but it is a third distinct stylistic convention in the batch (vs. canonical file 3 and interleaved file 4), confirming there is no enforced wrapper template. Inherits F-GAMES-B23-001, -002, -003, -005, -006, -007, -008, -011.

### File 20 — `griffin-sky-joust/sentences/route.ts`

**F-GAMES-B23-022 · Low · route.ts:4-7 (export ordering)**
Same trailing-`dynamic` ordering as file 19 (`export { GET }` on line 6, `export const dynamic` on line 7). Stylistic inconsistency. Inherits F-GAMES-B23-009, -010, -011.

---

## Feature-Parity Finding

### F-GAMES-B23-023 · Low · cross-file (ranking endpoint coverage is inconsistent)
Within this batch only `dragon-flight` and `dungeon-liberator` expose a `ranking` endpoint (files 8, 13). archers-revenge, castle-defense, devourer-slime, dragon-rider, enchanted-library, griffin-riders-escape, and griffin-sky-joust have `complete` + (vocabulary|sentences) but **no ranking route** in this batch. If leaderboards are a platform feature, coverage is uneven across games; if only some games are meant to have leaderboards, the rationale is undocumented. (Note: this batch does not include every endpoint of every game, so absence here is not proof of absence on disk — see Limitations. Directory listing of the nine game folders confirmed only these two carry a `ranking/` dir, however.)

---

## Cross-Cutting Themes

| Theme | Findings | Severity |
|-------|----------|----------|
| Client-supplied XP trusted verbatim (cheatable scoring) | B23-001 | Critical |
| No Zod/runtime validation at request boundary; unhandled throw on bad JSON | B23-002 | High |
| `complete` routes are mocks — no persistence, no `schoolId`, not importable into Reading/Primary | B23-003 | High |
| Leaderboard always empty + frozen by `force-static` | B23-004, B23-023 | High/Low |
| `force-static` on POST mutation routes (wrong/dead directive) | B23-005 | Medium |
| Difficulty never affects XP/scoring | B23-006 | Medium |
| Dead contract fields (`score`,`gameTime`,`dragonCount`,`bossPower`,`victory`) | B23-007 | Medium |
| `activityId` collision risk (`Date.now()` only) | B23-008 | Medium |
| `VocabularyItem` reused for sentences — cross-app contract conflation | B23-009 | Medium |
| Static Thai-only build-time content; no per-user/locale wiring | B23-010 | Low |
| 18/20 wrappers untested | B23-011 | Medium |
| Brittle/low-signal single test (`toHaveLength(25)`, `dynamic` literal) | B23-012, B23-013, B23-014 | Medium |
| griffin-riders-escape inlines divergent sentence data | B23-020 | Medium |
| Import/export ordering inconsistency (3 distinct styles) | B23-004(file8), B23-016, B23-017, B23-018, B23-019, B23-021, B23-022 | Low |

---

## Limitations

- **Read-only review.** No source was edited, per instructions. I did not run the Jest suites, start the Next.js server, issue real HTTP requests, measure FPS, exercise mobile/touch rendering, or test browser compatibility. Behavioral claims about the factories are derived from reading their source and tests, not from execution.
- This batch contains only API route handlers — **no React/Konva game components, no game-loop/rendering code, no asset files, no audio, and no accessibility-bearing UI** were in scope. Therefore findings on asset/audio/performance/mobile/browser/accessibility/age-appropriate UX are necessarily limited to what the data/scoring contracts imply (e.g. static Thai-only content, difficulty-insensitive XP); the player-facing surfaces that own those concerns are out of this batch and were not reviewed here.
- The shared factories (`completeRoute.ts`, `vocabularyRoute.ts`, `sentencesRoute.ts`, `rankingRoute.ts`, `types.ts`) and sample-data modules were read for verification but are not themselves files in `/tmp/opencode/games-batch-23`; findings reference them only to characterize the behavior the in-scope wrappers import.
- Endpoint inventory (F-GAMES-B23-023) is based on the listed batch files plus a directory listing of the nine game folders under `src/app/api/v1/games/`; I did not enumerate routes outside `apps/advantage-games`, and Reading/Primary import targets were assessed only against the monorepo AGENTS.md contract expectations, not against those apps' live schemas.
- Severity reflects impact *if/when* these mock endpoints are connected to real persistence and auth; today, as build-time static/mock handlers, several High/Critical findings are latent rather than actively exploited.

---

*No acceptance or closeout determination is made by this report. This is a line-by-line review deliverable only; track acceptance/closeout remains the responsibility of the Measure workflow owner.*
