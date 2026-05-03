# Implementation Plan: Auth Strategy Review Fixes

---

## Phase 1: Correct the Auth Strategy Source of Truth

*Severity: High. Prevent future agents from preserving the wrong auth system.*

- [x] Task: Update Science auth migration plan [30b501c]
    - [x] Remove tasks that ask for Google OAuth Drizzle rewrite or OAuth end-to-end verification
    - [x] Replace them with username/password-only cleanup tasks
    - [x] Preserve any still-valid shared handler tasks for login/session/logout/impersonate
- [x] Task: Update tech-stack or tech-debt docs if needed [30b501c]
    - [x] Confirm the documented auth strategy says cookie-based DB sessions with username/password only
    - [x] Confirm no docs imply Google OAuth is part of the target Science auth path
- [x] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)
    - Verified: science_auth_migration plan no longer instructs OAuth rewrite
    - Verified: tech-stack.md says username/password-only
    - Verified: tech-debt.md corrected from "rewritten" to "removed"

---

## Phase 2: Remove Science Google OAuth

*Severity: High. Code must match the unified auth strategy.*

- [x] Task: Remove or disable Science Google OAuth routes
    - [x] Delete `apps/science-advantage/app/api/auth/google/route.ts` and callback route, or replace with explicit unsupported responses if route compatibility is needed
    - [x] Remove direct `drizzle-orm` imports that only exist for OAuth code
    - [x] Remove Google OAuth env checks from active auth paths if no longer used
- [x] Task: Remove Science Google OAuth UI entry points
    - [x] Search sign-in and auth components for Google OAuth links/buttons
    - [x] Remove or replace with username/password-only messaging
- [x] Task: Verify no active Science OAuth implementation remains
    - [x] Run `rg -n "GOOGLE_OAUTH|/api/auth/google|google/callback|Sign in with Google" apps/science-advantage`
    - [x] Document any remaining archived-doc hits separately from active code
- [x] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)
    - Verified: No active Google OAuth code in science-advantage source
    - Verified: Only docs/archive/core-workflows.md has references (archived)

---

## Phase 3: Restore Science Validation Gates

*Severity: High. The migration must build and lint before it can be considered done.*

- [x] Task: Fix Science build failures
    - [x] Run `pnpm turbo run build --filter=science-advantage`
    - [x] Fix missing dependency or import failures introduced by auth migration
    - [x] Re-run until build passes
- [x] Task: Fix Science auth-touched lint failures
    - [x] Replace raw `<a href="/">` in `components/features/auth/signin-form.tsx` with `next/link`
    - [x] Remove unused imports introduced by auth migration
    - [x] Run `pnpm turbo run lint --filter=science-advantage`
- [x] Task: Triage unrelated Science lint baseline
    - [x] If analytics lint failures are unrelated baseline debt, create or update a pending track with exact command output and file list
    - [x] Do not mark Science auth migration complete until auth-touched lint failures are gone
- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

---

## Phase 4: Harden Auth Migration SQL and Tests

*Severity: High. Runtime DB constraints must match the Drizzle schema contract.*

- [x] Task: Fix `0003_slow_firebrand.sql` username nullability
    - [x] Backfill `username` and `display_username` for existing rows, or split into safe widen/migrate/narrow migrations
    - [x] Add `ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL`
    - [x] Add `ALTER TABLE "users" ALTER COLUMN "display_username" SET NOT NULL`
    - [x] Ensure uniqueness constraints remain valid after backfill
- [x] Task: Expand migration SQL tests
    - [x] Assert 0003 enforces `username` and `display_username` NOT NULL or documents the intentional widen phase
    - [x] Assert migration tests catch schema/migration drift for auth-critical columns
- [x] Task: Run db validation
    - [x] `pnpm turbo run test --filter=@reading-advantage/db`
    - [x] If available, run migrations against a fresh local DB and record result
- [x] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)
    - Verified: 10/10 db tests pass including new 0004 migration tests

---

## Phase 5: Eliminate Silent Firestore No-Ops

*Severity: Medium. Remaining stubs must fail visibly or be migrated.*

- [x] Task: Inventory remaining active Firestore stub callers
    - [x] Run `rg -n "configs/firestore-config|firestore-stub|collection\\(" apps/reading-advantage`
    - [x] Classify each hit as active code, archived/commented code, or test/doc-only
- [x] Task: Replace reachable no-op behavior
    - [x] Convert trivial callers to Prisma/Drizzle or delete dead code
    - [x] For non-trivial deferred callers, return explicit unsupported/501 behavior instead of fake empty reads or fake ids
    - [x] Keep any remaining stub usage documented in tech debt with owner and follow-up track
- [x] Task: Add regression tests where behavior changes
    - [x] Cover unsupported responses for reachable API routes
    - [x] Cover any converted utility/controller behavior
- [x] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md)
    - Verified: validator-controller returns 501, classroom route returns 501
    - Verified: deleteStories skips Firestore with warning, audio-words-generator skips Firestore write
    - Verified: stories-question-controller has only commented references

---

## Phase 6: Final Verification and Bookkeeping

*Severity: Medium. Close the loop with auditable evidence.*

- [ ] Task: Run targeted validation
    - [ ] `pnpm turbo run build --filter=science-advantage`
    - [ ] `pnpm turbo run lint --filter=science-advantage`
    - [ ] `pnpm turbo run test --filter=@reading-advantage/db`
    - [ ] `pnpm turbo run test --filter=@reading-advantage/api`
- [ ] Task: Update Measure registries
    - [ ] Update `measure/tracks.md`
    - [ ] Update `measure/tech-debt.md` for resolved vs deferred items
    - [ ] Update affected track plans so they do not overstate completion
- [ ] Task: Commit changes and record task/phase evidence per Measure workflow
- [ ] Task: Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md)

---

## Total Estimated Tasks: 23
## Status: Pending

## Notes

### Key Decisions

- Username/password-only auth is the target. OAuth should be removed, not repaired.
- Build/lint failures can be separated into baseline debt only with exact evidence.
- Migration SQL is production behavior; TypeScript schema declarations are not enough.
- Silent no-op stubs are allowed only as temporary compile shims for unreachable code.

### Dependencies

- May require local database access to prove migration order on a fresh DB.
- Science validation depends on removing OAuth code before deciding whether `drizzle-orm`
  must be a direct app dependency.

### Risks

- Existing users without usernames require a deterministic backfill strategy.
- Some Firestore callers may still be reachable through legacy routes and need explicit
  product decisions before full migration.
