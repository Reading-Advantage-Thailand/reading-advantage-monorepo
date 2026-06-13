# @reading-advantage/db

Drizzle ORM schema, migrations, and client for the Reading Advantage monorepo.

## Schema Organization

Schemas are in `src/schema/`, organized by domain:

| File | Tables |
|------|--------|
| `users.ts` | `schools`, `users`, `accounts`, `sessions` |
| `classrooms.ts` | `classrooms`, `classroomStudents`, `classroomTeachers` |
| `content.ts` | `articles`, `lessons`, `assignments`, `studentAssignments` |
| `progress.ts` | `userActivity`, `userWordRecords`, `userSentenceRecords`, `lessonProgress` |
| `questions.ts` | `multipleChoiceQuestions`, `shortAnswerQuestions`, `studentAnswers` |
| `flashcards.ts` | `flashcardDecks`, `flashcardCards`, `flashcardProgress` |
| `analytics.ts` | `storyRecords`, `chapterTracking`, `xpLogs`, `gameRankings`, `aiInsights`, `learningGoals` |

## Migrations

Migrations are in `drizzle/`. Run `pnpm generate` to create new migrations, `pnpm migrate` to apply them.

**Note:** `drizzle-kit generate` requires a TTY terminal for column-conflict prompts in drizzle-kit 0.31.x. If running in CI/non-interactive environments, write migration SQL manually.

## Prisma vs Drizzle

This package provides the **Drizzle** schema — the forward-looking ORM for the monorepo shared backend. However, some apps still maintain their own **Prisma** schemas:

| App | Prisma Schema | Status |
|-----|--------------|--------|
| reading-advantage | `apps/reading-advantage/prisma/schema.prisma` (36 models) | Active — controllers still use Prisma. Full migration deferred to future "Prisma→Drizzle Schema Alignment" track. |
| primary-advantage | `apps/primary-advantage/prisma/schema.prisma` | Active — separate schema from reading-advantage's. Two distinct Prisma schemas exist in the monorepo. |
| science-advantage | `apps/science-advantage/prisma/schema.prisma` | Auth tables migrated to Drizzle; curriculum/lessons/gamification/classes still on Prisma. |

### Drizzle ↔ Prisma Gap

The Drizzle schema is simpler and restructured compared to the Prisma schemas. Key divergences:

- **License system**: No Drizzle equivalent (no `licenses` or `LicenseOnUser` tables)
- **Story/Chapter**: No Drizzle equivalent (no `Story`, `Chapter`, `StoryTimepoint`, `StoryAssignment` tables)
- **LongAnswerQuestion**: No Drizzle equivalent
- **UserActivity / XPLogs**: Simplified column structure in Drizzle
- **UserWordRecord / UserSentenceRecord**: Simplified — lacks SR (spaced repetition) fields
- **AIInsights**: Simplified — lacks scope, priority, confidence fields

### Migration Path

1. New backend features → Use Drizzle via `@reading-advantage/db`
2. Legacy Prisma features → Keep on Prisma until they're rewritten for Drizzle
3. Full Prisma→Drizzle migration → Deferred to a dedicated future track

## Deploy Gate

Every app that runs `pnpm migrate` in production must also gate its deploy pipeline on a ledger-integrity check. The canonical pattern (used by `codecamp-advantage`) adds two Cloud Build steps **before** the traffic-shift step:

1. **`migrate-db`** — runs `pnpm --filter @reading-advantage/db migrate` with `DIRECT_DATABASE_URL` (privileged connection, bypasses transaction-mode pooling).
2. **`doctor-check`** — runs `pnpm --filter @reading-advantage/db doctor --check` with the same `DIRECT_DATABASE_URL`. Non-zero exit fails the build before traffic shifts.

```yaml
# apps/codecamp-advantage/cloudbuild.yaml (excerpt)
  - name: "node:20-slim"
    id: "migrate-db"
    entrypoint: "bash"
    args:
      - "-c"
      - "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @reading-advantage/db migrate"
    secretEnv:
      - "DIRECT_DATABASE_URL"
    env:
      - "DATABASE_URL=$$DIRECT_DATABASE_URL"

  - name: "node:20-slim"
    id: "doctor-check"
    entrypoint: "bash"
    args:
      - "-c"
      - "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @reading-advantage/db doctor --check"
    secretEnv:
      - "DIRECT_DATABASE_URL"
    env:
      - "DATABASE_URL=$$DIRECT_DATABASE_URL"
```

`DIRECT_DATABASE_URL` must be a Secret Manager entry pointing at a session-mode (non-pooled) connection. This is the same URL `drizzle-kit migrate` uses — `drizzle-kit` takes an advisory lock that breaks under transaction-mode pooling (PgBouncer / Hyperdrive).

### Adding the gate to other apps

For `reading-advantage`, `primary-advantage`, and `science-advantage`, replicate the two-step pattern above in each app's deployment pipeline. The `doctor --check` command validates:

- Every migration SQL file has a matching journal entry
- Journal `when` stamps are strictly increasing and contiguous
- Sentinels (table/column existence probes) match the expected schema state

## Production Reconciliation Runbook

When `doctor --check` reports divergence (exit 1), use the following procedure to reconcile:

1. **Report** — Run `pnpm --filter @reading-advantage/db doctor --check` against the target environment's `DIRECT_DATABASE_URL`. The tool outputs a matrix of: journal entries × ledger rows × sentinel probes, highlighting any mismatches.

2. **Review** — Examine the divergence report. Common patterns:
   - Missing ledger rows: a migration was applied manually without inserting a journal entry.
   - Sentinel mismatch: a migration's DDL was only partially applied or a column was renamed out-of-band.
   - Non-monotonic `when` stamps: the journal was hand-edited (fixed by the `db_migration_ledger_20260611` re-stamp campaign).

3. **Repair** — Run `pnpm --filter @reading-advantage/db doctor --repair` with the same `DIRECT_DATABASE_URL`. This inserts the missing ledger rows (no DDL changes). Re-run `--check` to confirm exit 0.

**Important:** `--repair` never executes DDL. It only inserts missing `drizzle.__drizzle_migrations` ledger rows. If the sentinel probe detects a missing table/column, the DDL must be applied manually (or the migration re-run) before `--repair` can reconcile the ledger.
