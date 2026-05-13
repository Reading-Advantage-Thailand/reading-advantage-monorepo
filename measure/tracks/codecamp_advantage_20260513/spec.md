# Specification: codecamp-advantage — LLM-Powered Next.js Intern Training App

## Overview

Create a new Next.js application (`apps/codecamp-advantage`) that uses LLMs to teach Next.js and the Reading Advantage monorepo's architectural patterns to new interns. The app serves as both a learning platform and a living reference implementation of the patterns it teaches.

## Functional Requirements

### 1. Interactive Chat Tutor
- Conversational interface where interns ask questions about Next.js, React, tRPC, Drizzle, auth, and monorepo patterns
- LLM responses are grounded in the monorepo's actual code (AGENTS.md, existing app examples, shared packages)
- Conversation history persisted per user
- Context-aware: LLM knows which lesson/topic the intern is currently viewing

### 2. Guided Code Exercises
- Step-by-step coding challenges embedded in the UI
- Exercises use real monorepo patterns (e.g., "Write a domain function that uses assertCan() and db.insert()")
- **LLM reviews submitted code** and gives feedback/hints (not automated pass/fail — no sandbox in MVP)
- Immediate feedback with explanations

### 3. Architecture Walkthroughs
- Rich lesson content (`contentJson`) with embedded diagrams and code references
- Explains: App Router → tRPC → domain functions → Drizzle → Postgres
- References actual files from the codebase (packages/api, packages/domain, packages/db)
- *Deferred:* Dedicated interactive walkthrough component with progressive disclosure (future track)

### 4. Quiz / Assessment Mode
- **Static quizzes** stored in `codecamp_quiz_questions` (MVP choice — reliable, testable)
- Questions cover monorepo patterns and conventions
- Score tracking and progress persistence
- *Deferred:* LLM-generated adaptive quizzes (future track)

### 5. Curriculum Modules
The app must cover the following modules:
1. **Next.js App Router & RSC** — Server Components, async page patterns, data fetching
2. **tRPC & Domain Functions** — Router structure, input validation, thin routers / thick domain
3. **Drizzle ORM** — Schema definition, multi-tenant queries, migrations
4. **Auth & Multi-Tenancy** — Cookie sessions, roles/permissions, assertCan(), tenant resolution
5. **Monorepo Patterns** — Workspace structure, shared packages, Turborepo pipelines

### 6. User Progress Tracking
- Per-user progress across modules, exercises, and quizzes
- Dashboard showing completion status and scores
- Resume capability: return to last active lesson/exercise

## Non-Functional Requirements

- **Integration:** Must consume `@reading-advantage/auth`, `@reading-advantage/db`, `@reading-advantage/api`, `@reading-advantage/ui`
- **Tenancy:** Codecamp is intentionally **single-tenant / global** — all authenticated users access the same curriculum and their own progress. `schoolId` is omitted from codecamp tables by design. Domain functions use `TenantDB` for consistency but codecamp queries are user-scoped by `userId`, not school-scoped.
- **Styling:** Tailwind CSS v4 with shared config; Radix/shadcn components from `@reading-advantage/ui`
- **Testing:** Vitest unit tests for all new backend/domain code; target >80% coverage
- **i18n:** next-intl ready (English first, i18n structure in place)
- **Performance:** Streaming LLM responses for chat; code exercise feedback <3s
- **Auth:** Cookie-based DB sessions via shared auth package

## Acceptance Criteria

- [ ] App builds successfully from monorepo root (`pnpm turbo run build --filter=codecamp-advantage`)
- [ ] Intern can register/login via shared auth system
- [ ] Intern can chat with LLM about Next.js patterns and receive grounded answers
- [ ] Intern can complete at least one guided code exercise per module (LLM-reviewed, not autograded)
- [ ] Intern can take a static quiz and see their score persisted
- [ ] Chat streaming uses a Next.js route handler (deliberate exception to tRPC-for-streaming pattern); chat persistence uses tRPC
- [ ] Progress dashboard shows module completion status
- [ ] All new domain functions have unit tests with >80% coverage
- [ ] Lint passes with shared ESLint config
- [ ] App is listed in root `package.json` workspaces / `turbo.json` pipeline

## Out of Scope

- Real-time collaborative editing (single-user learning only)
- Video content generation (text + interactive code only)
- Integration with external LMS (internal tool only)
- Mobile-native app (responsive web only)
- Admin/teacher dashboard (deferred; focus on intern experience first)
- AI-generated curriculum from live codebase (static curriculum with LLM tutoring only)
