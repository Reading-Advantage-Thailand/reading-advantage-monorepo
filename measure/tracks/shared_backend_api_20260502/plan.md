# Implementation Plan: Shared Backend API Route Migration

---

## Phase 1: Route Audit & Categorization

- [x] Task: Audit all 294 API routes across 3 apps
    - For each route: HTTP method, path, purpose, app ownership, DB tables accessed
    - Tag: `shared` (serves multiple apps) vs `app-specific`
    - Tag by domain: `auth`, `users`, `classes`, `assignments`, `articles`, `flashcards`, `ai`, `reports`, `admin`
    - Output: `packages/api/docs/route-audit.md`
- [x] Task: Identify route overlaps and duplicates
- [x] Task: Prioritize migration order
    - Tier 1 (shared, high-traffic): 92 routes — users, classes, assignments
    - Tier 2 (shared, medium-traffic): 37 routes — articles, flashcards, reports
    - Tier 3 (app-specific): 132 routes — games, admin, goals, science
    - Tier 4 (complex/AI): 33 routes — AI generation, analytics, insights
- [ ] Task: Measure — User Manual Verification 'Route Audit & Categorization' (Protocol in workflow.md)

## Phase 2: Tier 1 — Shared Core Routes

- [x] Task: Implement `users` tRPC router + domain functions
    - `users.get`, `users.me`, `users.list`, `users.update`
- [x] Task: Implement `classes` tRPC router + domain functions
    - `classes.create`, `classes.list`
- [x] Task: Implement `assignments` tRPC router + domain functions
    - `assignments.create`, `assignments.list`, `assignments.get`
    - `assignments.update`, `assignments.delete`, `assignments.submit`
- [x] Task: Implement `auth` tRPC router (login, register, session, refresh, logout)
- [ ] Task: Update frontends to call Tier 1 tRPC procedures
- [ ] Task: Write integration tests for Tier 1 procedures
- [ ] Task: Measure — User Manual Verification 'Tier 1 — Shared Core Routes' (Protocol in workflow.md)

## Phase 3: Tier 2 — Content & Flashcard Routes

- [x] Task: Implement `articles` tRPC router + domain functions
    - `articles.list`, `articles.get`, `articles.create`, `articles.rate`
    - Domain functions: `listArticles()`, `getArticle()`, `createArticle()`, `rateArticle()`
- [x] Task: Implement `progress` tRPC router + domain functions
    - `progress.recordActivity`, `progress.getStudentProgress`, `progress.getClassProgress`
    - Tracks user activity, word records, sentence records, lesson progress
- [ ] Task: Implement `reports` tRPC router + domain functions
    - `reports.studentProgress`, `reports.classAnalytics`, `reports.teacherDashboard`
    - Domain functions: `getStudentProgress()`, `getClassAnalytics()`
- [ ] Task: Update frontends to call Tier 2 tRPC procedures
- [ ] Task: Measure — User Manual Verification 'Tier 2 — Content & Flashcard Routes' (Protocol in workflow.md)

## Phase 4: Tier 3 — App-Specific Routes

- [ ] Task: Migrate science-advantage specific routes
    - `lessons` router — lesson CRUD, curriculum management
    - `interventions` router — intervention alerts
    - `scienceAnalytics` router — science-specific analytics
    - Domain functions for each
- [ ] Task: Migrate primary-advantage specific routes
    - `primaryAssignments` router — teacher assignment management
    - Domain functions
- [ ] Task: Migrate reading-advantage specific routes (non-AI)
    - `demo` router — demo accounts, refresh
    - `notifications` router — assignment notifications
    - `admin` router — admin utilities
    - Domain functions for each
- [ ] Task: Update frontends to call Tier 3 tRPC procedures
- [ ] Task: Measure — User Manual Verification 'Tier 3 — App-Specific Routes' (Protocol in workflow.md)

## Phase 5: Tier 4 — AI & Complex Routes

- [ ] Task: Migrate AI generation routes to tRPC procedures
    - `ai.generateArticle`, `ai.generateQuestions`, `ai.generateFlashcards`
    - These are tRPC actions (call external AI services)
    - Domain functions: `generateArticle()`, `generateQuestions()`
    - Streaming support via tRPC subscriptions or SSE
- [ ] Task: Implement AI streaming in tRPC
    - Use tRPC subscriptions or output streaming for long-running AI generation
    - Migrate existing streaming endpoints
- [ ] Task: Update frontends to call AI tRPC procedures
- [ ] Task: Measure — User Manual Verification 'Tier 4 — AI & Complex Routes' (Protocol in workflow.md)

## Phase 6: Cleanup & Validation

- [ ] Task: Remove migrated API route files from all apps
    - Delete `apps/*/app/api/` directories
    - Remove direct Prisma/Drizzle imports from app code
    - Remove per-app Prisma schemas (if all queries migrated)
- [ ] Task: Run full validation
    - `pnpm turbo run build` passes for all apps
    - `pnpm turbo run test` passes
    - Manual smoke test of each app's critical flows
- [ ] Task: Update tech debt registry
    - Remove items resolved by API migration
    - Note any deferred routes with rationale
- [ ] Task: Measure — User Manual Verification 'Cleanup & Validation' (Protocol in workflow.md)

---

## Total Estimated Tasks: 29
## Completed Tasks: 9
## Notes

### Decisions
- Migration order: shared routes first (highest value), then app-specific
- Each tier is a self-contained milestone — deploy and verify before next tier
- All procedures follow thin-router pattern: validate → call domain function → return
- All mutations use Drizzle transactions for multi-row writes
- AI routes are last — most complex, least cross-app overlap

### Risks
- 294 routes is a large surface — audit may reveal more complexity than expected
- Some routes may depend on Next.js server component behavior (needs investigation)
- AI streaming in tRPC may require workarounds if not natively supported

### Dependencies
- Requires `shared_backend_scaffold_20260502` (tRPC, domain layer, Drizzle)
- Requires `shared_backend_auth_20260502` (auth middleware for protected procedures)
