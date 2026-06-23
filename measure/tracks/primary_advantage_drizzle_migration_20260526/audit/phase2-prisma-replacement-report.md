# Phase 2 Closeout Report — `lib/prisma.ts` Replacement (FR-4)

> **Track:** `primary_advantage_drizzle_migration_20260526`
> **Date:** 2026-06-23
> **Phase:** 2 — `lib/prisma.ts` Replacement (FR-4)
> **Baseline SHA:** `2988691e77ef97aa2c33154571442c3aa631fe2a` (Mid-Red Phase 2 commit `2988691e`)
> **Goal:** Mechanically re-wire every `apps/primary-advantage/` source file from the
> local `@/lib/prisma` PrismaClient singleton to the shared `@reading-advantage/db` Drizzle
> `db` export, and delete the obsolete `apps/primary-advantage/lib/prisma.ts`. Query bodies
> still call Prisma-shaped methods on the renamed `db` handle — those break intentionally
> and are fixed model-by-model in Phases 3–7.

## Files Migrated

All **47** source files importing `@/lib/prisma` were re-wired in a single mechanical
pass (verified via `grep -rl '@/lib/prisma' apps/primary-advantage/` returning `0`).

For each file the two transformations were:

1. **Import line replacement** (uniform across all 47):
   - Before: `import { prisma } from "@/lib/prisma";`
   - After:  `import { db } from '@reading-advantage/db';`
2. **Variable rename** (`\bprisma\.` → `db.`):
   - All variable references like `prisma.user.findUnique(...)`, `prisma.$transaction(...)`,
     `prisma.flashcardDeck.findMany(...)` were renamed to `db.user.findUnique(...)` etc.
   - Word-boundary `\b` plus escaped `\.` ensured no false matches in the string
     `"@prisma/client"` or in identifier names like `globalForPrisma`.
   - The `@prisma/client` package imports (e.g. `import { CardState } from "@prisma/client";`,
     `import { Prisma } from "@prisma/client";`) were deliberately left untouched —
     Phase 7 handles namespace/type imports.

### Migrated file list (47 total)

```
apps/primary-advantage/actions/article.ts
apps/primary-advantage/actions/flashcard.ts
apps/primary-advantage/actions/pratice.ts
apps/primary-advantage/actions/question.ts
apps/primary-advantage/actions/test.ts
apps/primary-advantage/actions/user.ts
apps/primary-advantage/app/[locale]/(student)/student/lesson/[id]/page.tsx
apps/primary-advantage/app/api/classrooms/route.ts
apps/primary-advantage/app/api/debug/auth/route.ts
apps/primary-advantage/app/api/debug/init-roles/route.ts
apps/primary-advantage/app/api/debug/school/route.ts
apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts
apps/primary-advantage/app/api/flashcard/deck-id/route.ts
apps/primary-advantage/app/api/flashcard/decks/[deckId]/due/route.ts
apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts
apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-matching/route.ts
apps/primary-advantage/app/api/flashcard/decks/[deckId]/sentences-for-ordering/route.ts
apps/primary-advantage/app/api/flashcard/decks/[deckId]/words-for-ordering/route.ts
apps/primary-advantage/app/api/flashcard/save/[id]/route.ts
apps/primary-advantage/app/api/licenses/[id]/route.ts
apps/primary-advantage/app/api/licenses/route.ts
apps/primary-advantage/app/api/schools/ranking/route.ts
apps/primary-advantage/app/api/schools/route.ts
apps/primary-advantage/app/api/students/leaderboard/route.ts
apps/primary-advantage/app/api/upload/classes/route.ts
apps/primary-advantage/app/api/upload/csv/route.ts
apps/primary-advantage/app/api/users/[id]/route.ts
apps/primary-advantage/app/api/users/me/school/admins/[adminId]/route.ts
apps/primary-advantage/app/api/users/me/school/admins/route.ts
apps/primary-advantage/app/api/users/me/school/route.ts
apps/primary-advantage/app/api/users/search/route.ts
apps/primary-advantage/server/controllers/assignmentController.ts
apps/primary-advantage/server/models/articleModel.ts
apps/primary-advantage/server/models/assignmentModel.ts
apps/primary-advantage/server/models/classroomModel.ts
apps/primary-advantage/server/models/lessonModel.ts
apps/primary-advantage/server/models/schoolModel.ts
apps/primary-advantage/server/models/studentModel.ts
apps/primary-advantage/server/models/teacherModel.ts
apps/primary-advantage/server/models/userModel.ts
apps/primary-advantage/server/utils/assistant.ts
apps/primary-advantage/server/utils/auth.ts
apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts
apps/primary-advantage/server/utils/genaretors/audio-generator.ts
apps/primary-advantage/server/utils/genaretors/audio-word-generator.ts
apps/primary-advantage/server/utils/genaretors/new-generator.ts
apps/primary-advantage/server/utils/genaretors/sentence-translator.ts
```

### Files untouched (intentional)

- `apps/primary-advantage/lib/prisma.ts` — deleted (see next section).
- `apps/primary-advantage/lib/session.ts` — already imports from `@reading-advantage/db`
  pre-Phase 2; this file is the pattern reference for the migration.
- `apps/primary-advantage/types/index.d.ts` — references `Prisma.JsonValue` namespace.
  Phase 7 will port Prisma types to Drizzle-inferred or domain types.
- `apps/primary-advantage/prisma/seed.ts` — Prisma seed script. Phase 7 migrates it
  to a Drizzle seed script and Phase 8 deletes the `prisma/` directory.

## `lib/prisma.ts` Deletion

`apps/primary-advantage/lib/prisma.ts` was deleted via `git rm` (staged as `D` in
`git status --short`).

### Original contents (captured before deletion)

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// import "dotenv/config";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../generated/prisma/client";

// const connectionString = `${process.env.DATABASE_URL}`;

// const adapter = new PrismaPg({ connectionString });
// const prisma = new PrismaClient({ adapter });

// export { prisma };

// async function checkDbConnection() {
//   try {
//     await prisma.$connect();
//     console.log("Successfully connected to the database!");
//   } catch (error) {
//     console.error("Failed to connect to the database:", error);
//   } finally {
//     await prisma.$disconnect(); // Always disconnect in a test scenario
//   }
// }

// checkDbConnection();
```

The file was a standard PrismaClient singleton pattern: a `globalThis`-cached instance
so Next.js hot reload does not spawn multiple clients, with the PrismaPg adapter block
left as commented-out experimental scaffolding. All 47 importers of this singleton have
been rewired to the shared Drizzle `db` export.

> Note: `@prisma/client` and `prisma` package entries remain in
> `apps/primary-advantage/package.json` after this phase. They are removed in Phase 8
> (Cleanup & Dependency Removal, FR-4) once the schema/models and seed script are
> fully migrated.

## Import Pattern Verification

### New import pattern

Every migrated file now uses:

```ts
import { db } from '@reading-advantage/db';
```

- **Single quotes** match the convention in the migrated `apps/reading-advantage/`
  codebase (e.g. `apps/reading-advantage/server/services/srs-health-service.ts:12`).
- **`db` named import** is the canonical Drizzle client export from
  `packages/db/src/index.ts`, which re-exports it from `./client.js` and additionally
  exposes the Drizzle operators (`eq`, `and`, `or`, `sql`, `desc`, `asc`, `inArray`, etc.).
  Operators are not yet imported by these files because the query bodies still call
  Prisma-shaped methods on `db`. Operators get added per-file in Phases 3–7 when each
  query is rewritten to Drizzle.

### Decision: direct import vs. app-local `lib/db.ts`

The Phase 2 plan explicitly allows either:
- an app-local `apps/primary-advantage/lib/db.ts` re-export, **or**
- direct `import { db } from '@reading-advantage/db'` in every file.

This phase chose **direct import** because:
1. It matches the migrated `apps/reading-advantage/` pattern (no `lib/db.ts` exists
   there; all files import directly from `@reading-advantage/db`).
2. It removes one layer of indirection — there is no benefit to a local re-export
   since `@reading-advantage/db` is already the canonical client barrel.
3. `apps/primary-advantage/lib/session.ts` was already using this pattern pre-Phase 2,
   providing a precedent within the same app.

The test's "db client replacement is wired" assertion is satisfied by direct imports
(`directDbImports > 0`): `grep -rln "from '@reading-advantage/db'" apps/primary-advantage/`
returns **48** (47 migrated files + 1 pre-existing `lib/session.ts`).

### Live-proof greps (after migration)

```text
$ grep -rln '@/lib/prisma' apps/primary-advantage/ --include="*.ts" --include="*.tsx" \
    | grep -v node_modules | grep -v .next | wc -l
0

$ grep -rln "from '@reading-advantage/db'" apps/primary-advantage/ \
    --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .next | wc -l
48

$ ls apps/primary-advantage/lib/prisma.ts
ls: cannot access 'apps/primary-advantage/lib/prisma.ts': No such file or directory
```

### Variable-rename verification

Per-file grep confirms zero leftover `\bprisma\.` references inside any of the 47
migrated files. (The only remaining `prisma.` mentions in `apps/primary-advantage/`
are in `lib/prisma.ts` — deleted — and commented-out code in `prisma/seed.ts`,
which Phase 7 will rewrite and Phase 8 will delete along with the `prisma/` dir.)

## Build Status

**Build is intentionally RED at the close of Phase 2.** This is expected and matches
the Phase 2 plan's note: *"build being RED after Phase 2 is OK; build-green is gated
at Phase 9."*

### Why the build is RED

Phase 2 is a **mechanical import/rename refactor**. It does not translate Prisma query
calls into Drizzle query calls. After Phase 2 each migrated file has correct imports
(`import { db } from '@reading-advantage/db'`) but its query bodies still call
Prisma-shaped methods (`db.user.findUnique({ where: { id } })`,
`db.flashcardDeck.findMany({ where: { ... } })`, `db.$transaction(async (tx) => …)`,
`db.xPLogs.create({ ... })`, etc.). The Drizzle `db` handle exposes a different query
builder API, so these calls are type-errors and runtime-failures.

### Phase-to-phase repair schedule

| Phase | Scope | Repairs |
|---|---|---|
| 3 | Server Models (FR-2) | 8 model files + `assignmentController.ts`. Largest query rewrites. |
| 4 | Actions (FR-2) | 6 `actions/*.ts` files. Includes `$transaction` and `xPLogs` aggregation rewrites. |
| 5 | API Routes (FR-2) | 16 `app/api/**/route.ts` files (classrooms, flashcard, licenses, schools, students, upload, users, debug). |
| 6 | Component/UI (FR-3) | 5 component files importing Prisma types. |
| 7 | Utils & Types (FR-2, FR-4) | `server/utils/auth.ts`, `server/utils/assistant.ts`, 4 `server/utils/genaretors/*.ts`, `lib/fsrs-service.ts`, `types/index.d.ts`, `prisma/seed.ts`. |
| 8 | Cleanup & Dependency Removal (FR-4) | Delete `apps/primary-advantage/prisma/` directory; remove `@prisma/client`/`prisma`/`@prisma/adapter-pg` from package.json; `pnpm install`; update `apps/primary-advantage/AGENTS.md`. |
| 9 | Verification & Sign-Off | FR-2 audit must show zero Prisma matches; `pnpm --filter primary-advantage build` passes; `pnpm --filter primary-advantage test` passes (or matches pre-existing baseline); archive the track. |

### Other open build-time issues

The Phase 0 baseline already documented two pre-existing Turbopack module-resolution
errors unrelated to Prisma:
- 13× `@reading-advantage/ai` resolution failures.
- 1× `child_process` resolution failure.

These persist through Phase 2 and are out of scope for the Prisma→Drizzle migration.

### Type-check / test commands

TypeScript `tsc --noEmit` and `pnpm --filter primary-advantage build` were not run as
part of Phase 2. They will be run in Phase 9 after query rewrites. The Phase 2
verification gate is the contract test:

```bash
node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase2-prisma-replacement.test.mjs
```

Expected result: **7 pass / 0 fail** at the close of Phase 2.
