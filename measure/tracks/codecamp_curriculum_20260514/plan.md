# Implementation Plan: codecamp-advantage Curriculum Implementation

## Phase 1: Schema Extension [checkpoint: 6f3a48f]

Add `phase` column to the modules table and generate the migration.

- [x] Task: Add `phase` column to `codecampModules` in `packages/db/src/schema/codecamp.ts` [a9fcfda]
  - [x] Add `phase: text("phase").notNull().default("A")` column
  - [x] Add `phaseEnum` if preferred: `pgEnum("codecamp_phase", ["A", "B", "C", "D"])`
- [x] Task: Generate and apply Drizzle migration [a9fcfda]
  - [x] Run `pnpm drizzle-kit generate` to create migration for new column
  - [x] Apply migration to local database
- [x] Task: Update `getModulesByPhase` domain function to use `phase` column [a021829]
  - [x] Replace the `PHASE_RANGES` order-based logic with `where(eq(codecampModules.phase, input.phase))`
  - [x] This is more robust than deriving phase from order number
- [x] Task: Write tests for phase-column queries [a021829]
  - [x] Test `getModulesByPhase` returns only modules in the specified phase
  - [x] Test that all 4 phases return correct module counts
- [x] Task: Measure — User Manual Verification 'Schema Extension'

## Phase 2: Rewrite Seed Data — Phase A (Modules 1–6, 29 lessons) [checkpoint: 9d19f9a]

Replace the old 5-module seed with Phase A modules. Source: `measure/curriculum/unit-01-class-period-plan.md` through `unit-06-class-period-plan.md`.

- [x] Task: Write Module 1 seed (Dev Environment Setup, 2 lessons) [4f7bdce]
  - [x] Module: `{ title: "Dev Environment Setup", slug: "dev-environment", order: 1, phase: "A", status: "published" }`
  - [x] Lesson 1 (theory): Terminal, Node.js 20, pnpm 8.15.8 — contentJson with sections on terminal basics, installing Node, installing pnpm
  - [x] Lesson 2 (quiz): Dev environment quiz — 5 questions on terminal commands, Node.js version, pnpm vs npm
- [x] Task: Write Module 2 seed (Git & GitHub Fundamentals, 4 lessons) [4f7bdce]
  - [x] Lesson 1 (theory): Git basics — init, add, commit, Conventional Commits
  - [x] Lesson 2 (theory): GitHub — remotes, push, pull, Issues
  - [x] Lesson 3 (exercise): Branching, forking, pull requests, merge conflicts
  - [x] Lesson 4 (quiz): Git & GitHub quiz — 5 questions
- [x] Task: Write Module 3 seed (HTML & CSS Crash Course, 6 lessons) [4f7bdce]
  - [x] Lesson 1 (theory): Semantic HTML structure
  - [x] Lesson 2 (theory): CSS basics — selectors, colors, box model
  - [x] Lesson 3 (theory): Flexbox layouts
  - [x] Lesson 4 (theory): CSS Grid layouts
  - [x] Lesson 5 (theory): Responsive design with media queries
  - [x] Lesson 6 (exercise + quiz): Card layout exercise + HTML/CSS quiz
- [x] Task: Write Module 4 seed (JavaScript Fundamentals, 8 lessons) [4f7bdce]
  - [x] Lesson 1 (theory): Variables, types, operators
  - [x] Lesson 2 (theory): Functions and scope
  - [x] Lesson 3 (theory): DOM manipulation
  - [x] Lesson 4 (theory): Events and form handling
  - [x] Lesson 5 (theory): Arrays and objects
  - [x] Lesson 6 (theory): Async/await and Promises
  - [x] Lesson 7 (theory): Fetch API and error handling
  - [x] Lesson 8 (exercise + quiz): Dynamic searchable list exercise + JavaScript quiz
- [x] Task: Write Module 5 seed (TypeScript, 5 lessons) [4f7bdce]
  - [x] Lesson 1 (theory): Type annotations, interfaces, type aliases
  - [x] Lesson 2 (theory): Generics and type narrowing
  - [x] Lesson 3 (theory): Zod 3.25.76 runtime validation
  - [x] Lesson 4 (theory): Converting JavaScript to TypeScript
  - [x] Lesson 5 (exercise + quiz): TypeScript conversion exercise + TypeScript quiz
- [x] Task: Write Module 6 seed (Testing with Vitest, 4 lessons) [4f7bdce]
  - [x] Lesson 1 (theory): Writing unit tests with Vitest 4.1.5
  - [x] Lesson 2 (theory): Mocking with vi.fn() and vi.mock()
  - [x] Lesson 3 (theory): Async testing and TDD
  - [x] Lesson 4 (exercise + quiz): TDD exercise + Vitest quiz
- [x] Task: Measure — User Manual Verification 'Phase A Seed Data' [4f7bdce]

## Phase 3: Write Seed Data — Phase B (Modules 7–10, 23 lessons) [checkpoint: 048bc4c]

Source: `measure/curriculum/unit-07-class-period-plan.md` through `unit-10-class-period-plan.md`.

- [x] Task: Write Module 7 seed (React, 7 lessons) [048bc4c]
  - [x] Lesson 1 (theory): Components and JSX
  - [x] Lesson 2 (theory): useState and event handling
  - [x] Lesson 3 (theory): useEffect and data fetching
  - [x] Lesson 4 (theory): useContext and prop drilling
  - [x] Lesson 5 (theory): Lists, keys, and conditional rendering
  - [x] Lesson 6 (theory): Forms and custom hooks
  - [x] Lesson 7 (exercise + quiz): Filterable data table exercise + React quiz
- [x] Task: Write Module 8 seed (API Fundamentals, 5 lessons) [048bc4c]
  - [x] Lesson 1 (theory): HTTP methods, status codes, REST conventions
  - [x] Lesson 2 (theory): Fetch API GET requests
  - [x] Lesson 3 (theory): POST, PUT, PATCH, DELETE
  - [x] Lesson 4 (theory): Error handling patterns
  - [x] Lesson 5 (exercise + quiz): CRUD client exercise + API quiz
- [x] Task: Write Module 9 seed (Next.js 16 — Basics, 6 lessons) [048bc4c]
  - [x] Lesson 1 (theory): App Router file conventions
  - [x] Lesson 2 (theory): Server Components vs Client Components
  - [x] Lesson 3 (theory): Data fetching in Server Components
  - [x] Lesson 4 (theory): Dynamic routes and navigation
  - [x] Lesson 5 (theory): Layouts and nested routing
  - [x] Lesson 6 (exercise + quiz): Multi-page Next.js app exercise + Next.js basics quiz
- [x] Task: Write Module 10 seed (Next.js 16 — Advanced, 5 lessons) [048bc4c]
  - [x] Lesson 1 (theory): Route Handlers
  - [x] Lesson 2 (theory): Middleware
  - [x] Lesson 3 (theory): Error boundaries and streaming
  - [x] Lesson 4 (theory): next/image, next/font, metadata
  - [x] Lesson 5 (exercise + quiz): API routes + streaming exercise + Next.js advanced quiz
- [x] Task: Measure — User Manual Verification 'Phase B Seed Data' [048bc4c]

## Phase 4: Write Seed Data — Phase C (Modules 11–13, 14 lessons)

Source: `measure/curriculum/unit-11-class-period-plan.md` through `unit-13-class-period-plan.md`.

- [x] Task: Write Module 11 seed (Databases & ORMs, 5 lessons) [5923558]
  - [x] Lesson 1 (theory): PostgreSQL 16 basics and SQL
  - [x] Lesson 2 (theory): Drizzle ORM 0.44.7 schema definition
  - [x] Lesson 3 (theory): Drizzle queries (SELECT, INSERT, UPDATE, DELETE)
  - [x] Lesson 4 (theory): Migrations and multi-tenancy (TenantDB)
  - [x] Lesson 5 (exercise + quiz): Blog database design exercise + databases quiz
- [x] Task: Write Module 12 seed (tRPC & Server Actions, 5 lessons) [5923558]
  - [x] Lesson 1 (theory): Thin router / thick domain architecture
  - [x] Lesson 2 (theory): tRPC 11.17.0 router setup
  - [x] Lesson 3 (theory): tRPC on the frontend (useQuery, useMutation)
  - [x] Lesson 4 (theory): Server Actions
  - [x] Lesson 5 (exercise + quiz): Blog API with tRPC exercise + tRPC quiz
- [x] Task: Write Module 13 seed (Authentication, 4 lessons) [5923558]
  - [x] Lesson 1 (theory): Session-based authentication
  - [x] Lesson 2 (theory): Logout, middleware, auth context
  - [x] Lesson 3 (theory): Role-Based Access Control (RBAC) with assertCan
  - [x] Lesson 4 (exercise + quiz): Add auth to blog API exercise + auth quiz
- [ ] Task: Measure — User Manual Verification 'Phase C Seed Data'

## Phase 5: Write Seed Data — Phase D (Modules 14–18, 19 lessons)

Source: `measure/curriculum/unit-14-class-period-plan.md` through `unit-18-class-period-plan.md`.

- [x] Task: Write Module 14 seed (Internationalization, 3 lessons)
  - [x] Lesson 1 (theory): Setting up next-intl 4.11.0
  - [x] Lesson 2 (theory): Using translations in components
  - [x] Lesson 3 (exercise + quiz): Add i18n to blog app exercise + i18n quiz
- [x] Task: Write Module 15 seed (AI Integration, 5 lessons)
  - [x] Lesson 1 (theory): AI SDK 4.3.19 basics — generateText and streamText
  - [x] Lesson 2 (theory): Building a chat UI with useChat
  - [x] Lesson 3 (theory): Structured output with generateObject
  - [x] Lesson 4 (theory): Rate limiting and production concerns
  - [x] Lesson 5 (exercise + quiz): Code review bot exercise + AI integration quiz
- [x] Task: Write Module 16 seed (Monorepo & Package Management, 3 lessons)
  - [x] Lesson 1 (theory): pnpm 8.15.8 workspaces and workspace:*
  - [x] Lesson 2 (theory): Turborepo 2.9.8 pipeline and caching
  - [x] Lesson 3 (exercise + quiz): Map the Reading Advantage monorepo + monorepo quiz
- [x] Task: Write Module 17 seed (Cloud & Dockerization, 4 lessons)
  - [x] Lesson 1 (theory): Docker basics — images, containers, volumes
  - [x] Lesson 2 (theory): Dockerfile for Next.js (multi-stage build)
  - [x] Lesson 3 (theory): docker-compose for full stack
  - [x] Lesson 4 (exercise + quiz): Containerize the tracker exercise + Docker quiz
- [x] Task: Write Module 18 seed (Real-World Practice, 4 lessons)
  - [x] Lesson 1 (theory): Reading Issues and planning implementation
  - [x] Lesson 2 (theory): Opening PRs and code review
  - [x] Lesson 3 (theory): Continued practice — medium difficulty issues
  - [x] Lesson 4 (theory): Final practice and retrospective (no quiz — work is the assessment)
- [x] Task: Measure — User Manual Verification 'Phase D Seed Data' [39b7338]

## Phase 6: Domain and Router Updates

Wire phase information through the domain and API layers.

- [x] Task: Update `getModulesWithProgress` to include `phase` in response
  - [x] `getModulesWithProgress` already returns `...mod` which spreads all DB columns including `phase`
  - [x] `moduleResponseSchema` in `@reading-advantage/types` already includes `phase: z.string()`
- [x] Task: Update `getUserDashboard` to return phase-grouped data [461ff82]
  - [x] Group modules by phase in the response
  - [x] Include phase metadata: title, description, portfolio project name
  - [x] Include per-phase progress (lessons completed / total per phase)
- [x] Task: Update tRPC router output schemas
  - [x] `moduleResponseSchema` already includes `phase: z.string()`
  - [x] Update `dashboardResponseSchema` to include phase grouping [461ff82]
- [x] Task: Write tests for updated domain functions [461ff82]
  - [x] Test `getModulesWithProgress` returns phase for each module
  - [x] Test `getUserDashboard` returns phase-grouped data
  - [x] Test `getModulesByPhase` with phase column instead of order ranges
- [ ] Task: Measure — User Manual Verification 'Domain and Router Updates'

## Phase 7: UI Updates

Update the dashboard to display phase-grouped modules with portfolio project context.

- [x] Task: Update dashboard (`app/page.tsx`) for phase grouping [461ff82]
  - [x] Group modules by phase with section headers (Foundations, Frameworks, Backend & Data, Production)
  - [x] Show portfolio project name and description per phase section
  - [x] Show per-phase progress (e.g., "12/29 lessons" under Foundations)
  - [x] Maintain overall progress stats in the header area
- [x] Task: Add phase icon/color coding [461ff82]
  - [x] Phase A: Green (foundations, getting started)
  - [x] Phase B: Blue (frameworks, building)
  - [x] Phase C: Purple (backend, data)
  - [x] Phase D: Orange (production, shipping)
- [ ] Task: Verify lesson page renders contentJson correctly
  - [ ] Theory lessons: sections with heading, body, and code blocks render properly
  - [ ] Exercise lessons: instructions render, textarea works, submit works
  - [ ] Quiz lessons: questions render, submit scores correctly
- [ ] Task: Measure — User Manual Verification 'UI Updates'

## Phase 8: Validation and Cleanup

Run all checks and verify the curriculum works end-to-end.

- [x] Task: Delete old seed data completely [30c0e76]
  - [x] Verified: no code references to old 5 module slugs (only in tech-debt docs + legitimate curriculum content)
  - [x] Seed script is idempotent — checks `existingModule.length > 0` by slug and skips duplicates
- [x] Task: Run full test suite [e8aada1]
  - [x] `pnpm turbo run test --filter=@reading-advantage/domain` — 134 passed (9 files)
  - [x] `pnpm turbo run test --filter=@reading-advantage/api` — 65 passed (13 files)
  - [x] All existing tests pass with new schema and seed data
- [x] Task: Run build and type checks [1aaf26e]
  - [x] `pnpm turbo run build --filter=codecamp-advantage` — builds successfully (9/9 tasks)
  - [x] `pnpm turbo run check-types --filter=codecamp-advantage` — all pass (7/7 tasks)
  - [x] `pnpm turbo run lint --filter=codecamp-advantage` — 0 errors, 0 warnings in codecamp-advantage
- [~] Task: Manual smoke test
  - [~] Seed the database: `pnpm --filter @reading-advantage/db run seed`
  - [~] Start the app: `pnpm dev`
  - [~] Verify dashboard shows 4 phase groups with 18 modules
  - [~] Open a module → verify lessons appear with real content
  - [~] Open a theory lesson → verify contentJson renders
  - [~] Complete a quiz → verify scoring works
  - [~] Submit an exercise → verify submission works
  - [~] Open chat → verify module context is available
- [ ] Task: Update `measure/tracks.md` to reference this track
- [ ] Task: Measure — User Manual Verification 'Validation and Cleanup'
