# Implementation Plan: Last-12-Hour Review Fixes

---

## Phase 1: Migration And Schema Correctness

- [x] Task: Write migration/schema regression tests
    - [x] Assert generated/applied migration SQL does not reference removed `verification_tokens`
    - [x] Assert migration SQL uses current account schema columns only
    - [x] Assert the intended `accounts` uniqueness constraint exists in schema or migration
- [x] Task: Fix the broken migration
    - [x] Replace stale `accounts.provider` / `provider_account_id` references
    - [x] Remove stale `verification_tokens` constraint statement
    - [x] Verify remaining unique constraints match current Drizzle schema
- [x] Task: Run DB validation
    - [x] Run `pnpm turbo run test --filter=@reading-advantage/db`
    - [x] Run package build as migration/schema compile check: `pnpm turbo run build --filter=@reading-advantage/db`
- [ ] Task: Measure - User Manual Verification 'Migration And Schema Correctness' (Protocol in workflow.md)

---

## Phase 2: Tenant-Safe Auth Route Creation

- [x] Task: Write auth route regression tests
    - [x] Registration cannot create a user with `schoolId: null`
    - [x] Demo impersonation cannot create tenantless users
    - [x] Production impersonation is blocked even when `DEV_AUTH_ENABLED=true`
- [x] Task: Fix registration tenant behavior
    - [x] Require a verified tenant/school context or disable public registration with a clear response
    - [x] Ensure successful registration responses include a tenant-scoped user
    - [x] Avoid trusting arbitrary frontend-supplied `schoolId` without access verification
    - [x] Wrap user/account/session creation in a transaction or split session creation until after durable user/account creation
- [x] Task: Fix demo impersonation safety
    - [x] Make the route unavailable in production regardless of `DEV_AUTH_ENABLED`
    - [x] Seed or resolve a dev school before creating demo users
    - [x] Ensure demo users receive `schoolId`
    - [x] Create demo user/account rows atomically
- [x] Task: Fix credential account lookup
    - [x] Query `accounts` by `userId` and `providerId === "credential"`
    - [x] Add or document the intended uniqueness constraint for credential accounts
    - [x] Add regression coverage for users with multiple account providers
- [x] Task: Run API/auth validation
    - [x] Run `pnpm turbo run test --filter=@reading-advantage/api`
    - [x] Run `pnpm turbo run test --filter=@reading-advantage/auth`
- [ ] Task: Measure - User Manual Verification 'Tenant-Safe Auth Route Creation' (Protocol in workflow.md)

---

## Phase 3: Assignment Roster Integrity

- [x] Task: Write assignment domain regression tests
    - [x] Creating an assignment rejects a student from another school
    - [x] Creating an assignment rejects a same-school student not enrolled in the classroom, unless the product explicitly permits school-wide assignment targeting
    - [x] Successful assignment creation still inserts rows for valid classroom students
- [x] Task: Fix assignment student validation
    - [x] Verify every `input.studentIds` row through `classroomStudents` joined to `classrooms`
    - [x] Keep insert logic inside the existing transaction
    - [x] Return a safe error before writing partial assignment rows
- [x] Task: Run domain validation
    - [x] Run `pnpm turbo run test --filter=@reading-advantage/domain`
    - [x] Run `pnpm turbo run lint --filter=@reading-advantage/domain`
- [ ] Task: Measure - User Manual Verification 'Assignment Roster Integrity' (Protocol in workflow.md)

---

## Phase 4: User, Article, And App Auth Integration

- [x] Task: Write user-router tenant regression tests
    - [x] `users.get` rejects a non-admin caller requesting another school's user
    - [x] `users.update` rejects cross-tenant writes unless explicitly allowed by policy
    - [x] `users.list` rejects arbitrary `schoolId` filters for non-cross-tenant roles
- [x] Task: Fix user-router tenant scoping
    - [x] Scope `get` by `id` plus tenant for normal roles
    - [x] Decide and document whether `ADMIN` is school admin or global admin in this monorepo (SYSTEM is cross-tenant; ADMIN remains tenant-scoped)
    - [x] Keep safe-column selection in place
- [x] Task: Write article filter regression tests
    - [x] `topic` filters article list results
    - [x] `cefrLevel` filters article list results
    - [x] Combined filters are represented in the Drizzle where clause
- [x] Task: Fix article list filtering
    - [x] Apply `topic` and `cefrLevel` filters in `packages/domain/src/articles/index.ts`
    - [x] Keep router thin and preserve existing pagination
- [x] Task: Fix reading-advantage auth integration
    - [x] Replace NextAuth middleware token checks with shared `session_token` validation or a cookie-presence guard backed by server validation where possible
    - [x] Remove impossible `document.cookie` reads for httpOnly `session_token`
    - [x] Consolidate signup onto `@reading-advantage/auth-client` or remove the duplicate legacy hook path
    - [x] Verify protected route behavior after login and hard refresh via build-level integration; manual browser verification remains open
- [x] Task: Fix science sign-in production fallback
    - [x] Move hooks before any conditional return or split production fallback into a separate component
    - [x] Avoid `window`-only render branching that changes server/client output
    - [x] Preserve the existing dev demo-login behavior
- [ ] Task: Measure - User Manual Verification 'User, Article, And App Auth Integration' (Protocol in workflow.md)

---

## Phase 5: Lint, Whitespace, And Closure

- [x] Task: Fix reviewed quality-gate failures
    - [x] Remove `as any` casts from `packages/auth/src/__tests__/server.test.ts`
    - [x] Remove `as any` casts from `packages/auth/src/__tests__/session.test.ts`
    - [x] Remove unused imports in reviewed auth/db files
    - [x] Fix `.gitignore` blank line at EOF reported by `git diff --check`
- [x] Task: Re-run targeted quality gates
    - [x] `pnpm turbo run test --filter=@reading-advantage/db`
    - [x] `pnpm turbo run test --filter=@reading-advantage/api`
    - [x] `pnpm turbo run test --filter=@reading-advantage/auth`
    - [x] `pnpm turbo run test --filter=@reading-advantage/domain`
    - [x] `pnpm turbo run lint --filter=@reading-advantage/api --filter=@reading-advantage/auth --filter=@reading-advantage/auth-client --filter=@reading-advantage/db --filter=@reading-advantage/domain`
    - [x] `git diff --check 6af3b96^` (current working tree against review base)
- [x] Task: Update Measure docs
    - [x] Update this plan with completed task evidence and commit SHAs
    - [x] Update `measure/tech-debt.md` only if any accepted shortcut remains (no new accepted shortcut added; science build failure is pre-existing/out of scope)
    - [x] Update `measure/lessons-learned.md` if a recurring workflow lesson is discovered (no new durable lesson added)
- [ ] Task: Measure - User Manual Verification 'Lint, Whitespace, And Closure' (Protocol in workflow.md)

---

## Total Estimated Tasks: 18
## Status: Implemented; manual verification tasks remain open

## Automated Verification

- `pnpm turbo run test --filter=@reading-advantage/api --filter=@reading-advantage/auth --filter=@reading-advantage/auth-client --filter=@reading-advantage/db --filter=@reading-advantage/domain` — passed
- `pnpm turbo run lint --filter=@reading-advantage/api --filter=@reading-advantage/auth --filter=@reading-advantage/auth-client --filter=@reading-advantage/db --filter=@reading-advantage/domain` — passed with one pre-existing db warning in `packages/db/src/schema/flashcards.ts`
- `pnpm turbo run build --filter=@reading-advantage/api --filter=@reading-advantage/auth --filter=@reading-advantage/auth-client --filter=@reading-advantage/db --filter=@reading-advantage/domain` — passed
- `git diff --check 6af3b96^` — passed
- `pnpm --filter reading-advantage db:generate` — passed; required because generated Prisma client was stale for `Role.SYSTEM`
- `pnpm turbo run build --filter=reading-advantage` — passed after Prisma client regeneration
- `pnpm turbo run build --filter=science-advantage` — failed on pre-existing/out-of-scope curriculum type mismatch in `app/(teacher)/teacher/classes/[classId]/page.tsx` (`LessonSummary.titleThai` mismatch)
