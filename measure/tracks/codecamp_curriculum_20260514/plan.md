# Implementation Plan: codecamp-advantage Curriculum Implementation

## Phase 1: Schema Extension

Add `phase` column to the modules table and generate the migration.

- [x] Task: Add `phase` column to `codecampModules` in `packages/db/src/schema/codecamp.ts` [a9fcfda]
  - [ ] Add `phase: text("phase").notNull().default("A")` column
  - [ ] Add `phaseEnum` if preferred: `pgEnum("codecamp_phase", ["A", "B", "C", "D"])`
- [x] Task: Generate and apply Drizzle migration [a9fcfda]
  - [ ] Run `pnpm drizzle-kit generate` to create migration for new column
  - [ ] Apply migration to local database
- [~] Task: Update `getModulesByPhase` domain function to use `phase` column
  - [ ] Replace the `PHASE_RANGES` order-based logic with `where(eq(codecampModules.phase, input.phase))`
  - [ ] This is more robust than deriving phase from order number
- [ ] Task: Write tests for phase-column queries
  - [ ] Test `getModulesByPhase` returns only modules in the specified phase
  - [ ] Test that all 4 phases return correct module counts
- [ ] Task: Measure — User Manual Verification 'Schema Extension'

## Phase 2: Rewrite Seed Data — Phase A (Modules 1–6, 29 lessons)

Replace the old 5-module seed with Phase A modules. Source: `measure/curriculum/unit-01-class-period-plan.md` through `unit-06-class-period-plan.md`.

- [ ] Task: Write Module 1 seed (Dev Environment Setup, 2 lessons)
  - [ ] Module: `{ title: "Dev Environment Setup", slug: "dev-environment", order: 1, phase: "A", status: "published" }`
  - [ ] Lesson 1 (theory): Terminal, Node.js 20, pnpm 8.15.8 — contentJson with sections on terminal basics, installing Node, installing pnpm
  - [ ] Lesson 2 (quiz): Dev environment quiz — 5 questions on terminal commands, Node.js version, pnpm vs npm
- [ ] Task: Write Module 2 seed (Git & GitHub Fundamentals, 4 lessons)
  - [ ] Lesson 1 (theory): Git basics — init, add, commit, Conventional Commits
  - [ ] Lesson 2 (theory): GitHub — remotes, push, pull, Issues
  - [ ] Lesson 3 (exercise): Branching, forking, pull requests, merge conflicts
  - [ ] Lesson 4 (quiz): Git & GitHub quiz — 5 questions
- [ ] Task: Write Module 3 seed (HTML & CSS Crash Course, 6 lessons)
  - [ ] Lesson 1 (theory): Semantic HTML structure
  - [ ] Lesson 2 (theory): CSS basics — selectors, colors, box model
  - [ ] Lesson 3 (theory): Flexbox layouts
  - [ ] Lesson 4 (theory): CSS Grid layouts
  - [ ] Lesson 5 (theory): Responsive design with media queries
  - [ ] Lesson 6 (exercise + quiz): Card layout exercise + HTML/CSS quiz
- [ ] Task: Write Module 4 seed (JavaScript Fundamentals, 8 lessons)
  - [ ] Lesson 1 (theory): Variables, types, operators
  - [ ] Lesson 2 (theory): Functions and scope
  - [ ] Lesson 3 (theory): DOM manipulation
  - [ ] Lesson 4 (theory): Events and form handling
  - [ ] Lesson 5 (theory): Arrays and objects
  - [ ] Lesson 6 (theory): Async/await and Promises
  - [ ] Lesson 7 (theory): Fetch API and error handling
  - [ ] Lesson 8 (exercise + quiz): Dynamic searchable list exercise + JavaScript quiz
- [ ] Task: Write Module 5 seed (TypeScript, 5 lessons)
  - [ ] Lesson 1 (theory): Type annotations, interfaces, type aliases
  - [ ] Lesson 2 (theory): Generics and type narrowing
  - [ ] Lesson 3 (theory): Zod 3.25.76 runtime validation
  - [ ] Lesson 4 (theory): Converting JavaScript to TypeScript
  - [ ] Lesson 5 (exercise + quiz): TypeScript conversion exercise + TypeScript quiz
- [ ] Task: Write Module 6 seed (Testing with Vitest, 4 lessons)
  - [ ] Lesson 1 (theory): Writing unit tests with Vitest 4.1.5
  - [ ] Lesson 2 (theory): Mocking with vi.fn() and vi.mock()
  - [ ] Lesson 3 (theory): Async testing and TDD
  - [ ] Lesson 4 (exercise + quiz): TDD exercise + Vitest quiz
- [ ] Task: Measure — User Manual Verification 'Phase A Seed Data'

## Phase 3: Write Seed Data — Phase B (Modules 7–10, 23 lessons)

Source: `measure/curriculum/unit-07-class-period-plan.md` through `unit-10-class-period-plan.md`.

- [ ] Task: Write Module 7 seed (React, 7 lessons)
  - [ ] Lesson 1 (theory): Components and JSX
  - [ ] Lesson 2 (theory): useState and event handling
  - [ ] Lesson 3 (theory): useEffect and data fetching
  - [ ] Lesson 4 (theory): useContext and prop drilling
  - [ ] Lesson 5 (theory): Lists, keys, and conditional rendering
  - [ ] Lesson 6 (theory): Forms and custom hooks
  - [ ] Lesson 7 (exercise + quiz): Filterable data table exercise + React quiz
- [ ] Task: Write Module 8 seed (API Fundamentals, 5 lessons)
  - [ ] Lesson 1 (theory): HTTP methods, status codes, REST conventions
  - [ ] Lesson 2 (theory): Fetch API GET requests
  - [ ] Lesson 3 (theory): POST, PUT, PATCH, DELETE
  - [ ] Lesson 4 (theory): Error handling patterns
  - [ ] Lesson 5 (exercise + quiz): CRUD client exercise + API quiz
- [ ] Task: Write Module 9 seed (Next.js 16 — Basics, 6 lessons)
  - [ ] Lesson 1 (theory): App Router file conventions
  - [ ] Lesson 2 (theory): Server Components vs Client Components
  - [ ] Lesson 3 (theory): Data fetching in Server Components
  - [ ] Lesson 4 (theory): Dynamic routes and navigation
  - [ ] Lesson 5 (theory): Layouts and nested routing
  - [ ] Lesson 6 (exercise + quiz): Multi-page Next.js app exercise + Next.js basics quiz
- [ ] Task: Write Module 10 seed (Next.js 16 — Advanced, 5 lessons)
  - [ ] Lesson 1 (theory): Route Handlers
  - [ ] Lesson 2 (theory): Middleware
  - [ ] Lesson 3 (theory): Error boundaries and streaming
  - [ ] Lesson 4 (theory): next/image, next/font, metadata
  - [ ] Lesson 5 (exercise + quiz): API routes + streaming exercise + Next.js advanced quiz
- [ ] Task: Measure — User Manual Verification 'Phase B Seed Data'

## Phase 4: Write Seed Data — Phase C (Modules 11–13, 14 lessons)

Source: `measure/curriculum/unit-11-class-period-plan.md` through `unit-13-class-period-plan.md`.

- [ ] Task: Write Module 11 seed (Databases & ORMs, 5 lessons)
  - [ ] Lesson 1 (theory): PostgreSQL 16 basics and SQL
  - [ ] Lesson 2 (theory): Drizzle ORM 0.44.7 schema definition
  - [ ] Lesson 3 (theory): Drizzle queries (SELECT, INSERT, UPDATE, DELETE)
  - [ ] Lesson 4 (theory): Migrations and multi-tenancy (TenantDB)
  - [ ] Lesson 5 (exercise + quiz): Blog database design exercise + databases quiz
- [ ] Task: Write Module 12 seed (tRPC & Server Actions, 5 lessons)
  - [ ] Lesson 1 (theory): Thin router / thick domain architecture
  - [ ] Lesson 2 (theory): tRPC 11.17.0 router setup
  - [ ] Lesson 3 (theory): tRPC on the frontend (useQuery, useMutation)
  - [ ] Lesson 4 (theory): Server Actions
  - [ ] Lesson 5 (exercise + quiz): Blog API with tRPC exercise + tRPC quiz
- [ ] Task: Write Module 13 seed (Authentication, 4 lessons)
  - [ ] Lesson 1 (theory): Session-based authentication
  - [ ] Lesson 2 (theory): Logout, middleware, auth context
  - [ ] Lesson 3 (theory): Role-Based Access Control (RBAC) with assertCan
  - [ ] Lesson 4 (exercise + quiz): Add auth to blog API exercise + auth quiz
- [ ] Task: Measure — User Manual Verification 'Phase C Seed Data'

## Phase 5: Write Seed Data — Phase D (Modules 14–18, 19 lessons)

Source: `measure/curriculum/unit-14-class-period-plan.md` through `unit-18-class-period-plan.md`.

- [ ] Task: Write Module 14 seed (Internationalization, 3 lessons)
  - [ ] Lesson 1 (theory): Setting up next-intl 4.11.0
  - [ ] Lesson 2 (theory): Using translations in components
  - [ ] Lesson 3 (exercise + quiz): Add i18n to blog app exercise + i18n quiz
- [ ] Task: Write Module 15 seed (AI Integration, 5 lessons)
  - [ ] Lesson 1 (theory): AI SDK 4.3.19 basics — generateText and streamText
  - [ ] Lesson 2 (theory): Building a chat UI with useChat
  - [ ] Lesson 3 (theory): Structured output with generateObject
  - [ ] Lesson 4 (theory): Rate limiting and production concerns
  - [ ] Lesson 5 (exercise + quiz): Code review bot exercise + AI integration quiz
- [ ] Task: Write Module 16 seed (Monorepo & Package Management, 3 lessons)
  - [ ] Lesson 1 (theory): pnpm 8.15.8 workspaces and workspace:*
  - [ ] Lesson 2 (theory): Turborepo 2.9.8 pipeline and caching
  - [ ] Lesson 3 (exercise + quiz): Map the Reading Advantage monorepo + monorepo quiz
- [ ] Task: Write Module 17 seed (Cloud & Dockerization, 4 lessons)
  - [ ] Lesson 1 (theory): Docker basics — images, containers, volumes
  - [ ] Lesson 2 (theory): Dockerfile for Next.js (multi-stage build)
  - [ ] Lesson 3 (theory): docker-compose for full stack
  - [ ] Lesson 4 (exercise + quiz): Containerize the tracker exercise + Docker quiz
- [ ] Task: Write Module 18 seed (Real-World Practice, 4 lessons)
  - [ ] Lesson 1 (theory): Reading Issues and planning implementation
  - [ ] Lesson 2 (theory): Opening PRs and code review
  - [ ] Lesson 3 (theory): Continued practice — medium difficulty issues
  - [ ] Lesson 4 (theory): Final practice and retrospective (no quiz — work is the assessment)
- [ ] Task: Measure — User Manual Verification 'Phase D Seed Data'

## Phase 6: Domain and Router Updates

Wire phase information through the domain and API layers.

- [ ] Task: Update `getModulesWithProgress` to include `phase` in response
  - [ ] Add `phase` field to returned module objects
  - [ ] Update type contracts in `@reading-advantage/types` if needed
- [ ] Task: Update `getUserDashboard` to return phase-grouped data
  - [ ] Group modules by phase in the response
  - [ ] Include phase metadata: title, description, portfolio project name
  - [ ] Include per-phase progress (lessons completed / total per phase)
- [ ] Task: Update tRPC router output schemas
  - [ ] Add `phase` to `moduleResponseSchema` in `@reading-advantage/types`
  - [ ] Update `dashboardResponseSchema` to include phase grouping
- [ ] Task: Write tests for updated domain functions
  - [ ] Test `getModulesWithProgress` returns phase for each module
  - [ ] Test `getUserDashboard` returns phase-grouped data
  - [ ] Test `getModulesByPhase` with phase column instead of order ranges
- [ ] Task: Measure — User Manual Verification 'Domain and Router Updates'

## Phase 7: UI Updates

Update the dashboard to display phase-grouped modules with portfolio project context.

- [ ] Task: Update dashboard (`app/page.tsx`) for phase grouping
  - [ ] Group modules by phase with section headers (Foundations, Frameworks, Backend & Data, Production)
  - [ ] Show portfolio project name and description per phase section
  - [ ] Show per-phase progress (e.g., "12/29 lessons" under Foundations)
  - [ ] Maintain overall progress stats in the header area
- [ ] Task: Add phase icon/color coding
  - [ ] Phase A: Green (foundations, getting started)
  - [ ] Phase B: Blue (frameworks, building)
  - [ ] Phase C: Purple (backend, data)
  - [ ] Phase D: Orange (production, shipping)
- [ ] Task: Verify lesson page renders contentJson correctly
  - [ ] Theory lessons: sections with heading, body, and code blocks render properly
  - [ ] Exercise lessons: instructions render, textarea works, submit works
  - [ ] Quiz lessons: questions render, submit scores correctly
- [ ] Task: Measure — User Manual Verification 'UI Updates'

## Phase 8: Validation and Cleanup

Run all checks and verify the curriculum works end-to-end.

- [ ] Task: Delete old seed data completely
  - [ ] Verify no references to the old 5 modules (nextjs-app-router, trpc-domain, drizzle-orm, auth-multitenancy, monorepo-patterns)
  - [ ] Ensure seed script is idempotent (can run multiple times safely)
- [ ] Task: Run full test suite
  - [ ] `pnpm turbo run test --filter=@reading-advantage/domain`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/api`
  - [ ] All existing tests still pass with new schema and seed data
- [ ] Task: Run build and type checks
  - [ ] `pnpm turbo run build --filter=codecamp-advantage`
  - [ ] `pnpm turbo run check-types --filter=codecamp-advantage`
  - [ ] `pnpm turbo run lint --filter=codecamp-advantage`
- [ ] Task: Manual smoke test
  - [ ] Seed the database: `pnpm --filter @reading-advantage/db run seed`
  - [ ] Start the app: `pnpm dev`
  - [ ] Verify dashboard shows 4 phase groups with 18 modules
  - [ ] Open a module → verify lessons appear with real content
  - [ ] Open a theory lesson → verify contentJson renders
  - [ ] Complete a quiz → verify scoring works
  - [ ] Submit an exercise → verify submission works
  - [ ] Open chat → verify module context is available
- [ ] Task: Update `measure/tracks.md` to reference this track
- [ ] Task: Measure — User Manual Verification 'Validation and Cleanup'
