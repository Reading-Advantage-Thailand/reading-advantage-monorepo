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
- [ ] Task: Measure — User Manual Verification 'Extend AIClient with generateObjectFromMedia'

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
- [ ] Task: Measure — User Manual Verification 'Schema & Migration'

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
- [ ] Task: Measure — User Manual Verification 'Domain Module'

---

## Phase 3: tRPC Router

Wire the domain functions to tRPC procedures.

- [ ] Task: Write failing router tests (Red) — `packages/api/src/__tests__/sales-router.test.ts`
  - [ ] `sales.modules` — returns modules (rep role)
  - [ ] `sales.moduleBySlug` — returns module + lessons
  - [ ] `sales.lesson` — returns lesson + scenarios + quiz
  - [ ] `sales.scenario` — returns scenario + rubric
  - [ ] `sales.submitAttempt` — calls domain `createRoleplayAttempt` + `evaluateRoleplayAttempt` + `saveAttemptEvaluation` (mocked); returns evaluation result
  - [ ] `sales.attemptHistory` — returns attempts for a scenario
  - [ ] `sales.progress` / `sales.dashboard` — returns progress
  - [ ] `sales.conversations` / `sales.chatHistory` / `sales.saveChatMessage`
  - [ ] `sales.submitQuiz`
  - [ ] `sales.admin.createRep` — admin only; rep role gets 403
  - [ ] `sales.admin.reps` — admin only
  - [ ] `sales.admin.cohortOverview` — admin only
  - [ ] `sales.admin.approveContent` — admin only
- [ ] Task: Implement `packages/api/src/routers/sales.ts` (Green)
  - [ ] Use `protectedProcedure` for rep-facing procedures; `adminProcedure` (or role-gated) for admin procedures
  - [ ] Wire each procedure to the corresponding domain function
  - [ ] Pass `{ db, user, tenant }` context
  - [ ] Validate inputs with the Zod schemas from `packages/domain/src/sales/schema.ts`
- [ ] Task: Register `sales` router in `packages/api/src/root.ts`
- [ ] Task: Run router tests + lint + check-types
  - [ ] `CI=true pnpm turbo run test --filter=@reading-advantage/api`
  - [ ] `CI=true pnpm turbo run lint --filter=@reading-advantage/api`
  - [ ] `CI=true pnpm turbo run check-types --filter=@reading-advantage/api`
- [ ] Task: Measure — User Manual Verification 'tRPC Router'

---

## Phase 4: Audio Upload Route Handler

The upload + storage + evaluation pipeline. This is the practice-artifact submission endpoint (replaces codecamp's GitHub webhook).

- [ ] Task: Write failing tests (Red) — `apps/sales-advantage/app/api/roleplay-attempts/__tests__/route.test.ts`
  - [ ] POST with multipart audio → validates scenarioId + audio presence (Zod)
  - [ ] Uploads audio to `@reading-advantage/storage` under `sales-advantage/attempts/{userId}/{attemptId}.webm` with `contentType: 'audio/webm'`, `public: false`
  - [ ] Calls domain `submitRoleplayAttempt` (mocked)
  - [ ] Returns 200 with evaluation result on success
  - [ ] Returns 400 on invalid input
  - [ ] Returns 401 on unauthenticated
  - [ ] Returns 429 when rate limit exceeded (10/hour)
  - [ ] Returns 500 on storage failure
- [ ] Task: Implement `apps/sales-advantage/app/api/roleplay-attempts/route.ts` (Green)
  - [ ] `export const runtime = 'nodejs'`
  - [ ] Parse multipart form: `scenarioId` (text), `audio` (File)
  - [ ] Validate with Zod
  - [ ] Rate-limit via `lib/rate-limit.ts` (key = `sales-roleplay:${user.id}`, max 10, window 1h)
  - [ ] Convert audio File to Buffer
  - [ ] Call `storage.put(key, buffer, { contentType: 'audio/webm', public: false })`
  - [ ] Call domain `submitRoleplayAttempt({ db, user, tenant, input: { scenarioId, audioStorageKey: key, audioBuffer, mimeType: 'audio/webm', durationMs } })`
  - [ ] Return `{ attemptId, evaluation: result }`
  - [ ] On storage error: 500 with sanitized message
  - [ ] On AI error: 200 with `evaluation: null` + `error: 'EVALUATION_FAILED'` (the attempt is still saved; rep can retry)
- [ ] Task: Wire `@reading-advantage/storage` into `apps/sales-advantage` package.json
  - [ ] Add env vars to `.env.example`: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL` (optional)
- [ ] Task: Run route tests + lint + check-types
  - [ ] `CI=true pnpm turbo run test --filter=sales-advantage`
  - [ ] `CI=true pnpm turbo run lint --filter=sales-advantage`
  - [ ] `CI=true pnpm turbo run check-types --filter=sales-advantage`
- [ ] Task: Measure — User Manual Verification 'Audio Upload Route Handler'

---

## Phase 5: App Scaffold

Stand up the Next.js app shell from the codecamp template.

- [ ] Task: Create `apps/sales-advantage/` skeleton
  - [ ] `package.json` (name: `sales-advantage`, private, dependencies mirror codecamp: next, react, @reading-advantage/{auth,auth-client,db,api,ui,ai,storage,types,domain}, next-intl, tailwind, etc.)
  - [ ] `next.config.ts` (i18n via next-intl plugin, `reactStrictMode: true`, no `ignoreBuildErrors`)
  - [ ] `tsconfig.json` (extends root, paths `@/*` → `./{app,lib,components}/*`)
  - [ ] `tailwind.config.ts` + `postcss.config.mjs` (Tailwind v4 shared config)
  - [ ] `eslint.config.mjs` (extends shared)
  - [ ] `vitest.config.ts` (mirrors codecamp)
  - [ ] `i18n/` (request.ts, routing.ts, navigation.ts — mirrors codecamp)
  - [ ] `messages/{en.json,th.json}` — initial empty namespace structure
- [ ] Task: Add `sales-advantage` to root `pnpm-workspace.yaml` (or `package.json` workspaces) and `turbo.json` pipeline
- [ ] Task: Create `apps/sales-advantage/app/layout.tsx` — root layout with locale, font, providers
- [ ] Task: Create `apps/sales-advantage/app/[locale]/layout.tsx` — locale layout
- [ ] Task: Create `apps/sales-advantage/app/[locale]/page.tsx` — dashboard landing (redirect to /module/[slug] for first incomplete module)
- [ ] Task: Create `apps/sales-advantage/lib/trpc.ts` — tRPC provider (mirrors codecamp)
- [ ] Task: Create `apps/sales-advantage/lib/use-chat-stream.ts` — chat hook (mirrors codecamp)
- [ ] Task: Create `apps/sales-advantage/lib/rate-limit.ts` — wraps `packages/auth/src/rate-limit.ts` for the upload route
- [ ] Task: Create `apps/sales-advantage/components/providers.tsx` — tRPC + auth providers
- [ ] Task: Create `apps/sales-advantage/components/header.tsx` — app header with language switcher + logout
- [ ] Task: Create `apps/sales-advantage/proxy.ts` — edge auth gate (mirrors codecamp)
- [ ] Task: Run `pnpm install` and confirm workspace resolves
- [ ] Task: Run `CI=true pnpm turbo run build --filter=sales-advantage` — confirm skeleton builds
- [ ] Task: Measure — User Manual Verification 'App Scaffold'

---

## Phase 6: Curriculum Generation Seed Script

LLM-generate the draft curriculum from `advantage-pr/09-sales-enablement/`, land every row as `reviewStatus: 'draft'`.

- [ ] Task: Write `apps/sales-advantage/scripts/sales-curriculum-seed.ts`
  - [ ] Reads canonical sources: `distributor-rep-onboarding/README.md`, `objection-handling-guide.md`, `role-play-scenarios.md`, `battle-cards/*.md`, `demo-scripts.md`, `roi-calculator.md`, plus `02-brand/messaging-house.md`, `06-research-and-evidence/outcome-claims-policy.md`
  - [ ] Calls `getAIClient().generateObject()` with a Zod schema for the full curriculum shape: `{ modules: [{ slug, title, description, phase, order, lessons: [{ title, type, content, order, scenarios?: [...], rubric?: {...}, quizQuestions?: [...] }] }] }`
  - [ ] System prompt: "You are generating the curriculum for an internal sales-coaching app. Source material: <inlined docs>. Produce 6 modules covering the 5-day onboarding path, objection handling, competitor positioning, demo/discovery, pricing/closing. Each roleplay scenario must include a rubric with criteria traceable to the source docs (include sourceRef). Output JSON matching the schema."
  - [ ] Idempotent: checks if a module with the slug exists; skips if so. Supports `--force` to overwrite.
  - [ ] Inserts all rows with `reviewStatus: 'draft'`
  - [ ] Logs: "Inserted N modules, M lessons, K scenarios, L rubrics, Q quiz questions. All in draft status. Review and flip to approved via admin UI."
- [ ] Task: Write `apps/sales-advantage/scripts/sales-curriculum-seed.test.ts`
  - [ ] Mock the AI client; assert the script parses the AI output, inserts the right number of rows, sets `reviewStatus: 'draft'`, is idempotent on second run
- [ ] Task: Run the seed script against a local DB with `AI_PROVIDER=mock` first (uses MockProvider canned curriculum)
  - [ ] Confirm rows land
  - [ ] Confirm `reviewStatus` is `draft` on all content
- [ ] Task: Run the seed script with `AI_PROVIDER=openrouter` (real generation via OpenRouter)
  - [ ] Review the generated curriculum output
  - [ ] Spot-check 2-3 scenarios for rubric quality + source traceability
  - [ ] Document the run in a comment at the top of the script
- [ ] Task: Manual review — user flips `reviewStatus` to `approved` via admin UI (built in Phase 7) or a SQL one-liner for the initial cohort
- [ ] Task: Measure — User Manual Verification 'Curriculum Generation Seed Script'

---

## Phase 7: UI

Build the user-facing pages. Mirror codecamp's lesson page structure, replace the ForkInstruction + ReviewHistory with an audio recorder + evaluation display.

- [ ] Task: Create `apps/sales-advantage/app/[locale]/module/[slug]/page.tsx`
  - [ ] Fetch `trpc.sales.moduleBySlug.useQuery({ slug })`
  - [ ] Display module title, description, lesson list with completion status
  - [ ] Enforce prerequisites (lock later modules)
- [ ] Task: Create `apps/sales-advantage/app/[locale]/lesson/[id]/page.tsx`
  - [ ] Fetch `trpc.sales.lesson.useQuery({ lessonId })`
  - [ ] Render theory content via `LessonContent` component (reuse from codecamp or shared)
  - [ ] If `type === 'roleplay'`: render `<RoleplayRecorder>` for each scenario
  - [ ] If `type === 'quiz'`: render `<QuizComponent>` (reuse codecamp pattern)
  - [ ] Always render `<ChatTutor>` at the bottom (reuse codecamp pattern, Thai default)
- [ ] Task: Create `apps/sales-advantage/components/roleplay-recorder.tsx`
  - [ ] Props: `scenario` (persona, situation, objective, prospectContext), `rubric`
  - [ ] State: `idle` → `recording` → `recorded` → `uploading` → `evaluated` / `error`
  - [ ] `MediaRecorder` API: start, stop, listen-back `<audio controls>` playback
  - [ ] Submit button calls `fetch('/api/roleplay-attempts', { method: 'POST', body: FormData })`
  - [ ] On success: render `<RoleplayResult>` with score, criterion-by-criterion feedback, summary, strengths, weaknesses, suggested next action
  - [ ] "Try again" button resets to `idle` but keeps the previous attempt visible in `<AttemptHistory>`
  - [ ] ARIA labels on all controls; keyboard accessible
  - [ ] Permission prompt handling: if mic denied, show instructions
- [ ] Task: Create `apps/sales-advantage/components/roleplay-result.tsx`
  - [ ] Renders the `RoleplayEvaluationResult` in a structured card: overall score (with color: green ≥80, amber 60-79, red <60), pass/fail badge, criterion table (criterion / score / feedback), summary, strengths list, weaknesses list, suggested next action
- [ ] Task: Create `apps/sales-advantage/components/attempt-history.tsx`
  - [ ] Lists all attempts for the current scenario with date, score, pass/fail; highlights best
- [ ] Task: Create `apps/sales-advantage/components/chat-tutor.tsx`
  - [ ] Mirror codecamp's ChatTutor; defaults to Thai; system prompt grounds in sales-enablement canon
- [ ] Task: Create `apps/sales-advantage/components/quiz-component.tsx`
  - [ ] Mirror codecamp's QuizComponent; calls `trpc.sales.submitQuiz`
- [ ] Task: Create `apps/sales-advantage/app/[locale]/page.tsx` (rep dashboard)
  - [ ] Fetch `trpc.sales.dashboard.useQuery()`
  - [ ] 6 module cards with progress bars + best-roleplay-score badges + quiz-score badges
  - [ ] "Resume where you left off" link
- [ ] Task: Create `apps/sales-advantage/app/[locale]/admin/page.tsx`
  - [ ] Admin-only (role gate in `proxy.ts` or server-side check)
  - [ ] Cohort overview table: rep name, modules completed, avg roleplay score, avg quiz score, last active
  - [ ] Click a rep → per-rep detail page
- [ ] Task: Create `apps/sales-advantage/app/[locale]/admin/[repId]/page.tsx`
  - [ ] Per-rep progress: module completion, roleplay attempt history with scores, quiz scores, last active
- [ ] Task: Create `apps/sales-advantage/app/[locale]/admin/create-rep/page.tsx`
  - [ ] Form: name, username, password (admin sets initial); calls `trpc.sales.admin.createRep`
- [ ] Task: Create `apps/sales-advantage/app/[locale]/admin/curriculum/page.tsx`
  - [ ] Lists all lessons + rubrics with `reviewStatus`; admin can flip draft → approved
- [ ] Task: Create `apps/sales-advantage/app/api/chat/route.ts`
  - [ ] Mirror codecamp's chat route; streamText; Thai default; system prompt grounds in sales canon
- [ ] Task: Write component tests for `RoleplayRecorder` (mock MediaRecorder, mock fetch)
  - [ ] `apps/sales-advantage/components/__tests__/roleplay-recorder.test.tsx`
  - [ ] Assert state transitions, submit flow, error handling, retry
- [ ] Task: Run all app tests + lint + check-types + build
  - [ ] `CI=true pnpm turbo run test --filter=sales-advantage`
  - [ ] `CI=true pnpm turbo run lint --filter=sales-advantage`
  - [ ] `CI=true pnpm turbo run check-types --filter=sales-advantage`
  - [ ] `CI=true pnpm turbo run build --filter=sales-advantage`
- [ ] Task: Measure — User Manual Verification 'UI'

---

## Phase 8: QA + Deploy

- [ ] Task: Write `apps/sales-advantage/Dockerfile` (mirror codecamp)
- [ ] Task: Write `apps/sales-advantage/cloudbuild.yaml` (mirror codecamp; deploy to Cloud Run; set env vars from Secret Manager)
- [ ] Task: Add env vars to Secret Manager: `AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, `SALES_AUDIO_EVAL_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, `SALES_AUDIO_EVAL_FALLBACK_MODEL=google/gemini-2.5-flash-lite`, `STORAGE_*`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, etc.
- [ ] Task: Write `apps/sales-advantage/.env.example` — full env surface with comments
- [ ] Task: Write `apps/sales-advantage/scripts/sales-smoke.sh` — post-deploy smoke test (login, fetch dashboard, submit a mock roleplay, verify evaluation)
- [ ] Task: Run local end-to-end QA pass
  - [ ] Auth: login as admin, create rep, login as rep
  - [ ] Dashboard: modules load, progress visible
  - [ ] Lesson: theory lesson renders + marks complete
  - [ ] Roleplay: record → submit → evaluation displays
  - [ ] Retry: second attempt, best-attempt logic
  - [ ] Quiz: submit, score, pass threshold
  - [ ] Chat: send message, streaming response in Thai
  - [ ] Admin: cohort overview, per-rep detail, curriculum approval
  - [ ] i18n: switch to English and back
  - [ ] Rate limit: 11th submission in an hour returns 429
- [ ] Task: Run `CI=true pnpm turbo run lint test check-types build --filter=sales-advantage` — all green
- [ ] Task: Deploy to Cloud Run via `gcloud builds submit`
- [ ] Task: Run `sales-smoke.sh` against the production URL
- [ ] Task: Update `measure/lessons-learned.md` with insights from this track
- [ ] Task: Update `measure/tech-debt.md` if any shortcuts were taken (e.g., audio retention, no live chat roleplay)
- [ ] Task: Move track to `measure/archive/` and update `measure/tracks.md` row to `[x]`
- [ ] Task: Measure — User Manual Verification 'QA + Deploy'

---

## Risk Register (live notes during implementation)

- **OpenRouter audio eval latency** — a 5-minute recording sent to the nemotron-omni multimodal model may take 20-30 seconds to evaluate. UI must show a progress indicator and the route must not time out. The free tier may also rate-limit; the `gemini-2.5-flash-lite` fallback covers this, but sustained traffic may need the paid variant.
- **OpenRouter free-model availability** — `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` is a free tier with rate limits and possible downtime. The fallback to `google/gemini-2.5-flash-lite` (~$0.10/M tok) is automatic, but monitor eval success rate and flip the default to the paid Gemini model if the free tier is unreliable in production.
- **Audio file size** — webm/opus is efficient but a 5-minute recording can still be 5-10 MB. Confirm Next.js route body limit + Cloud Run request limit accommodate this. If not, switch to presigned PUT direct to storage (client uploads, then calls the route with just the key).
- **MockProvider for audio** — the MockProvider can't actually process audio, so domain tests use a canned `RoleplayEvaluationResult`. This is fine for unit tests but means the full pipeline is only validated in the Phase 8 QA pass against real OpenRouter.
- **Curriculum generation cost** — one `generateObject` call producing the full 6-module curriculum is a large output. May need to split into per-module calls to stay within token limits. The seed script handles this.
