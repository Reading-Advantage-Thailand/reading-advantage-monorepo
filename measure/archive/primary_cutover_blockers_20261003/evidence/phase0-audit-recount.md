# Phase 0 — Audit recount (2026-10-04)

Real runs on branch `primary/lane-a-cutover-blockers`. The 2026-10-03 audit used grep only.

## Counts

| Item | Audit | Real count | Method |
|---|---|---|---|
| `bcryptjs` imports, non-test, at base `8de168eb2` | 5 (lower bound) | 5: `app/api/users/[id]/route.ts:9`, `server/models/studentModel.ts:20`, `server/models/teacherModel.ts:17`, `server/models/userModel.ts:19`, `packages/auth/src/password.ts:2` | `git grep bcryptjs 8de168eb2` |
| `bcryptjs` imports in Primary app code, after `b3bf3ef0e` | — | 0. One test import remains (`server/utils/__tests__/credentials.test.ts`, legacy-hash fixture). `bcryptjs` stays in `package.json` for that test. | `grep -rl bcryptjs apps/primary-advantage` |
| Files importing `drizzle-orm` directly (app, non-test) | — | 34 | `grep -rl "from 'drizzle-orm"` |
| Files importing `@reading-advantage/db` directly (app, non-test) | 33 | 60 | same |
| `tsc --noEmit` errors, Primary app | 17 (Sept 15 baseline) | 14 after building the workspace packages: 12 in `components/apk/StudentCartridgeHost.tsx`, 2 in `app/api/v1/apk/__tests__/routes.test.ts`. Without the package builds, tsc reports extra "Cannot find module" errors for `@reading-advantage/game-cartridges` and `@reading-advantage/api/routes/apk-challenges`. | `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit` |
| Primary Vitest suite | 1 failing APK test | 95 files, 586 tests pass after the package builds. The APK test failure was a missing `game-cartridges` build, not a code defect. | `pnpm exec vitest run` |

The direct `@reading-advantage/db` count is the long tail that the semester 2 track
`primary_package_alignment` owns (program doc, "Semester 2 stub").

## Database state (local `primary_advantage`)

- Migration ledger doctor (`packages/db/scripts/migration-ledger-doctor.ts --check`,
  `DIRECT_DATABASE_URL` on port 5432): exit 0, no divergence. 60 journal entries, 60
  ledger rows. The production Primary database was not checked: no access from this
  machine.
- `users` columns in the local database match the Drizzle schema, including
  `email_verified` (timestamp, added by `drizzle/0022_flowery_black_tarantula.sql:93`).

## Finding: the "missing user columns" claim does not apply to Primary

FR-4 asks for an additive migration for the missing `emailVerified` / `onborda` user
columns. The source of that claim is the tech-debt row of 2026-05-23
(`measure/tech-debt.md:27`), which is about `apps/reading-advantage/lib/session.ts:106-110`.

- `email_verified` is already in the schema and in the migrations (0022).
- `onborda` is not a column in legacy Primary (`~/Desktop/primary-advantage/prisma/schema.prisma`)
  and the Primary app reads no such flag. The `onborda-*` strings in Primary are DOM
  ids for the onboarding tour.
- Legacy Primary `emailVerified` is a `Boolean` (`schema.prisma:16`); the shared column
  is a `timestamp`. That is an ETL transform for track
  `primary_legacy_data_migration_20261004`, not a schema change.

Result: no Primary user-column migration is needed. The Phase 3 task is closed as
"not needed" with this evidence.

## Other finding for the migration track

The April 2026 backup has 18 credential accounts: 14 bcrypt and 4 scrypt
(`docs/deployment/primary-cutover-migration-spec.md` §4). Teachers use Google only
(owner, 2026-10-04), so these accounts belong to admin, system, or `user`-role rows.
Scrypt verification was dropped (D7), so the 4 scrypt accounts cannot sign in after
cutover unless they also get a temporary password from the A9 credential script.
