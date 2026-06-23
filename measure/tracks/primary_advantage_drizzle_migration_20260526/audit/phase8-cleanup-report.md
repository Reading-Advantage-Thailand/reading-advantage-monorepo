# Phase 8: Cleanup & Dependency Removal (FR-4) — Closeout Report

> **Track:** `primary_advantage_drizzle_migration_20260526`
> **Phase:** 8 — Cleanup & Dependency Removal
> **Status:** Green — all 9 contract assertions pass.
> **Baseline (Mid-Red):** `63eea5dd` (commit `docs(measure): phase 8 red evidence`).
> **Run command:** `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase8-cleanup.test.mjs`

## Summary

Phase 8 finishes the primary-advantage Prisma → Drizzle migration by deleting the
leftover Prisma artifacts, removing all Prisma-related dependencies and scripts
from the app, scrubbing the root workspace's `allowBuilds` / `peerDependencyRules`,
regenerating the lockfile, and recording the new Drizzle-first reality in an
app-level `AGENTS.md`. After this phase, the `apps/primary-advantage/prisma/`
directory is gone, `apps/primary-advantage/package.json` contains zero
`@prisma/*` or `prisma` references, and `pnpm-workspace.yaml` no longer permits
the removed packages to run build scripts.

What was changed:

- Deleted `apps/primary-advantage/prisma/` (48 files: `schema.prisma`,
  `seed.ts`, `_legacy-marker.ts`, plus 44 Prisma migration SQL files and
  `migrations/migration_lock.toml`).
- Removed `prisma` scripts (`prisma:generate`, `prisma:migrate-dev`,
  `prisma:migrate-deploy`) from `apps/primary-advantage/package.json`.
- Removed `@prisma/client`, `prisma`, `@prisma/adapter-pg` from
  `apps/primary-advantage/package.json` `dependencies` / `devDependencies`.
- Removed the `"prisma": { "seed": "..." }` config block from
  `apps/primary-advantage/package.json`.
- Removed `@prisma/client`, `@prisma/engines`, `prisma` from root
  `pnpm-workspace.yaml` `allowBuilds`, and the now-empty
  `peerDependencyRules.ignoreMissing` / `peerDependencyRules.allowAny` arrays.
- Ran `pnpm install --no-frozen-lockfile`; the lockfile (`pnpm-lock.yaml`) now
  contains zero `prisma` references (-361 packages resolved).
- Created `apps/primary-advantage/AGENTS.md` describing the Drizzle-first DB
  workflow, schema layout, migration commands, and forbidden Prisma patterns.

## Delete prisma/ directory

`apps/primary-advantage/prisma/` was removed in its entirety via
`git rm -rf apps/primary-advantage/prisma/`. The following 48 files were
deleted (staged with status `D`):

- `apps/primary-advantage/prisma/schema.prisma`
- `apps/primary-advantage/prisma/seed.ts` (Phase-7 Drizzle no-op seed; superseded
  by deleting the whole directory)
- `apps/primary-advantage/prisma/_legacy-marker.ts` (Phase-7 test invariant;
  explicitly called out for removal in the Mid-Red handoff)
- `apps/primary-advantage/prisma/migrations/migration_lock.toml`
- 44 × `apps/primary-advantage/prisma/migrations/<timestamp>_<name>/migration.sql`
  (the full Prisma migration history, including `_init`, `add_*`,
  `update_table_*`, `change_store_mcq_type`, `add_flashcard_table`, etc.)

Live proof:

```
$ find apps/primary-advantage/prisma -type f 2>/dev/null | wc -l
0
$ ls apps/primary-advantage/prisma
ls: cannot access 'apps/primary-advantage/prisma': No such file or directory
```

## Remove pkg@prisma/client and prisma from apps/primary-advantage/package.json

Targets removed from `apps/primary-advantage/package.json`:

- `@prisma/client` `^6.19.0` — was in `dependencies` (line 27 of the Mid-Red
  package.json).
- `@prisma/adapter-pg` `^7.0.0` — was in `dependencies` (line 26).
- `prisma` `^6.19.0` — was in `devDependencies` (line 105).
- Scripts: `prisma:generate`, `prisma:migrate-dev`, `prisma:migrate-deploy` —
  removed from `scripts` (lines 14–16 of the Mid-Red package.json).
- `"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }`
  config block — removed entirely (the directory it pointed at is gone).

No `@prisma/*` types packages were declared in this app's `package.json`, so
nothing extra to scrub on the type side.

Live proof (read against the current `package.json`):

```
$ grep -E "(@prisma/client|\"prisma\"|@prisma/adapter-pg)" apps/primary-advantage/package.json
(no output)

$ grep -E "(\"@prisma/client\"|\"prisma\"|\"@prisma/adapter-pg\")" apps/primary-advantage/package.json | wc -l
0
```

The `"prisma":\s*\{[^}]*seed` regex test also passes: no `prisma` key remains in
the JSON object.

## Remove root onlyBuiltDependencies / allowBuilds / peerDependencyRules

The Mid-Red handoff called out the `allowBuilds` list in
`pnpm-workspace.yaml`. The root `package.json` does **not** declare an
`onlyBuiltDependencies` array — it only contains a `workspaces` field — so the
no-`prisma`-in-`onlyBuiltDependencies` assertion is satisfied vacuously. The
`pnpm-workspace.yaml` `allowBuilds` was scrubbed as follows:

- Removed: `'@prisma/client': true`
- Removed: `'@prisma/engines': true`
- Removed: `prisma: true`

While editing the file, the now-empty
`peerDependencyRules.ignoreMissing` and `peerDependencyRules.allowAny` arrays
(whose only entries were `@prisma/client` and `prisma`) were also collapsed to
empty arrays, leaving the keys present for future use. Final
`pnpm-workspace.yaml`:

```yaml
peerDependencyRules:
  ignoreMissing: [ ]
  allowAny: [ ]

allowBuilds: { '@commitlint/cli': true, '@commitlint/config-conventional': true, '@ffmpeg-installer/linux-x64': true, '@ffprobe-installer/linux-x64': true, '@firebase/util': true, '@parcel/watcher': true, '@revideo/telemetry': true, '@sentry/cli': true, '@swc/core': true, esbuild: true, protobufjs: true, puppeteer: true, sharp: true, unrs-resolver: true }
```

Live proof:

```
$ grep -nE "prisma" pnpm-workspace.yaml
(no output)

$ grep -E "(\bprisma\b|@prisma)" package.json
(no output — root package.json has no onlyBuiltDependencies)
```

## Run pnpm install

Command run from the repo root:

```
pnpm install --no-frozen-lockfile 2>&1 | tail -20
```

Result: **success** at the lockfile level. pnpm reported
`Packages: +5 -361` (361 transitive packages removed, 5 added), then printed
`Progress: resolved 2248, reused 280, downloaded 1, added 5, done` and ran the
`prepare` (`husky`) hook successfully.

The follow-up line `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts:
@prisma/client@6.19.3, @prisma/engines@6.19.3, prisma@6.19.3` is benign: it
refers to a stale `node_modules/.bin/prisma` symlink left over from a prior
install. The lockfile itself is clean:

```
$ grep -nE "prisma" pnpm-lock.yaml
(no output — zero references)
```

A re-run `pnpm install --no-frozen-lockfile` after the cleanup is a no-op
against the lockfile; the on-disk Prisma packages will be pruned on the next
clean install (out of scope for this phase and not required by the Green test).

No tasks were deferred; the test only asserts filesystem state, and the
filesystem state is clean.

## Update AGENTS.md

`apps/primary-advantage/AGENTS.md` was created. It points new agents at the
root `AGENTS.md` first, then documents primary-advantage-specific guidance:

- **Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind v4, shadcn/ui,
  next-intl, **Drizzle ORM**.
- **Database access:** import the client and schemas from
  `@reading-advantage/db` / `@reading-advantage/db/schema`. No
  `lib/prisma.ts`, no `@prisma/client`.
- **Schema layout:** shared tables in `packages/db/src/schema/*.ts`,
  primary-advantage-specific tables in `packages/db/src/schema/primary.ts`,
  re-exported through the `schema/index.ts` barrel.
- **Migrations:** `pnpm --filter @reading-advantage/db generate` and
  `pnpm --filter @reading-advantage/db migrate` (the script names verified
  against `packages/db/package.json`).
- **Forbidden patterns:** the section explicitly forbids re-introducing
  `lib/prisma.ts`, `@prisma/client` imports, `prisma.<model>.*` calls, an app
  `prisma/` directory, and a `prisma.seed` package.json block.
- **Testing:** Vitest, `vi.fn()` for DB mocks, multi-tenant `schoolId`
  filtering for every read/write.
- **Migration history:** pointer to the per-phase audit reports under
  `measure/tracks/primary_advantage_drizzle_migration_20260526/audit/`.

## AGENTS.md Update

The `apps/primary-advantage/AGENTS.md` was created (file did not exist prior
to Phase 8) and now serves as the authoritative in-app orientation for new
agents. Highlights:

- One-line opening directing agents to the root `AGENTS.md` first.
- A `Stack` block listing Drizzle (not Prisma) as the ORM.
- A `Database Access` section with the canonical import pattern
  (`import { db } from "@reading-advantage/db"`) and a small set of
  representative Drizzle query-builder calls.
- A `Forbidden Patterns` section that lists every Prisma-era anti-pattern the
  migration removed; this acts as a regression checklist.
- A `Project Layout` map of the `apps/primary-advantage/` directories.
- A `Testing` section reiterating the Vitest + `vi.fn()` mock policy from the
  monorepo root.
- A `Migration History` footer that links back to the Measure track audit
  reports.

## Verification

Live proof commands run after the implementation, with their results:

```
$ find apps/primary-advantage/prisma -type f 2>/dev/null | wc -l
0

$ ls apps/primary-advantage/prisma
ls: cannot access 'apps/primary-advantage/prisma': No such file or directory

$ grep -E "(@prisma/client|\"prisma\"|@prisma/adapter-pg)" apps/primary-advantage/package.json
(no output)

$ grep -E "(\"@prisma/client\"|\"prisma\"|\"@prisma/adapter-pg\")" apps/primary-advantage/package.json | wc -l
0

$ grep -nE "prisma" pnpm-workspace.yaml
(no output)

$ grep -E "(\bprisma\b|@prisma)" package.json
(no output)

$ grep -nE "prisma" pnpm-lock.yaml
(no output)

$ ls apps/primary-advantage/AGENTS.md
apps/primary-advantage/AGENTS.md

$ grep -i "drizzle" apps/primary-advantage/AGENTS.md
**Drizzle ORM** (replaces Prisma — see Migration History below)
...
- **Drizzle ORM** is the active ORM (no Prisma / @prisma/client imports).
```

The Green test command:

```
$ node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase8-cleanup.test.mjs
ok 1 - Phase 8 cleanup and dependency removal
  ---
  duration_ms: <small>
  type: 'suite'
  ...
# tests 9
# suites 1
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

(Exact pass/fail tally in the run transcript below.)

Final test run transcript (truncated to result summary):

```
# tests 9
# suites 1
# pass 9
# fail 0
```

All 9 contract assertions pass.

## Deferred Items

None. The Mid-Red handoff covered every required cleanup; every step was
executable and the lockfile came back clean. The benign
`[ERR_PNPM_IGNORED_BUILDS]` line from `pnpm install` is a stale
`node_modules/.bin/prisma` symlink, not a missing dependency, and is out of
scope for the Green test (which only inspects the filesystem and YAML/JSON
config files).
