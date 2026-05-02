# Implementation Plan: Last-24-Hour Review Remediation

---

## Phase 1: Validation Baseline And Governance Repair

- [ ] Task: Reproduce and document current validation failures
    - [ ] Run `CI=true pnpm validate` and capture failing package/test/lint evidence
    - [ ] Separate review-window regressions from known baseline debt
    - [ ] Record the accepted baseline in this plan if full validation cannot be green
- [ ] Task: Fix domain test lint/type violations
    - [ ] Replace `any` casts with typed mock DB helpers or narrowed test types
    - [ ] Remove unused imports and dead test scaffolding
    - [ ] Run `pnpm turbo run lint --filter=@reading-advantage/domain`
- [ ] Task: Repair Measure completion state
    - [ ] Reopen or annotate tasks marked `[x] ... [deferred]` in affected plans
    - [ ] Ensure track metadata/status reflects actual verified state
    - [ ] Add explicit follow-up references to this remediation track where work remains
- [ ] Task: Finish i18n/config governance cleanup
    - [ ] Remove remaining `next-international` dependency/config references or reopen the i18n migration track
    - [ ] Replace reading-advantage stale `I18nProviderClient` usage with valid `NextIntlClientProvider` wiring
    - [ ] Implement reading-advantage locale switching through the installed `next-intl` navigation API
    - [ ] Restore or replace reading-advantage Tailwind animation plugin utilities under Tailwind v4
    - [ ] Fix `www-reading-advantage` locale provider/layout contract and stale `transpilePackages`
    - [ ] Make `scripts/config-drift.test.ts` runnable from root
    - [ ] Add config drift checks to `pnpm validate` and CI
    - [ ] Align CI branch triggers with the repository branch policy
- [ ] Task: Resolve dependency lockfile drift
    - [ ] Confirm whether `pnpm-lock.yaml` changes match package dependency changes
    - [ ] Keep and commit required lockfile changes or revert accidental drift
- [ ] Task: Measure - User Manual Verification 'Validation Baseline And Governance Repair' (Protocol in workflow.md)

## Phase 2: Auth Migration Correctness

- [ ] Task: Write failing tests for Firebase-only existing-user login migration
    - [ ] Cover user with `firebaseUid` and no local password
    - [ ] Cover invalid credentials and safe error messaging
    - [ ] Cover successful local password setup or documented migration exchange
- [ ] Task: Restore existing-user login/migration path
    - [ ] Implement the smallest supported Firebase-to-tRPC bridge or restore a migration modal backed by tested API behavior
    - [ ] Preserve token issuance through `auth.login`/migration completion
    - [ ] Avoid reintroducing broad Firebase auth dependency outside the migration boundary
- [ ] Task: Align reading-advantage login with server-consumed session state
    - [ ] Decide whether NextAuth session providers remain during transition or are replaced by tRPC auth state
    - [ ] Ensure login followed by hard refresh keeps protected server pages authenticated
    - [ ] Await or remove legacy `getCurrentUser()` session plumbing as appropriate
- [ ] Task: Write failing tests for auth token propagation
    - [ ] Verify reading-advantage tRPC client sends `Authorization` when an access token exists
    - [ ] Verify `auth-client` session/logout calls use the correct endpoint and bearer token
- [ ] Task: Fix tRPC/auth-client endpoint and bearer-token handling
    - [ ] Add `headers()` support to reading-advantage `TRPCProvider`
    - [ ] Align shared `AuthProvider` with app-local `/api/trpc` or configurable tRPC endpoint semantics
    - [ ] Ensure logout invalidates the server refresh token when possible
- [ ] Task: Fix primary/science auth integration gaps
    - [ ] Add `@reading-advantage/auth-client` to primary package dependencies
    - [ ] Add or target a real tRPC endpoint for primary auth-client usage
    - [ ] Normalize legacy primary role shapes or migrate comparisons to shared role values
    - [ ] Replace changed primary auth `<a>` elements with locale-aware `Link`
    - [ ] Remove science production password login UI or migrate it to shared tRPC auth
- [ ] Task: Measure - User Manual Verification 'Auth Migration Correctness' (Protocol in workflow.md)

## Phase 3: Backend Architecture And Tenant Safety

- [ ] Task: Write authorization regression tests for cross-tenant access
    - [ ] Students cannot read other students' progress
    - [ ] `users.list`, `users.get`, and `users.update` cannot leak or mutate cross-school users
    - [ ] User API responses never include `password`, `firebaseUid`, or auth token/session fields
    - [ ] Teachers cannot list or mutate classes outside their school/roster
    - [ ] Assignment create/list/update/delete verifies classroom ownership
    - [ ] Report queries verify class/student membership
- [ ] Task: Move router business logic into domain functions
    - [ ] Implement assignment domain functions used by `assignmentsRouter`
    - [ ] Implement progress domain functions used by `progressRouter`
    - [ ] Implement article domain functions or explicitly limit article router scope
    - [ ] Keep routers thin: input validation, auth context, domain call
- [ ] Task: Add tenant and ownership guards to domain functions
    - [ ] Scope class/student/report queries by `tenant.schoolId`
    - [ ] Scope user queries and updates by tenant unless the caller has verified admin authority
    - [ ] Verify classroom IDs belong to caller's tenant before writes
    - [ ] Return `NOT_FOUND` or authorization-safe errors for inaccessible records
- [ ] Task: Fix lesson progress persistence semantics
    - [ ] Add a unique constraint for `(userId, lessonId)` or replace upsert with a transaction
    - [ ] Align `lessonProgress.lessonId` with `lessons.id` or document it as an external identifier
    - [ ] Add a repeat-update test that proves runtime-safe behavior
- [ ] Task: Add missing database integrity constraints
    - [ ] Add uniqueness for `(classroomId, studentId)`
    - [ ] Add uniqueness for `(assignmentId, studentId)`
    - [ ] Add account and verification token composite uniqueness
    - [ ] Redesign or constrain `studentAnswers.questionId` integrity
    - [ ] Add migration/schema tests for each constraint
- [ ] Task: Replace stub modules with real exports or remove inactive router surface
    - [ ] Remove `// Stub` assignment/progress modules
    - [ ] Ensure package barrels expose implemented domains only
- [ ] Task: Fix package typecheck and export metadata
    - [ ] Fix API test context typing
    - [ ] Replace self-referential mock DB helper types with explicit mock interfaces
    - [ ] Create or remove missing API package `./client`, `dev`, and `start` entrypoints
    - [ ] Run package `check-types` for API and domain
- [ ] Task: Measure - User Manual Verification 'Backend Architecture And Tenant Safety' (Protocol in workflow.md)

## Phase 4: Final Verification And Closure

- [ ] Task: Run targeted package gates
    - [ ] `pnpm turbo run lint --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/auth-client`
    - [ ] `pnpm turbo run test --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/auth-client`
    - [ ] `pnpm turbo run build --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/auth-client`
    - [ ] `pnpm turbo run build --filter=primary-advantage --filter=www-reading-advantage`
- [ ] Task: Run root validation
    - [ ] `CI=true pnpm validate`
    - [ ] Document any remaining known baseline failures with file/track ownership
- [ ] Task: Update lessons learned and tech debt if shortcuts remain
    - [ ] Add only near-term, actionable entries
    - [ ] Keep each file within its 50-line budget
- [ ] Task: Measure - User Manual Verification 'Final Verification And Closure' (Protocol in workflow.md)

---

## Total Estimated Tasks: 9
## Completed Tasks: 0

## Notes

- This track intentionally starts with validation and governance repair because downstream fixes need a truthful baseline.
- Review evidence came from local diff/log inspection and `CI=true pnpm validate`, which failed at `@reading-advantage/domain` lint.
