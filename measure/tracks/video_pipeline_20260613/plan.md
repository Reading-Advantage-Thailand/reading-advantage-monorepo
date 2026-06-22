# Implementation Plan: Marketing Video Production Pipeline

> **Track ID:** `video_pipeline_20260613`  
> **App:** `apps/marketing`  
> **Methodology:** Contract-First TDD. Tasks are marked `[x]` when both Red tests and Green implementation are committed.

---

## Phase 1: Marketing Schema

- [x] Task: Add marketing tables (`settings`, `past_topics`, `video_projects`) in `packages/db/src/schema/marketing.ts` or extend existing schema.
  - `settings` (key, value) — already present; add LLM keys if absent.
  - `past_topics` (id, app, topic, createdAt).
  - `video_projects` (id, app, topic, script jsonb, status, createdAt, updatedAt).
- [x] Task: Generate Drizzle migration `0021_marketing_tables.sql`.
- [x] Task: Export tables from `packages/db/src/schema/index.ts`.
- [ ] Task: Add schema-parity / table-existence tests.

## Phase 2: Topic Research & Deduplication

- [x] Task: Write Red wiring tests — `apps/marketing/app/__tests__/phase-5-topics.test.ts`.
  - Assert `apps/marketing/app/api/video/research-topics/route.ts` exports POST.
  - Assert `apps/marketing/app/api/video/save-topics/route.ts` exports POST.
- [x] Task: Implement `save-topics` route with deduplication against `past_topics`.
- [x] Task: Implement helper `deduplicateTopics(topics, existing)`.
- [ ] Task: Add full unit tests for deduplication logic and route behavior.

## Phase 3: Script Generation Prompt & Schema

- [x] Task: Design Thai script prompt in `apps/marketing/app/lib/script-generation.ts`.
- [x] Task: Define scene/script schema in `apps/marketing/app/lib/script-schema.ts`.
- [x] Task: Write Red wiring tests — `apps/marketing/app/__tests__/phase-6-script.test.ts`.
  - Assert `apps/marketing/app/api/video/generate-script/route.ts` exports POST.
- [x] Task: Implement `generate-script` route using settings-driven `createAIClient`.
- [ ] Task: Replace custom validator with Zod and add exhaustive schema-edge-case tests.

## Phase 4: Scene Editor

- [x] Task: Implement pure scene-editor utilities in `apps/marketing/app/lib/scene-editor.ts`.
  - `reorderScenes`, `addScene`, `removeScene`.
- [ ] Task: Add unit tests for scene-editor utilities.

## Phase 5: API Routes & Campaign Video Page

- [x] Task: Implement `apps/marketing/app/api/video/projects/route.ts`.
- [x] Task: Build `apps/marketing/app/campaigns/[id]/video/page.tsx`.
  - Topic input, script generation trigger, scene editor UI.
- [ ] Task: Add component-level tests for the video page.
- [ ] Task: Run `pnpm turbo run lint check-types --filter=marketing` and fix issues.

## Phase 6: Project Persistence

- [x] Task: Wire project list/create endpoints to `video_projects` table.
- [ ] Task: Add integration tests for project CRUD.

## Phase 7: QA, Build, and Closeout

- [ ] Task: Run `pnpm turbo run test --filter=marketing` — all marketing tests green.
- [ ] Task: Run `pnpm turbo run build --filter=marketing` — green.
- [ ] Task: Manual QA: generate a script, edit scenes, save project with mocked LLM.
- [ ] Task: Update `measure/tech-debt.md` / `lessons-learned.md` if needed.
- [ ] Task: Move track to `measure/archive/` and update `measure/tracks.md` to `[x]`.

---

## Risk Register

- **LLM output reliability:** Thai script generation may return malformed JSON; current route returns 500 with the validation error. Consider adding a retry loop or structured-error response.
- **App-local AI client:** `apps/marketing/app/lib/ai` is separate from `packages/ai`; future tracks should evaluate whether to consolidate.
- **Missing formal track until now:** The work was committed without a registered spec/plan, so acceptance criteria were implicit. This plan is retroactive.
