# Specification: Last-24-Hour Review Remediation

## Overview

Review of the last 24 hours of commits found correctness, security, testing, and governance gaps across the completed backend/auth/config/i18n tracks. This track fixes those findings before more migration work builds on the new shared backend.

Review window: commits `3b93a05` through `ee62b21` on 2026-05-02, plus current uncommitted `pnpm-lock.yaml` drift.

## Associated Tracks

- `shared_backend_auth_20260502`
- `shared_backend_api_20260502`
- `shared_backend_scaffold_20260502`
- `shared_config_consolidation_20260502`
- `i18n_migration_20260502`
- `unified_ci_cd_pipeline_20260502`

## Findings To Fix

### 1. Full validation does not pass after completed tracks

`pnpm validate` fails during `@reading-advantage/domain` lint because new domain tests use `any` casts and unused imports. Several Measure plans also marked full validation and manual verification tasks complete while annotated as `[deferred]`, creating a false completion state.

Evidence:
- `packages/domain/src/__tests__/classes.test.ts`
- `packages/domain/src/__tests__/reports.test.ts`
- `packages/domain/src/__tests__/students.test.ts`
- `measure/tracks/shared_backend_api_20260502/plan.md`
- `measure/tracks/shared_config_consolidation_20260502/plan.md`

### 2. Auth migration removed legacy Firebase password migration without preserving existing-user login

The auth migration spec requires existing users to log in without password reset. The reading-advantage sign-in form removed Firebase fallback and the password migration modal, while `auth.login` only accepts users with a local `password` value. Existing Firebase-only users now receive "Invalid email or password" with no migration path.

Evidence:
- `measure/tracks/shared_backend_auth_20260502/spec.md`
- `apps/reading-advantage/components/user-signin-form.tsx`
- `packages/api/src/routers/auth.ts`

### 3. New tRPC auth does not create the server session that reading-advantage still consumes

The reading-advantage login flow stores tRPC JWTs in `localStorage`, but server-rendered app state still comes from NextAuth session helpers. After login or a hard refresh, protected server pages can still see the user as unauthenticated. The locale layout also passes `getCurrentUser()` without awaiting it before providing the legacy session.

Evidence:
- `apps/reading-advantage/lib/use-trpc-auth.ts`
- `apps/reading-advantage/lib/session.ts`
- `apps/reading-advantage/app/[locale]/layout.tsx`

### 4. Auth clients do not consistently authenticate protected tRPC calls

The reading-advantage `TRPCProvider` creates an `httpBatchLink` without an `Authorization` header, so protected procedures cannot use tokens saved by `useTrpcAuth`. The shared `AuthProvider` also calls `/trpc/auth.*` paths directly instead of the app's `/api/trpc` endpoint and omits the bearer token on logout, making session restoration/logout unreliable for apps using that package.

Evidence:
- `apps/reading-advantage/components/providers/trpc-provider.tsx`
- `apps/reading-advantage/lib/use-trpc-auth.ts`
- `packages/auth-client/src/provider.tsx`
- `apps/reading-advantage/app/api/trpc/[trpc]/route.ts`

### 5. Primary and science auth integrations point at dead or incompatible flows

Primary's teacher sign-in uses the shared auth client, but primary does not expose the expected tRPC route and its package dependency wiring is incomplete. Science renders a password sign-in form in production even though its current `/api/auth/login` route rejects production and is not the shared tRPC auth flow. Primary's compatibility shim also returns uppercase shared roles into UI that compares lowercase legacy role values.

Evidence:
- `apps/primary-advantage/components/auth/teacher-signin-form.tsx`
- `apps/primary-advantage/lib/next-auth-compat.ts`
- `apps/primary-advantage/types/enum.ts`
- `apps/primary-advantage/components/nav/user-account-nav.tsx`
- `packages/auth-client/src/provider.tsx`
- `apps/science-advantage/components/features/auth/signin-container.tsx`
- `apps/science-advantage/components/features/auth/signin-form.tsx`
- `apps/science-advantage/app/api/auth/login/route.ts`

### 6. New API routers bypass the required domain-function architecture

The architecture requires `tRPC -> domain functions -> Drizzle`, with thin routers. New `articles`, `progress`, and `assignments` routers perform direct Drizzle writes/reads in router handlers. Domain packages for assignments and progress are explicit stubs.

Evidence:
- `packages/api/src/routers/articles.ts`
- `packages/api/src/routers/progress.ts`
- `packages/api/src/routers/assignments.ts`
- `packages/domain/src/assignments/index.ts`
- `packages/domain/src/progress/index.ts`

### 7. Tenant scoping and ownership checks are missing in new read/write paths

Several new routes and domain functions authorize only by role, then read or mutate records by caller-supplied IDs without proving school/class ownership. This violates the monorepo rule that every query is scoped by `schoolId` or verified tenant membership. `users.list` is especially severe because it builds conditions, leaves a TODO, and returns all users without a where clause.

Evidence:
- `packages/api/src/routers/users.ts`
- `packages/domain/src/students/index.ts`
- `packages/domain/src/reports/index.ts`
- `packages/api/src/routers/assignments.ts`
- `packages/api/src/routers/progress.ts`
- `packages/api/src/routers/articles.ts`

### 8. User APIs leak credential-bearing columns

The new user router returns full `users` rows from `me`, `get`, and `list`. The schema includes credential and identity-link fields such as `password` and `firebaseUid`, so these endpoints can expose sensitive fields to clients.

Evidence:
- `packages/api/src/routers/users.ts`
- `packages/db/src/schema/users.ts`

### 9. New database schema is missing constraints required by API behavior

Several new Drizzle tables omit uniqueness or foreign-key constraints that the new routers/domain functions assume. `lessonProgress` upserts on `(userId, lessonId)` without a unique constraint; `lessonProgress.lessonId` is text while `lessons.id` is UUID and has no FK; `classroomStudents` and `studentAssignments` have no membership uniqueness; `studentAnswers.questionId` is an unconstrained text pointer; auth compatibility tables allow duplicate provider accounts and verification tokens.

Evidence:
- `packages/api/src/routers/progress.ts`
- `packages/api/src/routers/assignments.ts`
- `packages/domain/src/students/index.ts`
- `packages/db/src/schema/progress.ts`
- `packages/db/src/schema/content.ts`
- `packages/db/src/schema/classrooms.ts`
- `packages/db/src/schema/questions.ts`
- `packages/db/src/schema/users.ts`
- `packages/db/drizzle/0000_wide_vengeance.sql`
- `packages/db/drizzle/meta/0001_snapshot.json`

### 10. `lessonProgress` upsert has no matching unique constraint

The progress router uses `onConflictDoUpdate` on `(userId, lessonId)`, but the `lessonProgress` schema does not declare a unique constraint for that pair. Postgres will reject that upsert at runtime.

Evidence:
- `packages/api/src/routers/progress.ts`
- `packages/db/src/schema/progress.ts`

### 11. Package typecheck/build gates fail even where tests pass

The API/domain tests can pass while typecheck fails. The API `trpc.test.ts` recreates tRPC without a context type and then references `ctx.auth`; the domain mock DB helper uses self-referential `ReturnType<typeof createMockDb>` typing. The API package also advertises missing runtime entrypoints/scripts.

Evidence:
- `packages/api/src/__tests__/trpc.test.ts`
- `packages/domain/src/__tests__/mock-db.ts`
- `packages/api/package.json`

Command evidence:
- `CI=true pnpm --filter @reading-advantage/api check-types` fails with `Property 'auth' does not exist on type '{}'`
- `CI=true pnpm turbo run check-types --filter=@reading-advantage/api --filter=@reading-advantage/domain` fails with mock DB self-reference type errors

### 12. Some completed API migration tasks are placeholders rather than complete work

The API migration plan marks Tier 3, Tier 4, frontend conversion, route deletion, manual verification, and validation tasks as complete while labeling them `[deferred]`. This hides remaining work and makes track status unreliable.

Evidence:
- `measure/tracks/shared_backend_api_20260502/plan.md`

### 13. i18n migration is marked complete while `next-international` remains referenced

The i18n migration acceptance criteria require removing `next-international`. The reading-advantage package still lists it and Next config still transpiles it, so the track completion claim is false or the dependency cleanup was missed.

Evidence:
- `measure/tracks/i18n_migration_20260502/spec.md`
- `measure/tracks/i18n_migration_20260502/plan.md`
- `apps/reading-advantage/package.json`
- `apps/reading-advantage/next.config.mjs`

### 14. reading-advantage i18n provider and locale-switching migration is incomplete

The reading-advantage locale provider still imports `I18nProviderClient`, but `locales/client.ts` no longer exports it. Locale switching also re-exports `useChangeLocale` from `next-intl/navigation`, which is not the installed API shape used elsewhere. Components still call that missing hook. This can break locale rendering or module resolution even though the track is marked complete.

Evidence:
- `apps/reading-advantage/components/providers/locale-provider.tsx`
- `apps/reading-advantage/locales/client.ts`
- `apps/reading-advantage/locales/navigation.ts`
- `apps/reading-advantage/components/switchers/locale-switcher.tsx`

### 15. Tailwind v4 migration dropped animation plugin wiring while plugin classes remain in use

The reading-advantage Tailwind v3 config was removed, but the v4 CSS/PostCSS setup does not wire `tailwindcss-animate`. Existing shadcn-style components still use plugin utilities such as `data-[state=open]:animate-in`, so dialogs/popovers/tooltips/toasts/mobile nav can lose expected animations or class generation.

Evidence:
- `apps/reading-advantage/tailwind.config.js`
- `apps/reading-advantage/postcss.config.mjs`
- `apps/reading-advantage/styles/globals.css`
- `apps/reading-advantage/components/ui/dialog.tsx`

### 16. `www-reading-advantage` next-intl migration leaves stale config and provider mismatch

`www-reading-advantage` now builds, but the migration still leaves `next-international` in `transpilePackages`. The new `LocaleProvider` requires a `messages` prop, while the app layout still renders it with only `locale` and relies on build settings that skip type/lint validation. This is a latent type/runtime mismatch masked by `ignoreBuildErrors` and skipped linting.

Evidence:
- `apps/www-reading-advantage/next.config.ts`
- `apps/www-reading-advantage/src/providers/locale-provider.tsx`
- `apps/www-reading-advantage/src/app/[locale]/layout.tsx`

Command evidence:
- `CI=true pnpm turbo run build --filter=www-reading-advantage` exits 0 but reports "Skipping validation of types" and "Skipping linting"

### 17. Config drift guard and CI wiring are incomplete

The config drift test is not runnable from the root with current dependencies, is not included in `pnpm validate` or CI, and misses current drift examples such as `www-reading-advantage/src/lib/utils.ts`. The GitHub Actions workflow also targets `main` while the repository branch/default branch is `master`.

Evidence:
- `scripts/config-drift.test.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `apps/www-reading-advantage/src/lib/utils.ts`
- `apps/reading-advantage/components.json`
- `apps/www-reading-advantage/components.json`

### 18. Primary auth migration does not build

Primary imports `@reading-advantage/auth-client` from the new layout/session/auth hooks, but the app package does not declare that workspace dependency. Production build fails with module resolution errors.

Evidence:
- `apps/primary-advantage/package.json`
- `apps/primary-advantage/components/auth/teacher-signin-form.tsx`
- `apps/primary-advantage/components/nav/user-account-nav.tsx`
- `apps/primary-advantage/components/providers/session-provider.tsx`
- `apps/primary-advantage/hooks/use-current-role.ts`
- `apps/primary-advantage/hooks/use-current-user.ts`

Command evidence:
- `CI=true pnpm turbo run build --filter=primary-advantage` fails with `Module not found: Can't resolve '@reading-advantage/auth-client'`

### 19. Primary auth migration introduces new lint failures

Primary already had baseline lint debt, but the changed `teacher-signin-form.tsx` introduces new `@next/next/no-html-link-for-pages` errors for plain `<a>` navigation.

Evidence:
- `apps/primary-advantage/components/auth/teacher-signin-form.tsx`

Command evidence:
- `CI=true pnpm turbo run lint --filter=primary-advantage --filter=www-reading-advantage --filter=science-advantage` fails with new errors at `teacher-signin-form.tsx:98` and `teacher-signin-form.tsx:147`

### 20. Lockfile drift is uncommitted

`git status --short` reports `M pnpm-lock.yaml` after dependency changes. This must be either committed with the dependency changes or reverted if generated accidentally.

Evidence:
- `pnpm-lock.yaml`

## Functional Requirements

1. Restore a truthful green validation baseline for affected packages.
2. Preserve or replace Firebase-only existing-user login migration so users are not locked out.
3. Ensure the new auth flow establishes the session shape each app actually consumes.
4. Ensure all auth clients use the app-local tRPC endpoint and send bearer tokens for protected calls.
5. Fix primary/science auth wiring so production login UI is not dead or incompatible.
6. Move router business logic into domain functions for migrated shared backend areas.
7. Add tenant and ownership checks to all new domain/API reads and mutations.
8. Remove sensitive fields from user API responses.
9. Add database constraints or explicit transactional behavior for schema assumptions.
10. Replace placeholder stubs with implemented domain functions or explicitly mark them out of scope in Measure artifacts.
11. Repair package metadata, typecheck, and test quality gaps.
12. Repair Measure plan/metadata status so completed means verified, not deferred.
13. Finish i18n dependency cleanup or reopen the i18n track truthfully.
14. Fix reading-advantage locale provider/switching and Tailwind v4 plugin migration gaps.
15. Wire config drift tests into validation/CI and make CI target the active branch policy.
16. Resolve lockfile drift intentionally.

## Non-Functional Requirements

- Keep fixes scoped to the changed areas from the review window.
- Add or repair tests before implementation for each backend/auth behavior.
- Preserve existing app deployability.
- Avoid weakening ESLint or type-safety rules to make validation pass.

## Acceptance Criteria

- [ ] `CI=true pnpm validate` exits 0 or all remaining failures are explicitly documented as pre-existing baseline debt with command evidence.
- [ ] Existing Firebase-only reading-advantage users have a tested login/migration path.
- [ ] reading-advantage login survives hard refresh and protected server-rendered pages see the authenticated user.
- [ ] Protected tRPC calls from reading-advantage and shared auth-client include `Authorization: Bearer <accessToken>`.
- [ ] Primary and science auth entry points target working shared auth routes or hide unsupported production UI.
- [ ] Primary declares the auth-client dependency and its auth migration builds.
- [ ] `articles`, `assignments`, and `progress` router mutations delegate business logic to domain functions.
- [ ] User, class, student, assignment, progress, and report queries verify school/class ownership before returning or mutating data.
- [ ] User APIs use safe projections and never return password, Firebase UID, or token/session fields.
- [ ] `lessonProgress` repeat updates work against a valid DB uniqueness strategy.
- [ ] Classroom enrollment, student assignment, OAuth account, verification token, and answer/question integrity assumptions are enforced or explicitly redesigned.
- [ ] Assignment and progress domain modules are no longer empty stubs if their routers remain active.
- [ ] API/domain typecheck gates pass, and package exports/scripts reference real files.
- [ ] `next-international` is removed from reading-advantage or the i18n track is reopened with explicit remaining work.
- [ ] reading-advantage locale provider and locale switcher use valid `next-intl` APIs and all five locales render.
- [ ] reading-advantage Tailwind v4 setup preserves required animation utilities or replaces the affected classes.
- [ ] `www-reading-advantage` locale provider/layout props and stale transpile config are consistent under typecheck.
- [ ] Config drift guard runs in root validation and CI, and branch triggers match repo policy.
- [ ] Tests cover unauthorized cross-tenant access, Firebase-only login migration, token propagation, and affected router/domain behavior.
- [ ] Measure plans and metadata accurately distinguish completed, deferred, and follow-up work.
- [ ] `git status --short` has no accidental dependency/lockfile drift for this track.

## Out of Scope

- Completing all 294 legacy API route migrations.
- Removing Firebase or Firestore entirely.
- Redesigning app auth UI beyond restoring the required migration path.
- Large app-wide lint cleanup unrelated to this review window.
