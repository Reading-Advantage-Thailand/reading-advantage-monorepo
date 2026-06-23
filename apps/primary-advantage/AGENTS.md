# AGENTS.md — primary-advantage

Instructions for AI coding agents working on the `primary-advantage` Next.js app.

This app is part of the Reading Advantage monorepo. The monorepo root
[`AGENTS.md`](../../../AGENTS.md) is authoritative for cross-cutting policies
(monorepo layout, multi-tenancy, testing order, commit style, Measure workflow).
**Read the root AGENTS.md first**, then this file for primary-advantage-specific
notes.

---

## Stack

- Next.js 16.2.9 (App Router)
- React 19.2.7
- TypeScript 5.9.x
- Tailwind CSS v4
- shadcn/ui (Radix primitives in `components/ui/`)
- next-intl for i18n
- **Drizzle ORM** (replaces Prisma — see Migration History below)

---

## Database Access

This app uses **Drizzle ORM** via the shared `@reading-advantage/db` package.
**Do not** use Prisma, `@prisma/client`, or a local `lib/prisma.ts` — they have
been fully removed (Phase 8, track
`primary_advantage_drizzle_migration_20260526`).

### Importing the client

```ts
import { db } from "@reading-advantage/db";
import { users, classrooms, licenses } from "@reading-advantage/db/schema";
import { eq, and, desc } from "drizzle-orm";
```

The `db` singleton lives in `packages/db/src/client.ts`. The schema barrel is
`packages/db/src/schema/index.ts`.

### Schema layout

- **Shared tables** (users, classrooms, content, progress, etc.) live in
  `packages/db/src/schema/*.ts`.
- **primary-advantage-specific tables** (VerificationToken, UserRole, Role,
  ArticleActivityLog, SentencsAndWordsForFlashcard, CardReview, ClozeTestGame,
  SchoolAdmins, Leaderboard, plus `activityType`, `flashcardType`, `cardState`,
  `subscriptionType` enums) live in
  [`packages/db/src/schema/primary.ts`](../../../packages/db/src/schema/primary.ts).
- Always re-export new tables/enums through `packages/db/src/schema/index.ts`
  (add `export * from "./primary.js";` or a named export).

### Migrations

```bash
# Generate a new migration after editing schema files
pnpm --filter @reading-advantage/db generate

# Apply migrations to a running database
pnpm --filter @reading-advantage/db migrate
```

The migration ledger is in `packages/db/drizzle/`. Do not hand-write SQL — use
`drizzle-kit generate` and review the output before committing.

### Query patterns

Use the Drizzle query builder. Common shapes:

```ts
// Select
const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);

// Insert + return
const [row] = await db.insert(classrooms).values({ ... }).returning();

// Update with join conditions
await db.update(licenses)
  .set({ status: "expired" })
  .where(eq(licenses.id, licenseId));

// Delete
await db.delete(articleActivityLogs).where(eq(articleActivityLogs.id, logId));
```

Prefer `InferSelectModel<typeof tableName>` / `InferInsertModel<typeof tableName>`
for row types over hand-rolled interfaces.

---

## Forbidden Patterns

The following Prisma-era patterns are gone and must not be re-introduced:

- `import { prisma } from "@/lib/prisma"` — `lib/prisma.ts` has been deleted.
- `import { PrismaClient, Prisma } from "@prisma/client"` — `@prisma/client` is
  no longer a dependency of this app.
- `prisma.<model>.<method>(...)` calls — use `db.select().from(...)` etc.
- A `prisma/` directory at the app root — schema and migrations live in
  `packages/db/`.
- A `"prisma": { "seed": "..." }` block in `package.json` — seed scripts run via
  `tsx` against Drizzle.

The CI / `pnpm turbo run test` gate enforces zero Prisma imports in this app.

---

## Project Layout

```
apps/primary-advantage/
  app/            # Next.js App Router (routes, layouts, server actions)
  actions/        # Server Actions (Drizzle queries)
  components/     # React components (UI + feature)
  configs/        # App-level config (auth providers, env, etc.)
  contexts/       # React context providers
  data/           # Static data fixtures, i18n messages
  hooks/          # Reusable React hooks
  i18n/           # next-intl config + locales
  lib/            # Cross-cutting utilities (db helpers, FSRS, etc.)
  messages/       # Translation JSON
  proxy.ts        # Next.js proxy/middleware entrypoint
```

`server/` and `server/utils/genaretors/` contain backend code that has been
migrated to Drizzle; the directories are still in use and must not be deleted.

---

## Testing

- `pnpm --filter primary-advantage test` — Vitest unit tests.
- Tests mock the DB layer with `vi.fn()`; do not hit a real Postgres from unit
  tests.
- Multi-tenant queries must filter on `users.schoolId` (or join through it) for
  every read/write — see the root AGENTS.md multi-tenancy section.

---

## Migration History

This app was migrated from Prisma to Drizzle across Phases 0–8 of the
`primary_advantage_drizzle_migration_20260526` Measure track. Audit reports
for each phase live under
`measure/tracks/primary_advantage_drizzle_migration_20260526/audit/`.
