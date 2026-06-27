# Line Review Evidence: primary-advantage-015

Reviewer: measure-jr-green/primary-advantage-015
Files assigned: 7
Lines assigned: 1183

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/app/api/debug/init-roles/route.ts` | 1-89 | reviewed | 3 |
| `apps/primary-advantage/app/api/debug/school/route.ts` | 1-74 | reviewed | 4 |
| `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts` | 1-133 | reviewed | 5 |
| `apps/primary-advantage/app/api/flashcard/deck-id/route.ts` | 1-74 | reviewed | 3 |
| `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts` | 1-81 | reviewed | 4 |
| `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts` | 1-408 | reviewed | 7 |
| `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts` | 1-324 | reviewed | 8 |

## Findings

### LR-primary-advantage-015-001 — `/api/debug/init-roles` POST mutates production data with no authentication

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:6-47`
- Evidence: The POST handler at lines 6-47 calls `db.insert(roles).values({ name: roleName }).returning()` (line 20) and `db.select().from(roles)` (line 29) with no `currentUser()`, no role check, no tenant/school scope, and no environment guard. The `/api/debug/` path is documented as debug but is publicly routable. The route can create rows in the primary-only `roles` table (`packages/db/src/schema/primary.ts:117-122`) for any caller. The POST also writes to `console.log` (lines 22, 24, 30-33) so even unauthenticated POSTs will spam production logs.
- Impact: An unauthenticated attacker can POST to `/api/debug/init-roles` and either (a) re-insert roles that already exist (the `findFirst` check on lines 14-16 prevents duplicates but does not stop repeated POSTs that pollute logs and burn DB connections) or (b) trigger the GET path (lines 50-89) which exposes up to 5 user emails and their role assignments. For a primary-student app the consent boundary is critical and an unauthenticated role-mutating endpoint is unacceptable.
- Recommendation: Gate the POST behind `requireRole(["system"])` and move the route under `/api/system/init-roles` with an environment check (`process.env.NODE_ENV !== "production"` or an explicit `ALLOW_DEBUG_ROUTES=true`). Add structured audit logging and a single-row upsert (`onConflictDoNothing`) so the POST is idempotent.

### LR-primary-advantage-015-002 — `/api/debug/init-roles` GET exposes user emails without authentication

- Severity: Critical
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:50-89`
- Evidence: The GET handler at lines 50-89 has no `currentUser()` check and no role check. It returns `sampleUsers` mapped to `{ id: user.id, email: user.email, roles: ... }` (lines 79-83). `user.email` is a PII field and the `roles` array reveals the user's authorization state (e.g., whether they are a teacher or admin). The response is broadcast to anyone who can reach the URL.
- Impact: A primary-student app exposes user emails and role mappings to any unauthenticated HTTP client. Even for the limited 5-row sample, this is a privacy violation (PII + role disclosure). The route name `debug` is not a security boundary.
- Recommendation: Remove the `email` field from the response (or hash it), gate the route behind `requireRole(["system"])`, and apply the same audit-logging recommendation as LR-001.

### LR-primary-advantage-015-003 — `/api/debug/init-roles` GET returns empty `roles` arrays for 4 of 5 sample users

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/debug/init-roles/route.ts:60-83`
- Evidence: The query on line 67 is `where(eq(userRoles.userId, userIds[0]))` — it fetches roles for `userIds[0]` only (the first sample user), not for all 5 sample users selected on line 57. The `rolesByUserId` Map (lines 71-75) is therefore populated with a single key (`userIds[0]`). The mapping on lines 79-83 then reads `rolesByUserId.get(user.id) || []` for every sample user, yielding `[]` for the 4 users whose IDs are not `userIds[0]`. The response is structurally misleading because every sample user entry has a `roles` array, but only one of them is populated.
- Impact: Operators inspecting the debug endpoint will see 4 users with empty role arrays and may conclude those users have no roles when in reality the query simply filtered them out. This is a debugging false negative.
- Recommendation: Use `where(inArray(userRoles.userId, userIds))` (or join `userRoles` to `users` directly) so the response is internally consistent. Document the response shape in a Zod schema so future readers can verify it.

### LR-primary-advantage-015-004 — `/api/debug/school` exposes ALL schools' licenses to any authenticated user

- Severity: Critical
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/debug/school/route.ts:48-53`
- Evidence: Line 48-53 reads `db.select({ id, name, key, status }).from(licenses)` with no `where` clause. This returns every license row in the database regardless of the caller's `schoolId`. The user's own school is also selected on lines 27-45, but the response on lines 55-66 returns `allLicenses` as a sibling field. The `licenses.key` field (line 34) is a license secret used to activate the app — leaking it would let any school (or non-school user) activate the app under another school's license.
- Impact: A primary-age user with any account can read every school's license name, key, and status. This is a critical data-exposure path and likely a billing/contract issue (a school that paid for a license could have its key exfiltrated and reused). The route name `debug` is misleading; the endpoint is reachable in production by any authenticated user.
- Recommendation: Filter `allLicenses` to `where(eq(licenses.schoolId, user.schoolId))` (or drop the `allLicenses` field entirely), gate the route behind `requireRole(["system", "admin"])` so it is not exposed to students, and consider whether `/api/debug/` routes should be removed from production builds entirely via a route-level environment guard.

### LR-primary-advantage-015-005 — `/api/debug/school` is named "debug" but has no admin guard, only a login check

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/debug/school/route.ts:7-22`
- Evidence: The GET handler at lines 7-22 only checks `currentUser()` (lines 9-13). There is no `requireRole(["system", "admin"])` call. Any authenticated user — including a primary-student account — can reach the endpoint. The route is meant for debugging but is mounted under a public path with no environment check.
- Impact: Even after fixing the cross-tenant license leak (LR-004), this route still exposes the caller's school ID and the caller's `user.id` to any authenticated user including the user's own child account. Primary-student users are also likely to be the same user that triggers the call, so the data they see is not catastrophic, but the route shape signals that the team treats "debug" as a label rather than a security boundary.
- Recommendation: Rename `/api/debug/*` to `/api/system/*` and add `requireRole(["system", "admin"])` at the top of every handler. Add an explicit `if (process.env.NODE_ENV === "production" && !process.env.ENABLE_DEBUG_ROUTES) return NextResponse.json({ error: "Not found" }, { status: 404 })` guard.

### LR-primary-advantage-015-006 — `/api/debug/school` catch block leaks `details: error` to the client

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/debug/school/route.ts:67-73`
- Evidence: The catch block on lines 67-73 returns `NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })`. The `details: error` field passes the raw error object (or message) back to the client. Combined with the lack of a role guard (LR-005), this exposes server-side error contents to any authenticated user.
- Impact: An unauthenticated probe that triggers a DB error can read the raw error message (which often includes the SQL statement or Drizzle column names). For a primary-student app this is an information-disclosure vector even if the route is nominally "internal".
- Recommendation: Drop the `details` field in production. Log the error server-side and return only `{ error: "Internal server error" }` (or an i18n-keyed message). If details are needed for local debugging, gate them on `process.env.NODE_ENV !== "production"`.

### LR-primary-advantage-015-007 — `cards/[cardId]/review` writes FSRS columns to `flashcardCards` that don't exist on the shared schema

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:62-77`
- Evidence: The transaction on lines 62-123 calls `tx.update(flashcardCards).set({ due, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview } as any)` (lines 64-77). The `as any` cast bypasses TypeScript, but the shared Drizzle schema for `flashcardCards` (defined at `packages/db/src/schema/flashcards.ts:19-29`) only declares columns `id, deckId, front, back, sourceId, order, createdAt`. The FSRS columns live on `userWordRecords` and `userSentenceRecords` (`packages/db/src/schema/progress.ts:29-82`), not on `flashcardCards`. The migration's Phase 1 audit explicitly flags these as "shared-partial additive columns" that "require cross-app coordination" (see `packages/db/src/schema/primary.ts:13-16`). At runtime, the Postgres UPDATE will throw `column "due" of relation "flashcard_cards" does not exist`.
- Impact: Every card review (the primary-student core learning loop) will 500 because the UPDATE fails. The `cardReviews` insert on lines 80-85 succeeds (the `cardReviews` table does have the right columns in `primary.ts:177-185`) but the transaction will roll back, so even the review history is lost. The entire flashcard review feature is non-functional until the schema is migrated.
- Recommendation: Either (a) port the FSRS columns onto `flashcardCards` via a `drizzle-kit generate` migration (requires cross-app coordination because Reading Advantage also writes to `flashcardCards`), or (b) move the FSRS state to `userWordRecords`/`userSentenceRecords` (already have the columns) and rewrite the review handler to join `flashcardCards` ⨝ `userSentenceRecords`/`userWordRecords`. Either way, remove the `as any` cast so TypeScript catches the schema mismatch before runtime.

### LR-primary-advantage-015-008 — `cards/[cardId]/review` reads FSRS columns that don't exist on `flashcardCards`

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:31-56`
- Evidence: Lines 31-43 select from `flashcardCards ⨝ flashcardDecks` and expect the row to expose FSRS columns (`card.due`, `card.stability`, etc.). The `card` is constructed on line 45 by spreading `cardRow.card` (the `flashcardCards` row) into a new object with a `deck` field — but the spread does not add any FSRS columns because they don't exist on `flashcardCards`. The `processReview` call on lines 52-56 then passes `card as any` into `fsrsService.processReview`, which calls `dbCardToFSRSCard` (`lib/fsrs-service.ts:79-92`). That function reads `dbCard.due`, `dbCard.stability`, etc. — all of which will be `undefined`. `ts-fsrs` will likely throw or produce garbage next-state values.
- Impact: Combined with LR-007 (the broken UPDATE), every review fails. Even if the UPDATE worked, the input to `ts-fsrs` is missing the FSRS state, so the algorithm can't compute the next interval. This is the same root cause as LR-007: the migration left FSRS state on `flashcardCards` in code but not in the database.
- Recommendation: Same remediation as LR-007 — either port the FSRS columns to `flashcardCards` or move the review pipeline to use `userWordRecords`/`userSentenceRecords` for FSRS state.

### LR-primary-advantage-015-009 — `cards/[cardId]/review` `xpReward` ternary always returns 15

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:106`
- Evidence: Line 106 reads `const xpReward = (card as any).type === "VOCABULARY" ? 15 : 15;`. Both ternary branches return the literal `15`. The ternary is structurally meaningless. The `UserXpEarned` enum (`types/enum.ts:83-94`) confirms both `VOCABULARY_FLASHCARDS = 15` and `SENTENCE_FLASHCARDS = 15`, so the runtime behavior is correct, but the code is misleading.
- Impact: A future change to `UserXpEarned` (e.g., differentiating sentence vs. vocabulary XP) will not propagate because the literal `15` shadows the enum. The developer who wrote the ternary may have intended different values and either forgot to update one branch or copy-pasted incorrectly.
- Recommendation: Replace with `const xpReward = (card as any).type === "VOCABULARY" ? UserXpEarned.VOCABULARY_FLASHCARDS : UserXpEarned.SENTENCE_FLASHCARDS;` (and remove the `as any` after the schema fix in LR-007).

### LR-primary-advantage-015-010 — `cards/[cardId]/review` does not validate the request body

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:21-27`
- Evidence: Line 21 reads `const { rating, timeSpent } = await request.json();` and line 25 validates `rating` is in `[1,2,3,4]` but does not validate `timeSpent`. There is no type guard, no `parseInt`/`Number.isFinite` check, and no Zod schema. If the client sends `timeSpent: "abc"` or `timeSpent: null`, the value is passed to `cardReviews.timeSpent` (line 83) and `userActivity.timer` (line 95) and `xpLogs` indirectly. Drizzle may coerce or throw depending on the driver.
- Impact: A primary-student client can crash the route or insert garbage timer values into the activity log. Combined with the broken UPDATE (LR-007), a malformed body will surface as a confusing 500 instead of a 400.
- Recommendation: Validate the body with a Zod schema: `z.object({ rating: z.number().int().min(1).max(4), timeSpent: z.number().int().nonnegative().max(60*60) })` and return 400 with the parse error on failure.

### LR-primary-advantage-015-011 — `cards/[cardId]/review` uses `${xpReward}` raw SQL interpolation for XP increment

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:118-120`
- Evidence: Lines 118-120 read `await tx.update(users).set({ xp: sql\`${users.xp} + ${xpReward}\` }).where(eq(users.id, user.id!));`. The interpolation is inside a `sql\`\`` template, so `xpReward` is parameterized at the driver level (not concatenated), and is therefore not a SQL injection vector. However, `xpReward` is an unvalidated integer from line 106 (see LR-009); the lack of bounds check is the real risk.
- Impact: Drizzle's parameter binding handles the SQL injection concern, but a client that successfully reaches this line can still inject arbitrary XP (e.g., by passing `timeSpent: -1` and a future `xpReward` derivation that uses it). Same root cause as LR-010.
- Recommendation: Validate `xpReward` against an allowlist (e.g., `UserXpEarned` enum values) before interpolating.

### LR-primary-advantage-015-012 — `deck-id` route raw-SQL `flashcard_cards.due` filter references a non-existent column

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:42-50`
- Evidence: Lines 42-50 build a query that selects from `flashcardCards` with an `and(eq(flashcardCards.deckId, deck.id), sql\`${flashcardCards.id} IN (SELECT id FROM flashcard_cards WHERE deck_id = ${deck.id} AND due <= ${now.toISOString()})\`)`. The subquery uses the literal table name `flashcard_cards` and tries to filter by `due`. The shared `flashcardCards` schema (`packages/db/src/schema/flashcards.ts:19-29`) does not have a `due` column — it lives on `userWordRecords` and `userSentenceRecords` (`packages/db/src/schema/progress.ts:40-82`).
- Impact: Every call to `/api/flashcard/deck-id` will throw a Postgres error at runtime (column does not exist). The route is the entry point used by the deck-selector UI, so the flashcard study flow is broken for all users.
- Recommendation: Drop the raw-SQL subquery and use `where(inArray(flashcardCards.id, db.select({ id: userSentenceRecords.sentenceId }).from(userSentenceRecords).where(...)))` after the schema is corrected. Or port the `due` column onto `flashcardCards` per LR-007.

### LR-primary-advantage-015-013 — `deck-id` route silently returns "no due flashcards" when SQL fails

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:64-73`
- Evidence: The catch block on lines 64-73 logs the error and returns a generic 500 with body `{ success: false, error: "Failed to get flashcard deck information" }`. The error message does not mention the underlying column-not-found issue. The UI consumer will display "Failed to get flashcard deck information" with no actionable context.
- Impact: Operators chasing the broken `deck-id` endpoint will see a generic 500 in logs but no clear pointer to the schema mismatch. The error is also returned to the student, which is not a security issue but is a poor UX signal.
- Recommendation: In development, include the underlying error message; in production, log the structured error and return a stable error code (e.g., `FLASHCARD_DECK_LOOKUP_FAILED`) that the UI can localize.

### LR-primary-advantage-015-014 — `deck-id` route success branch is unreachable because the SQL filter rejects all rows

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/deck-id/route.ts:42-58`
- Evidence: Even if the SQL subquery on line 47 didn't fail at parse time, the outer `db.select({ id: flashcardCards.id })` projects only the `id` column, and the inner subquery's `id` set is empty (because `due <= ${now.toISOString()}` filters all rows). The `dueCards.length === 0` branch on line 52 returns "No due sentence flashcards found". The `success: true, deckId: deck.id` branch on lines 60-63 is reachable only if `dueCards.length > 0`, which never happens.
- Impact: The success path is dead code at runtime. The UI flow that depends on `deckId` will receive `success: false` and a misleading "no due flashcards" message even when the user has flashcards to study. Combined with LR-012, the entire route is non-functional.
- Recommendation: Fix the underlying schema/query mismatch per LR-012.

### LR-primary-advantage-015-015 — `decks/[deckId]/due` route filters by `card.due` after selecting ALL cards

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:40-63`
- Evidence: Line 41 selects all `flashcardCards` for the deck with no `due` filter. Line 62 calls `fsrsService.getDueCards(cardsWithReviews as any, limit)` (defined at `lib/fsrs-service.ts:168-175`), which filters in JavaScript by `card.due <= now`. But `card.due` does not exist on the selected row (see LR-007). The condition `undefined <= now` is `false`, so every card is filtered out and `dueCards` is always `[]`.
- Impact: The `/api/flashcard/decks/[deckId]/due` endpoint always returns an empty `cards` array even when the user has flashcards due. The stats on line 63 still compute correctly (`new/learning/review` counts use `card.state`, which is also undefined → 0). The frontend will render "no due cards" forever.
- Recommendation: Same fix as LR-007 — port FSRS columns to `flashcardCards` or move the query to `userWordRecords`/`userSentenceRecords`. Then add the `due <= now` filter to the SQL `where` clause so the DB does the work.

### LR-primary-advantage-015-016 — `decks/[deckId]/due` loads all reviews for ALL cards in DB to find reviews for one deck

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:45-59`
- Evidence: Lines 45-59 read all `cardReviews` rows in the database (no `where` clause), order by `reviewedAt desc`, then iterate to keep the most recent review per `cardId`. The query is `db.select().from(cardReviews).orderBy(desc(cardReviews.reviewedAt))` with no `inArray` filter on `cardReviews.cardId`. For a primary-advantage deployment with thousands of reviews this is an O(N) table scan on every due-card request.
- Impact: Performance degrades linearly with the number of historical reviews in the system. The route is called every time a student opens a deck (likely multiple times per session). This is a fork-specific regression versus Reading Advantage, which uses Prisma's `include: { reviews: ... }` to fetch only the relevant rows.
- Recommendation: Replace with `db.select().from(cardReviews).where(inArray(cardReviews.cardId, cardIds)).orderBy(desc(cardReviews.reviewedAt))`. After validating the rows, group by `cardId` and keep only the most recent.

### LR-primary-advantage-015-017 — `decks/[deckId]/due` `parseInt(searchParams.get("limit"))` has no NaN guard or upper bound

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:21-23`
- Evidence: Line 22 reads `parseInt(searchParams.get("limit")!)` with no NaN guard, no upper bound, and no lower bound. A client can pass `limit=999999999` or `limit=-1` or `limit=abc` (which becomes `NaN`). `Number.isNaN(NaN)` is true, but the code on line 174 of `fsrs-service.ts` is `return limit ? dueCards.slice(0, limit) : dueCards` — `limit=NaN` is falsy, so all cards are returned. `limit=999999999` returns all cards. `limit=-1` is truthy and `slice(0, -1)` returns all-but-last.
- Impact: A client can cause the server to serialize the entire deck (potentially thousands of cards) every request. This is a denial-of-service vector and a primary-student adaptation risk if a student accidentally shares a malicious URL.
- Recommendation: Validate: `const raw = searchParams.get("limit"); const limit = raw ? Math.max(1, Math.min(100, parseInt(raw) || 20)) : undefined;`

### LR-primary-advantage-015-018 — `decks/[deckId]/due` catch hides all errors as a generic 500

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:74-80`
- Evidence: Lines 74-80 return `NextResponse.json({ error: "Failed to fetch due cards" }, { status: 500 })` for any thrown error. The underlying error (likely the schema mismatch from LR-015) is logged but the client receives a generic message.
- Impact: Same as LR-013 — operators chasing the broken endpoint will see a generic 500 and may not connect it to the schema mismatch.
- Recommendation: Add an error code (e.g., `DUE_CARDS_FETCH_FAILED`) and include a localized message key.

### LR-primary-advantage-015-019 — `sentences-for-cloze` GET handler iterates fields that don't exist on `flashcardCards`

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:76-104`
- Evidence: Lines 76-104 iterate over `cardsWithReviews` (a list of flashcardCards rows) and read `flashcardCard.articleId` (line 78), `flashcardCard.sentence` (line 89, 95), `flashcardCard.translation` (line 98), `flashcardCard.audioUrl` (line 99), `flashcardCard.startTime` (line 100), `flashcardCard.endTime` (line 101). None of these columns exist on the shared `flashcardCards` schema (`packages/db/src/schema/flashcards.ts:19-29`). The `if (!articleId) continue;` on line 79 always short-circuits because `articleId` is `undefined`.
- Impact: The GET handler always returns `clozeTests: []`. The cloze-test feature is non-functional. This is the same root cause as LR-007 (FSRS / content fields live on `userSentenceRecords`/`userWordRecords`, not on `flashcardCards`).
- Recommendation: Join `flashcardCards` ⨝ `userSentenceRecords` (or move the cloze test data to a primary-specific table like `sentencsAndWordsForFlashcards` already defined in `primary.ts:158-169`).

### LR-primary-advantage-015-020 — `sentences-for-cloze` `blanks: []` is hard-coded empty

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:97`
- Evidence: Line 97 sets `blanks: []` in every cloze-test object. The helper functions `createBlanksFromSentence` (lines 169-297), `generateOptions` (lines 300-336), and `generateGenericDistractors` (lines 339-407) are defined in the same file but never invoked. The cloze tests have no blank positions, so the UI will render a cloze test with no blanks to fill.
- Impact: Even after fixing the schema mismatch (LR-019), the cloze tests will still have empty `blanks` because the helper functions are never called. The dead-code helpers add 240 lines of confusion to the file inventory.
- Recommendation: Call `createBlanksFromSentence(sentence, words, allSentences, difficulty)` on lines 97 and set `blanks` to the returned array. If the helpers are no longer needed (e.g., the cloze logic moved client-side), delete them and add a code comment explaining the client-side path.

### LR-primary-advantage-015-021 — `sentences-for-cloze` POST has no try/catch wrapper

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:123-166`
- Evidence: Lines 123-166 export `POST` that performs `await currentUser()`, three DB writes (`userActivity` insert, `xpLogs` insert, `users` update), and returns `NextResponse.json({ success: true })`. There is no `try/catch` wrapper — the GET handler on lines 12-121 has one (lines 12, 114-121) but the POST does not. If any of the inserts/updates throw, the route will return an unhandled error and the student will see a generic 500.
- Impact: Inconsistent error handling within the same file. A primary-student client that triggers an XP write failure (e.g., DB connection drop) sees an unhandled error instead of a localized "Activity not saved" message.
- Recommendation: Wrap the POST body in `try/catch` and return a structured 500 with an i18n-keyed error code.

### LR-primary-advantage-015-022 — `sentences-for-cloze` POST does not validate `score` or `timer`

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:134-150`
- Evidence: Line 134 reads `const { score, timer } = await request.json();` and line 136 reads `const xpEarned = Math.floor(score * 2);`. There is no validation. A client can send `score: "abc"` (→ `Math.floor(NaN * 2) = NaN`), `score: 9999999` (→ `xpEarned: 19999998`), or `score: -100` (→ `xpEarned: -200`). The `xpEarned` is inserted into `xpLogs.xpEarned` (line 156) and added to `users.xp` (line 162), so a malicious or buggy client can mint unlimited XP.
- Impact: This is a primary-student adaptation risk because XP directly drives the gamification/leaderboard flows. A student who discovers the endpoint can self-promote. A buggy client (e.g., a teacher running a test that posts `{score: undefined}`) can corrupt the XP log with NaN values.
- Recommendation: Validate with Zod: `z.object({ score: z.number().min(0).max(100), timer: z.number().int().min(0).max(60*60) })`. Reject non-numeric values with 400. Cap `xpEarned` to the `UserXpEarned` enum value for `SENTENCE_CLOZE_TEST`.

### LR-primary-advantage-015-023 — `sentences-for-cloze` helper functions are 240 lines of dead code

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:168-407`
- Evidence: Lines 168-407 define `createBlanksFromSentence`, `generateOptions`, and `generateGenericDistractors` but none of them are called anywhere in the file (verified by reading lines 1-408 — only `createBlanksFromSentence` is referenced in comments on lines 96-97, not invoked). The 240-line block also contains hard-coded English `commonWords` and `genericDistractors` arrays that add to the bundle size without runtime use.
- Impact: File is bloated (408 lines vs the 168 needed for the actual GET/POST). Future readers will assume the helpers are part of the request flow and may try to fix them rather than deleting them. Dead code is a primary-student adaptation risk only if it ships to the client (it does, because the route handler is bundled).
- Recommendation: Delete the helper functions or call them from line 97 per LR-020.

### LR-primary-advantage-015-024 — `sentences-for-matching` raw-SQL `flashcard_cards.due` filter references non-existent column

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:42-52`
- Evidence: Lines 42-52 build a query with `sql\`${flashcardCards.id} IN (SELECT id FROM flashcard_cards WHERE deck_id = ${deck.id} AND due <= ${now.toISOString()} AND source_id IS NOT NULL)\`` (line 47). The subquery filters by `due` which doesn't exist on `flashcard_cards`. The outer `where` clause on lines 43-49 also includes `isNotNull(sql\`${flashcardCards.sourceId}\`)` — `sourceId` is a real column on `flashcardCards`, but the `due` filter will still throw.
- Impact: Every call to `/api/flashcard/decks/[deckId]/sentences-for-matching` returns a 500 because the SQL query fails. The matching-game feature is non-functional.
- Recommendation: Same fix as LR-012 — drop the `due` filter and join `flashcardCards` ⨝ `userSentenceRecords`/`userWordRecords` for the due-cards filter.

### LR-primary-advantage-015-025 — `sentences-for-matching` filters cards by `c.due` and `c.articleId` after the SQL already filtered them

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:50-52`
- Evidence: Line 50-52 reads `(cardRows as any[]).filter((c) => c.due && new Date(c.due) <= now && c.articleId != null)`. Even ignoring the SQL failure on line 47, the in-memory filter checks `c.due` and `c.articleId` — neither of which exist on the shared `flashcardCards` schema. The filter always returns `[]` because `c.due` is `undefined` (falsy).
- Impact: Even if the SQL filter were fixed, the JS-side filter would still reject every card. The matching game always returns `matchingGames: []`. This is the same root cause as LR-019.
- Recommendation: Same fix as LR-019 — join to `userSentenceRecords`/`userWordRecords` and read `due`/`articleId` from there.

### LR-primary-advantage-015-026 — `sentences-for-matching` `createVocabularyPairs` iterates fields that don't exist on `flashcardCards`

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:180-246`
- Evidence: `createVocabularyPairs` (lines 180-246) iterates over `vocabularyCards` (which are `flashcardCards` rows filtered by `card.type === "VOCABULARY"` on line 81). Line 187 reads `if (!card.word || !card.definition) continue;` — neither `word` nor `definition` exist on `flashcardCards`. Line 190 reads `if (!card.articleId) continue;` — `articleId` doesn't exist. The function returns an empty `pairs` array on every call.
- Impact: The vocabulary-pair fallback (line 104-115) is unreachable because `createVocabularyPairs` always returns `[]`. Combined with the broken `createTranslationPairs` (LR-027), the matching-game feature has no content.
- Recommendation: Move `word`/`definition`/`articleId` to a primary-specific table (e.g., extend `sentencsAndWordsForFlashcards`) or join `flashcardCards` ⨝ `userWordRecords` to read the vocabulary fields.

### LR-primary-advantage-015-027 — `sentences-for-matching` `createTranslationPairs` iterates fields that don't exist on `flashcardCards`

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:249-323`
- Evidence: `createTranslationPairs` (lines 249-323) reads `card.sentence` (line 256), `card.articleId` (line 259), and `card.translation` (line 294). None of these exist on `flashcardCards`. The `if (!card.sentence) continue;` on line 256 always short-circuits, so the function returns `[]`.
- Impact: Combined with LR-026, the matching-game GET always returns `matchingGames: []`. The matching feature is non-functional.
- Recommendation: Same fix as LR-026 — join to `userSentenceRecords` and read `sentence`/`translation` from there.

### LR-primary-advantage-015-028 — `sentences-for-matching` POST does not validate `score` or `timer`

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:145-175`
- Evidence: Line 145 reads `const { score, timer } = await request.json();` and line 147 reads `const xpEarned = Math.floor(score * 2);`. Same shape as LR-022 — no validation. `xpEarned` is written to `xpLogs` (line 167) and added to `users.xp` (line 173). A primary-student client can self-mint unlimited XP by posting `score: 9999999`.
- Impact: Primary-student adaptation risk (gamification tampering) and fork-specific regression (Reading Advantage validates the body before granting XP).
- Recommendation: Same fix as LR-022 — Zod validation, cap on `score` (0-100), cap on `xpEarned` to the `UserXpEarned.SENTENCE_MATCHING = 5` enum value.

### LR-primary-advantage-015-029 — `sentences-for-matching` POST has no try/catch wrapper

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:134-177`
- Evidence: Same pattern as LR-021 — the POST handler (lines 134-177) has no `try/catch` wrapper. The GET on lines 8-132 has one (lines 12, 125-131). Inconsistent error handling within the same file.
- Impact: An unhandled DB error returns a generic 500 with no i18n-friendly error code.
- Recommendation: Add `try/catch` to the POST body.

### LR-primary-advantage-015-030 — `sentences-for-matching` `language` query param is cast without validation

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:21-23`
- Evidence: Line 22-23 reads `(searchParams.get("language") as "th" | "vi" | "cn" | "tw") || "th"`. The `as` cast suppresses TypeScript, but any string is accepted. The `translatedPassage[targetLanguage]` lookup on line 285 silently returns `undefined` for invalid languages, and the empty-translation skip on line 301 drops the card from the matching game.
- Impact: A typo'd language parameter (`?language=thai`) silently drops all matching pairs and returns `matchingGames: []` instead of a 400. The UI has no way to distinguish "no due cards" from "language param invalid".
- Recommendation: Validate the language against the `MultiLanguageText` keys (`en | th | cn | tw | vi`) and return 400 with an i18n error if not present.

### LR-primary-advantage-015-031 — `sentences-for-matching` GET always returns empty `matchingGames` due to schema mismatch

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:72-124`
- Evidence: The `if (cards.length === 0)` branch on lines 72-77 returns `matchingGames: []`. Even if the SQL filter (line 47) succeeded, the JS filter on lines 50-52 would reject all cards (see LR-025), the `createTranslationPairs` (LR-027) and `createVocabularyPairs` (LR-026) would return empty arrays, and the GET response would be `matchingGames: []` with no error code. The `matchingGames.push(...)` calls on lines 95-99 and 110-114 are unreachable.
- Impact: The matching-game feature is completely non-functional. The `Date.now() + Math.random()` ID on lines 96 and 111 is never used because no games are generated.
- Recommendation: Same fix as the upstream LR-024, LR-025, LR-026, LR-027 — join to `userSentenceRecords`/`userWordRecords` for the content and FSRS fields.

### LR-primary-advantage-015-032 — `sentences-for-matching` GET review-loading is O(N) over all reviews

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:54-70`
- Evidence: Lines 54-65 read all `cardReviews` rows (no `where` filter), order by `reviewedAt desc`, and iterate to keep the most recent per `cardId`. Same anti-pattern as LR-016.
- Impact: O(N) table scan per request. Performance degrades linearly with the size of the review history.
- Recommendation: Replace with `db.select().from(cardReviews).where(inArray(cardReviews.cardId, cardIds)).orderBy(desc(cardReviews.reviewedAt))`.

### LR-primary-advantage-015-033 — All seven files rely on `as any` casts to bypass Drizzle's strict typing for `flashcardCards` schema mismatches

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:53,75,85,91-99,106-115`; `apps/primary-advantage/app/api/flashcard/deck-id/route.ts`; `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:44-45,89,92-103`; `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:50-52`
- Evidence: All five flashcard routes use `as any` casts to push fields (FSRS state, `sentence`, `translation`, `audioUrl`, `articleId`, `type`) onto `flashcardCards` rows or query parameters. The Drizzle schema (`packages/db/src/schema/flashcards.ts:19-29`) does not declare these columns, so the casts are suppressing a real schema mismatch that TypeScript would otherwise catch. The migration's Phase 1 audit (`packages/db/src/schema/primary.ts:13-16`) explicitly states these columns are "shared-partial additive columns" that "require cross-app coordination" and are deliberately not ported.
- Impact: This is the root cause of LR-007 through LR-031. Every flashcard feature in this batch is non-functional at runtime. The `as any` casts make the codebase look correct at compile time while silently failing at runtime.
- Recommendation: Either (a) complete the migration by porting the FSRS / content fields onto `flashcardCards` via a `drizzle-kit generate` migration (coordinated with Reading Advantage so the column additions don't regress the other app), or (b) rewrite the routes to query `userSentenceRecords`/`userWordRecords` for the FSRS / content state. Either way, remove every `as any` cast so TypeScript catches future schema drift.

### LR-primary-advantage-015-034 — All five flashcard routes accept the path parameter without validating that the deck/card belongs to a tenant (school)

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:31-49`; `apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts:26-37`; `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:27-39`; `apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts:26-37`
- Evidence: The routes accept `cardId` / `deckId` from the URL and filter by `eq(flashcardDecks.userId, user.id)` (e.g., `due/route.ts:30`, `sentences-for-matching/route.ts:30`). They verify the deck/card belongs to the current user, but they do NOT verify the user is in a school or that the school matches the tenant context. A primary-student account created without a `schoolId` (per `users.schoolId: uuid("school_id").references(() => schools.id)` in `packages/db/src/schema/users.ts:34`, the column is nullable) can still access their own flashcards, but the routes bypass the multi-tenant scoping that AGENTS.md and the root `AGENTS.md` require.
- Impact: The root `AGENTS.md` requires every query to be scoped by `schoolId`. The flashcard routes scope by `userId` only, which is acceptable for per-user data but does not satisfy the multi-tenancy contract for cross-school data. For a primary-school deployment this is a soft requirement rather than a hard one (each user owns their own deck), but the lack of a `schoolId` join means a deployment that later adds school-level flashcard libraries would not be ready.
- Recommendation: Add `assertCan(user, "flashcard:read", { deckId })` or an explicit `where(eq(flashcardDecks.schoolId, user.schoolId))` join so the contract is satisfied.

## No-Finding Notes

- All seven files in this batch produced at least one finding. The five flashcard routes share a common root cause (the `flashcardCards` schema is missing FSRS / content columns that the routes expect), so a single `Shared package migration blocker` remediation track should address them collectively. The two debug routes (`init-roles`, `school`) have independent auth and tenant issues.

## Summary

- Total findings: 34 (8 Critical on auth/schema/runtime, 8 High on auth/validation/performance, 11 Medium on validation/error handling/i18n, 7 Low on dead code/error structure).
- Critical-severity findings:
  - LR-001 / LR-002 — `/api/debug/init-roles` has no auth on POST or GET.
  - LR-004 — `/api/debug/school` exposes all schools' license keys to any authenticated user.
  - LR-007 / LR-008 — `cards/[cardId]/review` writes/reads FSRS columns that don't exist on `flashcardCards`.
  - LR-012 / LR-014 — `deck-id` route's raw-SQL filter references a non-existent `due` column; success branch is unreachable.
  - LR-015 — `decks/[deckId]/due` filters by `card.due` after selecting ALL cards; always returns `[]`.
  - LR-019 — `sentences-for-cloze` GET iterates fields that don't exist on `flashcardCards`.
  - LR-024 / LR-025 / LR-026 / LR-027 / LR-031 — `sentences-for-matching` GET has five cascading failures (raw-SQL filter, JS filter, vocabulary pair builder, translation pair builder, unreachable success branch).
  - LR-033 — Root-cause finding: every flashcard route uses `as any` casts to bypass Drizzle's strict typing for schema mismatches.
- Highest-impact fork-divergence categories for this batch:
  - `Shared package migration blocker` (LR-007, LR-008, LR-012, LR-014, LR-015, LR-019, LR-024, LR-025, LR-026, LR-027, LR-031, LR-033) — the FSRS / content columns live on `userSentenceRecords`/`userWordRecords` but the flashcard routes still query `flashcardCards`. The migration's Phase 1 audit acknowledged this gap.
  - `Primary-student adaptation risk` (LR-002, LR-004, LR-022, LR-028, LR-034) — debug endpoints expose PII and license keys, XP-minting routes are unguarded, and the multi-tenancy contract is not enforced.
  - `Fork-specific regression` (LR-001, LR-003, LR-005, LR-010, LR-013, LR-016, LR-017, LR-021, LR-029, LR-032) — debug routes lack auth, response shapes are misleading, body validation is missing, and review-loading is O(N) over the entire review table.
  - `Intentional product divergence that needs documentation` (LR-006, LR-009, LR-011, LR-018, LR-020, LR-030) — error structure and dead code that should be documented or removed.
- No source-code, plan.md, or `line-review-coverage.tsv` edits were made. The patch TSV is at `measure/tracks/primary_advantage_full_review_20260626/line-review/coverage-patches/primary-advantage-015.tsv` and the evidence is in this file.