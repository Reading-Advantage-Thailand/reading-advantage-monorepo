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
- [~] Task: Replace custom validator with Zod and add exhaustive schema-edge-case tests.
  - Evidence: current `scriptSchema` is a custom `safeParse` object, not Zod.

## Phase 4: Scene Editor

- [x] Task: Implement pure scene-editor utilities in `apps/marketing/app/lib/scene-editor.ts`.
  - `reorderScenes`, `addScene`, `removeScene`.
- [x] Task: Add unit tests for scene-editor utilities.
  - Evidence: `apps/marketing/app/__tests__/phase-6-script.test.ts` covers immutable reorder/add/remove behavior and passed 24/24 on 2026-06-29.

## Phase 5: API Routes & Campaign Video Page

- [x] Task: Implement `apps/marketing/app/api/video/projects/route.ts`.
- [x] Task: Build `apps/marketing/app/campaigns/[id]/video/page.tsx`.
  - Topic input, script generation trigger, scene editor UI.
- [~] Task: Add component-level tests for the video page.
  - Evidence: existing tests include source-level wiring assertions; no component-rendering test is present.
- [x] Task: Run marketing type/lint gates and record evidence.
  - Evidence: `CI=true pnpm --filter marketing check-types` passed on 2026-06-29.
  - Evidence: `CI=true pnpm --filter marketing lint` exited 0 on 2026-06-29 with existing warnings.

## Phase 6: Project Persistence

- [~] Task: Wire project list/create endpoints to `video_projects` table.
  - Evidence: POST create exists and is tested with a mocked DB; GET/list is not implemented in `apps/marketing/app/api/video/projects/route.ts`.
- [~] Task: Add integration tests for project CRUD.
  - Evidence: current coverage proves mocked POST insert and invalid-script rejection only; it does not prove list/create round-trip behavior against a live DB.

## Phase 7: QA, Build, and Closeout

- [~] Task: Run `CI=true pnpm --filter marketing test` — all marketing tests green.
  - Current evidence: red on 2026-06-29 due phase-1 boot/phase-3 settings tests, outside the video route slice but still part of the marketing aggregate gate.
- [~] Task: Run `CI=true pnpm --filter marketing build` — green.
  - Current evidence: red on 2026-06-29 with `vinext build` failing on `vite` export `parseSync`.
- [~] Task: Manual/live QA: generate a script, edit scenes, and save a project with a mocked or non-production LLM key.
- [~] Task: Update `measure/tech-debt.md` / `lessons-learned.md` only if closeout discovers new durable debt or a reusable lesson.
- [~] Task: Move track to `measure/archive/` and update `measure/tracks.md` to `[x]` after all closeout gates are green or explicitly accepted.

---

## Risk Register

- **LLM output reliability:** Thai script generation may return malformed JSON; current route returns 500 with the validation error. Consider adding a retry loop or structured-error response.
- **App-local AI client:** `apps/marketing/app/lib/ai` is separate from `packages/ai`; future tracks should evaluate whether to consolidate.
- **Missing formal track until now:** The work was committed without a registered spec/plan, so acceptance criteria were implicit. This plan is retroactive.
- **Migration artifact drift:** The repo's current migration filename/tag does not match the older marketing schema tests. Treat this as a plan/test contract reconciliation issue before marking Phase 1 complete.
- **Aggregate-suite red state:** The full marketing test/build gates currently fail for non-video reasons; closeout must either fix those failures or document an accepted aggregate-suite exception without claiming the full suite is green.
