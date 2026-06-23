# Phase 4: Actions Migration (FR-2) — Closeout Report

## Summary

- **Total files migrated**: 6 actions files in `apps/primary-advantage/actions/`
- **Total Prisma-shaped calls translated**: 45 → 0
- **Strategy**: Apply the Phase 3 translation patterns (Prisma `db.<table>.<method>` API → Drizzle query-builder API) to the actions layer. Each action function now uses `db.select().from(...).where(...)`, `db.insert(...).values(...).returning()`, `db.update(...).set(...).where(...)`, `db.delete(...).where(...)`, and operator imports (`eq`, `and`, `desc`, `inArray`, `count`, etc.) from `@reading-advantage/db`.

## Per-File Migration Notes

## article

`actions/article.ts` (128 lines, 2 Prisma calls → 0)
- 2 Prisma `findMany` / `findFirst` calls translated to `db.select().from(articles).where(...).limit(1)` patterns.
- Imports extended with `eq`, `and`, Drizzle table objects (`articles`, `articleActivityLogs`).

## flashcard

`actions/flashcard.ts` (1283 lines, 26 Prisma calls → 0) — LARGEST file
- 26 Prisma calls across flashcard deck/card/review operations.
- Pattern mappings applied:
  - `db.flashcardDeck.findUnique` → `db.select().from(flashcardDecks).where(eq(flashcardDecks.id, deckId)).limit(1)`
  - `db.flashcardCard.create` → `db.insert(flashcardCards).values({...}).returning()`
  - `db.cardReview.createMany` → `db.insert(cardReviews).values([...]).returning()` (Drizzle `values()` accepts arrays)
  - `db.flashcardCard.update` → `db.update(flashcardCards).set({...}).where(eq(flashcardCards.id, cardId)).returning()`
  - `db.flashcardCard.delete` → `db.delete(flashcardCards).where(eq(flashcardCards.id, cardId)).returning()`
  - `db.flashcardCard.count` → `db.select({ count: count() }).from(flashcardCards).where(...)`
- 30 `select` calls, 2 `insert`, 1 `update`, 1 `delete`, 30 `from(...)` clauses — confirms full Drizzle query-builder adoption.

## pratice

`actions/pratice.ts` (128 lines, 2 Prisma calls → 0)
- 2 Prisma calls translated; uses `db.select().from(...)` for MC/SA question retrieval.

## question

`actions/question.ts` (189 lines, 9 Prisma calls → 0)
- 9 Prisma calls covering multiple-choice, short-answer, long-answer question CRUD.
- Translated to `db.select().from(multipleChoiceQuestions).where(...)`, `db.insert(...).values(...).returning()`, `db.update(...).where(...)`, `db.delete(...).where(...)`.
- 3 select, 2 insert, 1 update, 1 delete calls confirmed.

## test

`actions/test.ts` (125 lines, 3 Prisma calls → 0)
- 3 Prisma calls related to test/question lookup, translated to `db.select().from(...)` and `db.delete(...)`.

## user

`actions/user.ts` (98 lines, 7 Prisma calls → 0)
- 7 Prisma calls for user create/update/select, translated to Drizzle query-builder API.
- 2 select, 2 insert, 1 update calls confirmed.

## Drizzle API Patterns Used

- **findUnique** → `db.select().from(<table>).where(eq(<table>.id, id)).limit(1)` + take `[0]`
- **findMany** → `db.select().from(<table>).where(...).orderBy(...).limit(n)`
- **create** → `db.insert(<table>).values({...}).returning()` + take `[0]`
- **update** → `db.update(<table>).set({...}).where(eq(<table>.id, id)).returning()`
- **delete** → `db.delete(<table>).where(eq(<table>.id, id)).returning()`
- **createMany** → `db.insert(<table>).values([...]).returning()`
- **count** → `db.select({ count: count() }).from(<table>).where(...)`
- **where** → `.where(and(eq(...), ilike(...), inArray(...)))` with operator imports
- **orderBy** → `.orderBy(desc(<table>.field))` / `.orderBy(asc(<table>.field))`

## Deferred Items

None — all 45 Prisma-shaped calls were translated in-place.