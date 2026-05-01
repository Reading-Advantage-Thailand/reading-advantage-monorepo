# Spec: Data Safety & Infrastructure Hardening

## Overview
Protect against data loss from cascading deletes, clean up accumulated expired sessions, move rate limiting and caching to Redis for multi-instance deployments, and implement session sliding window for better UX.

## Functional Requirements

### FR-1: Implement soft deletes for critical models
- Add `deletedAt DateTime?` field to: `user`, `Class`, `Attempt`, `LessonCompletion`, `StandardMastery`
- Add Prisma middleware or query extension that automatically filters `deletedAt IS NULL` on reads
- Replace `onDelete: Cascade` with `onDelete: Restrict` on relations to soft-delete models
- Create a `softDelete(model, id)` helper that sets `deletedAt = now()` instead of deleting
- Keep `onDelete: Cascade` for truly ephemeral data: `session`, `account`, `MasteryRun`, `QuestionResponse`

### FR-2: Add expired session cleanup
- Create a utility function `cleanupExpiredSessions()` that deletes sessions where `expiresAt < now()`
- Wire it into a Next.js API route (`/api/admin/cleanup-sessions`) protected by SYSTEM role
- Optionally trigger on a cron schedule (document how to set up via external cron or Vercel cron)

### FR-3: Move rate limiting to Redis
- Replace in-memory `Map<>` rate limit stores with Redis-backed counters
- Affected: login rate limiting (from Track 1), AI mastery update, AI recommendations
- Use Redis `INCR` + `EXPIRE` pattern for atomic rate limiting
- Graceful fallback: if Redis is unavailable, allow the request (fail-open) and log a warning

### FR-4: Move intervention cache to Redis
- Replace in-memory cache in `lib/interventions/cache.ts` with Redis
- Add TTL-based expiry
- Same fail-open pattern as FR-3

### FR-5: Implement session sliding window
- When `validateSession()` is called and the session is valid, extend `expiresAt` if less than half the session duration remains
- E.g., if session has <3.5 days remaining, reset to 7 days from now
- Only update DB if extension is needed (avoid unnecessary writes on every request)

### FR-6: Validate JSON schema fields
- Add proper Zod schemas for `Lesson.structuredContent`, `QuizQuestion.options`, `QuizQuestion.correctAnswer`, `QuestionResponse.studentAnswer`
- Replace `z.any()` annotations with actual structure validation
- Validate on write (API routes that create/update these records)

### FR-7: Clean up orphaned schema artifacts
- Remove `verification` model if confirmed unused (no code references it)
- Remove unused `ipAddress`/`userAgent` fields from session model, OR populate them during session creation (pick one)

## Non-Functional Requirements
- Migration must be backwards-compatible (soft delete fields are nullable)
- Redis connection failure must not crash the application
- Session cleanup must be safe to run concurrently
- >80% test coverage on all new code

## Acceptance Criteria
- [ ] Deleting a user sets `deletedAt` instead of removing the row
- [ ] Queries for users/classes/attempts exclude soft-deleted records by default
- [ ] `/api/admin/cleanup-sessions` removes expired sessions
- [ ] Rate limiting works correctly across multiple server instances (Redis-backed)
- [ ] Active users get session extended beyond 7 days with sliding window
- [ ] JSON fields have validated schemas on write paths
- [ ] `verification` model removed or documented with usage
- [ ] All existing tests pass

## Out of Scope
- Data archival/purge policies
- Admin UI for viewing deleted records
- Session management UI ("sign out everywhere")
- 2FA or advanced auth features
