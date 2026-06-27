# Primary Advantage Migration Tracks

Status: proposed from line-review evidence (2026-06-27).

These migration-track proposals are based on 893 line-review findings. They separate shared legacy work from Primary-specific remediation. No proposals claim remediation has been completed.

## Track M1: Fix Undefined Variable/Session Runtime Crashes

**Scope**: ~30 game/lesson components.
**Priority**: Critical — these components crash on game completion.
**Category**: Fork-specific regression.
**LR findings**: LR-031-001, LR-032-001, LR-033-001, LR-034-001, LR-035-001, LR-036-001, LR-037-001, LR-038-001, LR-040-001, LR-040-005, LR-044-001, LR-047-001, LR-047-002, LR-048-001, LR-049-001, LR-050-001, LR-052-001.

**Approach**: 
1. Standardize session access across game components using `useSession()` or a shared hook.
2. Import `update` from `next-auth/react` or equivalent session adapter.
3. Add shared game-completion wrapper that handles session/XP updates.
4. Add unit tests verifying session dependency is present.

## Track M2: Restore Admin CRUD Operations

**Scope**: `app/[locale]/admin/students/page.tsx`, `components/admin/classrooms-table.tsx`.
**Priority**: Critical — admin add/update/delete is non-functional.
**Category**: Fork-specific regression.
**LR findings**: LR-008-001, LR-008-002, LR-008-003, LR-023-002, LR-023-004.

**Approach**:
1. Connect `handleAddStudent`, `handleUpdateStudent`, `handleDeleteStudent` to actual API endpoints.
2. Fix `classrooms-table.tsx` destructuring mismatch (`classroomName` vs `name`).
3. Add server-side validation and permission checks.
4. Add integration tests for admin CRUD flows.

## Track M3: Re-enable Commented-Out Admin UI

**Scope**: `app/[locale]/admin/dashboard/students/page.tsx`, `app/[locale]/admin/dashboard/teachers/page.tsx`.
**Priority**: Critical — key admin functionality absent.
**Category**: Fork-specific regression.
**LR findings**: LR-006-003, LR-006-009.

**Approach**:
1. Uncomment `<StudentsTable />` and `<TeachersTable />` components.
2. Connect to real data sources instead of placeholder data.
3. Verify against existing API endpoints.

## Track M4: Add Authentication to Unprotected Routes/Actions

**Scope**: 72 API routes and server actions.
**Priority**: Critical/High — privilege escalation and data exposure.
**Category**: Fork-specific regression + Same root cause as Reading Advantage.
**LR findings**: Multiple across batches 003, 009-020.

**Approach**:
1. Audit all route handlers for `currentUser()` / `requireUser()` calls.
2. Add role-based authorization to state-mutating endpoints.
3. Gate debug routes behind admin/system role.
4. Add session validation middleware shared across routes.
5. Add authorization tests.

## Track M5: Add Tenant/SchoolId Scoping

**Scope**: 48 database queries across models and API routes.
**Priority**: High — cross-tenant data access.
**Category**: Same root cause as Reading Advantage + Fork-specific regression.
**LR findings**: Scattered across model and route batches.

**Approach**:
1. Add `schoolId` WHERE clauses to all multi-tenant queries.
2. Extract `schoolId` from authenticated user session, never from request body.
3. Add `TenantDB` integration where applicable.
4. Add tenant-isolation tests.

## Track M6: Drizzle/Flashcard Schema Resolution

**Scope**: 7 flashcard API routes, `lib/fsrs-service.ts`, shared `@reading-advantage/db` schema.
**Priority**: Critical — flashcard functionality broken.
**Category**: Shared package migration blocker.
**LR findings**: LR-015-007, LR-015-008, LR-015-012, LR-015-014, LR-015-015, LR-015-019, LR-015-024, LR-015-025, LR-015-026, LR-015-027, LR-015-031, LR-015-033.

**Approach**:
1. Decide: add FSRS columns (`due`, `stability`, `difficulty`, `lapses`, `state`, `last_review`) to shared `flashcardCards` table, OR maintain Primary-only extension table.
2. If shared: coordinate migration with `@reading-advantage/db` package.
3. Remove `as any` casts from all flashcard routes.
4. Update `lib/fsrs-service.ts` to use correct column names.

## Track M7: Prisma Artifact Cleanup

**Scope**: `Dockerfile`, `package.json`, Prisma references in code.
**Priority**: High — contradicts AGENTS.md migration claims.
**Category**: Shared package migration blocker + Fork-specific regression.
**LR findings**: LR-001-001.

**Approach**:
1. Remove `prisma:generate` step from Dockerfile.
2. Remove Prisma copy steps from Dockerfile.
3. Remove Prisma dependencies from `package.json`.
4. Convert Dockerfile to pnpm workspace install.
5. Clean up Prisma-era patterns in server models.

## Track M8: Fix Dashboard Hardcoded Data

**Scope**: All dashboard chart components.
**Priority**: High — admins see fabricated metrics.
**Category**: Fork-specific regression.
**LR findings**: LR-028-012 and related.

**Approach**:
1. Replace hardcoded arrays with API data fetches.
2. Add server-side aggregation endpoints.
3. Wire dashboard components to real data.

## Track M9: Remove Hardcoded Secrets/Credentials

**Scope**: 103 instances across config, utility, and data files.
**Priority**: Medium/High.
**Category**: Same root cause as Reading Advantage + Fork-specific regression.
**LR findings**: Scattered across utility/config batches.

**Approach**:
1. Move API keys to environment variables.
2. Use Vercel/Cloud Run secret manager for deployment.
3. Remove hardcoded emails, passwords, project IDs.
4. Add pre-commit secret scanning.

## Track M10: I18n Consolidation

**Scope**: 5 locale JSON files, hardcoded strings in components.
**Priority**: Medium.
**Category**: Intentional divergence that needs documentation + Fork-specific regression.
**LR findings**: 77 i18n findings.

**Approach**:
1. Create canonical English message key set.
2. Align other 4 locales to same key structure.
3. Replace hardcoded English strings with message keys.
4. Add i18n coverage tests.

## Track M11: Test Coverage Expansion

**Scope**: Current test coverage is minimal (7 test files).
**Priority**: High.
**Category**: Primary-student adaptation risk.
**LR findings**: See `test-gaps.md`.

**Approach**:
1. Add unit tests for `lib/calculateLevel.ts`, `lib/fsrs-service.ts`, `lib/permissions.ts`.
2. Add integration tests for admin CRUD, student lesson flow, auth boundaries.
3. Add tenant-isolation tests for multi-school queries.
4. Add component tests for game completion flows.

## Track M12: Auth Adapter Migration

**Scope**: `server/utils/auth.ts`, `lib/session.ts`, auth-related routes.
**Priority**: Medium (shared infrastructure).
**Category**: Shared package migration blocker.
**LR findings**: Batches 009, 078-079, 097.

**Approach**:
1. Replace raw JWT handling with `@reading-advantage/auth` adapter.
2. Standardize session management across the app.
3. Remove JWT secret placeholders.

## Track M13: Adapter Compliance

**Scope**: Direct provider SDK calls bypassing AGENTS.md adapters.
**Priority**: Medium (architecture).
**Category**: Shared package migration blocker.
**LR findings**: LR-098-005, LR-098-006, LR-099, LR-100 batches.

**Approach**:
1. Route Google TTS calls through AI adapter.
2. Route OpenAI calls through AI adapter.
3. Route S3 storage calls through storage adapter.
4. Route email (Resend) through mail adapter.
5. Centralize provider configuration.

## Priority Matrix

| Track | Priority | Scope (files) | Blocked by |
|---|---|---|---|
| M1: Undefined vars | Critical | ~30 | None |
| M2: Admin CRUD | Critical | 2 | None |
| M3: Commented UI | Critical | 2 | M2 |
| M4: Auth gaps | Critical/High | ~72 | None |
| M5: Tenant scoping | High | ~48 | M4 |
| M6: Flashcard schema | Critical | 7+shared | @reading-advantage/db |
| M7: Prisma cleanup | High | 3 | M6 |
| M8: Dashboard data | High | ~10 | M4, M5 |
| M9: Remove secrets | Medium/High | ~103 | None |
| M10: I18n | Medium | 5+ ~30 | None |
| M11: Tests | High | New | M1-M8 |
| M12: Auth adapter | Medium | 3+ | @reading-advantage/auth |
| M13: Adapter compliance | Medium | ~10 | Shared adapters |
