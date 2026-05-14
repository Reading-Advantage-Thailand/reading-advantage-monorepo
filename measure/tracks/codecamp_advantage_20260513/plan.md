# Implementation Plan: codecamp-advantage

## Phase 0: Remediate Existing Issues

Address known issues from plan-review.md before extending the codebase.

- [x] Task: Fix type errors in codecamp router and tests [08471b2]
  - [x] Fix `updateUserProgress` return type destructuring in `packages/api/src/routers/codecamp.ts`
  - [x] Fix `updateUserProgress` mock shape in `packages/api/src/__tests__/codecamp-router.test.ts`
  - [x] Fix `updateUserProgress` domain function to not reset score on partial updates
- [x] Task: Fix chat route to use streaming [08471b2]
  - [x] Switch `apps/codecamp-advantage/app/api/chat/route.ts` from `generateText` to `streamText`
  - [x] Return `result.toDataStreamResponse()`
- [x] Task: Connect UI pages to tRPC data [bf9a408]
  - [x] Dashboard: replace hardcoded module cards with `trpc.codecamp.dashboard.useQuery()`
  - [x] Module page: replace hardcoded lesson placeholders with tRPC data
  - [x] Lesson page: connect exercises and quiz components to tRPC procedures
- [x] Task: Remove `ignoreBuildErrors: true` from `apps/codecamp-advantage/next.config.ts` [08471b2]
- [x] Task: Set `reactStrictMode: true` in `apps/codecamp-advantage/next.config.ts` [08471b2]
- [ ] Task: Measure — User Manual Verification 'Remediate Existing Issues'

## Phase 1: Contract & Schema Extension [checkpoint: dbcd9bf]

Extend existing schema for GitHub integration and expanded curriculum.

- [x] Task: Add exercise repos and PR reviews tables to `packages/db/src/schema/codecamp.ts`
  - [x] `codecamp_exercise_repos` (id, moduleId FK→codecamp_modules, repoUrl, description, order, createdAt)
  - [x] `codecamp_pr_reviews` (id, exerciseRepoId FK→codecamp_exercise_repos, userId, prUrl, reviewStatus enum [pending/reviewed/needs_changes/approved], llmReviewSummary text, reviewedAt, createdAt)
  - [x] Add `pgEnum("codecamp_review_status", ["pending", "reviewed", "needs_changes", "approved"])`
  - [x] Export from `packages/db/src/schema/index.ts`
- [x] Task: Generate and apply Drizzle migration
  - [x] Created manual migration `0007_codecamp_repos_reviews.sql` (drizzle-kit snapshots lack codecamp tables; raw SQL applied)
- [x] Task: Define Zod contracts for GitHub integration
  - [x] Exercise repo input/output schemas (link repo to module, list repos by module)
  - [x] PR review input/output schemas (create review, update status, list reviews by user)
  - [x] GitHub webhook payload schema (PR opened/synchronized events)
  - [x] Export from `packages/types`
- [x] Task: Update shared package wiring
  - [x] Domain barrel export path already reserved in `packages/domain/src/index.ts`
  - [x] Router import path already reserved in `packages/api/src/root.ts`
  - [x] GitHub API client utility types deferred to Phase 3 implementation
- [x] Task: Measure — User Manual Verification 'Contract & Schema Extension'

## Phase 2: Test

Write tests for new domain functions and GitHub integration.

- [x] Task: Write domain function unit tests for exercise repo management [e8aada1]
  - [x] Test `getExerciseRepos` — returns repos for a module
  - [x] Test `linkExerciseRepo` — admin links repo to module
  - [x] Test `getPrReviewsForUser` — returns review status across all exercises
- [x] Task: Write domain function unit tests for PR review pipeline [e8aada1]
  - [x] Test `createPrReview` — creates pending review on PR open
  - [x] Test `updatePrReview` — updates status and summary after LLM review
  - [x] Test `getPrReviewByPrUrl` — lookup review by GitHub PR URL
- [x] Task: Write domain function unit tests for expanded curriculum queries [e8aada1]
  - [x] Test `getModulesByPhase` — returns modules grouped by phase (A/B/C/D)
  - [x] Test `getModuleWithExercises` — returns module + linked exercise repos
  - [x] Test `checkModulePrerequisite` — enforces sequential module completion
- [~] Task: Write tRPC router tests for new procedures (deferred to Phase 3 — TDD against new router procedures)
  - [~] Test exercise repo procedures
  - [~] Test PR review procedures
  - [~] Test module phase grouping procedure
- [~] Task: Write GitHub webhook handler tests (deferred to Phase 3 — TDD against webhook handler)
  - [~] Test webhook signature verification
  - [~] Test PR opened event → creates pending review
  - [~] Test PR synchronized event → re-triggers review
  - [~] Test invalid payload → returns 400
- [ ] Task: Measure — User Manual Verification 'Test'

## Phase 3: Implement GitHub Integration

Build the fork-based exercise workflow with LLM PR review.

- [x] Task: Create GitHub App and configure credentials [737bef8]
  - [x] Register GitHub App on the Reading Advantage org with repo + PR permissions (deferred to admin setup)
  - [x] Store App ID, private key, webhook secret as environment variables
  - [x] Create `packages/webhooks/src/github-client.ts` — GitHub App authentication helper + PR diff fetch + comment posting
- [x] Task: Implement GitHub webhook endpoint [737bef8]
  - [x] Create Hono route in `packages/webhooks` for `/webhooks/github/pr`
  - [x] Verify webhook signature
  - [x] Parse PR opened/synchronized events
  - [x] Trigger domain function to create/update PR review
  - [x] Queue LLM review job
- [x] Task: Implement LLM PR review pipeline [737bef8]
  - [x] Create `packages/domain/src/codecamp/review-exercise.ts` — orchestrates review (pre-existing)
  - [x] Fetch PR diff via GitHub API
  - [x] Build LLM system prompt grounded in the module's learning objectives and exercise rubric
  - [x] Call `generateObject` with structured output schema: { passed: boolean, summary: string, comments: Array<{line, body}> }
  - [x] Post review comments on the PR via GitHub API
  - [x] Update `codecamp_pr_reviews` with review status and summary
- [x] Task: Implement exercise repo management domain functions [pre-existing]
  - [x] `getExerciseRepos({ db, user, tenant, input })` — returns repos for a module
  - [x] `linkExerciseRepo({ db, user, tenant, input })` — admin-only, links repo to module
  - [x] `getPrReviewsForUser({ db, user, tenant })` — returns review status across exercises
- [x] Task: Implement tRPC routers for new procedures [pre-existing]
  - [x] Add exercise repo procedures to codecamp router
  - [x] Add PR review procedures to codecamp router
  - [x] Add module phase grouping procedure
- [~] Task: Measure — User Manual Verification 'Implement GitHub Integration'

## Phase 4: Implement Expanded Curriculum UI [~]

Evolve existing UI to support 18 modules with phase grouping and exercise workflow.

- [x] Task: Update dashboard for 18 modules [6cb00c0]
  - [x] Group modules by phase (Foundations, Frameworks, Backend & Data, Production) — already implemented
  - [x] Show module cards with progress bars and PR review status summary
  - [x] Enforce module prerequisites (lock later modules until earlier ones complete)
- [x] Task: Update module detail page [0f7b0c5]
  - [x] Display linked exercise repos with fork URL
  - [x] Show PR review status for the current user's exercises
  - [x] Link to GitHub exercise repos (fork instruction UI)
- [x] Task: Update lesson page [f665d84]
  - [x] Render lesson content with architecture diagrams — already implemented
  - [x] Embed exercise instructions with repo links
  - [x] Display quiz component with immediate scoring
  - [x] Show PR review feedback inline (pull from `codecamp_pr_reviews`)
- [ ] Task: Connect chat tutor to tRPC
  - [ ] Load conversation history on mount via `trpc.codecamp.chatHistory`
  - [ ] Save messages via `trpc.codecamp.saveChatMessage`
  - [ ] Streaming chat with `streamText` via route handler
  - [ ] System prompt includes current module context
- [ ] Task: Implement fork instruction component
  - [ ] Step-by-step UI: fork repo → clone → create branch → code → push → open PR
  - [ ] Auto-detect PR URL when intern pastes it
  - [ ] Show LLM review status after PR is detected
- [ ] Task: Measure — User Manual Verification 'Implement Expanded Curriculum UI'

## Phase 5: Seed Expanded Curriculum Data

Replace the existing 5-module seed with the full 18-module curriculum.

- [x] Task: Write Phase A seed data in `packages/db/src/seed/codecamp-curriculum-data.ts`
  - [x] Phase A modules (1–6, 29 lessons): Dev Environment, Git & GitHub, HTML & CSS, JavaScript, TypeScript, Testing
  - [x] Quiz questions per module (3–5 questions each)
  - [x] Exercise repo entries (placeholder URLs — real repos created separately)
- [x] Task: Write Phase B seed data in `packages/db/src/seed/codecamp-curriculum-data.ts`
  - [x] Phase B modules (7–10, 23 lessons): React, API Fundamentals, Next.js Basics, Next.js Advanced
  - [x] Quiz questions per module (3–5 questions each)
  - [x] Exercise repo entries (placeholder URLs — real repos created separately)
- [ ] Task: Write Phase C seed data
  - [ ] Phase C modules (11–13, 14 lessons): Databases & ORMs, tRPC & Server Actions, Authentication
- [ ] Task: Write Phase D seed data
  - [ ] Phase D modules (14–18, 19 lessons): i18n, AI Integration, Monorepo, Cloud & Docker, Real-World Practice
  - [ ] Total: 80 lessons across 18 modules
- [ ] Task: Create portfolio project repositories on GitHub
  - [ ] **Phase A — Personal Portfolio Website**: scaffolded with HTML boilerplate, README with project spec
  - [ ] **Phase B — Learning Dashboard**: React + Next.js scaffold, README with project spec
  - [ ] **Phase C+D — Student Progress Tracker**: Next.js + Drizzle scaffold, README with project spec, mirrors RA patterns
- [ ] Task: Create lesson exercise repositories on GitHub (smaller standalone exercises)
  - [ ] Module 2: Simple HTML repo for git practice
  - [ ] Module 3: CSS layout exercise repo
  - [ ] Module 4: JavaScript DOM manipulation exercise repo
  - [ ] Module 5: TypeScript conversion exercise repo
  - [ ] Module 6: Vitest test-writing exercise repo
  - [ ] Module 7: React component-building exercise repo
  - [ ] Module 8: API consumption exercise repo
  - [ ] Module 9: Next.js basic app exercise repo
  - [ ] Module 10: Next.js advanced features exercise repo
  - [ ] Module 11: Drizzle schema + queries exercise repo (mirrors RA tenant patterns)
  - [ ] Module 12: tRPC router + domain function exercise repo (mirrors RA thin router pattern)
  - [ ] Module 13: Auth + assertCan exercise repo (mirrors RA auth pattern)
  - [ ] Module 14: next-intl exercise repo (mirrors RA i18n conventions)
  - [ ] Module 15: AI SDK chat exercise repo (mirrors RA chat route pattern)
  - [ ] Module 16: Monorepo exploration exercises (no repo — uses real monorepo)
  - [ ] Module 17: Docker exercise repo
  - [ ] Module 18: Real-world Issues repo (pre-filed GitHub Issues on the Phase C+D tracker project)
- [ ] Task: Update seed script entry in `packages/db`
- [ ] Task: Measure — User Manual Verification 'Seed Expanded Curriculum Data'

## Phase 6: Implement Admin Dashboard

Build admin-facing features for account management and intern progress tracking.

- [x] Task: Implement account creation domain function [pre-existing]
  - [x] `createInternAccount({ db, user, tenant, input })` — admin-only, creates user with INTERN role
  - [x] `listInterns({ db, user, tenant })` — admin-only, returns all intern accounts with progress summary
  - [x] `getInternProgress({ db, user, tenant, input })` — admin-only, returns detailed progress for a specific intern
- [x] Task: Implement admin tRPC procedures [054c046]
  - [x] `codecamp.createIntern` — admin-protected, creates account
  - [x] `codecamp.listInterns` — admin-protected, cohort overview
  - [x] `codecamp.getInternProgress` — admin-protected, per-intern detail
- [x] Task: Write tests for admin domain functions and router procedures [054c046]
  - [x] Test `createInternAccount` with permission guard (non-admin rejected)
  - [x] Test `listInterns` returns progress summary per intern
  - [x] Test `getInternProgress` returns module completion, quiz scores, PR reviews, last active
- [x] Task: Build admin dashboard UI [6881c7b]
  - [x] Admin route group with auth gate (`ADMIN` role required)
  - [x] Cohort overview page (`/admin`) — table of interns with progress bars and last active
  - [x] Per-intern detail page (`/admin/[userId]`) — module-by-module breakdown, quiz scores, PR review history
  - [x] Account creation form (`/admin/new-intern`) — username, display name, initial password
- [x] Task: Disable self-registration for codecamp [6881c7b]
  - [x] Ensure codecamp-advantage auth flow does not expose a signup endpoint
  - [x] Only admin-created accounts can access codecamp
- [~] Task: Measure — User Manual Verification 'Implement Admin Dashboard'

## Phase 7: Implement Real-World Practice (Module 18)

Build the capstone module with GitHub Issues end-to-end workflow.

- [ ] Task: Create GitHub Issue templates for Module 18 practice repo
  - [ ] Bug fix template
  - [ ] Feature request template
  - [ ] Refactor template
- [ ] Task: Pre-file practice Issues on the Module 18 repo
  - [ ] 5–10 Issues of varying difficulty covering skills from all prior modules
  - [ ] Each Issue includes acceptance criteria and hints
- [ ] Task: Build Issue→PR workflow visualization in codecamp-advantage
  - [ ] Display open Issues from the practice repo via GitHub API
  - [ ] Track intern's PRs linked to Issues
  - [ ] Show workflow status: issue claimed → branch created → PR opened → review received → merged
- [ ] Task: Build code review comment display
  - [ ] Pull LLM review comments from `codecamp_pr_reviews`
  - [ ] Display feedback inline with the exercise
  - [ ] Show review history (initial review → revisions → final)
- [ ] Task: Measure — User Manual Verification 'Implement Real-World Practice'

## Phase 8: Generate Docs & Doctor

- [ ] Task: Update project documentation
  - [ ] Verify `codecamp-advantage` entry in `measure/product.md` is accurate
  - [ ] Update `measure/tech-stack.md` with any new dependencies
  - [ ] Update `measure/lessons-learned.md` with insights from this track
- [ ] Task: Run architectural linting
  - [ ] `pnpm turbo run lint --filter=codecamp-advantage`
  - [ ] `pnpm turbo run check-types --filter=codecamp-advantage`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/domain`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/api`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/webhooks`
- [ ] Task: Verify build
  - [ ] `pnpm turbo run build --filter=codecamp-advantage`
- [ ] Task: Measure — User Manual Verification 'Generate Docs & Doctor'
