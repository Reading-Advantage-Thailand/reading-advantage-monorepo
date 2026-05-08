# Specification: Last-12-Hour Review Fixes

## Overview

Review all code changes committed in the previous 12 hours and remediate the concrete defects found in that review window. The review covered commits from `6af3b96` through `1a49678`, primarily the `review_remediation_20260502` and `unified_auth_20260502` tracks plus Measure track bookkeeping.

Review methods used:

- Enumerated every file changed by `git diff --name-only 6af3b96^..HEAD`
- Mapped changed files to commits with `git log --since="12 hours ago" --name-only`
- Reviewed backend/auth/domain/app diffs by package area
- Scanned for shortcut markers, stale auth references, and ignored build gates
- Ran targeted tests: `pnpm turbo run test --filter=@reading-advantage/api --filter=@reading-advantage/auth --filter=@reading-advantage/auth-client --filter=@reading-advantage/db --filter=@reading-advantage/domain` (passed)
- Ran targeted lint: `pnpm turbo run lint --filter=@reading-advantage/api --filter=@reading-advantage/auth --filter=@reading-advantage/auth-client --filter=@reading-advantage/db --filter=@reading-advantage/domain` (failed in `@reading-advantage/auth`)
- Ran `git diff --check 6af3b96^..HEAD` (failed on `.gitignore` blank line at EOF)

This is a remediation track, not a feature track. The goal is to make the recent work truthful, tenant-safe, and runnable without broadening scope.

## Review Findings To Fix

### 1. Broken Drizzle Migration

`packages/db/drizzle/0002_quick_skreet.sql` references columns and a table that no longer exist in the current schema:

- `accounts.provider`
- `accounts.provider_account_id`
- `verification_tokens`

The current `accounts` schema uses `providerId`, and `verificationTokens` was removed by the unified auth schema rewrite. Applying this migration against the rewritten schema will fail before later constraints can be applied.

Associated track: `unified_auth_20260502`, Phase 1 and `review_remediation_20260502`, Phase 3.

### 2. Tenantless Auth Route User Creation

`packages/api/src/routes/auth/register.ts` creates a user with no `schoolId` and accepts only `{ username, password, name }`. `packages/api/src/routes/auth/impersonate.ts` auto-creates demo users with no `schoolId`. This conflicts with the repository rule that the system is multi-tenant by default and every query is scoped by `schoolId`.

Associated track: `unified_auth_20260502`, Phase 4 and Phase 5.

### 3. Production Demo Impersonation Safety

`packages/api/src/routes/auth/impersonate.ts` is documented as dev-only but allows production access when `DEV_AUTH_ENABLED=true`. If that variable leaks into production, unauthenticated requests can create and log in as demo users, including `ADMIN` and `SYSTEM`.

Associated track: `unified_auth_20260502`, Phase 4.

### 4. Assignment Creation Trusts Unvalidated Student IDs

`packages/domain/src/assignments/index.ts` verifies that the target classroom belongs to the caller's school, but then inserts every `input.studentIds` value into `studentAssignments` without verifying that each student belongs to the classroom or at least the same tenant. This can create cross-tenant assignment rows or assignments for students outside the classroom.

Associated track: `review_remediation_20260502`, Phase 3.

### 5. Verification Gaps

The previous review remediation track still lists manual verification tasks as not done. This track should add automated regression tests for the defects above and preserve manual verification tasks for the fixed paths.

Associated track: `review_remediation_20260502`, all phases.

### 6. `users.get` Still Leaks Cross-Tenant User Records

`packages/api/src/routers/users.ts` selects a requested user by `id` only and returns safe columns, but it does not check that the requested user belongs to the caller's tenant or that the caller is allowed to view cross-school users. The test suite exercises `caller.users.get({ id: "u2" })` as a student, but does not prove tenant rejection.

Associated track: `review_remediation_20260502`, Phase 3.

### 7. Auth Login Picks An Arbitrary Account Row

`packages/api/src/routes/auth/login.ts` selects the first account by `userId`, then rejects the login if that account is not `providerId === "credential"`. If a user has multiple account rows and the first row is a provider account, valid credential login can fail. The schema also lacks a current unique constraint such as `(userId, providerId)`, while the generated migration tries to add a stale provider-account uniqueness constraint.

Associated track: `unified_auth_20260502`, Phase 2 and Phase 4.

### 8. Registration And Impersonation Are Not Atomic

`packages/api/src/routes/auth/register.ts` inserts the user, then account, then session outside a transaction. `packages/api/src/routes/auth/impersonate.ts` does the same for demo users. A failure after user insert can leave partial auth state.

Associated track: `unified_auth_20260502`, Phase 4.

### 9. Reading-Advantage Middleware Still Authenticates With NextAuth

`apps/reading-advantage/middleware.ts` still uses `next-auth/jwt` `getToken()` and treats errors as unauthenticated. The new login route sets an httpOnly `session_token` cookie instead, so a user can successfully log in and then still be redirected away from protected pages by middleware.

Associated track: `unified_auth_20260502`, Phase 5a.

### 10. HttpOnly Cookie Is Read From `document.cookie`

`apps/reading-advantage/components/providers/trpc-provider.tsx` and `apps/reading-advantage/lib/use-trpc-auth.ts` try to read `session_token` from `document.cookie`. The cookie is set `httpOnly`, so this path cannot work. Same-origin browser requests should rely on cookie forwarding, and server/client auth code should not pretend it can read the token.

Associated track: `unified_auth_20260502`, Phase 5a.

### 11. Reading Signup Uses A Legacy Auth Hook Not Covered By Shared Auth-Client Tests

`apps/reading-advantage/components/user-signup-form.tsx` still uses `useTrpcAuth()` while sign-in uses `@reading-advantage/auth-client`. The legacy hook duplicates fetch logic and tries to expose token access by reading the httpOnly cookie. This creates two client auth paths with different tests and behavior.

Associated track: `unified_auth_20260502`, Phase 5a.

### 12. Science Sign-In Fix Violates Hook Ordering And Can Hydration-Mismatch

`apps/science-advantage/components/features/auth/signin-form.tsx` returns early in production before calling `useRouter()` and `useState()`, and its production check depends on `window`. Server render sees `window` as undefined and renders the form, while the client can render the maintenance message. That risks a hydration mismatch and violates React hook-order expectations across environments.

Associated track: `review_remediation_20260502`, Phase 5.

### 13. Article List Accepts Filters But Ignores Them

`packages/api/src/routers/articles.ts` accepts `topic` and `cefrLevel`, and `packages/domain/src/articles/index.ts` carries those fields in `input`, but `listArticles()` ignores both and returns the unfiltered page. This is a logical placeholder masked by a real-looking domain function.

Associated track: `review_remediation_20260502`, Phase 3.

### 14. Lint Gate Is Not Green For New Auth Tests

Targeted lint fails in `@reading-advantage/auth` with 17 `@typescript-eslint/no-explicit-any` errors in `packages/auth/src/__tests__/server.test.ts` and `packages/auth/src/__tests__/session.test.ts`, plus warnings for unused imports. Targeted tests pass, so the defect is specifically a quality-gate gap.

Associated track: `unified_auth_20260502`, Phase 2.

### 15. New Whitespace Check Failure

`git diff --check 6af3b96^..HEAD` reports `.gitignore:46: new blank line at EOF.`

Associated track: `review_remediation_20260502`, bookkeeping.

## Functional Requirements

- Replace or regenerate the broken migration so it only references schema objects that exist after the unified auth schema rewrite.
- Align `packages/db/src/schema/users.ts` and migration output around the intended `accounts` uniqueness model.
- Decide and enforce how registration assigns `schoolId`:
  - either require a verified tenant context in the request, or
  - disable public self-registration until a tenant-aware onboarding flow exists.
- Ensure demo impersonation cannot be enabled in production by a single environment flag.
- Ensure demo users are tenant-scoped when dev impersonation is available.
- Validate assignment student IDs before inserting `studentAssignments`.
- Scope `users.get` and `users.update` to the caller's tenant unless the caller has a documented cross-tenant role.
- Query credential accounts deterministically and enforce the intended account uniqueness model.
- Make auth user/account/session creation transactional.
- Replace reading-advantage middleware's NextAuth token check with the new session-cookie validation path.
- Remove impossible `document.cookie` reads for the httpOnly session token.
- Consolidate reading-advantage signup/signin on one tested auth-client path.
- Repair the science signin production fallback without conditional hook execution or hydration mismatch.
- Apply article list filters or remove the advertised inputs until filtering exists.
- Fix the new auth lint failures.
- Fix the `.gitignore` whitespace failure.
- Add tests that fail on the reviewed defects and pass after the fixes.

## Non-Functional Requirements

- Keep fixes narrowly scoped to the reviewed defects.
- Do not reopen broad app stabilization, full auth migration, Firestore migration, or ESLint cleanup work in this track.
- Preserve existing pending tracks and do not modify unrelated track plans except to add this track to the registry.
- Keep domain functions as the business logic layer; routers remain thin.

## Acceptance Criteria

- `pnpm turbo run test --filter=@reading-advantage/db` passes.
- `pnpm turbo run test --filter=@reading-advantage/api` passes.
- `pnpm turbo run test --filter=@reading-advantage/domain` passes.
- A migration/schema check proves no migration references removed auth tables or stale account column names.
- Auth route tests cover tenantless registration/demo creation rejection or tenant assignment.
- Auth route tests prove production impersonation stays blocked even if `DEV_AUTH_ENABLED=true`.
- Domain tests prove assignment creation rejects student IDs outside the classroom/tenant.
- API tests prove `users.get` rejects cross-tenant access.
- API tests prove credential login still succeeds when other provider accounts exist.
- Reading-advantage middleware tests or equivalent route-level tests prove `session_token` authenticates protected pages.
- Auth-client/app tests prove signup and signin use the same supported auth path.
- Science sign-in renders consistently without hook-order violations.
- Article list tests prove `topic` and `cefrLevel` filters affect the query.
- Targeted lint command for reviewed packages exits 0.
- `git diff --check 6af3b96^..HEAD` exits 0 or the review-window whitespace issue is otherwise removed.
- `measure/tracks.md` truthfully lists this track as pending until implementation is complete.

## Out Of Scope

- Completing all deferred unified auth Phase 5 and Phase 6 tasks.
- Removing all `ignoreBuildErrors` debt from apps.
- Fixing primary-advantage baseline lint errors.
- Migrating science-advantage from Prisma to Drizzle.
- Converting reading-advantage's remaining NextAuth call sites unless directly required to fix one of the findings above.
