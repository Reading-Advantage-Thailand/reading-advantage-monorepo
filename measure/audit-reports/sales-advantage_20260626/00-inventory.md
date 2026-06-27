# Sales Advantage — Inventory

> Track: `sales_advantage_review_20260626`
> Parent: `monorepo_feature_review_masterplan_20260626`
> Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Source: synthesized from the 6 line-review batch reports (no source code read directly for this file beyond the batch artifacts).
> This is a review inventory only. It makes **no** acceptance or closeout claim.

## Coverage metrics

| Metric | Value |
|--------|-------|
| In-scope tracked files reviewed | 110 |
| Batches | 6 (`sales-batch-00` … `sales-batch-05`) |
| Batch reports | 6 |
| Total batch-report lines | 1,675 (384 + 228 + 214 + 272 + 409 + 168) |
| Distinct finding IDs catalogued | 138 (`F-SALES-B00-001`…`B05-022`) |
| Source code edited during review | none |

Batch line counts: B00=384, B01=228, B02=214, B03=272, B04=409, B05=168.

## Scope boundary

- Primary: `apps/sales-advantage`
- Shared sales domain: `packages/domain/src/sales`
- Sales schema: `packages/db/src/schema/sales.ts` + migration `0021_sales_advantage.sql`
- Transport: `packages/api/src/routers/sales.ts`
- AI multimodal adapter: `packages/ai` (source + test suite)
- Exclusions: `.next/**`, `node_modules/**`, `public/**`, `coverage/**`, `.turbo/**`

## File classification (by batch)

### App surface — `apps/sales-advantage` (batches 00–02)

**Pages / layouts (batch 00)**
- `app/layout.tsx`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx` (dashboard)
- `app/[locale]/module/[slug]/page.tsx`, `app/[locale]/lesson/[id]/page.tsx`
- `app/[locale]/admin/page.tsx`, `admin/[repId]/page.tsx`, `admin/create-rep/page.tsx`, `admin/curriculum/page.tsx`
- `app/globals.css`

**Route handlers (batch 00)**
- `app/api/auth/login/route.ts`, `logout/route.ts`, `session/route.ts`
- `app/api/chat/route.ts` (+ `__tests__/route.test.ts`)
- `app/api/lesson-complete/route.ts`
- `app/api/roleplay-attempts/route.ts` (+ `__tests__/route.test.ts`)
- `app/api/trpc/[trpc]/route.ts`

**Components (batch 01)**
- `chat-tutor.tsx`, `header.tsx`, `language-switcher.tsx`, `login-form.tsx`, `providers.tsx`
- `quiz-component.tsx`, `roleplay-recorder.tsx`, `roleplay-result.tsx`

**i18n / lib / config (batches 01–02)**
- `i18n/{navigation,request,routing}.ts`, `lib/{i18n-font,i18n-messages,rate-limit,trpc}.ts`, `lib/__tests__/setup.ts`
- `messages/{en,th}.json`
- `next.config.ts`, `next-env.d.ts`, `package.json`, `postcss.config.mjs`, `proxy.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`

**Seeds (batch 02)**
- `scripts/sales-curriculum-seed.ts` (AI-generated curriculum, lands `draft`)
- `scripts/static-seed.ts` (hand-authored, lands `approved`)

### AI adapter — `packages/ai` (batches 02–04)

- Source: `src/client.ts`, `src/index.ts` (barrel), `src/errors.ts`, `src/types.ts`
- Providers: `providers/{google,openai,openrouter,mock}.ts`
- Tests: full `__tests__/phase-*` suite + provider `*.test.ts` + `contract-suite.ts`, fixtures, snapshots
- Docs/config: `README.md`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`

### Sales domain — `packages/domain/src/sales` (batches 04–05)

- `contracts.ts`, `errors.ts`, `index.ts`, `mutations.ts`, `permissions.ts`, `queries.ts`, `roleplay-evaluator.ts`, `schema.ts`
- Tests: `__tests__/{excerpt-derivation,permissions-and-evaluator}.test.ts`, plus `packages/domain/src/__tests__/sales-{mutations,queries,roleplay-evaluator}.test.ts`

### Transport + DB (batch 04)

- `packages/api/src/routers/sales.ts` (+ `__tests__/sales-router.test.ts`)
- `packages/db/src/schema/sales.ts`, `drizzle/0021_sales_advantage.sql`, `__tests__/sales-schema-parity.test.ts`

## Sales domain functions (observed via reviews)

| Function | File | Role gate observed |
|----------|------|--------------------|
| `getModules` | queries.ts | (read) |
| `getModuleBySlug` | queries.ts | (read) |
| `getLesson` | queries.ts | approval-gated |
| `getScenario` / `getAttemptsForScenario` | queries.ts | userId-scoped (attempts) |
| `getProgressForUser` / `getDashboardData` | queries.ts | (read) |
| `getCohortOverview` | queries.ts | admin |
| `getRoleplayEvaluationContext` | queries.ts | FR-4 excerpt sourcing |
| `submitQuiz` | mutations.ts | rep |
| `saveChatMessage` | mutations.ts | rep |
| `createRoleplayAttempt` | mutations.ts | `sales:attempt:create` |
| `saveAttemptEvaluation` | mutations.ts | `sales:attempt:create` |
| `submitRoleplayAttempt` | mutations.ts | orchestrator |
| `markTheoryLessonComplete` | mutations.ts | rep |
| `approveCurriculumContent` | mutations.ts | admin |
| `createRepAccount` | mutations.ts | admin |

## Sales schema tables (`sales_*`, all REFERENTIAL, no `schoolId`)

`sales_modules`, `sales_lessons`, `sales_rubrics`, `sales_roleplay_scenarios`, `sales_quiz_questions`, `sales_roleplay_attempts`, `sales_progress`, `sales_chat_messages`, `sales_chat_conversations` (9 tables per parity test).

## Enums / contracts of note

- `reviewStatus` enum (`draft`/`approved`) gates curriculum visibility.
- Roleplay evaluation output schema: `overallScore`, `passed`, `criteria`, `feedback`, `transcriptExcerpt`.
- AI provider capability: audio multimodal supported by `google` + `openrouter`, **not** `openai` (`UnsupportedError`).
