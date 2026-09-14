# Implementation Plan: Primary Authorization Hardening

Track ID: `primary_authorization_hardening_20260912`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/primary-advantage/`. This track blocks tracks 2-6.

## Phase 1: Contract & Schema Definition

- [x] Task: Define authorization contracts
  - [x] Zod schema for `PATCH /api/users/[id]`: allowed fields, refused self-role change, `ADMIN`/`SYSTEM` caller, target `schoolId` scope.
  - [x] Zod schema for `amountPerGenre` (bounded integer) and `fileName` (plain basename only).
  - [x] Server-side XP award contract: `updateUserActivity` takes `ActivityType`; award comes from `UserXpEarned`; client `xpEarned` is not an input.
  - [x] Ownership contract for student-progress, article-records, reminder-reread, user search, and assignment-by-id: caller school must match resource school.
  - [x] Write static invariant tests (Red): `PATCH` handler mentions `ADMIN` or `SYSTEM`; `articles/generate` and `upload/csv/cleanup` call an auth helper; `updateUserActivity` signature has no `xpEarned`; `protectedRoutes["/student"]` is student-only.

## Phase 2: Test

- [x] Task: Write failing behavioral tests (Red)
  - [x] FR-1: a student `PATCH` to self with `role: "SYSTEM"` returns 403 and does not write `userRoles`.
  - [x] FR-1: a student `PATCH` to another user with `password` returns 403.
  - [x] FR-2: each of the five routes returns 401 without a session.
  - [x] FR-2: `fileName=../../secret` is rejected before `unlink`.
  - [x] FR-3: `deleteAllArticles` rejects a student caller, or the module is absent.
  - [x] FR-4: `updateUserActivity` awards `UserXpEarned` for the activity type and ignores a planted client XP value.
  - [x] FR-5: a teacher from school A cannot read school B student progress or user-search hits.
  - [x] FR-7: a test fails when a role enum member has no proxy policy.
  - [x] Confirm all new tests fail (Red).

## Phase 3: Implement

- [x] Task: FR-1 gate `PATCH /api/users/[id]` behind `ADMIN`/`SYSTEM`, Zod, school scope, and no self-role change
- [x] Task: FR-2 authorize the five routes; bound `amountPerGenre`; reject non-basename `fileName`
- [x] Task: FR-3 add a role check to each named server action, or delete `actions/test.ts` and `/system/test`
- [x] Task: FR-4 remove `xpEarned` from `updateUserActivity`; derive the award from `UserXpEarned` on the server
- [x] Task: FR-5 add ownership and `schoolId` checks to the four cross-tenant reads
- [x] Task: FR-6 create `app/[locale]/unauthorized/page.tsx`; remove the sign-in redirect from the 404 layout
- [x] Task: FR-7 restrict `/student` to `["student"]`; derive `protectedRoutes` from the role enum
- [x] Task: FR-8 add a role assertion in each of the five layouts
- [x] Task: Run new tests until green; run `pnpm turbo run test --filter=primary-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update `docs/primary-advantage-ux-refactor-plan.md` section 2 items to done
- [x] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
