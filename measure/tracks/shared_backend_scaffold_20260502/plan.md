# Implementation Plan: Shared Backend Scaffold + Schema Unification

---

## Phase 1: Drizzle Database Package

- [x] Task: Scaffold `packages/db/`
    - `package.json` with `drizzle-orm`, `drizzle-kit`, `postgres`
    - `drizzle.config.ts` for `drizzle-kit`
    - `src/client.ts` — typed `db` singleton (connection pooling, graceful shutdown)
    - `src/schema/` directory organized by domain
- [x] Task: Write Drizzle schema — core multi-tenant tables
    - `schools` — school-level tenant
    - `users` — unified user model with role enum, schoolId FK, firebaseUid
    - `accounts` — OAuth/account linkage
    - `sessions` — session management
    - `verificationTokens` — email verification
    - `refreshTokens` — JWT refresh token storage
- [x] Task: Write Drizzle schema — classroom domain
    - `classrooms` (mapped from reading's Classroom, primary's Classroom, science's Class)
    - `classroom_students`
    - `classroom_teachers`
- [x] Task: Write Drizzle schema — content & assignment domain
    - `articles` (reading-advantage content)
    - `lessons` (science-advantage, primary-advantage)
    - `assignments`
    - `student_assignments`
- [x] Task: Write Drizzle schema — progress & tracking domain
    - `user_activity`
    - `user_word_records`
    - `user_sentence_records`
    - `lesson_progress`
- [ ] Task: Write Drizzle schema — remaining domain models
    - Flashcard decks, cards, progress
    - Reports, analytics tables
    - Billing/licensing tables (if any)
- [ ] Task: Generate and verify initial migration
    - Run `drizzle-kit generate` to produce SQL migration
    - Review generated SQL for correctness
    - Run `drizzle-kit migrate` against local Docker Postgres
- [ ] Task: Measure — User Manual Verification 'Drizzle Database Package' (Protocol in workflow.md)

## Phase 2: Auth Package

- [x] Task: Scaffold `packages/auth/`
    - `src/roles.ts` — role definitions (STUDENT, USER, TEACHER, ADMIN)
    - `src/permissions.ts` — permission matrix (what each role can do)
    - `src/tenant.ts` — tenant resolution (extract school from user context)
    - `src/assert.ts` — `assertCan(permission, tenant)` function that throws on unauthorized
- [x] Task: Define role-permission matrix
    - Map existing role usage across all 3 apps
    - Define granular permissions (class:create, student:list, assignment:grade, etc.)
- [ ] Task: Write permission unit tests
    - Teacher can create class, cannot delete school
    - Student can submit answers, cannot view other students' progress
    - Admin can do everything within their tenant scope
- [ ] Task: Measure — User Manual Verification 'Auth Package' (Protocol in workflow.md)

## Phase 3: tRPC API Package

- [x] Task: Scaffold `packages/api/`
    - `package.json` with `@trpc/server`, `@trpc/client`, `superjson`, `zod`
    - `src/context.ts` — `createTRPCContext` returning `{ db, user, tenant }`
    - `src/trpc.ts` — `initTRPC` setup with superjson transformer
    - `src/root.ts` — root router merging all sub-routers
- [x] Task: Implement tRPC middleware
    - `isAuthed` — validates JWT/session, attaches `user` to context
    - `protectedProcedure` — auth + tenant
    - `publicProcedure` — no auth required
- [x] Task: Create example routers
    - `classesRouter` with `create` (mutation) and `list` (query)
    - `studentsRouter` with `list` (query) and `importRoster` (mutation)
    - Routers are thin — delegate to domain functions
- [ ] Task: Write tRPC integration tests
    - Call procedure with valid auth → succeeds
    - Call procedure without auth → throws UNAUTHORIZED
    - Call procedure with wrong role → throws FORBIDDEN
    - Call procedure with wrong tenant → returns empty or throws
- [ ] Task: Measure — User Manual Verification 'tRPC API Package' (Protocol in workflow.md)

## Phase 4: Domain Layer

- [x] Task: Scaffold `packages/domain/`
    - `src/classes/` — `createClass()`, `listClasses()`
    - `src/students/` — `listStudents()`, `importRoster()`
    - `src/assignments/` — stub
    - `src/progress/` — stub
- [x] Task: Implement example domain functions
    - `createClass` — validates permissions, inserts with tenant scoping, returns entity
    - `listClasses` — queries scoped by tenant, teacher sees own classes
    - `listStudents` — queries students in a classroom
    - `importRoster` — parses student list, creates users + links to classroom (transaction)
- [x] Task: Domain function conventions
    - Every function receives `{ db, user, tenant, input }`
    - Every function calls `assertCan()` before mutation
    - Mutations use `db.transaction()` for multi-row writes
    - Functions are pure business logic — no HTTP concerns
- [ ] Task: Write domain function unit tests
    - `createClass` with valid permissions → returns new class
    - `createClass` without permission → throws
    - `importRoster` with valid input → creates students in transaction
- [ ] Task: Measure — User Manual Verification 'Domain Layer' (Protocol in workflow.md)

## Phase 5: Webhooks Package + Cleanup

- [x] Task: Scaffold `packages/webhooks/`
    - `package.json` with `hono`, `@hono/node-server`
    - `src/index.ts` — Hono app mounting sub-routers
    - `src/health.ts` — `GET /health` endpoint
- [x] Task: Stub webhook routes
    - `POST /stripe` — Stripe webhook handler (stub, returns 501)
    - `POST /google-classroom` — Google Classroom sync callback (stub, returns 501)
- [ ] Task: Remove CloudSQL-specific code from reading-advantage
    - Remove `/cloudsql/` Unix socket parsing from `lib/prisma.ts`
    - Remove `CLOUD_SQL_CONNECTION_NAME` references
    - Standard TCP `DATABASE_URL` only
- [ ] Task: Update `packages/` exports
    - Ensure all packages have clean `src/index.ts` barrel exports
    - Verify cross-package imports work (api imports auth, domain, db)
- [ ] Task: Measure — User Manual Verification 'Webhooks + Cleanup' (Protocol in workflow.md)

---

## Total Estimated Tasks: 24
## Completed Tasks: 0
## Notes

### Decisions
- Drizzle replaces Prisma from the start (no Prisma in new backend code)
- tRPC is the primary product backend interface
- Hono only for external HTTP boundaries (webhooks, health checks)
- Domain functions are the unit of business logic — routers are thin wrappers
- Multi-tenant scoping on every query (schoolId as primary tenant identifier)
- Zod for all input validation
- `packages/auth/` is shared logic, not a REST API — it exports functions consumed by domain layer

### Package dependency graph
```
packages/db (Drizzle)
  ↑
packages/auth (roles, permissions, tenant)
  ↑
packages/domain (business logic) ← uses db + auth
  ↑
packages/api (tRPC routers) ← uses domain + auth
packages/webhooks (Hono) ← uses domain + auth
```

### Risks
- 83 models in Drizzle is significant schema work — Phase 1 may take longer than estimated
- Multi-tenant scoping adds complexity to every query — need to be disciplined about it from day one
- tRPC learning curve if team hasn't used it before
