# Implementation Plan: Data Safety & Infrastructure Hardening

## Phase 1: Soft Deletes

- [ ] Task: Add deletedAt field to critical models
    - [ ] Write migration tests verifying new fields are nullable and default to null
    - [ ] Add `deletedAt DateTime?` to `user`, `Class`, `Attempt`, `LessonCompletion`, `StandardMastery` in `prisma/schema.prisma`
    - [ ] Run `npx prisma generate` and create migration

- [ ] Task: Create Prisma query extension for soft delete filtering
    - [ ] Write unit tests: findMany excludes soft-deleted records, findUnique excludes soft-deleted records, explicit `where: { deletedAt: { not: null } }` can find deleted records
    - [ ] Create `lib/prisma-extensions.ts` with Prisma client extension that adds `deletedAt IS NULL` filter to all queries on soft-delete models
    - [ ] Update `lib/prisma.ts` to apply the extension

- [ ] Task: Create softDelete helper
    - [ ] Write unit tests for `softDelete()`: sets deletedAt, does not remove row, subsequent queries exclude the record
    - [ ] Create `lib/db/soft-delete.ts` with `softDelete(model, id)` that sets `deletedAt = new Date()`
    - [ ] Add `restoreDeleted(model, id)` for admin recovery (sets `deletedAt = null`)

- [ ] Task: Update cascade rules for soft-delete models
    - [ ] Change `onDelete: Cascade` to `onDelete: Restrict` on relations pointing to `user`, `Class`, `Attempt`, `LessonCompletion`, `StandardMastery`
    - [ ] Keep `onDelete: Cascade` on `session`, `account`, `MasteryRun`, `QuestionResponse`
    - [ ] Run `npx prisma generate` and create migration
    - [ ] Verify all existing tests pass (update any that delete records directly)

- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Session Cleanup & Sliding Window

- [ ] Task: Create expired session cleanup utility
    - [ ] Write unit tests: deletes sessions with `expiresAt < now()`, leaves valid sessions untouched, returns count of deleted sessions
    - [ ] Create `lib/auth/cleanup.ts` with `cleanupExpiredSessions()` function
    - [ ] Add batch deletion with configurable batch size to avoid long-running transactions

- [ ] Task: Create cleanup API route
    - [ ] Write integration test: SYSTEM role can call endpoint, non-SYSTEM roles get 403, returns deletion count
    - [ ] Create `app/api/admin/cleanup-sessions/route.ts` protected by SYSTEM role (use `withRole` from Track 2 if available, otherwise direct check)
    - [ ] Return `{ success: true, deletedCount }` response
    - [ ] Document cron setup in code comments

- [ ] Task: Implement session sliding window
    - [ ] Write unit tests: session with >3.5 days remaining is NOT extended, session with <3.5 days remaining IS extended to 7 days from now, extension updates DB record
    - [ ] Update `validateSession()` in `lib/auth/session.ts` to check remaining time
    - [ ] If remaining < SESSION_DURATION / 2, update `expiresAt` in DB
    - [ ] Return the (possibly updated) session to the caller

- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Redis Integration

- [ ] Task: Set up Redis client
    - [ ] Write unit tests: client connects, handles connection failure gracefully, reconnects
    - [ ] Create `lib/redis.ts` with Redis client singleton (using `ioredis` or `@upstash/redis`)
    - [ ] Add `REDIS_URL` to `lib/env.ts` schema (optional, with fallback)
    - [ ] Implement connection health check
    - [ ] Update `.env.example`

- [ ] Task: Create Redis-backed rate limiter
    - [ ] Write unit tests: limits work across simulated instances, fail-open when Redis unavailable
    - [ ] Create `lib/rate-limit/redis-rate-limiter.ts` using Redis `INCR` + `EXPIRE` pattern
    - [ ] Implement `RateLimiter` interface with `checkLimit(key)`, `recordHit(key)`, `reset(key)`
    - [ ] Graceful fallback: log warning and allow request if Redis is down

- [ ] Task: Migrate rate limiters to Redis
    - [ ] Replace login rate limiter (from Track 1) with Redis-backed version
    - [ ] Replace AI mastery update rate limiter in `app/api/ai/update-mastery/route.ts`
    - [ ] Replace AI recommendations rate limiter in `app/api/ai/recommendations/route.ts`
    - [ ] Verify all rate limiting integration tests pass

- [ ] Task: Migrate intervention cache to Redis
    - [ ] Write tests: cache set/get works, TTL expiry works, fail-open when Redis unavailable
    - [ ] Update `lib/interventions/cache.ts` to use Redis with configurable TTL
    - [ ] Verify intervention alert integration tests pass

- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: JSON Validation & Schema Cleanup

- [ ] Task: Define JSON field schemas
    - [ ] Write unit tests for each Zod schema: valid data passes, invalid data rejected, edge cases handled
    - [ ] Create `lib/schemas/quiz-question.schema.ts` with schemas for `options` and `correctAnswer` per QuestionType
    - [ ] Create `lib/schemas/question-response.schema.ts` with schema for `studentAnswer`
    - [ ] Update `lib/schemas/lesson-content.schema.ts` if `structuredContent` schema needs tightening

- [ ] Task: Add JSON validation to write paths
    - [ ] Update quiz question creation/update logic to validate `options` and `correctAnswer` against schemas
    - [ ] Update quiz submission route to validate `studentAnswer` against schema
    - [ ] Return 400 with descriptive errors on validation failure
    - [ ] Verify existing quiz integration tests pass

- [ ] Task: Clean up orphaned schema artifacts
    - [ ] Search codebase for any references to `verification` model
    - [ ] If unused: remove model from schema, create migration
    - [ ] Decision on `ipAddress`/`userAgent`: populate during `createSession()` by accepting request object, or remove fields
    - [ ] Run `npx prisma generate` and create migration
    - [ ] Verify all tests pass

- [ ] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)
