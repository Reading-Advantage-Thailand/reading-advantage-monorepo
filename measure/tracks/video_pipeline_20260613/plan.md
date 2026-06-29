# Implementation Plan: Marketing Video Production Pipeline

> **Track ID:** `video_pipeline_20260613`  
> **App:** `apps/marketing`  
> **Methodology:** Contract-First TDD. Tasks are marked `[x]` when both Red tests and Green implementation are committed; `[~]` means executable work remains. Legacy `[ ]` markers were reconciled on 2026-06-29.

---

## Phase 1: Marketing Schema

- [x] Task: Add marketing tables (`settings`, `past_topics`, `video_projects`) in `packages/db/src/schema/marketing.ts` or extend existing schema.
  - `settings` (key, value) — present.
  - `past_topics` (id, app, topic, createdAt) — present as `pastTopics`.
  - `video_projects` (id, campaignId, topic, script jsonb, status, createdAt) — present as `videoProjects`.
- [x] Task: Reconcile the migration artifact for the marketing tables.
  - Evidence: canonical migration is `packages/db/drizzle/0021_sales_advantage.sql` (combined Sales Advantage + marketing tables). Journal tag is `0021_sales_advantage`; sentinel target is `sales_modules`.
  - Red reconciled on 2026-06-29: updated `phase-2-marketing-schema.test.ts` and `phase-2-marketing-schema-adversarial.test.ts` to reference the canonical file/tag, scoped marketing FK cascade assertions to the two marketing ALTER TABLE blocks, and matched Drizzle-generated `CREATE TABLE` / `CREATE INDEX` / `CREATE TYPE` syntax (no `IF NOT EXISTS`, `public.` schema prefix, `AS ENUM(` no space).
  - Command: `CI=true pnpm --filter @reading-advantage/db test phase-2-marketing-schema` → 79/79 passing on 2026-06-29.
  - Command: `CI=true pnpm --filter @reading-advantage/db check-types` → passing on 2026-06-29.
- [x] Task: Export tables from `packages/db/src/schema/index.ts`.
- [x] Task: Repair schema-parity / table-existence tests so they verify the canonical migration artifact and schema exports without stale path assumptions.
  - Evidence: `phase-2-marketing-schema.test.ts` now reads `0021_sales_advantage.sql`, asserts journal tag `0021_sales_advantage` at idx 21, sentinel probe `0021_sales_advantage`, marketing table/column presence, marketing FK cascades scoped to the two marketing ALTER TABLE blocks, and schema exports from `packages/db/src/schema/index.ts`.
  - Evidence: `phase-2-marketing-schema-adversarial.test.ts` verifies Drizzle metadata, enum parity, schema⇄SQL cross-consistency, snapshot FK integrity, and consumer contracts for `apps/marketing`.
  - Command: `CI=true pnpm --filter @reading-advantage/db test phase-2-marketing-schema` → 79/79 passing on 2026-06-29.

## Phase 2: Topic Research & Deduplication

- [x] Task: Write Red wiring tests — `apps/marketing/app/__tests__/phase-5-topics.test.ts`.
  - Assert `apps/marketing/app/api/video/research-topics/route.ts` exports POST.
  - Assert `apps/marketing/app/api/video/save-topics/route.ts` exports POST.
- [x] Task: Implement `research-topics` and `save-topics` routes with deduplication against `past_topics`.
- [x] Task: Implement helper `deduplicateTopics(topics, existing)`.
- [x] Task: Add unit/route tests for topic prompt construction, Thai/Latin normalization, duplicate skipping, and route behavior.
  - Evidence: `CI=true pnpm --filter marketing test phase-5-topics` passed 18/18 on 2026-06-29.

## Phase 3: Script Generation Prompt & Schema

- [x] Task: Design Thai script prompt in `apps/marketing/app/lib/script-generation.ts`.
- [x] Task: Define initial scene/script schema in `apps/marketing/app/lib/script-schema.ts`.
- [x] Task: Write Red wiring tests — `apps/marketing/app/__tests__/phase-6-script.test.ts`.
  - Assert `apps/marketing/app/api/video/generate-script/route.ts` exports POST.
- [x] Task: Implement `generate-script` route using settings-driven `createAIClient`.
- [x] Task: Replace custom validator with Zod and add exhaustive schema-edge-case tests.
  - Red evidence (2026-06-29): added Zod-contract tests to `apps/marketing/app/__tests__/phase-6-script.test.ts`.
    - Requires `scriptSchema` to expose a Zod `parse` method.
    - Requires `safeParse` failures to return `ZodError` `issues` with path details.
    - Requires rejection of <5 scenes, >7 scenes, empty-string fields, non-string field types, and extra unknown fields (strict scene contract).
    - Covers acceptance of exactly 5, 6, and 7 scenes.
  - Red failure snapshot (2026-06-29): `CI=true pnpm --filter marketing test phase-6-script` → 25 passed, 7 failed.
  - Green implementation (2026-06-29, commit `d148c1de`): replaced the custom validator in `apps/marketing/app/lib/script-schema.ts` with `z.array(z.object({...}).strict()).min(5).max(7)`, declared `zod ^3.25.76` as a direct dependency in `apps/marketing/package.json`, and updated `pnpm-lock.yaml` for the new direct importer.
  - Green gate: `CI=true pnpm --filter marketing test phase-6-script` → 32/32 passing, and `CI=true pnpm --filter marketing check-types` exit 0 (2026-06-29).

## Phase 4: Scene Editor

- [x] Task: Implement pure scene-editor utilities in `apps/marketing/app/lib/scene-editor.ts`.
  - `reorderScenes`, `addScene`, `removeScene`.
- [x] Task: Add unit tests for scene-editor utilities.
  - Evidence: `apps/marketing/app/__tests__/phase-6-script.test.ts` covers immutable reorder/add/remove behavior and passed 24/24 on 2026-06-29.

## Phase 5: API Routes & Campaign Video Page

- [x] Task: Implement `apps/marketing/app/api/video/projects/route.ts`.
- [x] Task: Build `apps/marketing/app/campaigns/[id]/video/page.tsx`.
  - Topic input, script generation trigger, scene editor UI.
- [x] Task: Add component-level tests for the video page.
  - Red evidence (2026-06-29): added `apps/marketing/app/__tests__/phase-7-video-page.test.tsx` with jsdom-based React Testing Library tests covering campaign load, topic research, approve/select topic, script generation trigger, scene editor reorder, and save-project action.
  - Added test dependencies (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`) to `apps/marketing/package.json` and configured `esbuild.jsx: "automatic"` in `apps/marketing/vitest.config.ts` so component JSX can render in the test harness.
  - Command: `CI=true pnpm --filter marketing test phase-7-video-page` → 6/7 passing, 1 failing because Step 3 does not display the selected approved topic text to the user.
  - Command: `CI=true pnpm --filter marketing check-types` → passing.
  - Green implementation (2026-06-29): updated `apps/marketing/app/campaigns/[id]/video/page.tsx` to derive `activeTopic` from `topics` + `activeTopicId` and render the selected topic's text inside the Step 3 card before generation, so users can see which approved topic they are about to script.
  - Green gate: `CI=true pnpm --filter marketing test phase-7-video-page` → 7/7 passing, and `CI=true pnpm --filter marketing check-types` exit 0 (2026-06-29, commit `96657859`).
- [x] Task: Run marketing type/lint gates and record evidence.
  - Evidence: `CI=true pnpm --filter marketing check-types` passed on 2026-06-29.
  - Evidence: `CI=true pnpm --filter marketing lint` exited 0 on 2026-06-29 with existing warnings.

## Phase 6: Project Persistence

- [x] Task: Wire project list/create endpoints to `video_projects` table.
  - Evidence: POST create exists and is wired to `db.insert(videoProjects)`; GET/list is implemented in `apps/marketing/app/api/video/projects/route.ts` (filters by `campaignId` query param via `db.select().from(videoProjects).where(eq(videoProjects.campaignId, campaignId))` and returns 400 if `campaignId` is missing).
  - Red evidence (2026-06-29): `CI=true pnpm --filter marketing test phase-8-projects` → 2 failed, 2 passed. Failures: `exports both GET and POST handlers` (expected GET to be a function, received undefined) and `returns projects from the mocked DB result for a campaign` (GET is not a function).
  - Green evidence (2026-06-29, commit `e6b9d4ed`): added `GET` export that parses `campaignId` from query string, calls `db.select().from(videoProjects).where(eq(videoProjects.campaignId, campaignId))`, and returns the rows. `CI=true pnpm --filter marketing test phase-8-projects` → 4/4 passing, `CI=true pnpm --filter marketing check-types` exit 0.
- [x] Task: Add integration tests for project CRUD.
  - Evidence: added `apps/marketing/app/__tests__/phase-8-projects.test.ts` with mocked-DB tests covering GET list, POST create returning the mocked DB row (not a fabricated response), and invalid-script 400 rejection.
  - Evidence: added `apps/marketing/app/__tests__/phase-8-projects-live.test.ts` with PGlite-backed live integration tests covering POST create → DB insert, JSONB script persistence, GET list scoped by campaignId, and missing-campaignId 400. Uses `apps/marketing/app/__tests__/helpers/testDb.ts` (in-process Postgres) and proxies `@reading-advantage/db` to the PGlite drizzle instance.
  - Red evidence (2026-06-29): the two GET/list assertions fail because the route exports only POST; the POST create and invalid-script assertions pass.
  - Live-CRUD evidence (2026-06-29): `CI=true pnpm --filter marketing test phase-8-projects-live` → 3/3 passing; `CI=true pnpm --filter marketing test phase-8-projects` → 4/4 passing; `CI=true pnpm --filter marketing check-types` → exit 0.
  - Note: `@electric-sql/pglite` added to `apps/marketing/package.json` devDependencies as test-only infrastructure. Live CRUD is now automated; no human-gated manual proof is required for this task.

## Phase 7: QA, Build, and Closeout

- [x] Task: Run `CI=true pnpm --filter marketing test` — all marketing tests green.
  - Evidence (2026-06-30, commit `6df13c35`): fixed the Phase 3 adversarial `POST /api/settings/test-connection` API-key echo by redacting the caller-supplied `apiKey` from the upstream SDK error message before returning it to the client. The route now scrubs known secrets via `redactSecrets(message, [apiKey])` and deliberately does not log the raw error (the upstream message may itself contain the secret).
  - Green gate (2026-06-30, commit `6df13c35`): `CI=true pnpm --filter marketing test` → 151/151 passing across 10 test files; `CI=true pnpm --filter marketing check-types` → exit 0; `CI=true pnpm --filter marketing test phase-3-settings-adversarial` → 18/18 passing.
- [~] Task: Run `CI=true pnpm --filter marketing build` — green.
  - Current evidence: red on 2026-06-29 with `vinext build` failing on `vite` export `parseSync`. Per Jr-Green scope, this task is intentionally NOT flipped to `[x]` even though the aggregate test gate is now green — the build failure is unrelated to the test-connection redaction fix and requires a separate remediation track.
- [b] Task: Manual/live QA: generate a script, edit scenes, and save a project with a mocked or non-production LLM key.
  - deferred:phikul — requires Phikul to drive a live end-to-end session against the running marketing app. Out of scope for AI agents; verification-checkpoint rule forbids fabrication of QA notes.
- [~] Task: Update `measure/tech-debt.md` / `lessons-learned.md` only if closeout discovers new durable debt or a reusable lesson.
- [b] Task: Move track to `measure/archive/` and update `measure/tracks.md` to `[x]` after all closeout gates are green or explicitly accepted.
  - deferred:closeout-steward — archive movement and registry updates are closeout-steward responsibilities, not Jr-Green scope. The build task is still `[~]`, so archive is not yet appropriate even though the aggregate test gate is green.

---

## Risk Register

- **LLM output reliability:** Thai script generation may return malformed JSON; current route returns 500 with the validation error. Consider adding a retry loop or structured-error response.
- **App-local AI client:** `apps/marketing/app/lib/ai` is separate from `packages/ai`; future tracks should evaluate whether to consolidate.
- **Missing formal track until now:** The work was committed without a registered spec/plan, so acceptance criteria were implicit. This plan is retroactive.
- **Migration artifact drift:** The repo's current migration filename/tag does not match the older marketing schema tests. Treat this as a plan/test contract reconciliation issue before marking Phase 1 complete.
- **Aggregate-suite red state:** The full marketing test/build gates currently fail for non-video reasons; closeout must either fix those failures or document an accepted aggregate-suite exception without claiming the full suite is green.
