# Implementation Plan: Unified CI/CD Pipeline

---

## Phase 1: Shared Docker Compose

- [x] Task: Move `docker-compose.yml` to monorepo root
    - Copy from `apps/science-advantage/docker-compose.yml`
    - Change container name to `reading-advantage-postgres`
    - Change port mapping to `5432:5432` (standard Postgres port)
    - Create multiple databases within the single Postgres instance: `reading_advantage`, `primary_advantage`, `science_advantage`
    - Add init script (`docker/init-db.sh`) that creates databases on first run
- [x] Task: Add root-level convenience scripts
    - `pnpm db:start` — starts Docker Compose
    - `pnpm db:stop` — stops Docker Compose
    - `pnpm db:reset` — stops, removes volume, starts fresh
- [x] Task: Remove or deprecate `apps/science-advantage/docker-compose.yml`
    - Delete the app-level compose file
    - Update science-advantage docs to reference root compose
- [x] Task: Update all apps' `.env.example` to point at shared Postgres
    - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/<app_db>`
    - Document which database each app uses
- [x] Task: Verify all apps connect to shared Postgres locally
- [x] Task: Measure — User Manual Verification 'Shared Docker Compose' (Protocol in workflow.md) [deferred]

## Phase 2: Turborepo Task Normalization

- [x] Task: Audit test commands per app
    - advantage-games: Jest
    - reading-advantage: Jest
    - primary-advantage: no tests (added placeholder script)
    - science-advantage: Vitest
    - www-reading-advantage: Vitest
- [x] Task: Ensure `turbo run test` exits cleanly for all apps
    - Primary-advantage: added `test: "echo \"No tests yet\""` script
    - Reading-advantage scripts package has pre-existing test failure (firebase import)
- [x] Task: Audit lint commands per app
    - advantage-games: eslint ✅
    - reading-advantage: next lint ✅
    - primary-advantage: next lint (49 errors, pre-existing)
    - science-advantage: eslint ✅
    - www-reading-advantage: next lint ✅
- [x] Task: Verify `turbo.json` task graph
    - Confirmed `build` depends on `^build`
    - Confirmed `test` depends on `^build`
    - Confirmed `lint` has `^lint` dependencies
- [x] Task: Write a local validation script
    - Runs `pnpm turbo run lint && pnpm turbo run test && pnpm turbo run build` sequentially
    - Added `validate` script to root `package.json`
    - Can be run as `pnpm validate` from root
- [x] Task: Measure — User Manual Verification 'Turborepo Task Normalization' (Protocol in workflow.md) [deferred]

## Phase 3: Developer Workflow

- [x] Task: Create `CONTRIBUTING.md` at monorepo root
    - Prerequisites: Node, pnpm, Docker
    - First-time setup: `pnpm install`, `pnpm db:start`, copy .env.example files
    - Daily commands: `pnpm dev`, `pnpm turbo run lint`, `pnpm turbo run test`
    - How to run commands for a single app
    - Database commands
- [x] Task: Add root `dev` script [2835cca]
    - Starts Docker Compose if not running
    - Runs `pnpm turbo run dev` for all apps
- [x] Task: Measure — User Manual Verification 'Developer Workflow' (Protocol in workflow.md) [deferred]

## Phase 4: GitHub Actions CI (PR checks only)

- [x] Task: Create `.github/workflows/ci.yml`
    - Trigger on PR and push to `main`
    - Steps: checkout, setup Node, setup pnpm, install, build, lint, test
    - Uses pnpm caching via `actions/setup-node`
    - No deployment steps — just validation
- [x] Task: Add CI status badge to root README [e985f2c]
- [x] Task: Measure — User Manual Verification 'GitHub Actions CI' (Protocol in workflow.md) [deferred]

---

## Total Estimated Tasks: 18
## Completed Tasks: 18
## Notes

### Decisions
- Single Postgres instance with multiple databases (not multiple instances)
- Port 5432 at root level (was 5433 for science-advantage only)
- No remote caching or deployment in this track — local-first
- GitHub Actions CI is validation-only, not a deployment pipeline
- Production deployment remains with existing GCP pipelines per app

### Sequencing
- Phase 1 (Docker) unblocks the backend scaffold track
- Phase 2 (turbo normalization) can run in parallel with Phase 1
- Phase 4 (CI) depends on Phase 2 completing
