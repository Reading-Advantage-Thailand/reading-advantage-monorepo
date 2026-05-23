# Repository Guidelines

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

Core application logic lives in `app/`, which follows the Next.js App Router layout with feature groups such as `(auth)` and `(dashboard)` plus API handlers under `app/api/`. Shared UI lives in `components/`, with `components/ui/` mirroring shadcn/ui primitives and `components/features/` collecting higher-level widgets. Cross-cutting utilities reside in `lib/` (auth, database client, helpers). Database schema, migrations, and seed scripts are maintained in `prisma/`, while static assets live in `public/` and extended documentation belongs in `docs/`.

The first thing the agent should do in any session is to run the .claude/skills/doc-indexer/scripts/scan-docs.sh script to get document context.

## Build, Test, and Development Commands

Install dependencies with `npm install`. Use `npm run dev` for the local Next.js server. Database tasks rely on Prisma: `npx prisma generate` to refresh the client, `npx prisma db push` to sync schema, and `npx prisma db seed` for baseline content. For production artifacts run `npm run build`; staging and production deploys use `npm run deploy:staging` and `npm run deploy:production`.

## Coding Style & Naming Conventions

Write all components and modules in TypeScript with 2-space indentation. ESLint and Prettier configurations ship with the repo—run `npm run lint` before opening a PR. Prefer PascalCase for components (`LessonOverviewCard`) and camelCase for functions, variables, and Prisma fields. Keep files focused; collocate component-specific hooks or styles alongside the component.

## Testing Guidelines

Tests are organized by scope. Execute `pnpm test` for the full suite, `pnpm test:integration` for API-route / DB integration tests only, `pnpm exec vitest run --config vitest.unit.config.ts` for the DB-free unit subset, and `pnpm test:e2e` before deploys. Name test files with the `.test.ts` or `.spec.ts` suffix adjacent to the code under test (integration tests use `.integration.test.ts`). Seed deterministic fixtures inside each `beforeEach`/`afterEach` (truncate-and-reseed against Drizzle tables; see `app/api/lessons/[lessonSlug]/route.integration.test.ts` for the canonical pattern).

## Local Test Database

Integration tests run against an isolated Postgres database `science_advantage_test` on the same container the rest of the monorepo uses (port 5432). The schema is applied via Drizzle migrations — Prisma is no longer involved in test-DB provisioning.

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

**Troubleshooting `ERROR: type "StandardsAlignment" already exists`:** this means something tried to run `prisma db push` against a database that already has Drizzle migrations applied (e.g. the dev DB). The fix is *never* point Prisma at the test DB — Track 3 moved test-DB provisioning entirely to Drizzle. Use the commands above, not `prisma db push`.

## Commit & Pull Request Guidelines

Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`) to keep history machine-readable. Keep commits scoped to a single concern and include context about affected modules. The Measure skill manages commit workflow during implementation (including git notes for auditability), so follow its conventions when working within a track. Pull requests should describe functional changes, list test commands executed, and attach screenshots or screen recordings for UI updates. Flag any schema or environment changes in the PR summary so reviewers can coordinate migrations.

## Environment & Security Tips

Duplicate `.env.example` into `.env.local` before development and populate credentials for PostgreSQL, NextAuth, Google OAuth, OpenAI, Google Cloud Storage, and Redis. Never commit `.env*` files or production secrets. Rotate keys whenever rotating cloud resources, and confirm that Prisma migrations run cleanly in staging before tagging a release.

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

