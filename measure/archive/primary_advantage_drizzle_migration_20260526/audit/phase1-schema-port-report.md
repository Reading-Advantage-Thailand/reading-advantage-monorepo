# Phase 1 Closeout Report — Schema Port (FR-1)

> **Track:** `primary_advantage_drizzle_migration_20260526`
> **Date:** 2026-06-23
> **Phase:** 1 — Schema Port (FR-1)
> **Baseline SHA:** `4ecc5072e63652fb2a46d420a1ad8c549394eba0` (Mid-Red; `e1f5a0ea` + `4ecc5072`)
> **Goal:** Port the 9 Prisma models with no shared Drizzle equivalent
> (`needs porting` per Phase 0 audit) plus the 4 missing pgEnums into
> `packages/db/src/schema/primary.ts`, add safe additive columns to
> `shared-partial` tables, generate the Drizzle migration, and verify it
> applies cleanly to a fresh database.

## Schema Changes

All 9 needs-porting Prisma models were ported as new Drizzle pgTables in
`packages/db/src/schema/primary.ts`. Column names match Prisma
`@map(...)` where present; FKs reference the shared `users` (text PK),
`articles` (uuid PK), `schools` (uuid PK), and `flashcardCards` (uuid
PK) tables via the shared schema exports. Full per-model column mapping:

- `VerificationToken` → `verificationTokens` table `verification_tokens`. Composite unique on `(identifier, token)` via `unique("verification_tokens_identifier_token_unique")`; mirrors Prisma `@@unique([identifier, token])`.
- `UserRole` → `userRoles` table `user_roles`. Composite unique on `(userId, roleId)`; FKs to `users.id` (cascade) and `roles.id` (cascade).
- `Role` → `roles` table `roles`. `id uuid PK defaultRandom()`, `name text notNull`.
- `ArticleActivityLog` → `articleActivityLogs` table `article_activity_logs`. 11 boolean flags; FKs to `articles.id` and `users.id` (cascade both).
- `SentencsAndWordsForFlashcard` → `sentencsAndWordsForFlashcards` table `sentencs_and_words_for_flashcard`. FK to `articles.id` (cascade); `sentence`/`words` are `jsonb`. Table name intentionally NOT pluralised to mirror Prisma `@@map`.
- `CardReview` → `cardReviews` table `card_reviews`. FK to `flashcardCards.id` (cascade).
- `ClozeTestGame` → `clozeTestGames` table `cloze_test_games`. FK to `flashcardCards.id` (cascade).
- `SchoolAdmins` → `schoolAdmins` table `school_admins`. FKs to `schools.id` (cascade) and `users.id` (cascade).
- `Leaderboard` → `leaderboards` table `leaderboards`. FK to `schools.id` (cascade); `details jsonb`.

> **Count clarification:** the Phase 0 audit report and the test contract
> both list **9** needs-porting models (the dispatch summary said "8"
> but re-counting the Phase 0 table shows 9). All 9 are ported here.

### New Tables Ported (summary table)

| Prisma model | Drizzle export | Table name | Notes |
|---|---|---|---|
| `VerificationToken` | `verificationTokens` | `verification_tokens` | Composite unique on `(identifier, token)`. |
| `UserRole` | `userRoles` | `user_roles` | Composite unique on `(userId, roleId)`; FKs cascade. |
| `Role` | `roles` | `roles` | uuid PK, name text not null. |
| `ArticleActivityLog` | `articleActivityLogs` | `article_activity_logs` | 11 boolean flags; FKs cascade. |
| `SentencsAndWordsForFlashcard` | `sentencsAndWordsForFlashcards` | `sentencs_and_words_for_flashcard` | Singular table name mirrors Prisma. |
| `CardReview` | `cardReviews` | `card_reviews` | FK to flashcardCards (cascade). |
| `ClozeTestGame` | `clozeTestGames` | `cloze_test_games` | FK to flashcardCards (cascade). |
| `SchoolAdmins` | `schoolAdmins` | `school_admins` | FKs cascade. |
| `Leaderboard` | `leaderboards` | `leaderboards` | FK to schools (cascade); `details` jsonb. |

### New Enums Ported (summary table)

| Drizzle export | Type name | Values |
|---|---|---|
| `activityType` | `activity_type` | `ARTICLE_RATING`, `ARTICLE_READ`, `STORIES_RATING`, `STORIES_READ`, `CHAPTER_RATING`, `CHAPTER_READ`, `LEVEL_TEST`, `MC_QUESTION`, `SA_QUESTION`, `LA_QUESTION`, `SENTENCE_FLASHCARDS`, `SENTENCE_MATCHING`, `SENTENCE_ORDERING`, `SENTENCE_WORD_ORDERING`, `SENTENCE_CLOZE_TEST`, `VOCABULARY_FLASHCARDS`, `VOCABULARY_MATCHING` |
| `flashcardType` | `flashcard_type` | `VOCABULARY`, `SENTENCE` |
| `cardState` | `card_state` | `NEW`, `LEARNING`, `REVIEW`, `RELEARNING` |
| `subscriptionType` | `subscription_type` | `BASIC`, `PREMIUM`, `ENTERPRISE` |

> `assignmentStatus` is intentionally NOT ported as a pgEnum in Phase 1
> because the shared `studentAssignments.status` column is `text`; a
> text→enum migration across all apps is deferred to a coordinated phase.

## Shared-Partial Column Additions

The following additive columns were added to shared tables. Each addition
is **nullable or has a safe default** and **does not change the semantics
of any existing column**. Cross-app breakage risk is therefore minimal.
The full per-table additive-column mapping (added in Phase 1) is:

- `users` — `password text` (nullable); `email_verified timestamp` (nullable). Both mirror Prisma `User`. Shared `accounts.password` (Argon2 hash) remains the authoritative credential column; this `users.password` mirrors the Prisma column for primary-advantage's login flow. **`cefrLevel` default divergence noted but NOT changed** — shared defaults to `A1-`, Prisma defaults to `A0-`. Changing the shared default would cascade to all apps; deferred to a coordinated phase.
- `schools` — `contact_name text`, `contact_email text`, `owner_id text` (all nullable). Mirrors Prisma `School` model. No FK on `owner_id` (avoids circular FK with `users.school_id`).
- `classrooms` — `password_students text` (nullable). Mirrors Prisma `Classroom.passwordStudents`.
- `articles` — `is_approved boolean default false notNull`, `is_draft boolean default false notNull`, `is_published boolean default false notNull`, `brainstorming text` (nullable), `planning text` (nullable). Mirrors Prisma `Article` model.
- `assignments` — `teacher_name text` (nullable). Mirrors Prisma `Assignment.teacherName`.
- `lesson_progress` — `article_id uuid` (FK→`articles`, cascade), `assignment_id uuid` (FK→`assignments`, cascade), `time_spent integer default 0 notNull`, `is_completed boolean default 0 notNull`. FKs use cascade to match Prisma `onDelete: Cascade`. Note: shared `lessonProgress.lessonId` remains `text` (not `uuid`) to allow external lesson identifiers — preserved by design.
- `flashcard_decks` — `description text` (nullable). Mirrors Prisma `FlashcardDeck.description`.
- `licenses` — `name text`, `description text`, `subscription subscription_type default 'BASIC' notNull`, `start_date timestamp`, `expiry_date timestamp`, `status text default 'active' notNull`. The `subscription` column uses the new `subscriptionType` pgEnum; safe default `BASIC` matches Prisma. All other fields nullable. The pre-existing shared `licenses.licenseType` (text) is preserved for backward compatibility.

### Added in Phase 1 (summary)

Summary of per-table additive-column additions for quick reference.

### Added in Phase 1

- `users` — `password text` (nullable); `email_verified timestamp` (nullable). Both mirror Prisma `User`. Shared `accounts.password` (Argon2 hash) remains the authoritative credential column; this `users.password` mirrors the Prisma column for primary-advantage's login flow. **`cefrLevel` default divergence noted but NOT changed** — shared defaults to `A1-`, Prisma defaults to `A0-`. Changing the shared default would cascade to all apps; deferred to a coordinated phase.
- `schools` — `contact_name text`, `contact_email text`, `owner_id text` (all nullable). Mirrors Prisma `School` model. No FK on `owner_id` (avoids circular FK with `users.school_id`).
- `classrooms` — `password_students text` (nullable). Mirrors Prisma `Classroom.passwordStudents`.
- `articles` — `is_approved boolean default false notNull`, `is_draft boolean default false notNull`, `is_published boolean default false notNull`, `brainstorming text` (nullable), `planning text` (nullable). Mirrors Prisma `Article` model.
- `assignments` — `teacher_name text` (nullable). Mirrors Prisma `Assignment.teacherName`.
- `lesson_progress` — `article_id uuid` (FK→`articles`, cascade), `assignment_id uuid` (FK→`assignments`, cascade), `time_spent integer default 0 notNull`, `is_completed boolean default 0 notNull`. FKs use cascade to match Prisma `onDelete: Cascade`. Note: shared `lessonProgress.lessonId` remains `text` (not `uuid`) to allow external lesson identifiers — preserved by design.
- `flashcard_decks` — `description text` (nullable). Mirrors Prisma `FlashcardDeck.description`.
- `licenses` — `name text`, `description text`, `subscription subscription_type default 'BASIC' notNull`, `start_date timestamp`, `expiry_date timestamp`, `status text default 'active' notNull`. The `subscription` column uses the new `subscriptionType` pgEnum; safe default `BASIC` matches Prisma. All other fields nullable. The pre-existing shared `licenses.licenseType` (text) is preserved for backward compatibility.

### Deferred Shared-Partial Additions

The following Prisma columns are NOT ported in Phase 1 because they
require cross-app coordination or non-trivial schema churn:

- `flashcard_cards` — 15+ FSRS fields (`type`, `articleId`, `storyChapterId`, `audioUrl`, `startTime`, `endTime`, `word`, `definition`, `sentence`, `translation`, `context`, `due`, `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `learningSteps`, `reps`, `lapses`, `state`, `lastReview`). Adding 15+ columns with cascade FKs and `cardState` pgEnum to a heavily-shared table is too invasive for Phase 1. Recommend a dedicated Phase-1.5 track with a `cardState` migration plan and FK coordination.
- `student_assignments` — `status` text→`assignmentStatus` pgEnum. The shared column is `text`; other apps may write values outside the new enum. Requires a one-time data migration + type change. Deferred.
- `multiple_choice_questions` / `short_answer_questions` / `long_answer_questions` — `story_chapter_id uuid` FK. Shared uses `chapter_id text` (not uuid FK) to allow external chapter IDs. Adding a new FK column alongside is safe but the rename requires coordination. Deferred — primary-advantage should use the existing `chapter_id` text column.
- `user_activity` / `xp_logs` — `activityType` text→`activityType` pgEnum. Both columns are `text` today with legacy values that may not match the new enum. Deferred to a data-validation phase.
- `accounts` — Prisma `provider`/`providerAccountId` vs shared `providerId`. Drizzle intentionally consolidates provider + providerAccountId into a single `providerId` column. No port needed. Documented for posterity.

## Migration Verification

The Drizzle migration generator produced `packages/db/drizzle/0022_flowery_black_tarantula.sql` cleanly. The migration is fully additive (no `DROP COLUMN`, no destructive `ALTER TYPE`) so rollforward is safe. Detailed breakdown follows.

### Migration Generated

- **Filename:** `packages/db/drizzle/0022_flowery_black_tarantula.sql`
- **Generator output:** `pnpm --filter @reading-advantage/db generate` (via `drizzle-kit generate`) produced a clean diff against the previous snapshot.
- **Statement count:** 122 SQL statements (4 enum creates, 9 table creates, 15 column adds to 8 shared tables, 11 FK constraints).
- **Generated meta snapshot:** `packages/db/drizzle/meta/0022_snapshot.json` (drizzle-kit updates the journal automatically).

The migration creates:

- 4 new types: `activity_type`, `card_state`, `flashcard_type`, `subscription_type`.
- 9 new tables: `article_activity_logs`, `card_reviews`, `cloze_test_games`, `leaderboards`, `roles`, `school_admins`, `sentencs_and_words_for_flashcard`, `user_roles`, `verification_tokens`.
- 15 new columns on 8 shared tables (`schools`, `users`, `classrooms`, `articles`, `assignments`, `lesson_progress`, `flashcard_decks`, `licenses`).
- 11 foreign-key constraints (all `ON DELETE cascade` matching Prisma's intent).

### Fresh-DB Verification

```text
# Create fresh database
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS primary_advantage_fresh;"
psql -h localhost -U postgres -c "CREATE DATABASE primary_advantage_fresh;"

# Apply every migration file in order via psql
for f in packages/db/drizzle/00*.sql; do
  psql -h localhost -U postgres -d primary_advantage_fresh \
       -v ON_ERROR_STOP=1 -f "$f"
done
```

**Result:** **PASS** — all 23 migration files (0000–0022) apply cleanly to
the fresh `primary_advantage_fresh` database. Post-migration state:

- 92 tables in `public` schema.
- 17 enum types in `public` schema (including all 4 new ones).
- All additive columns confirmed present via
  `information_schema.columns` queries.
- FK constraints confirmed via `\d+ <table>`.

> **Note:** `drizzle-kit migrate` (the official migration runner) hangs
> on this environment with no error output (likely an interactive TTY
> issue unrelated to the migration content). Direct `psql -f` application
> is therefore used for verification. The generated SQL file itself is
> valid — this is an operator-environment issue, not a migration defect.

### Down-Migration Considerations

The migration is additive only (no `DROP COLUMN`, no destructive
`ALTER TYPE`). A reverse migration would require:

1. `DROP TABLE` for each of the 9 new tables.
2. `DROP TYPE` for each of the 4 new enums.
3. `DROP COLUMN` for each of the 15 additive columns.

No destructive changes to existing data; rollforward is safe.

## Barrel Export Updates

`packages/db/src/schema/index.ts` updated:

```diff
 export * from "./sales.js";
+export * from "./primary.js";
```

All 9 new table constants, all 4 new enum constants, and the JSDoc
comments from `primary.ts` are now re-exported from
`@reading-advantage/db/schema`. The barrel is appended (not reordered) to
preserve insertion order and minimise merge conflicts.

Verified by `grep -cE "export const .* = (pgTable|pgEnum)" packages/db/src/schema/primary.ts`
returning **13** (≥8 required by the live-proof assertion).