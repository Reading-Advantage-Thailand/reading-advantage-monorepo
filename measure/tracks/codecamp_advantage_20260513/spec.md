# Specification: codecamp-advantage — Full-Stack Web Dev Intern Bootcamp

## Overview

Create a Next.js application (`apps/codecamp-advantage`) that trains interns with near-zero JavaScript experience into productive web developers over ~4 months. The app delivers an 18-module curriculum through guided lessons, fork-based coding exercises with LLM PR review, GitHub Issues practice, and an AI chat tutor. Exercises progressively mirror real Reading Advantage architecture patterns so interns recognize the codebase when they encounter it.

## Target Users

- **Primary:** Interns (~1 year of a 2-year associate degree program) joining Reading Advantage. They have minimal exposure to HTML, Python, or C — likely no meaningful JavaScript, TypeScript, or React experience.
- **Secondary:** Mentors and managers tracking intern progress

## Time Commitment

- Interns spend **1+ hour per day** on codecamp-advantage
- 18 modules, ~80 lessons (one per workday) over ~4 months
- Each lesson is sized for a single sitting

## Portfolio Projects

Each phase has a **portfolio project** that interns build incrementally across modules. By the end of the program, interns have four shipped projects to showcase.

| Phase | Portfolio Project | Description |
|-------|-------------------|-------------|
| A | **Personal Portfolio Website** | Starts as static HTML/CSS → add JS interactivity → convert to TypeScript → write tests. A real personal site they can host and show. |
| B | **Learning Dashboard** | Rebuild as a React SPA → integrate external APIs → migrate to Next.js with SSR/SSG → add advanced patterns. Mirrors the codecamp dashboard they use daily. |
| C | **Student Progress Tracker** | Add a PostgreSQL database → build a tRPC API with domain functions → implement auth with RBAC and multi-tenancy. Directly mirrors Reading Advantage's core domain. |
| D | **Production-Ready Tracker** | Same Phase C app, productionized — add i18n, AI chat assistant, understand monorepo packaging, Dockerize, and ship. One full-stack app from database to deployment. |

Phase C and D are the **same application** — interns build it, then ship it. This mirrors real product development: build → hardening → deployment.

Each portfolio project has its own GitHub repository. Interns commit to it across multiple modules, so their git history tells the story of the project's evolution.

## Curriculum Modules

### Phase A: Foundations — Personal Portfolio Website (Modules 1–6, 29 lessons)

| # | Module | Lessons | Key Topics |
|---|--------|---------|-----------|
| 1 | **Dev Environment Setup** | 2 | VS Code, essential extensions (ESLint, Prettier, GitLens), Node.js, pnpm, terminal proficiency |
| 2 | **Git & GitHub Fundamentals** | 4 | init/add/commit/push, branching, forking, pull requests, Issues, basic collaboration |
| 3 | **HTML & CSS Crash Course** | 6 | Semantic HTML, box model, Flexbox, Grid, responsive design — build portfolio site structure |
| 4 | **JavaScript Fundamentals** | 8 | Variables, functions, closures, DOM manipulation, async/await, Promises — add interactivity to portfolio |
| 5 | **TypeScript** | 5 | Types, interfaces, generics, type narrowing, Zod validation — convert portfolio JS to TS |
| 6 | **Testing with Vitest** | 4 | Unit test basics, mocking, assertions, coverage — test portfolio utility functions |

### Phase B: Frameworks — Learning Dashboard (Modules 7–10, 23 lessons)

| # | Module | Lessons | Key Topics |
|---|--------|---------|-----------|
| 7 | **React** | 7 | Components, props, state, hooks, composition, lists/keys — build dashboard as React SPA |
| 8 | **API Fundamentals** | 5 | HTTP methods, REST, Fetch, request/response, error handling, JSON — fetch real API data into dashboard |
| 9 | **Next.js 16 — Basics** | 6 | App Router, RSC, pages/layouts, data fetching, loading/error states — migrate dashboard to Next.js |
| 10 | **Next.js 16 — Advanced** | 5 | Route handlers, middleware, error boundaries, optimization, streaming — polish the dashboard |

### Phase C: Backend & Data — Student Progress Tracker (Modules 11–13, 14 lessons)

| # | Module | Lessons | Key Topics |
|---|--------|---------|-----------|
| 11 | **Databases & ORMs** | 5 | PostgreSQL basics, Drizzle schema/queries/migrations, multi-tenant patterns — add database to tracker |
| 12 | **tRPC & Server Actions** | 5 | Type-safe API, thin routers / thick domain functions, Server Actions — build tracker API |
| 13 | **Authentication** | 4 | Cookie sessions, RBAC, assertCan(), multi-tenancy — add auth with teacher/student roles |

### Phase D: Production — Production-Ready Tracker (Modules 14–18, 19 lessons)

| # | Module | Lessons | Key Topics |
|---|--------|---------|-----------|
| 14 | **Internationalization** | 3 | next-intl setup, message extraction, locale routing — add Thai/English to tracker |
| 15 | **AI Integration** | 5 | Vercel AI SDK, streamText, generateObject, chat UI — add AI tutor feature to tracker |
| 16 | **Monorepo & Package Management** | 3 | pnpm workspaces, Turborepo, shared packages — understand how the real RA monorepo works |
| 17 | **Cloud & Dockerization** | 4 | Docker basics, containerize the tracker, Google Cloud overview, deployment |
| 18 | **Real-World Practice** | 4 | Solve GitHub Issues on the tracker repo, code review etiquette, feature delivery lifecycle |

## Functional Requirements

### 1. Interactive Chat Tutor
- Conversational interface where interns ask questions about any curriculum topic
- LLM responses are grounded in the monorepo's actual code and the current module's learning objectives
- Chat defaults to Thai (interns will use Thai) — curriculum content remains English
- Conversation history persisted per user per module
- Streaming responses for real-time feedback

### 2. Fork-Based Coding Exercises
- Each module has 1–3 exercise repositories on the Reading Advantage GitHub org
- Portfolio project repos are the primary exercise vehicles — interns commit to the same project across modules within a phase
- Individual lesson exercises use smaller standalone repos for focused practice
- Intern forks the repo, completes the exercise on a branch, opens a PR
- GitHub webhook triggers LLM code review on PR open/update
- LLM posts review as GitHub PR comments — advisory and educational, not a hard gate
- Intern owns the fork and decides when to merge after addressing feedback
- PR review status tracked in codecamp-advantage for progress visibility

### 3. Architecture Mirroring
- Phase C+D portfolio project (Student Progress Tracker) uses simplified but structurally faithful versions of Reading Advantage patterns:
  - Drizzle schemas with tenant scoping and multi-tenant queries (Module 11)
  - Thin tRPC routers delegating to thick domain functions (Module 12)
  - Domain functions with `assertCan()` permission checks (Module 13)
  - next-intl message structure matching the monorepo's i18n conventions (Module 14)
  - Vercel AI SDK patterns matching the chat route in the real codebase (Module 15)
- Phase B portfolio project (Learning Dashboard) mirrors the codecamp-advantage app the interns use daily
- Interns encounter recognizable patterns when they see the real codebase

### 4. GitHub Issues Practice (Module 18)
- Practice repos contain pre-filed GitHub Issues describing features or bugs
- Intern implements the full cycle: read issue → create branch → implement → open PR → address review → merge
- Issue templates provided for common task types (bug fix, feature, refactor)

### 5. Architecture Walkthroughs
- Rich lesson content with embedded diagrams and code references
- References actual files from the Reading Advantage monorepo (packages/api, packages/domain, packages/db)
- Progressive disclosure: advanced details hidden behind interaction

### 6. Quizzes
- Static quizzes stored in `codecamp_quiz_questions` per module
- Multiple choice, immediate scoring with explanations
- Score tracking and progress persistence

### 7. User Progress Tracking
- Per-user progress across all 18 modules, exercises, and quizzes
- Dashboard showing completion status, PR review status, and quiz scores
- Resume capability: return to last active lesson/exercise
- Module prerequisites enforced (must complete earlier modules before advancing)

### 8. Admin Dashboard
- Admins (managers, mentors) can view all interns' progress at a glance
- Account creation: admins create intern accounts (no self-registration)
- Per-intern view: module completion, quiz scores, PR review history, last active timestamp
- Cohort overview: aggregate progress across all interns, identify who is falling behind
- Role-based access: `ADMIN` role sees dashboard; `INTERN` role sees only their own progress

## Non-Functional Requirements

- **Integration:** Must consume `@reading-advantage/auth`, `@reading-advantage/db`, `@reading-advantage/api`, `@reading-advantage/ui`
- **Tenancy:** Codecamp is intentionally **single-tenant / global** — all authenticated users access the same curriculum and their own progress. `schoolId` is omitted from codecamp tables by design. Domain functions use `TenantDB` for consistency but codecamp queries are user-scoped by `userId`, not school-scoped.
- **Styling:** Tailwind CSS v4 with shared config; Radix/shadcn components from `@reading-advantage/ui`
- **Testing:** Vitest unit tests for all new backend/domain code; target >80% coverage
- **i18n:** next-intl ready (English curriculum content, Thai chat by default)
- **Performance:** Streaming LLM responses for chat; exercise feedback <3s
- **Auth:** Cookie-based DB sessions via shared auth package
- **GitHub Integration:** GitHub App with webhook for PR events; REST/GraphQL API for reading exercise repo content and posting review comments

## Database Schema Extensions

The existing 7 codecamp tables are retained. Two new tables added:

- **`codecamp_exercise_repos`** (id, moduleId, repoUrl, description, order, createdAt) — Links curriculum modules to their GitHub exercise repositories
- **`codecamp_pr_reviews`** (id, exerciseRepoId, userId, prUrl, reviewStatus, llmReviewSummary, reviewedAt, createdAt) — Tracks LLM PR review results for progress visibility

## Acceptance Criteria

- [ ] App builds successfully from monorepo root (`pnpm turbo run build --filter=codecamp-advantage`)
- [ ] Intern can register/login via shared auth system
- [ ] Intern can chat with LLM about any curriculum topic and receive grounded, streaming answers (Thai by default)
- [ ] Intern can browse 18 modules / ~80 lessons grouped by phase with portfolio project context
- [ ] Intern can complete fork-based exercises with LLM PR review (GitHub webhook → LLM review → PR comment)
- [ ] Intern can take quizzes per module with score persistence
- [ ] PR review status visible in codecamp dashboard (linked to exercise repos)
- [ ] Module 18 exercises use GitHub Issues with full issue→PR→merge cycle
- [ ] Each phase has a portfolio project that interns build incrementally across modules
- [ ] Phase C+D portfolio project mirrors Reading Advantage architecture patterns
- [ ] Module prerequisites enforced sequentially
- [ ] Progress dashboard shows module completion, quiz scores, and PR review status
- [ ] Admin can create intern accounts
- [ ] Admin dashboard shows cohort overview with per-intern progress (module completion, quiz scores, PR reviews, last active)
- [ ] All new domain functions have unit tests with >80% coverage
- [ ] Lint passes with shared ESLint config
- [ ] App is listed in root `package.json` workspaces / `turbo.json` pipeline

## Out of Scope

- No real-time collaborative editing (each intern works independently)
- Video content generation (text + interactive code only)
- Integration with external LMS (internal tool only)
- Mobile-native app (responsive web only)
- AI-generated curriculum from live codebase (static curriculum with LLM tutoring only)
- Automated code sandboxing/execution (LLM reviews code statically; no runtime execution of intern code)
