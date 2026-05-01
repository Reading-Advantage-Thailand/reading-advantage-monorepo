# Implementation Plan: Authorization Centralization

## Phase 1: Core Wrappers & Helpers

- [ ] Task: Create withAuth higher-order function
    - [ ] Write unit tests for `withAuth`: returns 401 when no session, passes session to handler when valid
    - [ ] Write unit tests for `withAuth` with role option: returns 403 when role insufficient, passes when sufficient
    - [ ] Create `lib/auth/api.ts` with `withAuth(handler, options?)` implementation
    - [ ] Ensure compatibility with Next.js App Router GET/POST/PUT/DELETE handlers and `context.params`

- [ ] Task: Create withRole convenience wrapper
    - [ ] Write unit tests for `withRole`: shorthand behaves identically to `withAuth(handler, { role })`
    - [ ] Implement `withRole(role, handler)` in `lib/auth/api.ts`

- [ ] Task: Create standardized API response helpers
    - [ ] Write unit tests for `apiSuccess()` and `apiError()` helpers
    - [ ] Create `lib/api-helpers.ts` with `apiSuccess(data, status?)` and `apiError(error, status, details?)`
    - [ ] `apiSuccess` returns `{ success: true, ...data }` with NextResponse
    - [ ] `apiError` returns `{ success: false, error, details? }` with NextResponse

- [ ] Task: Consolidate role constants
    - [ ] Write test verifying `ROLE_HIERARCHY` and `ROLE_ROUTES` are exported from a single module
    - [ ] Create `lib/auth/constants.ts` with `ROLE_HIERARCHY`, `ROLE_ROUTES`, and `UserRole` type
    - [ ] Update `lib/auth/server.ts` to import from `lib/auth/constants.ts`
    - [ ] Update `app/(auth)/signin/page.tsx` to import from `lib/auth/constants.ts`
    - [ ] Update `components/features/auth/user-menu.tsx` to import from `lib/auth/constants.ts`
    - [ ] Remove all inline `ROLE_HIERARCHY` and `ROLE_ROUTES` definitions

- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Refactor API Routes (Batch 1 - Auth & Class Routes)

- [ ] Task: Refactor auth session route
    - [ ] Update `app/api/auth/session/route.ts` to use `apiSuccess`/`apiError` helpers
    - [ ] Verify existing integration tests pass

- [ ] Task: Refactor class routes
    - [ ] Refactor `app/api/classes/route.ts` GET to use `withRole('TEACHER', handler)`
    - [ ] Refactor `app/api/classes/route.ts` POST to use `withRole('TEACHER', handler)`
    - [ ] Refactor `app/api/classes/join/route.ts` POST to use `withRole('STUDENT', handler)`
    - [ ] Refactor `app/api/classes/[classId]/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/classes/[classId]/curriculum/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/classes/[classId]/analytics/overview/route.ts` GET to use `withAuth`
    - [ ] Update all responses to use `apiSuccess`/`apiError`
    - [ ] Verify all existing tests pass

- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Refactor API Routes (Batch 2 - Student, Teacher, AI, Lesson Routes)

- [ ] Task: Refactor student routes
    - [ ] Refactor `app/api/student/classes/route.ts` GET to use `withRole('STUDENT', handler)`
    - [ ] Refactor `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/students/[studentId]/mastery-profile/route.ts` GET to use `withAuth`
    - [ ] Update all responses to use `apiSuccess`/`apiError`
    - [ ] Verify all existing tests pass

- [ ] Task: Refactor teacher and AI routes
    - [ ] Refactor `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/ai/update-mastery/route.ts` POST to use `withAuth`
    - [ ] Refactor `app/api/ai/recommendations/route.ts` POST to use `withAuth`
    - [ ] Update all responses to use `apiSuccess`/`apiError`
    - [ ] Verify all existing tests pass

- [ ] Task: Refactor lesson routes
    - [ ] Refactor `app/api/lessons/[lessonSlug]/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/lessons/[lessonSlug]/quiz/route.ts` GET to use `withAuth`
    - [ ] Refactor `app/api/lessons/[lessonSlug]/quiz/route.ts` POST to use `withAuth`
    - [ ] Update all responses to use `apiSuccess`/`apiError`
    - [ ] Verify all existing tests pass

- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Proxy Validation & Schema Indexes

- [ ] Task: Add session validation to proxy.ts
    - [ ] Write tests: valid session token passes through, expired token clears cookie and redirects, invalid token clears cookie and redirects
    - [ ] Import Prisma client in `proxy.ts`
    - [ ] Query session table to verify token is valid and not expired
    - [ ] On invalid/expired: delete the `session_token` cookie and redirect to `/login`
    - [ ] Consider a short in-memory TTL cache (30s) for validated tokens to reduce DB hits

- [ ] Task: Add account model indexes
    - [ ] Add `@@index([userId])` to `account` model in `prisma/schema.prisma`
    - [ ] Add `@@index([providerId])` to `account` model in `prisma/schema.prisma`
    - [ ] Run `npx prisma generate`
    - [ ] Create and verify migration

- [ ] Task: Final verification - no direct getCurrentSession auth checks remain
    - [ ] Search codebase for `getCurrentSession()` calls in API routes (should only appear inside `withAuth` or `proxy.ts`)
    - [ ] Verify all API routes use `withAuth`/`withRole` wrappers
    - [ ] Document any intentional exceptions

- [ ] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)
