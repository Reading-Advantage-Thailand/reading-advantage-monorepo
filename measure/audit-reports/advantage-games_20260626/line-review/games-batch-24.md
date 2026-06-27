# Line-by-Line Review — games-batch-24

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-24`
**Scope source:** `/tmp/opencode/games-batch-24` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is entirely Next.js **API route handlers** under `apps/advantage-games/src/app/api/v1/games/**`. All 20 files are thin wrappers that delegate to the shared factory layer in `src/lib/games/api/` (`createVocabularyRoute`, `createSentencesRoute`, `createCompleteRoute`, `createRankingRoute`). To review the wrappers meaningfully, the shared factories (`completeRoute.ts`, `vocabularyRoute.ts`, `sentencesRoute.ts`, `rankingRoute.ts`, `types.ts`) and the sample-data modules (`sampleVocabulary.ts`, `sampleSentences.ts`) were read-only inspected. Findings about shared behavior are attributed to the wrapper files that import that behavior, since the wrappers are this batch's deliverables.
**Finding ID scheme:** `F-GAMES-B24-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Game | Endpoint | Factory used |
|---|------|------|----------|--------------|
| 1 | `gryphon-patrol/complete/route.ts` | gryphon-patrol | complete | `createCompleteRoute()` |
| 2 | `gryphon-patrol/ranking/route.ts` | gryphon-patrol | ranking | `createRankingRoute()` |
| 3 | `gryphon-patrol/sentences/route.ts` | gryphon-patrol | sentences | `createSentencesRoute([...inline 11...])` |
| 4 | `haunted-library/complete/route.ts` | haunted-library | complete | `createCompleteRoute()` |
| 5 | `haunted-library/sentences/route.ts` | haunted-library | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |
| 6 | `labyrinth-goblin-king/complete/route.ts` | labyrinth-goblin-king | complete | `createCompleteRoute()` |
| 7 | `labyrinth-goblin-king/sentences/route.ts` | labyrinth-goblin-king | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |
| 8 | `magic-defense/complete/route.ts` | magic-defense | complete | `createCompleteRoute()` |
| 9 | `magic-defense/vocabulary/route.ts` | magic-defense | vocabulary | `createVocabularyRoute(SAMPLE_VOCABULARY)` |
| 10 | `paladins-twin-soul/complete/route.ts` | paladins-twin-soul | complete | `createCompleteRoute()` |
| 11 | `paladins-twin-soul/vocabulary/route.ts` | paladins-twin-soul | vocabulary | `createVocabularyRoute(SAMPLE_VOCABULARY)` |
| 12 | `potion-rush/complete/route.ts` | potion-rush | complete | `createCompleteRoute()` |
| 13 | `potion-rush/ranking/route.ts` | potion-rush | ranking | `createRankingRoute()` |
| 14 | `potion-rush/sentences/route.ts` | potion-rush | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |
| 15 | `realm-carver/complete/route.ts` | realm-carver | complete | `createCompleteRoute()` |
| 16 | `realm-carver/sentences/route.ts` | realm-carver | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |
| 17 | `rpg-battle/complete/route.ts` | rpg-battle | complete | `createCompleteRoute()` |
| 18 | `rpg-battle/vocabulary/route.ts` | rpg-battle | vocabulary | `createVocabularyRoute(SAMPLE_VOCABULARY)` |
| 19 | `rune-forge-chamber/complete/route.ts` | rune-forge-chamber | complete | `createCompleteRoute()` |
| 20 | `rune-forge-chamber/sentences/route.ts` | rune-forge-chamber | sentences | `createSentencesRoute(SAMPLE_SENTENCES)` |

---

## Cross-Batch Verification Performed (read-only)

- All 20 files are `route.ts` wrappers: an import from `@/lib/games/api`, an `export const dynamic = "force-static"`, and a re-export of the factory's `GET`/`POST`. Confirmed by direct read of each file.
- **0 of 20** files in this batch is a test. Directory listing of all nine game folders (`gryphon-patrol`, `haunted-library`, `labyrinth-goblin-king`, `magic-defense`, `paladins-twin-soul`, `potion-rush`, `realm-carver`, `rpg-battle`, `rune-forge-chamber`) confirmed **no co-located `route.test.ts`** anywhere in this batch's scope.
- Factory behavior verified by reading `completeRoute.ts`, `vocabularyRoute.ts`, `sentencesRoute.ts`, `rankingRoute.ts`, `types.ts`.
- `SAMPLE_VOCABULARY` has 25 entries (`sampleVocabulary.ts:3-29`); `SAMPLE_SENTENCES` has 10 entries (`sampleSentences.ts:3-14`). Confirmed.
- `createRankingRoute()` always returns the hardcoded `EMPTY_RANKINGS` constant (`rankingRoute.ts:4-9,16`). Confirmed.
- `gryphon-patrol/sentences` (file 3) is the **only** sentences route in the batch that inlines its own data (11 sentences) instead of importing `SAMPLE_SENTENCES`. Confirmed.
- Two games expose a `ranking` endpoint in this batch: `gryphon-patrol` (file 2) and `potion-rush` (file 13). Confirmed via directory listing.

---

## Shared-Runtime Findings (apply to multiple files in this batch)

These are the highest-impact findings because the wrappers are duplications of the same shared behavior. Each is anchored to the shared factory and to the wrapper files that pull it in.

### F-GAMES-B24-001 · Critical · `createCompleteRoute()` trusts client-supplied XP — files 1,4,6,8,10,12,15,17,19

`completeRoute.ts:9-12`: the handler reads `xp` straight from the request body and returns it verbatim as `xpEarned` (`const xpEarned = xp ?? Math.floor(correctAnswers * accuracy)`). There is **no validation, no clamping, no server-side recomputation, and no authentication**. Any client can POST `{ "xp": 1000000, "correctAnswers": 1000, "totalAttempts": 1000 }` and the server echoes 1,000,000 XP back as earned. For a scoring/XP/leaderboard system this is a cheating vector and a data-integrity defect. Every `complete` wrapper in this batch (files 1, 4, 6, 8, 10, 12, 15, 17, 19 — nine of them) inherits it. When these routes are wired to real persistence (today they are mocks — see F-GAMES-B24-003), this becomes a live exploit. Server-authoritative XP requires recomputation from validated `correctAnswers`/`accuracy`/`difficulty` and rejection of a client-supplied `xp` field.

### F-GAMES-B24-002 · High · No Zod / runtime validation at the request boundary — files 1,4,6,8,10,12,15,17,19

`completeRoute.ts:8` does `const body: CompleteRequest = await request.json()` with a bare type assertion. The monorepo AGENTS.md ("Contracts and Validation": *"Runtime validation is required at all external boundaries. Do not rely solely on TypeScript types"*) is violated. Consequences:
- A malformed or empty body makes `request.json()` throw; the throw is uncaught (no `try/catch`) → unhandled 500 with a stack trace rather than a structured error.
- `correctAnswers`/`totalAttempts` are never checked to be finite, non-negative numbers. `Math.floor(correctAnswers * accuracy)` with `NaN`/negative/`Infinity` inputs yields `NaN`/negative/`Infinity` XP and still returns `status: 200`.
- The body's `accuracy` field is received but never used (the handler recomputes accuracy locally at `completeRoute.ts:11`), so the contract field is misleading.

All nine `complete` wrappers inherit this. The fix belongs in the shared factory.

### F-GAMES-B24-003 · High · `complete` routes are mocks — not importable into Reading/Primary — files 1,4,6,8,10,12,15,17,19

`completeRoute.ts:13` returns `activityId = \`mock-activity-${Date.now()}\`` and the message "Game completed successfully" with **no database write, no `schoolId` scoping, no user association, and no audit event**. There is no progress/XP persistence at all. This is acceptable for a standalone demo but means none of these nine endpoints can be imported into Reading/Primary as-is — those apps require multi-tenant `schoolId`-scoped persistence and a real activity record (per the monorepo AGENTS.md multi-tenancy and audit rules). The mock contract (`xpEarned`, `activityId`) also does not match any documented Reading/Primary completion schema, so cross-app importability is unproven. This is a readiness blocker that the thin wrappers silently inherit.

### F-GAMES-B24-004 · High · `ranking` endpoints always return empty leaderboards — files 2,13

`rankingRoute.ts:4-9,16` returns the constant `EMPTY_RANKINGS` (`{easy:[],normal:[],hard:[],extreme:[]}`) for every request. `gryphon-patrol/ranking/route.ts` (file 2) and `potion-rush/ranking/route.ts` (file 13) therefore expose a **permanently empty leaderboard**. Combined with `export const dynamic = "force-static"` (file 2 line 2, file 13 line 2), the empty payload is baked in at build time and can *never* reflect real scores even if a backend existed. The leaderboard feature is non-functional. There is no test in this batch covering ranking behavior.

### F-GAMES-B24-005 · Medium · `dynamic = "force-static"` on POST routes is semantically wrong — files 1,4,6,8,10,12,15,17,19

Every `complete` route exports `export const dynamic = "force-static"` (e.g. file 1 line 2, file 19 line 6) on a handler that exposes only `POST`. `force-static` is a directive for statically rendering/caching responses; POST route handlers cannot be statically generated and are always dynamic. At best the directive is dead/misleading; at worst it interacts poorly with build-time route analysis. The factory itself also advertises `dynamic: 'force-static'` (`completeRoute.ts:6`), but the wrappers re-declare their own module-level `dynamic` (the factory's value is never consumed). This is an inconsistency across the shared runtime that should be resolved to `force-dynamic` (or removed) for mutation endpoints.

### F-GAMES-B24-006 · Medium · Difficulty never affects scoring/XP — files 1,4,6,8,10,12,15,17,19

`CompleteRequest` declares `difficulty?: Difficulty` (`types.ts:26`), but `completeRoute.ts` **never reads `difficulty`** in the XP computation. Easy/normal/hard/extreme all yield identical XP for identical answers. This is the same "difficulty is cosmetic" defect class flagged in prior batches (cf. B23-006, B15-019), now at the scoring layer shared by all nine `complete` wrappers. Difficulty-based XP multipliers are a normal expectation for difficulty progression and age-appropriate pacing; their absence undercuts the difficulty selector across every game in this batch.

### F-GAMES-B24-007 · Medium · Unused / dead contract fields in `CompleteRequest` — files 1,4,6,8,10,12,15,17,19

`types.ts:27-31` declares `score`, `gameTime`, `dragonCount`, `bossPower`, `victory` on `CompleteRequest`, none of which are consumed by `completeRoute.ts`. These game-specific fields imply per-game completion semantics that the shared mock does not honor. The contract over-promises; clients sending `victory`/`score` get no behavioral difference. For importability this is a contract-clarity risk: a Reading/Primary integrator reading the type would expect these to matter. Note that `dragonCount`/`bossPower` are also irrelevant to most games in this batch (e.g. a library or potion game), underscoring that the shared contract was shaped around a different game and reused indiscriminately.

### F-GAMES-B24-008 · Medium · `activityId` uniqueness relies on `Date.now()` — files 1,4,6,8,10,12,15,17,19

`completeRoute.ts:13` builds the id from `Date.now()` only. Two completions in the same millisecond (concurrent submissions, common under load) produce identical `activityId`s. A real implementation needs a UUID or DB-generated id. Low runtime impact today (mock), medium for importability.

### F-GAMES-B24-009 · Medium · `VocabularyItem` reused for sentence payloads — sentence contract conflation — files 3,5,7,14,16,20

`sentencesRoute.ts:8` types its payload as `sentences: VocabularyItem[]`, and `SAMPLE_SENTENCES` is declared `VocabularyItem[]` (`sampleSentences.ts:3`). Sentences and vocabulary share the exact `{term, translation}` shape with no distinguishing type. This is the cross-app `VocabularyItem` vs `SentenceItem` divergence repeatedly flagged in prior batches (cf. B23-009, B15-006/B15-020). For importability into Reading/Primary, where sentence content may carry richer metadata (audio, timing, source passage), the flattened contract is a real integration risk. All six sentence wrappers in this batch inherit it.

### F-GAMES-B24-010 · Low · Static Thai-only sample content shipped as game data — files 3,5,7,9,11,14,16,18,20

Every vocabulary/sentence wrapper serves hardcoded Thai↔English sample data (`sampleVocabulary.ts`, `sampleSentences.ts`, and the inline list in file 3). With `dynamic = "force-static"` this content is frozen at build time and identical for every user — there is no per-user/per-lesson vocabulary wiring and no i18n/locale parameterization (locale hardcoded to Thai). Functionally fine for a demo, but it means these endpoints cannot yet serve a learner's actual word list, the core value proposition when imported into Reading/Primary.

### F-GAMES-B24-011 · Medium · 0 of 20 wrappers have tests — all files

No co-located `route.test.ts` exists for any of the 20 files in this batch (confirmed via directory listing of all nine game folders). AGENTS.md ("Testing": *"Write tests for all new backend code"*) is not met for any endpoint wrapper in this batch. The shared factories do have unit tests elsewhere (`completeRoute.test.ts`, `vocabularyRoute.test.ts`, `sentencesRoute.test.ts`, `rankingRoute.test.ts`), which mitigates the *factory* logic risk, but each wrapper independently chooses its data source and `dynamic` export, and those wiring decisions (e.g. file 3's inline data, file 15/16/19/20's misplaced `dynamic`) are entirely untested. No wrapper-level test asserts the correct factory was wired to the correct data.

---

## Per-File Findings

### File 1 — `gryphon-patrol/complete/route.ts`
Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011. Canonical wrapper shape (import → `dynamic` → re-export). No file-specific defect beyond shared behavior.

### File 2 — `gryphon-patrol/ranking/route.ts`
Inherits F-GAMES-B24-004 (empty leaderboard) and F-GAMES-B24-011 (untested). The `force-static` directive (line 2) actively guarantees the leaderboard can never populate (see F-GAMES-B24-004).

### File 3 — `gryphon-patrol/sentences/route.ts`

**F-GAMES-B24-012 · Medium · route.ts:4-16 (inlined data diverges from shared `SAMPLE_SENTENCES`)**
This is the **only** sentences route in the batch that inlines its own array (11 sentences, `route.ts:4-16`) instead of importing `SAMPLE_SENTENCES`. Consequences: (a) content drift — gryphon-patrol serves a different sentence set than haunted-library / labyrinth-goblin-king / potion-rush / realm-carver / rune-forge-chamber, with no shared source of truth; (b) the sentences vary widely in length and complexity ("Collect all the magic orbs to win the game." vs "The wise owl watches over the enchanted forest at night.") with no leveling/difficulty metadata; (c) the array is hardcoded inside a route handler — the wrong layer for content (content belongs in a typed content module). If the shared sample is the intended demo content, this divergence is an inconsistency; if per-game content is intended, it argues for a typed `SentenceItem` content module rather than literals in a route file. Inherits F-GAMES-B24-009, -010, -011.

**F-GAMES-B24-013 · Info · route.ts:5-15 (content quality)**
The 11 inline sentences are thematically coherent (fantasy/gryphon framing) and grammatically clean, with Thai translations present for each. No profanity or age-inappropriate content observed; reading level is mixed but broadly elementary-appropriate. Noted as a positive observation, not a defect.

### File 4 — `haunted-library/complete/route.ts`
Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 5 — `haunted-library/sentences/route.ts`
Clean ordering (imports grouped, then `dynamic`). Inherits F-GAMES-B24-009, -010, -011. No file-specific defect.

### File 6 — `labyrinth-goblin-king/complete/route.ts`
Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 7 — `labyrinth-goblin-king/sentences/route.ts`
Clean ordering. Inherits F-GAMES-B24-009, -010, -011. No file-specific defect.

### File 8 — `magic-defense/complete/route.ts`
Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 9 — `magic-defense/vocabulary/route.ts`

**F-GAMES-B24-014 · Low · route.ts:1-3 (statement interleaved among imports)**
`export const dynamic = "force-static"` (line 2) is placed **between** the factory import (line 1) and the `SAMPLE_VOCABULARY` import (line 3). A non-import statement interleaved among imports is non-idiomatic and will trip `import/first` / import-ordering lint rules. Inherits F-GAMES-B24-010, -011.

### File 10 — `paladins-twin-soul/complete/route.ts`
Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 11 — `paladins-twin-soul/vocabulary/route.ts`
Clean ordering (imports grouped on lines 1-2, then `dynamic` on line 4). Inherits F-GAMES-B24-010, -011. No file-specific defect.

### File 12 — `potion-rush/complete/route.ts`
Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 13 — `potion-rush/ranking/route.ts`
Inherits F-GAMES-B24-004 (empty leaderboard) and F-GAMES-B24-011. Same as file 2.

### File 14 — `potion-rush/sentences/route.ts`

**F-GAMES-B24-015 · Low · route.ts:1-3 (statement interleaved among imports)**
Same pattern as file 9: `export const dynamic = "force-static"` (line 2) sits between the factory import (line 1) and the `SAMPLE_SENTENCES` import (line 3). Lint/style inconsistency. Inherits F-GAMES-B24-009, -010, -011.

### File 15 — `realm-carver/complete/route.ts`

**F-GAMES-B24-016 · Low · route.ts:3-6 (export ordering)**
`const { POST } = createCompleteRoute()` (line 3), then `export { POST }` (line 5), then `export const dynamic = "force-static"` placed **last** (line 6) — after the re-export rather than near the top. Functionally equivalent (hoisting), but a distinct stylistic convention vs. the canonical files (e.g. file 1), confirming there is no enforced wrapper template. Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011.

### File 16 — `realm-carver/sentences/route.ts`

**F-GAMES-B24-017 · Low · route.ts:4-7 (export ordering)**
Same trailing-`dynamic` ordering as file 15: `export { GET }` on line 5, `export const dynamic = "force-static"` on line 7. Stylistic inconsistency. Inherits F-GAMES-B24-009, -010, -011.

### File 17 — `rpg-battle/complete/route.ts`
Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011. No file-specific defect.

### File 18 — `rpg-battle/vocabulary/route.ts`

**F-GAMES-B24-018 · Low · route.ts:1-3 (statement interleaved among imports)**
Same interleaved-`dynamic`-between-imports pattern as files 9 and 14 (`dynamic` on line 2, `SAMPLE_VOCABULARY` import on line 3). Lint/style inconsistency. Inherits F-GAMES-B24-010, -011.

### File 19 — `rune-forge-chamber/complete/route.ts`

**F-GAMES-B24-019 · Low · route.ts:3-6 (export ordering)**
Same trailing-`dynamic` ordering as files 15/16 (`export { POST }` on line 5, `export const dynamic` on line 6). Stylistic inconsistency. Inherits F-GAMES-B24-001, -002, -003, -005, -006, -007, -008, -011.

### File 20 — `rune-forge-chamber/sentences/route.ts`

**F-GAMES-B24-020 · Low · route.ts:4-7 (export ordering)**
Same trailing-`dynamic` ordering as file 16. Stylistic inconsistency. Inherits F-GAMES-B24-009, -010, -011.

---

## Feature-Parity Finding

### F-GAMES-B24-021 · Low · cross-file (ranking endpoint coverage is inconsistent)
Within this batch only `gryphon-patrol` (file 2) and `potion-rush` (file 13) expose a `ranking` endpoint. `haunted-library`, `labyrinth-goblin-king`, `magic-defense`, `paladins-twin-soul`, `realm-carver`, `rpg-battle`, and `rune-forge-chamber` have `complete` + (vocabulary|sentences) but **no ranking route** in this batch. If leaderboards are a platform feature, coverage is uneven across games; if only some games are meant to have leaderboards, the rationale is undocumented. Directory listing of the nine game folders confirmed only `gryphon-patrol` and `potion-rush` carry a `ranking/` dir (see Limitations).

---

## Cross-Cutting Themes

| Theme | Findings | Severity |
|-------|----------|----------|
| Client-supplied XP trusted verbatim (cheatable scoring) | B24-001 | Critical |
| No Zod/runtime validation at request boundary; unhandled throw on bad JSON | B24-002 | High |
| `complete` routes are mocks — no persistence, no `schoolId`, not importable into Reading/Primary | B24-003 | High |
| Leaderboard always empty + frozen by `force-static` | B24-004, B24-021 | High/Low |
| `force-static` on POST mutation routes (wrong/dead directive) | B24-005 | Medium |
| Difficulty never affects XP/scoring | B24-006 | Medium |
| Dead contract fields (`score`,`gameTime`,`dragonCount`,`bossPower`,`victory`) | B24-007 | Medium |
| `activityId` collision risk (`Date.now()` only) | B24-008 | Medium |
| `VocabularyItem` reused for sentences — cross-app contract conflation | B24-009 | Medium |
| Static Thai-only build-time content; no per-user/locale wiring | B24-010 | Low |
| 0/20 wrappers tested | B24-011 | Medium |
| gryphon-patrol inlines divergent sentence data in a route handler | B24-012 | Medium |
| Import/export ordering inconsistency (multiple distinct styles) | B24-014, B24-015, B24-016, B24-017, B24-018, B24-019, B24-020 | Low |

---

## Limitations

- **Read-only review.** No source was edited, per instructions. I did not run the test suites, start the Next.js server, issue real HTTP requests, measure FPS, exercise mobile/touch rendering, or test browser compatibility. Behavioral claims about the factories are derived from reading their source, not from execution.
- This batch contains only API route handlers — **no React/Konva game components, no game-loop/rendering code, no asset files, no audio, and no accessibility-bearing UI** were in scope. Therefore findings on asset/audio/performance/mobile/browser/accessibility/age-appropriate UX are necessarily limited to what the data/scoring contracts imply (e.g. static Thai-only content, difficulty-insensitive XP, content quality of inline sentences in file 3); the player-facing surfaces that own those concerns are out of this batch and were not reviewed here.
- The shared factories (`completeRoute.ts`, `vocabularyRoute.ts`, `sentencesRoute.ts`, `rankingRoute.ts`, `types.ts`) and sample-data modules (`sampleVocabulary.ts`, `sampleSentences.ts`) were read for verification but are not themselves files in `/tmp/opencode/games-batch-24`; findings reference them only to characterize the behavior the in-scope wrappers import. Defects rooted in those shared files are fixed once at the factory but are reported here because the in-scope wrappers are the deliverables that inherit them.
- Endpoint inventory (F-GAMES-B24-021) is based on the listed batch files plus a directory listing of the nine game folders under `src/app/api/v1/games/`; I did not enumerate routes outside `apps/advantage-games`, and Reading/Primary import targets were assessed only against the monorepo AGENTS.md contract expectations, not against those apps' live schemas.
- Severity reflects impact *if/when* these mock endpoints are connected to real persistence and auth; today, as build-time static/mock handlers, several High/Critical findings are latent rather than actively exploited.

---

*No acceptance or closeout determination is made by this report. This is a line-by-line review deliverable only; track acceptance/closeout remains the responsibility of the Measure workflow owner.*
