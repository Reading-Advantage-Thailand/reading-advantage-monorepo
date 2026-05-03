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
