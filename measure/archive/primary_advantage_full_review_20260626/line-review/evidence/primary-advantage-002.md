# Line Review Evidence: primary-advantage-002

Reviewer: measure-jr-green/primary-advantage-002
Files assigned: 1
Lines assigned: 1400

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/actions/flashcard.ts` | 1-1400 | reviewed | 8 |

## Findings

### LR-primary-advantage-002-001 — Hardcoded NULL `due`/`state` columns in dashboard query

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/flashcard.ts:441-465`
- Evidence: In `getDashboardData`, the per-deck card fetch (lines 437-443) projects `due: sql<string>\`(SELECT NULL::timestamp)\`` and `state: sql<string>\`(SELECT NULL::text)\`` as raw SQL casts. The downstream filters on lines 461, 462, 464, 465 (`card.due && new Date(card.due) <= now`, `card.state === "NEW"`, etc.) and `reviewCards` filter on line 474 then always evaluate against `undefined`/`null`. The result: every `formattedDecks` entry (lines 476-488) reports `newCards = 0`, `learningCards = 0`, `dueCards = 0`, `reviewCards = 0`, and `totalCards` collapses to 0 because `newOrDueCards` is computed from those empty lists (lines 468-472). The "Vocabulary" / "Sentence" / dashboard tiles are therefore permanently empty even for users with FSRS-scheduled cards. The same file still reads the real `due`/`state` columns in `reviewCard` (lines 752-768) and `getUserFlashcardDecks` (lines 366-374), so the regression is localised to the dashboard projection.
- Impact: Primary students see a flashcard dashboard with zero cards of any state, breaking the gamified study loop. This is fork-specific because the Prisma-era code used real column values.
- Recommendation: Project the real `due` / `state` columns from `flashcardCards` (or shared-partial `sql` references that read `flashcard_cards.due`/`flashcard_cards.state`) and remove the literal `NULL` sub-selects.

### LR-primary-advantage-002-002 — `getLessonClozeTestSentences` returns cloze tests with empty `blanks` array

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/actions/flashcard.ts:1128-1157`
- Evidence: The function pushes cloze test objects (lines 1144-1156) but always sets `blanks: []` (line 1150). The interface contract implies a cloze test should mark which words to mask, but no masking/highlighting logic exists. The student-side renderer (`components/lesson/games/lesson-sentence-cloze-test.tsx`, batch 032) cannot show fill-in-the-blank interactions without populated blanks.
- Impact: Primary students playing the sentence cloze-test game cannot actually fill any blanks; the feature silently degrades to displaying the sentence with no interactivity. This is a primary-student adaptation risk because cloze testing is a primary-age reading strategy that depends on blanks being supplied.
- Recommendation: Compute `blanks` from the flashcard sentence (e.g., mask function/content words, or mark a percentage of tokens) before returning; otherwise either remove the feature surface or label the game as "read-only" until populated.

### LR-primary-advantage-002-003 — `NextResponse.json` returned from server actions

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/flashcard.ts:37,831,962,1105,1183`
- Evidence: `NextResponse` is imported from `next/server` (line 37) but the file's exports are `"use server"` Server Actions (line 1), not Route Handlers. Four branches return `NextResponse.json({ error }, { status })`: line 831 (`saveArticleToFlashcard`, "Article not found"), line 962 (`getLessonOrderingSentences`, "Unauthorized"), line 1105 (`getLessonClozeTestSentences`, "Unauthorized"), and line 1183 (`getLessonOrderingWords`, "Unauthorized"). The success paths of the same functions return plain objects (e.g., `{ sentenceGroups, totalGroups }` at lines 1082-1085, `{ clozeTests, totalTests }` at lines 1162-1166). Callers cannot reliably destructure the result; client components that expect plain objects will hit type/value mismatches.
- Impact: Inconsistent return contracts between success and failure branches; consumer code that destructures `result.error` will silently miss NextResponse-wrapped errors, masking auth failures from primary students. Server Actions in Next.js 16 should return plain serializable values.
- Recommendation: Replace `NextResponse.json(...)` returns with plain `{ success: false, error: "..." }` objects to match the success paths and the conventions used by sibling actions in the same file (e.g., `saveFlashcard`, `deleteFlashcardCard`).

### LR-primary-advantage-002-004 — Heavy `as any` casts indicate incomplete Drizzle port of shared-partial schema

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/actions/flashcard.ts:219-220,235,245-247,278-298,322-325,366-374,421-447,460-474,686,696-767,939-945,981-983,999-1011,1047-1055,1070,1124-1126,1139,1142-1155,1202-1204,1220,1225,1235,1243-1247,1269-1271,1304`
- Evidence: The file's comments (e.g., lines 33-34, 270-277, 751) admit that the shared `flashcardCards` table exposes only `id/deckId/front/back/sourceId/order/createdAt`, while runtime columns `type/articleId/audioUrl/startTime/endTime/word/definition/sentence/translation/due/stability/difficulty/elapsedDays/scheduledDays/learningSteps/reps/lapses/state/lastReview/updatedAt` are accessed via `as any` casts. The grep for `as any`/`SELECT NULL` finds 30+ cast sites plus the two literal NULL sub-selects (lines 441-442). Every read site suppresses type safety and trusts the runtime shape.
- Impact: Type-system protection is bypassed across the entire flashcard action surface. A schema rename or column removal in `@reading-advantage/db` will fail silently at runtime. The Drizzle migration story documented in `apps/primary-advantage/AGENTS.md:21-54` is incomplete for flashcard data, blocking the "fully removed Prisma" claim.
- Recommendation: Extend `packages/db/src/schema/primary.ts` (or a new shared module) to declare the missing columns (`due`, `state`, FSRS fields, content fields), regenerate migrations, and remove the `as any` casts incrementally. Until then, isolate the casts behind a typed adapter to keep type errors localised.

### LR-primary-advantage-002-005 — `completeDeck` XP-awarding function is entirely commented out

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/flashcard.ts:1329-1400`
- Evidence: Lines 1329-1400 are a fully commented-out `completeDeck` implementation that previously awarded XP via `xpLogs.insert(...)`, `users.xp` increment, and `userActivity.insert(...)` inside a `db.transaction`. The body uses the now-removed Prisma shape (`tx.userActivity.create`) but the comment block was preserved as dead code. There is no replacement XP flow visible in this file; `reviewCard` (lines 752-797) explicitly comments out the `userActivity` insert (lines 776-794) and only writes `cardReviews`. `getDashboardData` reads XP from `xpLogs` (lines 513-520), so no XP ever lands in the ledger for flashcard activity.
- Impact: Primary students who complete a flashcard deck or review a card receive no XP / streak / activity-log updates, breaking the gamification feedback loop. This regresses from the documented Reading Advantage behavior.
- Recommendation: Re-implement `completeDeck` (and the `reviewCard` userActivity insert) using Drizzle inserts against `xpLogs` and `userActivity`, removing the commented-out legacy Prisma shape.

### LR-primary-advantage-002-006 — `reviewCard` returns pre-update card instead of FSRS-computed `updatedCard`

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/flashcard.ts:743-803`
- Evidence: Line 744 destructures `{ updatedCard, reviewLog }` from `fsrsService.processReview(...)`. Lines 752-768 persist `updatedCard.due`, `updatedCard.state`, etc. to the DB. The transaction's return (line 796) is `{ card, reviewLog }` where `card` is the pre-update snapshot from line 737 (`cardRow ? { ...cardRow.card, deck: cardRow.deck } : null`), not `updatedCard`. Line 801 then returns `result.card` — the stale object.
- Impact: Client callers (`app/api/flashcard/cards/[cardId]/review/route.ts`, batch 015) receive a card object with the old `due`/`state`/`stability` fields. Subsequent UI rendering (next-review interval, "due in 3 days", etc.) will be wrong even though the DB has been updated. This regresses from the Prisma-era behavior, which returned the post-update record.
- Recommendation: Return `{ updatedCard, reviewLog }` (or spread `{ ...updatedCard, deck: card.deck }`) from the transaction and surface it through the API.

### LR-primary-advantage-002-007 — N+1 query pattern in lesson sentence/word fetchers

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/actions/flashcard.ts:988-1000,1131-1140,1209-1221`
- Evidence: `getLessonOrderingSentences` (line 988), `getLessonClozeTestSentences` (line 1131), and `getLessonOrderingWords` (line 1209) all iterate `flashcards` with `for (const flashcardCard of flashcards)` and inside the loop await a fresh `db.select().from(articles).where(eq(articles.id, flashcardCard.sourceId))` (lines 990-1000, 1133-1140, 1211-1221). Each request issues N sequential queries (where N = flashcard count) plus the initial card fetch.
- Impact: For decks with many sentences, response time grows linearly and Postgres connection-pool pressure increases. Primary-student lessons with 10+ flashcards per article will be visibly slow compared to Reading Advantage.
- Recommendation: Collect unique `sourceId`s, fetch all matching articles in one `inArray(articles.id, ids)` query, then build a Map for O(1) lookup inside the loop.

### LR-primary-advantage-002-008 — Unused imports `State` and `redirect`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/actions/flashcard.ts:4,36`
- Evidence: Line 4 imports `State` from `ts-fsrs` alongside `Card`, `Rating`, `createEmptyCard`; `State` is never referenced in the file. Line 36 imports `redirect` from `next/navigation`; `redirect` is never called. The file defines its own `CardState` type alias on line 34 derived from the Drizzle `cardState` enum, which makes the `State` import redundant.
- Impact: Dead imports add bundle weight and signal an incomplete migration (the local `CardState` replaces `State`, but the original is left behind). Not security-critical.
- Recommendation: Drop `State` from the `ts-fsrs` import on line 4 and remove the `redirect` import on line 36 (or document the intentional divergence if a planned redirect-based flow is queued).

## No-Finding Notes

- (none — every assigned file produced at least one finding)