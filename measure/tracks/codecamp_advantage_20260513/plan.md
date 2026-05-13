# Implementation Plan: codecamp-advantage

## Phase 1: Contract & Schema Definition

- [ ] Task: Define codecamp database schema in `packages/db`
  - [ ] Create `packages/db/src/schema/codecamp.ts` with tables:
    - `codecamp_modules` (id, title, description, slug, order, status, createdAt, updatedAt)
    - `codecamp_lessons` (id, moduleId, title, description, order, type, contentJson, createdAt, updatedAt)
    - `codecamp_exercises` (id, lessonId, title, instructions, starterCode, expectedOutput, hintsJson, order, createdAt, updatedAt)
    - `codecamp_quiz_questions` (id, lessonId, question, optionsJson, correctAnswer, explanation, order, createdAt, updatedAt)
    - `codecamp_user_progress` (id, userId, moduleId, lessonId, status, score, completedAt, createdAt, updatedAt)
    - `codecamp_chat_conversations` (id, userId, title, moduleId, lessonId, createdAt, updatedAt)
    - `codecamp_chat_messages` (id, conversationId, role, content, createdAt, updatedAt)
  - [ ] Add unique constraints: `codecamp_user_progress_user_lesson_unique` on (userId, lessonId)
  - [ ] Export from `packages/db/src/schema/index.ts`
  - [ ] Generate Drizzle migration: `pnpm --filter @reading-advantage/db db:generate`
- [ ] Task: Define Zod API contracts
  - [ ] Create codecamp input schemas (module filters, exercise submission, quiz answers, chat messages)
  - [ ] Create codecamp output schemas (module with progress, lesson with content, quiz result, chat history)
  - [ ] Define streaming chat response contract
- [ ] Task: Update shared package wiring
  - [ ] Reserve domain barrel export path in `packages/domain/src/index.ts`
  - [ ] Reserve router import path in `packages/api/src/root.ts`
- [ ] Task: Measure — User Manual Verification 'Contract & Schema Definition' (Protocol in workflow.md)

## Phase 2: Test

- [ ] Task: Set up domain test utilities
  - [ ] Create `packages/domain/src/__tests__/codecamp/mock-db.ts` with thenable Drizzle mocks (per lessons learned)
  - [ ] Create shared fixtures for modules, lessons, exercises, quizzes
- [ ] Task: Write domain function unit tests
  - [ ] Test `getModulesWithProgress` — returns modules with user's progress status
  - [ ] Test `getLessonWithContent` — returns lesson + exercises + quiz questions
  - [ ] Test `submitExerciseAttempt` — validates code-like input, returns feedback
  - [ ] Test `submitQuizAnswers` — scores answers, returns result
  - [ ] Test `saveChatMessage` / `getChatHistory` — persists and retrieves messages
  - [ ] Test `updateUserProgress` — transitions status, sets completedAt
  - [ ] Test `getUserDashboard` — aggregates progress across modules
  - [ ] Test cross-tenant authorization guards explicitly (per lessons learned)
- [ ] Task: Write tRPC router tests
  - [ ] Test codecamp router exercise endpoints
  - [ ] Test codecamp router quiz endpoints
  - [ ] Test codecamp router chat endpoints
  - [ ] Test codecamp router progress endpoints
- [ ] Task: Measure — User Manual Verification 'Test' (Protocol in workflow.md)

## Phase 3: Implement

- [ ] Task: Scaffold Next.js app
  - [ ] Create `apps/codecamp-advantage/` directory structure:
    - `app/`, `components/`, `lib/`, `messages/`, `public/`
  - [ ] Create `package.json` with shared workspace deps (`@reading-advantage/*`, `next`, `react`, `tailwindcss`, etc.)
  - [ ] Create `tsconfig.json` (standard Next.js + path alias `@/*`)
  - [ ] Create `next.config.ts` with `transpilePackages: ["@reading-advantage/*"]` and next-intl plugin
  - [ ] Create `postcss.config.mjs` with Tailwind v4
  - [ ] Create `tailwind.config.ts` importing shared config
  - [ ] Create `eslint.config.mjs` using `@reading-advantage/config` shared ESLint config
  - [ ] Create `.gitignore`
  - [ ] Run `pnpm install` to resolve workspace dependencies
- [ ] Task: Configure shared integrations
  - [ ] Set up `next-intl` (`i18n.ts`, `middleware.ts`, `messages/en.json`)
  - [ ] Set up tRPC client provider in `components/providers.tsx`
  - [ ] Set up auth provider with `@reading-advantage/auth-client`
  - [ ] Configure Tailwind v4 CSS entry (`app/globals.css`)
- [ ] Task: Implement domain functions
  - [ ] `getModulesWithProgress({ db, user, tenant })`
  - [ ] `getLessonWithContent({ db, user, tenant, input })`
  - [ ] `submitExerciseAttempt({ db, user, tenant, input })`
  - [ ] `submitQuizAnswers({ db, user, tenant, input })`
  - [ ] `saveChatMessage({ db, user, tenant, input })`
  - [ ] `getChatHistory({ db, user, tenant, input })`
  - [ ] `updateUserProgress({ db, user, tenant, input })`
  - [ ] `getUserDashboard({ db, user, tenant })`
  - [ ] Export from `packages/domain/src/index.ts` barrel
- [ ] Task: Implement tRPC routers
  - [ ] Create `packages/api/src/routers/codecamp.ts`
  - [ ] Wire into `packages/api/src/root.ts` as `codecamp: codecampRouter`
  - [ ] Map domain `Error` throws to `TRPCError` in router layer (per lessons learned)
- [ ] Task: Implement LLM integration
  - [ ] Create `apps/codecamp-advantage/app/api/chat/route.ts` using AI SDK `streamText`
  - [ ] Build system prompt grounded in monorepo context (AGENTS.md, tech-stack.md, actual code patterns)
  - [ ] Create exercise evaluation helper (structured output via `generateObject`)
  - [ ] Create quiz generation helper (per-module question generation)
- [ ] Task: Implement UI pages and components
  - [ ] Layout with auth gate, navigation, and providers
  - [ ] Dashboard page (`/`) — module cards with progress bars
  - [ ] Module detail page (`/module/[slug]`) — lesson list
  - [ ] Lesson page (`/lesson/[id]`) — renders content, exercises, quizzes
  - [ ] Chat tutor component — streaming message display, conversation sidebar
  - [ ] Code exercise component — textarea for code submission, LLM feedback panel
  - [ ] Quiz component — multiple choice, submit, score display
- [ ] Task: Seed curriculum data
  - [ ] Write `packages/db/src/seed/codecamp-seed.ts` with 5 modules:
    1. Next.js App Router & RSC
    2. tRPC & Domain Functions
    3. Drizzle ORM
    4. Auth & Multi-Tenancy
    5. Monorepo Patterns
  - [ ] Include real file references in lesson content (e.g., `packages/api/src/root.ts`, `packages/domain/src/index.ts`)
  - [ ] Add seed script to `package.json` or migration
- [ ] Task: Measure — User Manual Verification 'Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update project documentation
  - [ ] Add `codecamp-advantage` entry to `measure/product.md` products table
  - [ ] Update `measure/tech-stack.md` if any new dependencies introduced
- [ ] Task: Run architectural linting
  - [ ] `pnpm turbo run lint --filter=codecamp-advantage`
  - [ ] `pnpm turbo run check-types --filter=codecamp-advantage`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/domain`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/api`
- [ ] Task: Verify build
  - [ ] `pnpm turbo run build --filter=codecamp-advantage`
- [ ] Task: Measure — User Manual Verification 'Generate Docs & Doctor' (Protocol in workflow.md)
