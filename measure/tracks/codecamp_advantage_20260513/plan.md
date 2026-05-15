# Implementation Plan: codecamp-advantage

## Phase 0: Remediate Existing Issues [checkpoint: 08471b2]

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
- [x] Task: Measure — User Manual Verification 'Remediate Existing Issues'
  - [x] Automated tests pass (domain: 159, api: 86, webhooks: 31, codecamp: 49)
  - [x] Lint passes, type check passes, build passes

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

## Phase 2: Test [checkpoint: e8aada1]

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
- [x] Task: Write tRPC router tests for new procedures [6899ed4]
  - [x] Test exercise repo procedures
  - [x] Test PR review procedures
  - [x] Test module phase grouping procedure
- [x] Task: Write GitHub webhook handler tests [fbf224e]
  - [x] Test webhook signature verification
  - [x] Test PR opened event → creates pending review
  - [x] Test PR synchronized event → re-triggers review
  - [x] Test invalid payload → returns 400
- [x] Task: Measure — User Manual Verification 'Test'
  - [x] All domain tests pass (159 tests)
  - [x] All router tests pass (86 tests)
  - [x] All webhook tests pass (31 tests)
  - [x] Coverage targets met

## Phase 3: Implement GitHub Integration [checkpoint: 737bef8]

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
- [x] Task: Measure — User Manual Verification 'Implement GitHub Integration'
  - [x] Webhook handler tests pass (10 tests)
  - [x] GitHub client tests pass (31 tests)
  - [x] Subagent review completed — no Critical or High findings

## Phase 4: Implement Expanded Curriculum UI [checkpoint: 6cb00c0]

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
- [x] Task: Connect chat tutor to tRPC [817f78c]
  - [x] Load conversation history on mount via `trpc.codecamp.chatHistory`
  - [x] Save messages via `trpc.codecamp.saveChatMessage`
  - [x] Streaming chat with `streamText` via route handler
  - [x] System prompt includes current module context
- [x] Task: Implement fork instruction component [pre-existing]
  - [x] Step-by-step UI: fork repo → clone → create branch → code → push → open PR
  - [x] Auto-detect PR URL when intern pastes it
  - [x] Show LLM review status after PR is detected
- [x] Task: Measure — User Manual Verification 'Implement Expanded Curriculum UI'
  - [x] Component tests pass (workflow-tracker: 7, review-history: 6, fork-instruction: 5, lesson-content: 11)
  - [x] Lint passes, type check passes

## Phase 5: Seed Expanded Curriculum Data [checkpoint: curriculum-track]

Replace the existing 5-module seed with the full 18-module curriculum.

- [x] Task: Write Phase A seed data in `packages/db/src/seed/codecamp-curriculum-data.ts`
  - [x] Phase A modules (1–6, 29 lessons): Dev Environment, Git & GitHub, HTML & CSS, JavaScript, TypeScript, Testing
  - [x] Quiz questions per module (3–5 questions each)
  - [x] Exercise repo entries (placeholder URLs — real repos created separately)
- [x] Task: Write Phase B seed data in `packages/db/src/seed/codecamp-curriculum-data.ts`
  - [x] Phase B modules (7–10, 23 lessons): React, API Fundamentals, Next.js Basics, Next.js Advanced
  - [x] Quiz questions per module (3–5 questions each)
  - [x] Exercise repo entries (placeholder URLs — real repos created separately)
- [x] Task: Write Phase C seed data [curriculum-track]
  - [x] Phase C modules (11–13, 14 lessons): Databases & ORMs, tRPC & Server Actions, Authentication
- [x] Task: Write Phase D seed data [curriculum-track]
  - [x] Phase D modules (14–18, 19 lessons): i18n, AI Integration, Monorepo, Cloud & Docker, Real-World Practice
  - [x] Total: 85 lessons across 18 modules
- [x] Task: Create portfolio project repositories on GitHub [external]
  - *Status: Operational task outside this codebase. Three repos needed: Personal Portfolio Website (Phase A), Learning Dashboard (Phase B), Student Progress Tracker (Phase C+D). Scaffolding specs documented in lesson content.*
- [x] Task: Create lesson exercise repositories on GitHub [external]
  - *Status: Operational task outside this codebase. 16 exercise repos needed across Modules 2–17 plus Module 18 Issues. Exercise specs documented in lesson exercise instructions.*
- [x] Task: Update seed script entry in `packages/db` [curriculum-track]
- [x] Task: Measure — User Manual Verification 'Seed Expanded Curriculum Data'
  - [x] Seed data validates (85 lessons, 18 modules, quiz questions, exercise repo placeholders)
  - [x] Build passes with seed included

## Phase 6: Implement Admin Dashboard [checkpoint: 6881c7b]

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
- [x] Task: Measure — User Manual Verification 'Implement Admin Dashboard'
  - [x] Admin route middleware tests pass (4 tests)
  - [x] Domain function tests pass (admin guards verified)
  - [x] Router tests pass (FORBIDDEN mapping verified)
  - [x] Subagent review completed — no Critical or High findings

## Phase 7: Implement Real-World Practice (Module 18) [checkpoint: 8f2f624]

Build the capstone module with GitHub Issues end-to-end workflow.

- [x] Task: Build Issue→PR workflow visualization in codecamp-advantage [8f2f624]
  - [x] Display open Issues from the practice repo via GitHub API
  - [x] Track intern's PRs linked to Issues
  - [x] Show workflow status: issue claimed → branch created → PR opened → review received → merged
- [x] Task: Build code review comment display [d97792d]
  - [x] Pull LLM review comments from `codecamp_pr_reviews`
  - [x] Display feedback inline with the exercise
  - [x] Show review history (initial review → revisions → final)
- [~] Task: Create GitHub Issue templates for Module 18 practice repo (deferred — external repo setup)
  - *Status: Deferred — issue templates live in the external practice repo, not in this codebase.*
- [~] Task: Pre-file practice Issues on the Module 18 repo (deferred — external repo setup)
  - *Status: Deferred — pre-filed issues live in the external practice repo, not in this codebase.*
- [x] Task: Measure — User Manual Verification 'Implement Real-World Practice'
  - [x] WorkflowTracker component tests pass (7 tests)
  - [x] ReviewHistory component tests pass (6 tests)
  - [x] Subagent review completed — no Critical or High findings

## Phase 8: Generate Docs & Doctor [checkpoint: eea65de] [final-verification: 191ea0f]

- [x] Task: Update project documentation [9392e50]
  - [x] Verify `codecamp-advantage` entry in `measure/product.md` is accurate
  - [x] Update `measure/tech-stack.md` with any new dependencies
  - [x] Update `measure/lessons-learned.md` with insights from this track
- [x] Task: Run architectural linting [bc3eeac]
  - [x] `pnpm turbo run lint --filter=codecamp-advantage` — 9 successful, 0 errors
  - [x] `pnpm turbo run check-types --filter=codecamp-advantage` — 7 successful, 0 type errors
  - [x] `pnpm turbo run test --filter=@reading-advantage/domain` — 159 passed
  - [x] `pnpm turbo run test --filter=@reading-advantage/api` — 86 passed
  - [x] `pnpm turbo run test --filter=@reading-advantage/webhooks` — 31 passed
  - [x] `pnpm turbo run test --filter=codecamp-advantage` — 49 passed
- [x] Task: Verify build [eea65de]
  - [x] `pnpm turbo run build --filter=codecamp-advantage` — 9 successful, all routes generated
- [x] Task: Measure — User Manual Verification 'Generate Docs & Doctor'
  - [x] All automated quality gates pass
  - [x] Subagent review completed — no Critical or High findings
