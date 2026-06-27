# Line Review Evidence: primary-advantage-016

Reviewer: measure-jr-green/primary-advantage-016
Files assigned: 7
Lines assigned: 991

Batch scope: `apps/primary-advantage/app/api/flashcard/**` (decks
sentence/word ordering and the save stub) and `apps/primary-advantage/app/api/lessons/**`
(activity, progress, route) plus `apps/primary-advantage/app/api/licenses/[id]/route.ts`.
All of these are Next.js App Router Route Handlers migrated from Prisma to Drizzle
per `apps/primary-advantage/AGENTS.md:8-54` (Drizzle-only, no `@prisma/client`,
multi-tenant via `users.schoolId`, comments referencing "replaces Prisma ..." are
expected migration breadcrumbs). Cross-referenced the matched server models
(`apps/primary-advantage/server/models/lessonModel.ts`) and the multi-tenancy /
auth adapter guidance in the root `AGENTS.md`.

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts` | 1-229 | reviewed | 6 |
| `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts` | 1-355 | reviewed | 6 |
| `apps/primary-advantage/app/api/flashcard/save/[id]/route.ts` | 1-28 | reviewed | 1 |
| `apps/primary-advantage/app/api/lessons/[articleId]/activity/route.ts` | 1-38 | reviewed | 0 |
| `apps/primary-advantage/app/api/lessons/[articleId]/progress/route.ts` | 1-40 | reviewed | 0 |
| `apps/primary-advantage/app/api/lessons/[articleId]/route.ts` | 1-89 | reviewed | 1 |
| `apps/primary-advantage/app/api/licenses/[id]/route.ts` | 1-212 | reviewed | 4 |

## Findings

### LR-primary-advantage-016-001 — Shared-partial Drizzle schema forces `as any[]` client-side filter on `flashcardCards`

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:36-47`
- Evidence: Lines 36-37 explicitly acknowledge the schema gap: "Shared-partial filters (type, due, articleId) are applied client-side since those columns aren't on the shared schema yet." Lines 38-39 issue `db.select().from(flashcardCards).where(eq(flashcardCards.deckId, deck.id))` returning rows typed only by Drizzle's inference, then line 41 casts the array via `(cardRows as any[]).filter(...)` to read `c.type === "SENTENCE"`, `c.due`, and `c.articleId` (lines 43-46). The exact same `(flashcardCard as any).articleId` and `(flashcardCard as any).sentence` casts reappear at lines 79, 102, 161. Per `apps/primary-advantage/AGENTS.md:32-54` the primary-advantage tables (`SentencsAndWordsForFlashcard`, `CardReview`, etc.) live in `packages/db/src/schema/primary.ts` and must round-trip through `InferSelectModel<...>`, but this file is forced into `any` because those columns are not yet on the shared Drizzle surface that the Drizzle `client` is built against.
- Impact: The route silently works only as long as the runtime rows happen to contain the fields. If a future migration drops the `due` column or renames `type`, the `filter` predicate silently returns an empty array and the game reports "No due sentence flashcards found" (lines 68-71) with no error. The `as any[]` cast prevents TypeScript from flagging the breakage. This blocks confidence that the Drizzle migration is structurally complete and makes it impossible to drop Prisma-era assumptions from this code path.
- Recommendation: Extend `packages/db/src/schema/primary.ts` to add the missing `type`, `due`, `articleId` columns to `flashcardCards` (or the equivalent `SentencsAndWordsForFlashcard` table), regenerate the migration with `pnpm --filter @reading-advantage/db generate`, then drop the `(cardRows as any[])` cast and rewrite the filter as a Drizzle `where(and(eq(...), isNotNull(...), lte(...)))` chain. Track this as a Prisma→Drizzle completion item in `measure/audit-reports/primary-advantage-full_20260626/migration-tracks.md`.

### LR-primary-advantage-016-002 — `cardReviews` table is fully scanned to find one review per card

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:50-60`
- Evidence: Lines 50-60 build `cardIds = sentenceCards.map((c) => c.id)` and then, inside `if (cardIds.length > 0)`, issue `db.select().from(cardReviews).orderBy(desc(cardReviews.reviewedAt))` with **no** `where` clause, then walk the full result set assigning to `reviewsByCard` (lines 55-59). The result is an O(R) scan of the entire `cardReviews` table on every request, with a per-card `cardIds.includes(r.cardId)` linear lookup (line 56) making the per-card assignment O(C·R) in the worst case. The function then never reads the second-or-later review for any card (line 64 only reads the first entry in `reviewsByCard`).
- Impact: Once `cardReviews` grows beyond a few hundred rows this endpoint becomes the slowest route on the page; with the full `cardReviews` history loaded into Node and walked twice (once in the includes-loop, once when projecting the cards), a request from a teacher with many students could take seconds. The review is logically scoped to the current `deckId` / `cardIds` set, so the DB has the data needed to answer it without scanning. A regression test that runs this route against a seeded `cardReviews` table of 10k rows would expose the linear scan today.
- Recommendation: Replace the unconditional `db.select().from(cardReviews).orderBy(...)` with `db.select().from(cardReviews).where(inArray(cardReviews.cardId, cardIds)).orderBy(desc(cardReviews.reviewedAt))` and use a `Map` keyed by `cardId` while iterating in DB order. Add a Drizzle index on `cardReviews.cardId` in the next migration so the `inArray` lookup stays cheap.

### LR-primary-advantage-016-003 — N+1 `articles` select inside the per-card loop

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:77-91`
- Evidence: The `for (const flashcardCard of cards)` loop on line 77 issues a separate `db.select({...}).from(articles).where(eq(articles.id, articleId)).limit(1)` for every card (lines 81-91). With the comment "Get the full article with sentences (replaces Prisma `article.findUnique`)" the author was clearly matching a one-shot per-card fetch, but the resulting query plan is one round-trip per card, not per distinct article. Two cards from the same `articleId` will issue the same SELECT twice.
- Impact: A deck of 20 sentence cards spread across 4 articles issues 20 round-trips to Postgres where 4 would suffice. The route sits behind a student-facing page and is called every time a student opens a flashcard session, so latency is user-visible. A `findMany({ where: inArray(articles.id, distinctArticleIds) })` then in-memory join would cut the round-trips to one and is a one-line change.
- Recommendation: Pre-collect `const articleIds = Array.from(new Set(sentenceCards.map((c) => (c as any).articleId).filter(Boolean)))`, issue a single `db.select().from(articles).where(inArray(articles.id, articleIds))`, build a `Map<articleId, article>`, and look up by id in the loop. Track this under the same Prisma→Drizzle completion item as LR-primary-advantage-016-001.

### LR-primary-advantage-016-004 — POST `/api/flashcard/.../sentences-for-ordering` parses the body without Zod

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:197-199`
- Evidence: Line 197 destructures `{ score, timer } = await request.json()` with no validation, then line 199 computes `Math.floor(score * 2)` and persists `xpEarned`, `timer`, `score` into the `details` JSON column on `userActivity` (lines 202-213). `score` and `timer` are never type-checked: a malicious or buggy client can send `{ score: "100", timer: "abc" }` and the value gets cast to `NaN` by `Math.floor`, recorded as `xpEarned: NaN`, and used in the SQL increment on lines 224-226 (`sql\`${users.xp} + ${xpEarned}\``). Drizzle's `sql` template tag treats `NaN` as a numeric literal that Postgres will reject, but only if the column is `integer`; if it is `numeric` the row silently becomes `NaN` and corrupts the leaderboard.
- Impact: Score and XP values feed into a shared `users.xp` column, the `xpLogs` audit table, and the leaderboard surfaced on the primary-student dashboard. A bad submission from a misbehaving client permanently inflates or defiles a student's XP, which is a primary-student adaptation risk (gamified content for young learners). The license route handler in the same batch (LR-primary-advantage-016-015) uses `z.object` for the same kind of payload, so the inconsistency is also a fork-divergence smell.
- Recommendation: Define `const SaveSchema = z.object({ score: z.number().int().min(0).max(10000), timer: z.number().int().min(0).max(60 * 60 * 24) })` and parse the body with `SaveSchema.parse(body)` before destructuring. Add a regression test that POSTs `{"score":"100"}` and asserts a 400 response. Add the same Zod parse to the words-for-ordering POST (LR-primary-advantage-016-012).

### LR-primary-advantage-016-005 — `flashcardCards` and `articles` reads have no `schoolId`/tenant filter

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:38-39, 81-91`
- Evidence: Line 38 selects every `flashcardCards` row for the deck and line 81 selects the `articles` row for the card without any `schoolId` or `classroomId` filter. The only auth check before these reads is `currentUser()` returning non-null (line 15) and `eq(flashcardDecks.userId, user.id)` (line 26) on the deck. The `flashcardCards` table is joined to `articles` purely by `articleId`; if an `articleId` was reassigned or copied across schools (e.g., via a shared content import) a student from school A could end up reading a sentence from an article that is restricted to school B. Per root `AGENTS.md` "Every query must be scoped by `schoolId`. ... Never trust tenant IDs from the frontend without verifying the user has access" and `apps/primary-advantage/AGENTS.md:70-73` ("Multi-tenant queries must filter on `users.schoolId` ... for every read/write").
- Impact: A primary-school adaptation risk: a primary student (typically 6-12 years old) could be shown sentence content with a translation from a different school's reading list, including vocabulary that the school has chosen to exclude. There is no defense in this route — the tenant boundary is implicit in the `userId` filter on the deck, not in a verified school join. A regression test that seeds two schools and submits a `cardId` from school A while authenticated as school B would expose the leak.
- Recommendation: Either (a) add `eq(users.schoolId, <tenant schoolId>)` joins to the `flashcardCards` and `articles` selects, or (b) introduce a `flashcardDecks.schoolId` column populated on deck creation and join through it. The Reading Advantage equivalent scopes by `schoolId` at the Prisma level; the migration to Drizzle must preserve that scope.

### LR-primary-advantage-016-006 — Unused `isNotNull` import in sentences-for-ordering route

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts:2`
- Evidence: Line 2 imports `isNotNull` from `@reading-advantage/db` (`import { db, eq, and, desc, isNotNull, sql } from '@reading-advantage/db';`) but `isNotNull` is never referenced in the 229-line file. The `as any[]` filter on line 41 makes it look like a filter that *should* have used `isNotNull(flashcardCards.articleId)` and `isNotNull(flashcardCards.due)` is being expressed manually as `c.articleId != null` and `c.due && new Date(c.due) <= now` instead.
- Impact: Dead import, but the bigger signal is the missing Drizzle expression: the same where-clause authored in Drizzle would be `where(and(eq(flashcardCards.deckId, deck.id), isNotNull(flashcardCards.articleId), lte(flashcardCards.due, now), eq(flashcardCards.type, "SENTENCE")))` and would not need the post-fetch `filter` (LR-primary-advantage-016-001). Leaving `isNotNull` imported without using it is a hint that the migration author started to write that expression and gave up.
- Recommendation: Either use `isNotNull(flashcardCards.articleId)` in the `where` clause (per LR-primary-advantage-016-001) or drop the import. The former is the better outcome because it eliminates the `as any[]` cast.

### LR-primary-advantage-016-007 — `getPartOfSpeech` is a hardcoded English heuristic that defaults to "noun" and labels plurals as verbs

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:9-122, 257`
- Evidence: The 114-line `getPartOfSpeech` function (lines 9-122) hardcodes English articles (line 28), prepositions (lines 32-45), conjunctions (line 50), pronouns (lines 56-69), and verbs (lines 75-96). The fallback chain on lines 100-105 ends with `cleanWord.endsWith("ed") || cleanWord.endsWith("ing") || cleanWord.endsWith("s")` returning `"verb"`, which misclassifies common plural nouns ("books", "cats", "apples") as verbs. The default at line 121 is `"noun"`. The function is called once per word on line 257 and the resulting `partOfSpeech` is returned to the client. The Primary Advantage reading list explicitly targets primary-school students who may not yet be confident English readers, so a misclassification that flashes "verb" under a picture of a book could create an explicit mis-learning moment.
- Impact: A primary student playing the word-ordering game sees the wrong part-of-speech label after every word, and the `endsWith("s")` rule causes the most common plural noun in any sentence to be labeled as a verb. This is a primary-student adaptation risk because the surface UI surfaces a wrong educational fact. It is also a fork-specific regression because the same route in Reading Advantage uses the same flawed heuristic; the author copied it without review.
- Recommendation: Replace the heuristic with a server-side dictionary lookup (e.g., `compromise` or `wink-nlp` English POS tagger), or at minimum add a guard: if `endsWith("s")` and the word has no clear verb suffix, fall through to the noun default. If the part-of-speech label is not actually displayed in the UI, delete the field from the response (line 247-258) entirely; carrying wrong data is worse than no data.

### LR-primary-advantage-016-008 — Same `as any[]` shared-partial Drizzle filter on `flashcardCards`

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:151-162`
- Evidence: Lines 151-162 mirror the sentences-for-ordering pattern. Line 153 selects `db.select().from(flashcardCards).where(eq(flashcardCards.deckId, deck.id))` without a `type` or `due` filter, line 156 casts the rows with `(cardRows as any[]).filter((c) => (c.type === undefined || c.type === "SENTENCE") && c.due && new Date(c.due) <= now && c.articleId != null)`. The route is supposed to return "words for ordering" yet it filters to `c.type === "SENTENCE"` cards and tokenizes them into words downstream (line 213), so the type filter and the response shape are mismatched. Per `apps/primary-advantage/AGENTS.md:32-54` the same Drizzle schema gap noted in LR-primary-advantage-016-001 forces the cast here too.
- Impact: A second instance of the same schema gap. The `c.type === undefined || c.type === "SENTENCE"` test silently includes any card whose `type` column is missing, which means a non-sentence card (a `WORD` card, once the schema is fixed) would be tokenized as a sentence and pushed into the words-for-ordering game. The response shape (sentences with embedded words) is also a contract drift from the words-for-ordering endpoint's name.
- Recommendation: Same as LR-primary-advantage-016-001: extend `packages/db/src/schema/primary.ts` to add the missing `flashcardCards` columns, regenerate the Drizzle schema, and replace the `as any[]` filter with a `where(and(...))` chain. After the schema fix, decide whether the words-for-ordering endpoint should accept `WORD` cards (rename to `cards-for-ordering`) or be removed.

### LR-primary-advantage-016-009 — Same O(R) `cardReviews` scan as the sentences-for-ordering route

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:165-175`
- Evidence: Lines 165-175 are a near-verbatim copy of LR-primary-advantage-016-002. `cardIds` is computed on line 165, then line 168-169 issues `db.select().from(cardReviews).orderBy(desc(cardReviews.reviewedAt))` with no `where` clause, and lines 170-174 walk the full result set building `reviewsByCard` via `cardIds.includes(r.cardId)`. The endpoint name and the "for words" framing makes no use of `cardReviews` for any word-specific logic; the `reviews` field is just appended to each card and discarded by the game.
- Impact: Doubles the cost of the bug from LR-primary-advantage-016-002. Every time a student opens the words-for-ordering game the server loads the entire `cardReviews` table, sorts it in memory by `reviewedAt`, and walks it linearly. With even a few thousand reviews in the table the route times out.
- Recommendation: Same fix as LR-primary-advantage-016-002: `where(inArray(cardReviews.cardId, cardIds))`. If `reviews` is not actually consumed by the words-for-ordering game, drop the lookup entirely (lines 165-180) and pass `reviews: []` to the client.

### LR-primary-advantage-016-010 — N+1 `articles` select inside the per-card loop (words-for-ordering)

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:192-291`
- Evidence: Line 192 opens a `for (const flashcardCard of cards)` loop that issues a separate `db.select({...}).from(articles).where(eq(articles.id, articleId)).limit(1)` (lines 196-206) for every card. The loop continues to read `article.sentences`, `article.audioUrl`, and `article.translatedPassage` (lines 220-232) per card even when many cards share the same `articleId`. This is the same N+1 pattern as LR-primary-advantage-016-003, copied to the words-for-ordering sibling.
- Impact: A student with 20 sentence flashcards spread across 4 articles issues 20 round-trips. The Reading Advantage equivalent does the same `findUnique` per card under Prisma, so the per-card cost is the same; the Drizzle migration did not collapse the loop. With the AGENTS.md guidance to "centralize database access" this is the right place to add a backend module wrapper.
- Recommendation: Same fix as LR-primary-advantage-016-003: pre-fetch distinct articles with `inArray` and serve from a `Map`. Track as part of the same Prisma→Drizzle migration-completion item.

### LR-primary-advantage-016-011 — Word-level `audioUrl`/`startTime`/`endTime` are set from card-level fields

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:254-256`
- Evidence: Inside the `wordObjects = words.map((word, index) => { ... })` (lines 235-259), lines 254-256 assign `audioUrl: getAudioUrl((flashcardCard as any).audioUrl || "")`, `startTime: (flashcardCard as any).startTime`, and `endTime: (flashcardCard as any).endTime` to every word in the sentence. The earlier block on lines 240-245 already computed per-word timings `wordDuration = totalDuration / words.length` and assigned `startTime`/`endTime` to local variables, but the per-word variables are shadowed by the card-level cast on lines 255-256. Result: every word in the sentence gets the same startTime, the same endTime, and the same audioUrl (the whole sentence's audio file) instead of the per-word clip.
- Impact: The words-for-ordering game likely plays the same sentence audio for every word card, breaking the word-by-word pronunciation feedback that a primary-school learner needs. This is a primary-student adaptation risk: mispronounced vocabulary slows down early reading. The shadowing of the local `startTime`/`endTime` is a strong code-smell signal that this branch was supposed to be the per-word one.
- Recommendation: Drop the card-level casts on lines 255-256 and assign the locally-computed `startTime` and `endTime` (declared on lines 237-238 and set on lines 243-244). For per-word audio, either (a) clip the audio file with the start/end offsets and use a signed-URL helper, or (b) return the same `audioUrl` for all words but expose the per-word `startTime`/`endTime` so the client can `<audio>` seek to the word boundary. Add a unit test that asserts two words in the same sentence have different `startTime` values.

### LR-primary-advantage-016-012 — POST `/api/flashcard/.../words-for-ordering` parses the body without Zod

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts:322-325`
- Evidence: Line 323 destructures `{ score, timer } = await request.json()` with no validation, then line 325 computes `Math.floor(score * 2)` and feeds `xpEarned` into the `userActivity` insert (lines 328-339), the `xpLogs` insert (lines 342-347), and the `users.xp` SQL increment (lines 350-352). Same shape as LR-primary-advantage-016-004, with the same risk: a non-numeric `score` becomes `NaN`, lands in `details.xp` and corrupts the user's `xp` column.
- Impact: Doubles the XP-corruption attack surface noted in LR-primary-advantage-016-004. The two endpoints share the same `ActivityType` table and the same `users.xp` column, so a bug in either route is enough to inflate a primary student's XP.
- Recommendation: Share a `SaveFlashcardResultSchema = z.object({ score: z.number().int().min(0).max(10000), timer: z.number().int().min(0).max(60 * 60 * 24) })` between this route and the sentences-for-ordering route, place it in `apps/primary-advantage/lib/validators/flashcard.ts`, and `parse` it before computing `xpEarned`. Add a Vitest unit test that posts a string-typed `score` and asserts a 400 response.

### LR-primary-advantage-016-013 — `/api/flashcard/save/[id]` is a stub that logs the body and returns success

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/save/[id]/route.ts:1-28`
- Evidence: The entire 28-line file is: import (lines 1-4), POST handler (lines 6-27) which awaits `params.id` (line 10), awaits `currentUser()` (line 11), parses `body = await req.json()` (line 12), checks user (lines 14-16), selects the article by id with no tenant filter (lines 18-20), returns 404 if missing (lines 22-24), `console.log(body);` (line 25), and finally returns `{ message: "Article saved" }` with status 200 (line 27). The handler never writes to the database. The article lookup on line 18-20 has no `schoolId`/`userId` filter, so any authenticated user can probe whether an article id exists; the response is `{ error: "Article not found" }` vs. `{ message: "Article saved" }` regardless of whether the article actually belongs to the user. The `console.log(body);` on line 25 is a debug leftover.
- Impact: Two distinct issues. (a) The route is functionally a no-op: a "Save" button in the primary-advantage UI that POSTs to this endpoint appears to succeed but persists nothing. Students who think they bookmarked an article have no record of the bookmark. (b) The article-id probe leaks existence: an attacker can enumerate article ids by looking for `200 { message: ... }` vs `404 { error: ... }`. This is a primary-student adaptation risk: the primary UI likely surfaces a "Saved Articles" list that is silently empty.
- Recommendation: Either delete the route entirely (and the UI button that calls it) or implement the actual save by inserting a row into a `bookmarks`/`savedArticles` table. Add a regression test that asserts POSTing a valid body to this route either persists a row (200 + DB count incremented) or returns a meaningful 4xx. Remove the `console.log(body);` debug statement on line 25 and add an ESLint rule that disallows `console.log` outside of `/system/test/**` pages.

### LR-primary-advantage-016-014 — Manual type check in `POST /api/lessons/[articleId]` accepts `NaN` for `progress`

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/lessons/[articleId]/route.ts:60-71`
- Evidence: Lines 60-71 validate `progress` and `timeSpent` with a manual `typeof` ladder:
  ```ts
  if (
    typeof progress !== "number" ||
    typeof timeSpent !== "number" ||
    progress < 0 ||
    progress > 100
  ) { ... 400 ... }
  ```
  `typeof NaN === "number"` is `true`, `NaN < 0` is `false`, and `NaN > 100` is `false`, so the `NaN` value passes validation. The same path is followed for `timeSpent`, so a body like `{ "progress": null, "timeSpent": 0 }` will pass `typeof null === "object"` (rejected) but `{ "progress": 0/0, "timeSpent": 5 }` (i.e. NaN literal) will pass and be persisted. The license route in this batch (LR-primary-advantage-016-015) uses `z.number().int().min(0).max(100)` which would reject `NaN`; the inconsistency is a fork-divergence smell. The destination function `updateStandaloneLessonProgress(user.id, articleId, progress, timeSpent)` on line 73-78 then writes the `NaN` into a Drizzle update.
- Impact: A single malformed POST corrupts the user's lesson progress row. Downstream UI that reads `progress` and renders a percent bar (likely a 0-100 ring in the primary-advantage lesson view) shows `NaN%`, which most React UI libraries render as `NaN%` or an empty bar. The bug only triggers from malformed clients (e.g., the student lost connectivity mid-write), so it is a primary-student adaptation risk: a primary student may see the lesson permanently "stuck" after one bad submission, and there is no UI path to reset it.
- Recommendation: Replace the manual `typeof` ladder with a Zod parse: `const Schema = z.object({ progress: z.number().min(0).max(100), timeSpent: z.number().int().min(0).max(60 * 60 * 24) })`. Add a Vitest unit test that POSTs `{ progress: 0/0 }` (or any NaN-yielding expression like `Number("x")`) and asserts a 400. Track under the same lesson-progress migration item as LR-primary-advantage-016-015.

### LR-primary-advantage-016-015 — `GET/PUT/DELETE /api/licenses/[id]` filter only by role, not by school

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:34-47, 80-93, 180-200`
- Evidence: The three handlers share a single role gate: `if (user.role !== "ADMIN" && user.role !== "SYSTEM") return 403` (lines 34-36 GET, 80-82 PUT, 183-185 DELETE). After the gate, every handler fetches by `eq(licenses.id, id)` with no school/tenant filter (lines 41-43 GET, 91-93 PUT, 190-192 DELETE). The `licenses` table has a `schoolId` column (see `licenses` schema in `packages/db/src/schema/`) but the route never joins or filters on it. An `ADMIN` from school A could read, mutate, or delete a license assigned to school B by guessing or scraping the id, because the role check treats all `ADMIN` users as global administrators.
- Impact: Multi-tenant boundary breach. Per the root `AGENTS.md` multi-tenancy section and `apps/primary-advantage/AGENTS.md:70-73`, queries must be scoped by `schoolId`. A school admin should only see/edit their own school's licenses. The current code grants every admin global license access, which is a primary-student adaptation risk: a primary school's billing data is exposed to admins from other primary schools.
- Recommendation: Replace the role-only gate with a scoped lookup: after the role check, fetch the license with `where(and(eq(licenses.id, id), or(eq(licenses.schoolId, user.schoolId), isNull(licenses.schoolId))))` for `ADMIN` users, and an unfiltered `eq(licenses.id, id)` for `SYSTEM` users. The `PUT` should additionally re-validate that the new `schoolId` (line 119) matches the admin's own school. Add a Vitest integration test that creates two schools with two licenses and asserts an admin from school A cannot GET the school-B license.

### LR-primary-advantage-016-016 — `subscriptionType.toUpperCase()` plus `as SubscriptionType` plus `as any` cast on the update payload

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:117-120`
- Evidence: Line 117-118 sets `subscription: validatedData.subscriptionType.toUpperCase() as SubscriptionType` where `validatedData.subscriptionType` is one of `"basic" | "premium" | "enterprise"` (Zod enum, lines 20-21) and `SubscriptionType` is the uppercase Drizzle pgEnum values union (line 10). The `toUpperCase()` happens in app code rather than in the Zod schema (`z.enum(["BASIC", "PREMIUM", "ENTERPRISE"])`), and the `as SubscriptionType` is a non-validated type assertion that would be wrong if the Zod enum ever grew a lowercase value that does not map to a pgEnum entry. Line 120 then casts the entire `set` object via `as any` to bypass a structural mismatch the Drizzle types flagged.
- Impact: A type-system escape hatch. If a future contributor adds a new pgEnum value (e.g., `"TRIAL"`) the Zod schema and the `toUpperCase()` call need to be updated in lockstep; TypeScript will not catch a typo because of the `as SubscriptionType` and `as any` casts. The Drizzle migration's `InferSelectModel` chain is defeated for the entire update payload.
- Recommendation: Define the Zod schema in terms of the uppercase enum values (`z.enum(["BASIC", "PREMIUM", "ENTERPRISE"])`) and drop the `toUpperCase()` call. Investigate the `as any` cast on line 120 and either (a) make the `licenses` schema's column types match the Zod output, or (b) use `Partial<InferInsertModel<typeof licenses>>` and only include the fields the route actually updates.

### LR-primary-advantage-016-017 — `Foreign key` error matched by string substring

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:158-163`
- Evidence: Lines 158-163 catch generic errors and pattern-match `error.message.includes("Foreign key")` to translate a FK violation into a 400. Drizzle surfaces FK violations via `DrizzleQueryError` with a typed `cause` (a `pg` error object with `code === '23503'` for foreign_key_violation). The string match breaks if (a) the error message changes wording, (b) the locale is non-English, or (c) the same substring appears in an unrelated error.
- Impact: A school-id with a typo currently produces a 400 with a usable error. A future Postgres error-message change (or a localized Postgres build) silently turns it into a 500, which the client treats as a generic failure. This is a shared package migration blocker because the same pattern appears in the Reading Advantage codebase and the migration to Drizzle never updated the error-mapping layer.
- Recommendation: Inspect `error.cause` (the DrizzleQueryError cause) and check `code === '23503'` (Postgres foreign_key_violation). Translate to a 400 only on that specific code. Add a unit test that throws a `DrizzleQueryError` with a fake cause and asserts the route returns 400.

### LR-primary-advantage-016-018 — `DELETE /api/licenses/[id]` is a hard delete with no soft-delete or audit row

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/licenses/[id]/route.ts:198-204`
- Evidence: Lines 198-200 issue `await db.delete(licenses).where(eq(licenses.id, id))`. There is no prior insert into an `auditLog` table, no `deletedAt` soft-delete column on `licenses`, and no FK cascading consideration for the `schools` row on line 51-56. The `DELETE` is gated by the role-only check from LR-primary-advantage-016-015, so a `SYSTEM` user can permanently remove any license row in the database. The response (lines 202-204) only returns `{ message: "License deleted successfully" }` and does not include the deleted id for audit traceability.
- Impact: A billing-related destructive action with no audit trail. Per root `AGENTS.md` observability section, "Security-sensitive actions should create audit events" and audit logs should be immutable. Deleting a license for a school that has active students removes the only record that grants the school access, with no way to roll back or attribute the action. Primary-student adaptation risk: a school admin who deletes a license by accident immediately loses access for every primary student in that school.
- Recommendation: Either (a) implement a soft-delete (`status: "deleted"` and `deletedAt: new Date()` instead of a row delete), or (b) wrap the delete in a `db.transaction` that also inserts an `audit_events` row with `{ actorId, action: "license.delete", targetId, timestamp }`. If the team intentionally chose hard delete, document the rationale in `measure/audit-reports/primary-advantage-full_20260626/fork-divergence.md` so future audits know the decision was deliberate.

## No-Finding Notes

- `apps/primary-advantage/app/api/lessons/[articleId]/activity/route.ts`: reviewed line-by-line; the file is a 38-line GET handler that delegates to the `getArticleActivity` server model in `@/server/models/lessonModel`. The auth check is `currentUser()` non-null (lines 15-17), the route forwards `articleId` and `user.id` to the server model (line 21), and the response is wrapped in a `try/catch` that returns 500 on failure (lines 30-37). There is no direct Drizzle/Prisma access in this file, so the shared-partial schema gap from LR-primary-advantage-016-001 does not apply. The `[articleId]` URL param is not validated, but the server model is expected to validate it; the parent batch's `lessonModel` review is out of scope here. No findings.
- `apps/primary-advantage/app/api/lessons/[articleId]/progress/route.ts`: reviewed line-by-line; the file is a 40-line GET handler that delegates to `getStandaloneLessonProgress` in `@/server/models/lessonModel`. The auth check, the try/catch, and the response shape are all consistent with the activity route. No direct database access, so no Drizzle schema gap applies. No findings.
- `apps/primary-advantage/app/api/lessons/[articleId]/route.ts` (GET handler only): the GET portion (lines 12-40) is clean — it calls `currentUser()`, then `getArticleForLesson(articleId)`, and returns the article with a try/catch. The one finding (LR-primary-advantage-016-014) is on the POST handler, so the GET handler itself is fine. The route is the only `lessons/[articleId]/route.ts` so the single finding_count of 1 covers the file.
