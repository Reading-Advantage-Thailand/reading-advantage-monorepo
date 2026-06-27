# Cross-App Workflows Review — Proposed Migration Tracks

> **Track:** `cross_app_workflows_review_20260626`  
> **Type:** Review-only synthesis. No remediation performed.  
> **Purpose:** Convert the 13 cross-app findings in `findings.md` into remediation-track proposals that name affected apps and package owners.

## CAX-1: Shared Auth, Role, and Session Adoption Program

- **Priority:** Critical
- **Resolves:** CA-001, partially CA-009
- **Owners:** `packages/auth`, `packages/auth-client`, `packages/api`, Reading, Primary, Sales, Marketing, Advantage Games
- **Scope:**
  1. Make role schemas include every active app role (`INTERN`, `SALES_REP`, `SALES_ADMIN`, app admin/system roles) and add package tests proving role parity.
  2. Replace ad-hoc Reading/Primary auth guards with `auth.requireUser()` / `requireRole()` and domain-level `assertCan()`.
  3. Add server-side auth to Marketing data/AI routes and real auth to Advantage Games completion/ranking routes before product import.
  4. Complete Postgres-backed rate limiter v2 and wire login/register/reset-password flows in all deployed apps.
- **Affected apps:** Reading, Primary, Science (gamification), CodeCamp, Sales, Marketing, Advantage Games.
- **Acceptance evidence:** all state-changing routes require an authenticated user or explicit system key; role schemas reject no legitimate app role; login rate limits survive multi-instance deployment.

## CAX-2: Tenant Registry and TenantDB Fail-Closed Hardening

- **Priority:** Critical
- **Resolves:** CA-002
- **Owners:** `packages/db`, `packages/domain`, `packages/api`, app domain owners
- **Scope:**
  1. Complete shared-foundation M-SF-1 and M-SF-2 first: classify all unregistered tables and make null-tenant `TenantDB` fail closed.
  2. Add tenant-isolation fixtures that always include `schoolId` and fail when omitted.
  3. Migrate Reading/Primary controllers and Science gamification/lib-services paths to `createTenantDB` + ownership checks.
  4. Fix CodeCamp REFERENTIAL table access with explicit `unscoped("reason")` or owner-FK joins.
  5. Decide Sales/Marketing single-tenant/global policy and encode it in registry docs/tests.
- **Affected apps:** all tenant-sensitive apps; hard blockers in Reading, Primary, Science, CodeCamp, Sales, Advantage Games import.

## CAX-3: Contract-First API Boundary Standardization

- **Priority:** Critical
- **Resolves:** CA-003
- **Owners:** `packages/types`, `packages/domain`, `packages/api`, app route owners
- **Scope:**
  1. Add tests to `@reading-advantage/types` for role schemas, branded IDs, shared response envelopes, and app-specific contracts.
  2. Standardize `ErrorResponse`, `SuccessResponse`, and `ListResponse` Zod contracts.
  3. Replace route-local contract duplication and string-based error mapping with shared schemas and typed domain errors.
  4. Add Zod boundary helpers in legacy apps and migrate Reading/Primary/Marketing/Games high-risk endpoints first.
- **Affected apps:** Reading, Primary, Science, Sales, Marketing, Advantage Games.

## CAX-4: Transport-Thin Backend/Domain Migration

- **Priority:** Critical
- **Resolves:** CA-004
- **Owners:** `packages/domain`, `packages/api`, Reading/Primary app owners, CodeCamp webhook owner
- **Scope:**
  1. Move remaining shared API business logic into domain functions.
  2. Migrate Reading's 54 controllers / 209 routes into domain modules by risk bucket.
  3. Migrate Primary fork-specific business logic after crash/admin/flashcard blockers are fixed.
  4. Move CodeCamp webhook LLM review to a Postgres-backed job/DLQ path.
  5. Keep UI, route handlers, and tRPC routers as transport adapters only.

## CAX-5: Provider Adapter Compliance Program

- **Priority:** High
- **Resolves:** CA-005, CA-006, CA-011
- **Owners:** `packages/ai`, `packages/storage`, prospective observability adapter, legacy app owners
- **Scope:**
  1. Stop re-exporting raw provider SDK surfaces from `@reading-advantage/ai` and add an architecture guard that catches barrel leaks.
  2. Route Reading/Primary/Marketing provider calls through AI/storage adapters.
  3. Decide whether `StorageClient` needs a `get()` method; document/test read semantics.
  4. Introduce a small observability adapter or logger boundary so apps do not import Sentry/console directly from domain/application paths.

## CAX-6: Database Migration and Seed Governance

- **Priority:** High
- **Resolves:** CA-007
- **Owners:** `packages/db`, deployment owners, app seed owners
- **Scope:**
  1. Add missing migration sentinels and Drizzle-version alignment gates.
  2. Repair schema/contract drift: Primary flashcards, Sales audio nullability, Science grade-4 seeds, CodeCamp uniqueness backfill safety.
  3. Require deploy pipelines to gate app rollout on matching DB migrations/doctor checks.

## CAX-7: Website Claims and Product Reality Alignment

- **Priority:** High
- **Resolves:** CA-008
- **Owners:** www-reading-advantage, product owner, app owners
- **Scope:**
  1. Correct stale launch dates, product counts, placeholder case studies, duplicated efficacy stats, and unverifiable model claims.
  2. Add a claims matrix review gate before future marketing launches.
  3. Mark non-existent apps as planned concepts or remove public product pages until code exists.

## CAX-8: Monorepo Test Signal Restoration

- **Priority:** High
- **Resolves:** CA-010
- **Owners:** shared package owners and each app owner
- **Scope:**
  1. Retire vacuous tests and `passWithNoTests` quality claims.
  2. Add domain/route/contract tests for Reading and Primary high-risk routes.
  3. Add tenant-isolation regression tests for Science, CodeCamp, Sales, and Games persistence.
  4. Replace production-smoke tests in CI with explicit opt-in live checks and local deterministic contract tests.
  5. Make `pnpm turbo run test` meaningful for shared `types`, `ai`, and legacy-script packages.

## CAX-9: Advantage Games Import Readiness Program

- **Priority:** High
- **Resolves:** CA-013
- **Owners:** Advantage Games, Reading/Primary integration owners, `packages/db`, `packages/domain`
- **Scope:**
  1. Define one completion/scoring Zod contract and server persistence path.
  2. Remove client-trusted XP and duplicate completion events.
  3. Make leaderboard/progress tables tenant-safe.
  4. Add i18n and embeddable navigation.
  5. Promote shared primitives into a reusable package before importing into product apps.

## Sequencing

1. **CAX-2**, **CAX-1**, **CAX-3**, **CAX-4** are the Critical foundation lane.
2. **CAX-6** runs in parallel where deploy/seed blockers are isolated.
3. **CAX-5** follows the AI/storage/shared package repair order but can start with the AI barrel leak immediately.
4. **CAX-8** should accompany every remediation lane; no repaired area closes without meaningful tests.
5. **CAX-7** and **CAX-9** are product-facing lanes and should be sequenced after the foundation lane defines safe contracts.
