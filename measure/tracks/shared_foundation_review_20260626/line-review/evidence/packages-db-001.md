# Line Review Evidence: packages-db-001

Reviewer: measure-review-a
Files assigned: 10
Lines assigned: 799

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/db/README.md | 1-107 | reviewed | 1 |
| packages/db/docs/adr/0001-use-drizzle-not-prisma.md | 1-37 | reviewed | 0 |
| packages/db/docs/adr/0002-drop-jwt-era-accounts-columns.md | 1-35 | reviewed | 0 |
| packages/db/docs/adr/0003-add-intern-role.md | 1-30 | reviewed | 0 |
| packages/db/drizzle/0000_wide_vengeance.sql | 1-203 | reviewed | 0 |
| packages/db/drizzle/0001_thick_santa_claus.sql | 1-139 | reviewed | 1 |
| packages/db/drizzle/0002_quick_skreet.sql | 1-4 | reviewed | 0 |
| packages/db/drizzle/0003_slow_firebrand.sql | 1-96 | reviewed | 1 |
| packages/db/drizzle/0004_sturdy_forge.sql | 1-27 | reviewed | 1 |
| packages/db/drizzle/0005_codecamp_schema.sql | 1-121 | reviewed | 0 |

## Findings

### LR-packages-db-001-001 — README lists stale Drizzle↔Prisma gaps

- Severity: Low
- File: `packages/db/README.md:39-44`
- Evidence: The "Drizzle ↔ Prisma Gap" section claims there is "No Drizzle equivalent" for the license system (`licenses`/`LicenseOnUser` tables) and for Story/Chapter tables. However, this same package already defines `src/schema/licenses.ts` and `src/schema/stories.ts`, which contain `licenses`, `licenseRenewals`, `stories`, and related tables.
- Impact: Product documentation is out of sync with the actual schema, misleading developers about feature availability and migration status.
- Recommendation: Update `README.md` to remove or correct the stale gap entries for licenses and stories after verifying current schema parity; track the doc fix in the review synthesis.

### LR-packages-db-001-002 — Migration 0001 comment does not match created tables

- Severity: Low
- File: `packages/db/drizzle/0001_thick_santa_claus.sql:1`
- Evidence: The leading comment says "Initial schema: flashcard_cards + flashcard_decks for spaced-repetition learning", but the migration also creates `multiple_choice_questions`, `short_answer_questions`, `student_answers`, `ai_insights`, `chapter_tracking`, `game_rankings`, `learning_goals`, `story_records`, and `xp_logs`.
- Impact: The comment misrepresents the migration scope, making it harder to identify which migration introduced which tables.
- Recommendation: Expand the comment to enumerate all table groups introduced by this migration (e.g., flashcards, questions/answers, analytics/story/xp) or replace it with a generic summary such as "Initial schema: flashcards, questions, and analytics tables".

### LR-packages-db-001-003 — Migration 0003 may fail on users with multiple OAuth accounts

- Severity: Medium
- File: `packages/db/drizzle/0003_slow_firebrand.sql:57-71`
- Evidence: The migration drops the OAuth-specific columns (`type`, `provider`, `provider_account_id`) and replaces them with a single `provider_id` column defaulting to `'credential'`, then immediately adds a unique constraint `accounts_user_provider_unique` on `(user_id, provider_id)`. The original `accounts` table in `0000_wide_vengeance.sql` had no unique constraint on `user_id`, so a user could have multiple provider rows. After the migration, all such rows become `(user_id, 'credential')` duplicates, causing the unique-constraint creation to fail.
- Impact: Any database with users linked to more than one OAuth provider (or with multiple account rows for any reason) cannot run `0003_slow_firebrand.sql` without manually removing or merging duplicate account rows first.
- Recommendation: Either deduplicate/merge accounts before adding the unique constraint, or add the constraint only after a data-cleaning step. Document this hazard in `MIGRATION_LEDGER.md`; for historical migrations, add a pre-flight check for duplicate `user_id` rows in `accounts` before applying this migration range.

### LR-packages-db-001-004 — Backfill in migration 0004 may violate unique constraints added earlier

- Severity: Medium
- File: `packages/db/drizzle/0004_sturdy_forge.sql:3-19`
- Evidence: `0003_slow_firebrand.sql:25-27` already added `UNIQUE` constraints on `users.username` and `users.display_username`. Migration `0004_sturdy_forge.sql` backfills `username` from the email local part (`split_part(email, '@', 1)`). Because the original `users` table enforces unique emails but not unique email local parts, two users such as `user@gmail.com` and `user@example.com` would receive the same generated username. The active unique constraint then causes the `UPDATE` to fail with a unique-violation error. The same duplicate propagates to `display_username`, which also has a unique constraint.
- Impact: This is a production migration hazard: an environment with duplicate email local parts cannot run `0004_sturdy_forge.sql` without manual remediation, and the migration will fail partway through.
- Recommendation: Either (a) move the `UNIQUE` constraints from `0003` to after the backfill in `0004`, or (b) deduplicate generated usernames deterministically in the backfill (e.g., append a counter/suffix when a conflict is detected). Since historical migrations are normally immutable, document the hazard in `MIGRATION_LEDGER.md` and ensure any environment still on this migration range is pre-checked for duplicate email prefixes before applying.

## No-Finding Notes

- `packages/db/docs/adr/0001-use-drizzle-not-prisma.md`: reviewed line-by-line; no findings.
- `packages/db/docs/adr/0002-drop-jwt-era-accounts-columns.md`: reviewed line-by-line; no findings.
- `packages/db/docs/adr/0003-add-intern-role.md`: reviewed line-by-line; no findings.
- `packages/db/drizzle/0000_wide_vengeance.sql`: reviewed line-by-line; no findings.
- `packages/db/drizzle/0002_quick_skreet.sql`: reviewed line-by-line; no findings.
- `packages/db/drizzle/0005_codecamp_schema.sql`: reviewed line-by-line; no findings.
