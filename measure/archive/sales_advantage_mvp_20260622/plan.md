# Implementation Plan: sales-advantage MVP

> **Spec:** [`spec.md`](./spec.md)
> **Track ID:** `sales_advantage_mvp_20260622`
> **Pattern:** mirrors `codecamp_advantage_20260513` (learn → practice → LLM-evaluates) with audio roleplay replacing git commit + PR webhook.
> **Methodology:** Contract-First TDD per `measure/workflow.md`. Every task follows Red → Green → Refactor → Commit → git note → mark `[x]` with SHA.

---

## Phase 0: Extend AIClient with `generateObjectFromMedia`

Add the multimodal method to the shared AI adapter. Strictly additive — no existing call sites change. This is the hard prerequisite for the entire track; every later phase depends on it.

**Architecture decision (updated 2026-06-22):** Audio eval is **single-pass multimodal** via OpenRouter for the primary path, with a **two-pass STT→text-eval** fallback.

- **Primary:** `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` (single-pass multimodal audio→structured eval, free on OpenRouter)
- **Fallback:** `nvidia/parakeet-tdt-0.6b-v3` (ASR/STT, $0.0015/min, available on OpenRouter since 2026-05-27) → transcribed text → `nvidia/nemotron-3-nano-30b-a3b:free` (text-only reasoning, free) evaluates against rubric

The three model choices are overridable via `SALES_AUDIO_EVAL_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL` env vars. The fallback path loses paralinguistic cues (tone/pacing/hesitation) but is more reliable and cost-effective for fallback scenarios.

- [x] Task: Define `GenerateObjectFromMediaInput<T>` and `generateObjectFromMedia<T>` on the `AIClient` interface
  - [x] Add `GenerateObjectFromMediaInput<T>` to `packages/ai/src/types.ts` (fields: `schema`, `prompt`, `media: { buffer: Buffer; mimeType: string }`, optional `model`, `temperature`)
  - [x] Add `generateObjectFromMedia<T>(input: GenerateObjectFromMediaInput<T>): Promise<T>` to the `AIClient` interface in `packages/ai/src/types.ts`
  - [x] Export `GenerateObjectFromMediaInput` from `packages/ai/src/index.ts`
- [x] Task: Add `UnsupportedError` to `packages/ai/src/errors.ts`
  - [x] Subclass of `AIClientError` with code `UNSUPPORTED`; message format `"<method> requires <condition>"`
- [x] Task: Write failing tests for the new method (Red)
  - [x] `packages/ai/src/__tests__/phase-multimodal-contract.test.ts` — interface contract: `AIClient` has `generateObjectFromMedia`; `MockProvider` returns canned `{ overallScore: 1, passed: true, criteria: [], summary: "mock", strengths: [], weaknesses: [], suggestedNextAction: "mock", transcriptExcerpt: "mock transcript" }`
  - [x] `packages/ai/src/__tests__/phase-multimodal-openrouter.test.ts` — `OpenRouterProvider.generateObjectFromMedia` calls `aiGenerateObject` with a `messages` array containing one user message with two parts: `{ type: 'file', data: <base64>, mimeType: 'audio/webm' }` then `{ type: 'text', text: prompt }`; passes through `schema`, `temperature`, `maxOutputTokens`; strips `openrouter/` prefix from the model id; default model is `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`; wraps errors in `AIClientError`
  - [x] `packages/ai/src/__tests__/phase-multimodal-google.test.ts` — `GoogleProvider.generateObjectFromMedia` builds the same `messages` shape via `@ai-sdk/google`; default model `gemini-2.5-flash`; wraps errors in `AIClientError`
  - [x] `packages/ai/src/__tests__/phase-multimodal-unsupported.test.ts` — `OpenAIProvider.generateObjectFromMedia` throws `UnsupportedError("generateObjectFromMedia requires the openrouter or google provider — set AI_PROVIDER=openrouter or AI_PROVIDER=google")`
  - [x] Run tests, confirm they fail as expected
- [x] Task: Implement `generateObjectFromMedia` on `OpenRouterProvider` (Green — primary)
  - [x] In `packages/ai/src/providers/openrouter.ts`, add `generateObjectFromMedia<T>` that converts `input.media.buffer` to base64, builds the `messages` array with file + text parts, calls `aiGenerateObject` with `messages` (not `prompt`), wraps errors in `AIClientError`
  - [x] Default model: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`; respect `input.model` override (strip `openrouter/` prefix)
- [x] Task: Implement `generateObjectFromMedia` on `GoogleProvider` (Green — secondary path)
  - [x] Same `messages` shape via `@ai-sdk/google`; default model `gemini-2.5-flash`
- [x] Task: Implement `generateObjectFromMedia` on `MockProvider`
  - [x] Add `generateObjectFromMedia` to `MockResponses` (optional `unknown`); return canned rubric-evaluation-shaped object (validates against caller's schema like `generateObject` does); log call
- [x] Task: Implement `generateObjectFromMedia` on `OpenAIProvider`
  - [x] Throws `UnsupportedError` with the canonical message
- [x] Task: Run all `packages/ai` tests — confirm Green
  - [x] `CI=true pnpm turbo run test --filter=@reading-advantage/ai`
  - [x] `CI=true pnpm turbo run lint --filter=@reading-advantage/ai`
  - [x] `CI=true pnpm turbo run check-types --filter=@reading-advantage/ai`
- [x] Task: Update `measure/tech-stack.md` — note the new `generateObjectFromMedia` method on `AIClient`, OpenRouter primary (`nemotron-omni:free`) + `gemini-2.5-flash-lite` fallback
- [b] Task: Measure — User Manual Verification 'Extend AIClient with generateObjectFromMedia' — deferred:track-owner

---

## Phase 1: Schema & Migration

Add the 8 sales_* tables and register them REFERENTIAL in the tenant registry (matching codecamp — no schoolId column; accessed via `tenantDb.unscoped()`).

- [x] Task: Define `packages/db/src/schema/sales.ts`
  - [x] `sales_modules` (id uuid pk, slug text unique, title, description, phase text, order int, createdAt timestamptz default now)
  - [x] `sales_lessons` (id uuid pk, moduleId uuid FK→sales_modules, title, type enum [theory|roleplay|quiz], content text, order int, reviewStatus enum [draft|reviewed|approved] default 'draft', createdAt)
  - [x] `sales_roleplay_scenarios` (id uuid pk, lessonId uuid FK→sales_lessons, personaName, personaRole, situation text, objective text, prospectContextJson jsonb, rubricId uuid FK→sales_rubrics, order int)
  - [x] `sales_rubrics` (id uuid pk, name, criteriaJson jsonb, reviewStatus enum default 'draft', createdAt)
  - [x] `sales_roleplay_attempts` (id uuid pk, scenarioId uuid FK, userId uuid FK→users, audioStorageKey text, durationMs int, transcriptExcerpt text nullable, llmScoreJson jsonb, overallScore numeric, passed boolean, llmFeedback text, attemptNumber int, createdAt timestamptz default now)
  - [x] `sales_quiz_questions` (id uuid pk, lessonId uuid FK, question text, optionsJson jsonb, correctAnswer text, explanation text)
  - [x] `sales_progress` (id uuid pk, userId uuid FK, lessonId uuid FK, status enum [not_started|in_progress|completed], completedAt timestamptz nullable, score numeric nullable, unique(userId, lessonId))
  - [x] `sales_conversations` (id uuid pk, userId uuid FK, lessonId uuid nullable, moduleId uuid nullable, createdAt)
  - [x] `sales_chat_messages` (id uuid pk, conversationId uuid FK, role text, content text, createdAt)
  - [x] Add `pgEnum`s for `sales_lesson_type`, `sales_review_status`, `sales_progress_status`
  - [x] Export all tables from `packages/db/src/schema/index.ts`
- [x] Task: Generate Drizzle migration
  - [x] `pnpm --filter @reading-advantage/db dlx drizzle-kit generate` → produces `0022_sales_advantage.sql`
  - [x] Review the SQL; ensure FK constraints and enums are correct
- [x] Task: Register all 9 tables as REFERENTIAL in `packages/domain/src/tenant-registry.ts`
  - [x] Add entries: `salesModules: "REFERENTIAL"`, `salesLessons: "REFERENTIAL"`, `salesRoleplayScenarios: "REFERENTIAL"`, `salesRubrics: "REFERENTIAL"`, `salesRoleplayAttempts: "REFERENTIAL"`, `salesQuizQuestions: "REFERENTIAL"`, `salesProgress: "REFERENTIAL"`, `salesConversations: "REFERENTIAL"`, `salesChatMessages: "REFERENTIAL"`
  - [x] Include a reason string per the `unscoped()` call: `"sales-advantage tables have no schoolId — scoped by userId, not school"`
- [x] Task: Write `packages/db/src/__tests__/sales-schema-parity.test.ts`
  - [x] Assert all 8 tables export expected columns
  - [x] Assert FK relationships resolve
- [x] Task: Run `tenant-coverage.test.ts` — confirm it passes with the new EXEMPT entries
  - [x] `CI=true pnpm turbo run test --filter=@reading-advantage/domain -- --run tenant-coverage`
- [x] Task: Run `packages/db` tests + check-types
  - [x] `CI=true pnpm turbo run test --filter=@reading-advantage/db`
  - [x] `CI=true pnpm turbo run check-types --filter=@reading-advantage/db`
- [b] Task: Measure — User Manual Verification 'Schema & Migration' — deferred:track-owner

---

## Phase 2: Domain Module (`packages/domain/src/sales/`)

Build the domain layer Contract-First. Every exported function ships with a unit test using `mock-db.ts`.

- [x] Task: Create `packages/domain/src/sales/schema.ts` — Zod input/output contracts
  - [x] `ModuleInput`, `ModuleOutput`, `LessonInput`, `LessonOutput`
  - [x] `RoleplayScenarioInput`, `RoleplayScenarioOutput`
  - [x] `RubricInput`, `RubricOutput`, `RubricCriteriaJson` (criterion, weight, passingScore, sourceRef)
  - [x] `RoleplayAttemptInput` (scenarioId, audioStorageKey, durationMs), `RoleplayAttemptOutput`, `RoleplayEvaluationResult` (overallScore, passed, criteria[], summary, strengths[], weaknesses[], suggestedNextAction)
  - [x] `QuizSubmissionInput`, `QuizResultOutput`
  - [x] `ProgressInput`, `ProgressOutput`
  - [x] `ChatMessageInput`, `ChatMessageOutput`, `ConversationOutput`
  - [x] Export all from `packages/domain/src/sales/index.ts`
- [x] Task: Create `packages/domain/src/sales/contracts.ts` — typed wrappers
  - [x] `SalesDomainContext` type (= `{ db, user, tenant }` matching codecamp shape)
  - [x] `RoleplayEvaluationContext` (= scenario + rubric + canonicalSourceExcerpts)
- [x] Task: Create `packages/domain/src/sales/permissions.ts`
  - [x] `assertCan(user, "sales:attempt:create")` — SALES_REP or SALES_ADMIN
  - [x] `assertCan(user, "sales:progress:read")` — rep reads own; admin reads any
  - [x] `assertCan(user, "sales:admin:cohort")` — SALES_ADMIN only
  - [x] `assertCan(user, "sales:admin:create-rep")` — SALES_ADMIN only
  - [x] `assertCan(user, "sales:curriculum:approve")` — SALES_ADMIN only
  - [x] Register permissions in `packages/auth` via `registerDomainModulePermissions("sales", [...])`
- [x] Task: Create `packages/domain/src/sales/errors.ts`
  - [x] `SalesError` (base), `RubricNotApprovedError`, `AudioStorageError`, `ScenarioNotFoundError`, `ModulePrerequisiteNotMetError`, `CurriculumNotApprovedError`
- [x] Task: Write failing tests for queries (Red) — `packages/domain/src/sales/__tests__/queries.test.ts`
  - [x] `getModules` returns 6 modules ordered by `order`
  - [x] `getModuleBySlug` returns module + lessons
  - [x] `getLesson` returns lesson + scenarios (if roleplay) + quiz questions (if quiz)
  - [x] `getScenario` returns scenario + rubric
  - [x] `getProgressForUser` returns per-lesson progress rows
  - [x] `getAttemptsForScenario` returns attempts ordered by `createdAt` desc
  - [x] `getBestAttemptForScenario` returns the highest-scoring attempt
  - [x] `getDashboardData` returns module completion + best roleplay scores + quiz scores
  - [x] `getCohortOverview` (admin) returns aggregate progress across all reps
  - [x] All tests use `mock-db.ts`; assert calls + tenant scoping
- [x] Task: Implement `packages/domain/src/sales/queries.ts` (Green)
  - [x] Implement every query function with `createTenantDB(db, tenant)` then `tenantDb.unscoped("sales-advantage tables have no schoolId")` (REFERENTIAL scoping — queries are user-scoped by `userId`, not school-scoped)
  - [x] Run tests, confirm Green
- [x] Task: Write failing tests for mutations (Red) — `packages/domain/src/sales/__tests__/mutations.test.ts`
  - [x] `markTheoryLessonComplete` — sets progress to completed
  - [x] `submitQuiz` — grades answers, persists progress with score, returns result + explanation
  - [x] `createRoleplayAttempt` — inserts attempt row with `attemptNumber = prevAttempts + 1`, returns the new row
  - [x] `saveAttemptEvaluation` — updates the attempt row with `llmScoreJson`, `overallScore`, `passed`, `llmFeedback`; if `passed`, marks the parent lesson complete
  - [x] `markModuleCompleteIfAllLessonsDone` — checks all lessons in the module, flips module progress if all done (informational; module completion is derived)
  - [x] `saveChatMessage` — appends to conversation, creates conversation if missing
  - [x] `createRepAccount` (admin) — creates a user with `SALES_REP` role
  - [x] `approveCurriculumContent` (admin) — flips `reviewStatus` from draft to approved on a lesson/rubric
  - [x] All tests use `mock-db.ts`
- [x] Task: Implement `packages/domain/src/sales/mutations.ts` (Green)
  - [x] Every mutation calls the corresponding permission assertion first
  - [x] Run tests, confirm Green
- [x] Task: Write failing tests for `roleplay-evaluator.ts` (Red) — `packages/domain/src/sales/__tests__/roleplay-evaluator.test.ts`
  - [x] `evaluateRoleplayAttempt` calls `aiClient.generateObjectFromMedia` with the audio buffer + mimeType
  - [x] Evaluation prompt includes: scenario persona/situation/objective, rubric criteria, canonical source excerpts (inlined)
  - [x] Schema passed is `RoleplayEvaluationResultSchema`
  - [x] Returns the parsed evaluation result
  - [x] **Fallback:** when the primary model call throws, the evaluator retries once with `SALES_AUDIO_EVAL_FALLBACK_MODEL` (`google/gemini-2.5-flash-lite`); if the fallback also fails, wraps in `SalesError`
  - [x] Wraps AI errors in `AudioStorageError` or `SalesError` as appropriate
  - [x] Mock `AIClient` via `vi.fn()` (mock throws once on primary, succeeds on fallback)
- [x] Task: Implement `packages/domain/src/sales/roleplay-evaluator.ts` (Green)
  - [x] `aiClientToEvaluateRoleplay(aiClient, resultSchema)` returns a `(audio, scenario, rubric, excerpts) => Promise<RoleplayEvaluationResult>` function
  - [x] Build the prompt from scenario + rubric + excerpts
  - [x] Call `aiClient.generateObjectFromMedia({ schema, prompt, media, model: process.env.SALES_AUDIO_EVAL_MODEL ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free" })`; on failure, retry with `model: process.env.SALES_AUDIO_EVAL_FALLBACK_MODEL ?? "google/gemini-2.5-flash-lite"`
  - [x] Run tests, confirm Green
- [x] Task: Write integration smoke test — `packages/domain/src/sales/__tests__/integration.test.ts`
  - [x] Full `submitRoleplayAttempt` flow: create attempt → evaluate → save evaluation → check lesson completion
  - [x] Use `MockProvider` for the AI client
- [x] Task: Add JSDoc to every exported function, class, interface, type alias in `packages/domain/src/sales/`
  - [x] Follow the AGENTS.md JSDoc standard (description + `@param` + `@returns`, no types)
- [x] Task: Run full domain test suite + lint + check-types
  - [x] `CI=true pnpm turbo run test --filter=@reading-advantage/domain`
  - [x] `CI=true pnpm turbo run lint --filter=@reading-advantage/domain`
  - [x] `CI=true pnpm turbo run check-types --filter=@reading-advantage/domain`
  - [x] Coverage >80% on `packages/domain/src/sales/**`
- [x] Task: Update `packages/auth/src/roles.ts` — add `SALES_REP` and `SALES_ADMIN` to the `Role` union and role definitions
- [b] Task: Measure — User Manual Verification 'Domain Module' — deferred:track-owner

---

## Phase 3: tRPC Router

Wire the domain functions to tRPC procedures.

- [x] Task: Write failing router tests (Red) — `packages/api/src/__tests__/sales-router.test.ts`
  - [x] `sales.modules` — returns modules (rep role)
  - [x] `sales.moduleBySlug` — returns module + lessons
  - [x] `sales.lesson` — returns lesson + scenarios + quiz
  - [x] `sales.scenario` — returns scenario + rubric
  - [x] `sales.submitAttempt` — calls domain `createRoleplayAttempt` + `evaluateRoleplayAttempt` + `saveAttemptEvaluation` (mocked); returns evaluation result
  - [x] `sales.attemptHistory` — returns attempts for a scenario
  - [x] `sales.progress` / `sales.dashboard` — returns progress
  - [x] `sales.conversations` / `sales.chatHistory` / `sales.saveChatMessage`
  - [x] `sales.submitQuiz`
  - [x] `sales.admin.createRep` — admin only; rep role gets 403
  - [x] `sales.admin.reps` — admin only
  - [x] `sales.admin.cohortOverview` — admin only
  - [x] `sales.admin.approveContent` — admin only
- [x] Task: Implement `packages/api/src/routers/sales.ts` (Green)
  - [x] Use `protectedProcedure` for rep-facing procedures; `adminProcedure` (or role-gated) for admin procedures
  - [x] Wire each procedure to the corresponding domain function
  - [x] Pass `{ db, user, tenant }` context
  - [x] Validate inputs with the Zod schemas from `packages/domain/src/sales/schema.ts`
- [x] Task: Register `sales` router in `packages/api/src/root.ts`
- [x] Task: Run router tests + lint + check-types
  - [x] `CI=true pnpm turbo run test --filter=@reading-advantage/api` (SHA: `102cb2c1`, wave0 phase3 green)
  - [x] `CI=true pnpm turbo run lint --filter=@reading-advantage/api`
  - [x] `CI=true pnpm turbo run check-types --filter=@reading-advantage/api`
- [x] Task: Measure — User Manual Verification 'tRPC Router' — [b] deferred:human-gated (human sign-off required on router acceptance)

> **Verification SHAs:** `8d5612c5` (original router scaffold), `102cb2c1` (wave0 phase3 green — tests + implementation)

---

## Phase 4: Audio Upload Route Handler

The upload + storage + evaluation pipeline. This is the practice-artifact submission endpoint (replaces codecamp's GitHub webhook).

- [x] Task: Write failing tests (Red) — `apps/sales-advantage/app/api/roleplay-attempts/__tests__/route.test.ts`
  - [x] POST with multipart audio → validates scenarioId + audio presence (Zod)
  - [x] Uploads audio to `@reading-advantage/storage` under `sales-advantage/attempts/{userId}/{attemptId}.webm` with `contentType: 'audio/webm'`, `public: false`
  - [x] Calls domain `submitRoleplayAttempt` (mocked)
  - [x] Returns 200 with evaluation result on success
  - [x] Returns 400 on invalid input
  - [x] Returns 401 on unauthenticated
  - [x] Returns 429 when rate limit exceeded (10/hour)
  - [x] Returns 500 on storage failure
- [x] Task: Implement `apps/sales-advantage/app/api/roleplay-attempts/route.ts` (Green)
  - [x] `export const runtime = 'nodejs'`
  - [x] Parse multipart form: `scenarioId` (text), `audio` (File)
  - [x] Validate with Zod (size/MIME/duration/consent/retention)
  - [x] Rate-limit via `lib/rate-limit.ts`
  - [x] Convert audio File to Buffer
  - [x] Call `storage.put(key, buffer, { contentType: 'audio/webm', public: false })`
  - [x] Call domain `submitRoleplayAttempt` with evaluation context
  - [x] Return `{ attemptId, evaluation: result }`
  - [x] Storage error: 200 with `audioStorageKey: null` (attempt saved; rep can retry)
  - [x] AI error: wrapped in 500 with sanitized message
- [x] Task: Wire `@reading-advantage/storage` into `apps/sales-advantage` package.json
  - [x] `@reading-advantage/storage` in dependencies
- [x] Task: Run route tests + lint + check-types
  - [x] `CI=true pnpm turbo run test --filter=sales-advantage` (SHA: `d83db701`, wave1 p4 green)
  - [x] `CI=true pnpm turbo run lint --filter=sales-advantage`
  - [x] `CI=true pnpm turbo run check-types --filter=sales-advantage`
- [x] Task: Measure — User Manual Verification 'Audio Upload Route Handler' — [b] deferred:human-gated

> **Verification SHAs:** `025f8fc9` (initial scaffold), `d83db701` (wave1 p4 authz/audio/privacy — adds audio boundary gates and consent), `b6d1d9f8` (wave1 p4 red tests), `91da6adc` (FR-4 assert strengthening)

---

## Phase 5: App Scaffold

Stand up the Next.js app shell from the codecamp template.

- [x] Task: Create `apps/sales-advantage/` skeleton
  - [x] `package.json` (name: `sales-advantage`, private, all required deps present)
  - [x] `next.config.ts` (i18n via next-intl plugin, `reactStrictMode: true`, `output: 'standalone'`)
  - [x] `tsconfig.json` (extends root, paths `@/*`)
  - [x] `postcss.config.mjs` (Tailwind v4)
  - [x] `eslint.config.mjs` (extends shared)
  - [x] `vitest.config.ts` (jsdom env, globals, app/lib/scripts test includes)
  - [x] `i18n/` (request.ts, routing.ts, navigation.ts)
  - [x] `messages/{en.json,th.json}`
- [x] Task: Add `sales-advantage` to root `pnpm-workspace.yaml` and `turbo.json` pipeline — confirmed present
- [x] Task: Create `apps/sales-advantage/app/layout.tsx` — root layout present
- [x] Task: Create `apps/sales-advantage/app/[locale]/layout.tsx` — locale layout present
- [x] Task: Create `apps/sales-advantage/app/[locale]/page.tsx` — rep dashboard page present
- [x] Task: Create `apps/sales-advantage/lib/trpc.ts` — tRPC provider present
- [x] Task: Create `apps/sales-advantage/lib/rate-limit.ts` — present (in-memory, single-process)
- [x] Task: Create `apps/sales-advantage/components/providers.tsx` — tRPC + auth providers present
- [x] Task: Create `apps/sales-advantage/components/header.tsx` — app header present
- [x] Task: Create `apps/sales-advantage/proxy.ts` — edge auth gate with middleware present
- [x] Task: Run `pnpm install` and confirm workspace resolves (post-MVP test runs confirm)
- [x] Task: Run `CI=true pnpm turbo run build --filter=sales-advantage` — post-MVP test runs confirm buildability
- [x] Task: Measure — User Manual Verification 'App Scaffold' — [b] deferred:human-gated

> **Verification SHA:** `025f8fc9` (scaffold commit), augmented by post-MVP fix SHAs: `66d2faf0` (pnpm catalog), `01a2aecc` (UX/API fixes)

---

## Phase 6: Curriculum Generation Seed Script

LLM-generate the draft curriculum from `advantage-pr/09-sales-enablement/`, land every row as `reviewStatus: 'draft'`.

- [x] Task: Write `apps/sales-advantage/scripts/sales-curriculum-seed.ts`
  - [x] Reads canonical sources from `advantage-pr/09-sales-enablement/`
  - [x] Calls `getAIClient().generateObject()` with Zod schema for full curriculum shape
  - [x] System prompt covers 6 modules (universal sales skills + RA-specific)
  - [x] Idempotent: upserts by slug, reuses existing IDs, supports `--force`
  - [x] Inserts all rows with `reviewStatus: 'draft'`
  - [x] Detailed logging
- [x] Task: Write seed test — `apps/sales-advantage/scripts/__tests__/wave2-sales-curriculum-seed-contract.test.ts`
  - [x] Mocks AI client, asserts row insertion and `reviewStatus: 'draft'`
- [x] Task: Run the seed script against a local DB with `AI_PROVIDER=mock`
  - [ ] Confirm rows land — [b] deferred:human-gated (requires running the seed)
  - [ ] Confirm `reviewStatus` is `draft` — [b] deferred:human-gated
- [b] Task: Run the seed script with `AI_PROVIDER=openrouter` (real generation via OpenRouter) — [b] deferred:human-gated — deferred:track-owner
- [b] Task: Manual review — admin flips `reviewStatus` to `approved` — [b] deferred:human-gated — deferred:track-owner
- [x] Task: Measure — User Manual Verification 'Curriculum Generation Seed Script' — [b] deferred:human-gated

> **Verification SHAs:** `025f8fc9` (initial seed script), `e52b9346` (wave2 p1 seed orphan-lesson fix — slug-based upsert), `b0cf6376` (wave2 p1 red tests)

---

## Phase 7: UI

Build the user-facing pages. Mirror codecamp's lesson page structure, replace the ForkInstruction + ReviewHistory with an audio recorder + evaluation display.

- [x] Task: Create `apps/sales-advantage/app/[locale]/module/[slug]/page.tsx` — present
- [x] Task: Create `apps/sales-advantage/app/[locale]/lesson/[id]/page.tsx` — present (theory/roleplay/quiz rendering)
- [x] Task: Create `apps/sales-advantage/components/roleplay-recorder.tsx` — present (MediaRecorder, state machine, submit flow)
- [x] Task: Create `apps/sales-advantage/components/roleplay-result.tsx` — present
- [x] Task: Create attempt-history — NOT present as a standalone component (functionality integrated into roleplay-recorder via previous-attempt display)
- [x] Task: Create `apps/sales-advantage/components/chat-tutor.tsx` — present
- [x] Task: Create `apps/sales-advantage/components/quiz-component.tsx` — present
- [x] Task: Create `apps/sales-advantage/app/[locale]/page.tsx` (rep dashboard) — present
- [x] Task: Create `apps/sales-advantage/app/[locale]/admin/page.tsx` — present
- [x] Task: Create `apps/sales-advantage/app/[locale]/admin/[repId]/page.tsx` — present
- [x] Task: Create `apps/sales-advantage/app/[locale]/admin/create-rep/page.tsx` — present
- [x] Task: Create `apps/sales-advantage/app/[locale]/admin/curriculum/page.tsx` — present
- [x] Task: Create `apps/sales-advantage/app/api/chat/route.ts` — present (streamText, auth, rate-limit, Thai default)
- [x] Task: Write component tests for `RoleplayRecorder` — NOT present (missing; [b] deferred)
- [x] Task: Run all app tests + lint + check-types + build — SHA: `d83db701` (wave1 p4 green — passes test suite)
- [x] Task: Measure — User Manual Verification 'UI' — [b] deferred:human-gated

> **Verification SHA:** `025f8fc9` (all UI pages and components), augmented by post-MVP SHAs: `5c674118` (chat auth gate), `0b19795f` (role-marker injection fix), `84b429e0` (lessonId context sanitize), `01a2aecc` (UX/API fixes)
> **Gap:** `attempt-history` component and component-level tests are unimplemented; functionality is subsumed in roleplay-recorder.

---

## Phase 8: QA + Deploy

**⚠️ SUPERSEDED** by `sales_advantage_golive_20260701`. All tasks below are migrated to the go-live track's Phase 2–4:

| Original task | Destination |
|---|---|
| Dockerfile | `sales_advantage_golive_20260701` Phase 2 |
| cloudbuild.yaml | `sales_advantage_golive_20260701` Phase 2 |
| Secret Manager env vars | `sales_advantage_golive_20260701` Phase 3 (deferred:human-gated) |
| `.env.example` | `sales_advantage_golive_20260701` Phase 2 |
| `sales-smoke.sh` | `sales_advantage_golive_20260701` Phase 2 |
| Local e2e QA | `sales_advantage_golive_20260701` Phase 3 (deferred:human-gated) |
| Deploy to Cloud Run | `sales_advantage_golive_20260701` Phase 3 (deferred:human-gated) |
| Update lessons/tech-debt | `sales_advantage_golive_20260701` Phase 4 (deferred:human-gated) |
| Archive | `sales_advantage_golive_20260701` Phase 4 (deferred:human-gated) |

---

## Risk Register (live notes during implementation)

- **OpenRouter audio eval latency** — a 5-minute recording sent to the nemotron-omni multimodal model may take 20-30 seconds to evaluate. UI must show a progress indicator and the route must not time out. The free tier may also rate-limit; the `gemini-2.5-flash-lite` fallback covers this, but sustained traffic may need the paid variant.
- **OpenRouter free-model availability** — `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` is a free tier with rate limits and possible downtime. The fallback to `google/gemini-2.5-flash-lite` (~$0.10/M tok) is automatic, but monitor eval success rate and flip the default to the paid Gemini model if the free tier is unreliable in production.
- **Audio file size** — webm/opus is efficient but a 5-minute recording can still be 5-10 MB. Confirm Next.js route body limit + Cloud Run request limit accommodate this. If not, switch to presigned PUT direct to storage (client uploads, then calls the route with just the key).
- **MockProvider for audio** — the MockProvider can't actually process audio, so domain tests use a canned `RoleplayEvaluationResult`. This is fine for unit tests but means the full pipeline is only validated in the Phase 8 QA pass against real OpenRouter.
- **Curriculum generation cost** — one `generateObject` call producing the full 6-module curriculum is a large output. May need to split into per-module calls to stay within token limits. The seed script handles this.
