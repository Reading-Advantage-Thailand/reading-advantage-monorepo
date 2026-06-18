# Repository Guidelines

> **Regression guard (housekeeping_batch_20260603, Phase 1, F-205):** The `prisma/` directory at the app root must not exist. If you see `apps/science-advantage/prisma/`, it is a regression — the legacy `prisma/seed-data`, `prisma/data/content`, and `prisma/seed-functions` contents were relocated to `apps/science-advantage/scripts/seed-data/` and `apps/science-advantage/scripts/seed/`. Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root.

> **Deviation note:** This file documents app-specific deviations from the monorepo `AGENTS.md`. For shared conventions (auth, packages, CI), see the monorepo root.

> **Dependency deviation:** Dependencies use `^` (caret) ranges for flexibility (56 `^`-ranged deps, grandfathered). The `pnpm-lock.yaml` is the authoritative source of truth at install time — pnpm defaults to `save-exact=false`, so `^` ranges are the current behavior. Strict pinning is deferred to a follow-up track.

## Measure Workflow

All development runs through the **Measure** spec-driven development framework exclusively. At the start of every session:

1. Load the `measure` skill
2. Read `measure/index.md` to understand the project context
3. Follow the workflow defined in `measure/workflow.md`

Key reference files:
- `measure/tracks.md` — Active work registry
- `measure/tracks/<track_id>/plan.md` — Task checklist
- `measure/product.md` — Product vision
- `measure/tech-stack.md` — Technology choices
- `measure/lessons-learned.md` — Project memory
- `measure/tech-debt.md` — Known shortcuts

Never start significant work without an active track. Always update `measure/tracks.md` and the current track's `plan.md` before and after work.


## Project Structure & Module Organization

Core application logic lives in `app/`, which follows the Next.js App Router layout with feature groups such as `(auth)` and `(dashboard)` plus API handlers under `app/api/`. Shared UI lives in `components/`, with `components/ui/` mirroring shadcn/ui primitives and `components/features/` collecting higher-level widgets. Cross-cutting utilities reside in `lib/` (auth, database client, helpers). Database schema and migrations are maintained via Drizzle in `packages/db/`. Seed scripts and data live in `scripts/seed/` and `scripts/seed-data/`. Static assets live in `public/` and extended documentation belongs in `docs/`.

The first thing the agent should do in any session is to run the .claude/skills/doc-indexer/scripts/scan-docs.sh script to get document context.

## Build, Test, and Development Commands

Install dependencies with `pnpm install`. Use `pnpm dev` for the local Next.js server. Database tasks rely on Drizzle: `pnpm seed` for baseline content and `pnpm seed:demo-users` for local dev accounts. For production artifacts run `pnpm build`.

## Coding Style & Naming Conventions

Write all components and modules in TypeScript with 2-space indentation. ESLint and Prettier configurations ship with the repo—run `pnpm lint` before opening a PR. Prefer PascalCase for components (`LessonOverviewCard`) and camelCase for functions, variables, and database fields. Keep files focused; collocate component-specific hooks or styles alongside the component.

## Testing Guidelines

Tests are organized by scope. Execute `pnpm test` for the full suite, `pnpm test:integration` for API-route / DB integration tests only, `pnpm exec vitest run --config vitest.unit.config.ts` for the DB-free unit subset, and `pnpm test:e2e` before deploys. Name test files with the `.test.ts` or `.spec.ts` suffix adjacent to the code under test (integration tests use `.integration.test.ts`). Seed deterministic fixtures inside each `beforeEach`/`afterEach` (truncate-and-reseed against Drizzle tables; see `app/api/lessons/[lessonSlug]/route.integration.test.ts` for the canonical pattern).

## Local Test Database

Integration tests run against an isolated Postgres database `science_advantage_test` on the same container the rest of the monorepo uses (port 5432). The schema is applied via Drizzle migrations.

**One-time setup:**

```bash
docker exec reading-advantage-postgres createdb -U postgres science_advantage_test
```

**Run integration tests** (`vitest.integration.config.ts` runs `drizzle-kit migrate` once via `globalSetup`, then your test files):

```bash
pnpm --filter science-advantage test:integration
```

**Override the test DB** (CI, remote DB, etc.):

```bash
TEST_DATABASE_URL=postgresql://user:pass@host:5432/my_test_db \
  pnpm --filter science-advantage test:integration
```

Resolution order (see `lib/test/resolve-test-database-url.ts`):
1. `TEST_DATABASE_URL` — used verbatim.
2. `DATABASE_URL` with `_test` appended to the pathname.
3. Built-in default: `postgresql://postgres:postgres@localhost:5432/science_advantage_test`.

**Troubleshooting `ERROR: type "StandardsAlignment" already exists`:** this means something tried to apply duplicate schema changes against a database that already has Drizzle migrations applied (e.g. the dev DB). The fix is always use Drizzle — Track 3 moved test-DB provisioning entirely to Drizzle. Use the commands above.

## Commit & Pull Request Guidelines

Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`) to keep history machine-readable. Keep commits scoped to a single concern and include context about affected modules. The Measure skill manages commit workflow during implementation (including git notes for auditability), so follow its conventions when working within a track. Pull requests should describe functional changes, list test commands executed, and attach screenshots or screen recordings for UI updates. Flag any schema or environment changes in the PR summary so reviewers can coordinate migrations.

## Environment & Security Tips

Duplicate `.env.example` into `.env.local` before development and populate credentials for PostgreSQL, OpenAI, Google Cloud Storage, and Redis. Never commit `.env*` files or production secrets. Rotate keys whenever rotating cloud resources, and confirm that Drizzle migrations run cleanly in staging before tagging a release.

### Local Auth Configuration Reminder

- Authentication is username/password-only via shared `@reading-advantage/auth`.
- Demo accounts are seeded with username/password credentials for local testing.
- A dev-only impersonation toggle is available when `DEV_AUTH_ENABLED=true`. Use the panel on `/signin` to assume teacher or student roles; the override stores an HTTP-only cookie and is automatically cleared on sign out.
- Any new feature must remain production-secure (no dev overrides leaking to prod) while still supporting the dev impersonation flow so manual QA can run locally.


## AI Collaboration Guidelines

- Default to the Measure spec-driven workflow. Use `/measure` to create tracks, implement tasks, check status, or revert work.
- Reference track specs in `measure/tracks/` before starting implementation and document requirement updates directly in those specs.
- Use GitHub issues and pull requests for coordination; Measure tracks complement issues rather than replacing them.
- When delegating to AI tooling, include the relevant spec excerpt, acceptance criteria, and test expectations so work stays aligned with the track's plan.

