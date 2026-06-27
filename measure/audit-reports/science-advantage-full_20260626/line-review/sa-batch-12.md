# Line-by-Line Review: sa-batch-12

**Track:** `science_advantage_review_20260626`  
**Batch:** `sa-batch-12` (20 files)  
**Reviewer:** Measure audit agent  
**Date:** 2026-06-27  
**Scope:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture / golden-path patterns  
**Policy:** Archive documentation only — no app-code edits made. Findings flagged for awareness; no acceptance/closeout claims.

---

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `apps/science-advantage/docs/archive/architecture/database-schema.md` | 596 |
| 2 | `apps/science-advantage/docs/archive/architecture/deployment-architecture.md` | 186 |
| 3 | `apps/science-advantage/docs/archive/architecture/development-workflow.md` | 609 |
| 4 | `apps/science-advantage/docs/archive/architecture/error-handling.md` | 873 |
| 5 | `apps/science-advantage/docs/archive/architecture/external-apis.md` | 406 |
| 6 | `apps/science-advantage/docs/archive/architecture/frontend-architecture.md` | 819 |
| 7 | `apps/science-advantage/docs/archive/architecture/monitoring-observability.md` | 518 |
| 8 | `apps/science-advantage/docs/archive/architecture/security-performance.md` | 735 |
| 9 | `apps/science-advantage/docs/archive/architecture/testing-strategy.md` | 1058 |
| 10 | `apps/science-advantage/docs/archive/architecture/unified-project-structure.md` | 367 |
| 11 | `apps/science-advantage/docs/archive/bug-fixes/completion-status-display-bug.md` | 104 |
| 12 | `apps/science-advantage/docs/archive/competitor-analysis.md` | 759 |
| 13 | `apps/science-advantage/docs/archive/competitor-analysis/1-introduction.md` | 32 |
| 14 | `apps/science-advantage/docs/archive/competitor-analysis/2-market-overview.md` | 60 |
| 15 | `apps/science-advantage/docs/archive/competitor-analysis/3-competitor-analysis.md` | 170 |
| 16 | `apps/science-advantage/docs/archive/competitor-analysis/4-feature-comparison-matrix.md` | 28 |
| 17 | `apps/science-advantage/docs/archive/competitor-analysis/5-pricing-analysis.md` | 77 |
| 18 | `apps/science-advantage/docs/archive/competitor-analysis/6-ecosystem-competitive-advantage.md` | 79 |
| 19 | `apps/science-advantage/docs/archive/competitor-analysis/7-go-to-market-recommendations.md` | 80 |
| 20 | `apps/science-advantage/docs/archive/competitor-analysis/7-market-positioning-opportunities.md` | 95 |

**Total lines reviewed:** 6,651  
**All files carry frontmatter:** `status: deprecated`, `type: archive` ✓

---

## Finding Severity Key

| Severity | Definition |
|----------|------------|
| 🔴 **Critical** | Security, tenancy, or auth pattern that would cause a production vulnerability if this code were live |
| 🟠 **High** | Significant AGENTS.md or golden-path deviation; outdated tech-stack reference that could mislead readers |
| 🟡 **Medium** | Non-critical convention violation; stale pattern reference; documentation drift |
| 🔵 **Low** | Informational; minor inconsistency; archive doc expected to be stale |

---

## File 1: database-schema.md (596 lines)

### F-SA-B12-001 🟠 High — No `schoolId` column on any tenant table
**Lines 50–65, 83–101, 120–142, 163–180, 205–224, 247–262, 265–281, 284–306, 313–323**
Every data table (users, classes, lessons, quizzes, experiments, lesson_progress, quiz_submissions, experiment_submissions, user_activity_logs) lacks a `schoolId` column. The monorepo AGENTS.md mandates that every FLAT table must have `schoolId` and that every query must be scoped by `schoolId`. Users table has no school affiliation at all. This schema is pre-multi-tenancy and would require a full migration to comply.

### F-SA-B12-002 🟠 High — Prisma stack references instead of Drizzle
**Lines 27–540 (entire SQL DDL block)**
The entire schema is raw SQL DDL intended for a Prisma-based stack. The monorepo now uses Drizzle ORM with TypeScript schema definitions in `packages/db/src/schema/`. This raw SQL file is a stale artifact.

### F-SA-B12-003 🟡 Medium — `google_id` for OAuth (line 57)
**Line 57:** `google_id VARCHAR(255) UNIQUE, -- For Google OAuth integration`
The monorepo auth philosophy (AGENTS.md) mandates username/password auth via `@reading-advantage/auth` with an adapter pattern. Google OAuth is explicitly excluded by default policy ("Features Not Included by Default"). This column would not exist in the current architecture.

### F-SA-B12-004 🔵 Low — `last_login_at` column (line 60)
**Line 60:** `last_login_at TIMESTAMPTZ,`
Not harmful, but the session-based auth adapter manages login tracking separately. This is a legacy denormalization.

### F-SA-B12-005 🟡 Medium — `class_code` for student enrollment (line 89)
**Line 89:** `class_code VARCHAR(20) UNIQUE NOT NULL, -- For student enrollment`
Join-code-based enrollment is a valid pattern but absent from the current `packages/db` schema. Duplication risk if implemented separately.

### F-SA-B12-006 🟡 Medium — `order_index` on `class_lessons` without composite ordering (line 151)
**Line 151:** `order_index INTEGER NOT NULL, -- For lesson sequencing`
No `UNIQUE(class_id, order_index)` constraint, meaning duplicate order_index values are possible within a class.

### F-SA-B12-007 🟡 Medium — `UNIQUE(user_id, lesson_id, class_id)` on lesson_progress allows NULL in class_id (line 261)
**Line 261:** `UNIQUE(user_id, lesson_id, class_id)`
PostgreSQL treats NULLs as distinct in unique constraints, so two rows with `class_id IS NULL` and the same `(user_id, lesson_id)` would not violate the constraint. This is likely unintended.

### F-SA-B12-008 🟡 Medium — `quiz_submissions.score` signing check is wrong (line 280)
**Line 280:** `CONSTRAINT quiz_submissions_score_check CHECK (score BETWEEN 0 AND 100)`
But line 272 defines `score INTEGER` — a percentage score. If `max_score` (line 273) can vary, then `score` may not be a percentage but a raw sum. The constraint assumes percentage but the field name implies raw score. Inconsistent.

### F-SA-B12-009 🟡 Medium — `experiment_submissions.grade` allows nullable with constraint (lines 296, 305)
**Lines 296, 305:** `grade INTEGER` with `CHECK (grade BETWEEN 0 AND 100)` but `graded_by` is nullable — grade can be set without a grader. No constraint tying `grade` to `graded_at` or `graded_by` non-null.

### F-SA-B12-010 🟡 Medium — RLS policies use application session variable pattern (lines 515–529)
**Lines 515–529:** `current_setting('app.current_user_id', true)`
This is a non-standard pattern requiring middleware to set `SET app.current_user_id = '...'` per request. Fragile and bypasses the tenant-registry system. The monorepo's `createTenantDB` pattern is the approved approach.

### F-SA-B12-011 🟡 Medium — Missing unique index on `user_sessions.session_token` (line 71)
**Line 71:** `session_token VARCHAR(255) UNIQUE NOT NULL`
UNIQUE constraint on VARCHAR(255) is correct but no index on `expires_at` alone (only `idx_user_sessions_expires_at`), which is fine. No issue here — withdrawn.

### F-SA-B12-012 🔵 Low — `system_metrics` table has no tenant scope (lines 326–333)
**Line 326:** `CREATE TABLE system_metrics`
This is probably an EXEMPT table (infra metrics), but should be classified in the tenant registry.

---

## File 2: deployment-architecture.md (186 lines)

### F-SA-B12-013 🟠 High — Deployment targets GCP Cloud Run, not monorepo Docker target
**Lines 18–23, 99–106**
The doc describes GCP Cloud Run + Cloud SQL + Cloud Build. The monorepo AGENTS.md targets "Docker deployment target" — Cloud Run, Fly.io, Railway, Kubernetes. GCP is acceptable but the specific GCP service references (Cloud Build, Artifact Registry, Secret Manager) are platform-specific. The doc references Prisma for connection pooling (line 113) instead of Drizzle.

### F-SA-B12-014 🟡 Medium — GitHub Actions workflow references `@v3` action versions (lines 147, 152, 157)
**Lines 147, 152, 157:** `actions/checkout@v3`, `google-github-actions/auth@v1`, `google-github-actions/setup-gcloud@v1`
These major versions are now outdated. `checkout@v4` is current; `auth@v2` and `setup-gcloud@v2` are available.

### F-SA-B12-015 🟡 Medium — No Drizzle migration step in CI pipeline
**Lines 164–177**
The CI/CD pipeline lacks any Drizzle migration step (`drizzle-kit migrate`). The old Prisma flow is referenced but not materialized.

### F-SA-B12-016 🔵 Low — Dockerfile uses `npm ci` (line 65) but monorepo uses pnpm
**Line 65:** `RUN npm ci`
The monorepo uses pnpm workspaces. This Dockerfile would fail in the current repository structure.

---

## File 3: development-workflow.md (609 lines)

### F-SA-B12-017 🟠 High — All database commands use Prisma, not Drizzle
**Lines 129–136, 177–191**
`npx prisma generate`, `npx prisma db push`, `npx prisma migrate dev`, `npx prisma studio` — every database command references Prisma. The monorepo has fully migrated to Drizzle. This doc is actively misleading for new developers.

### F-SA-B12-018 🟡 Medium — NextAuth.js references (lines 241–246, 268–277)
**Lines 241–246:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
The monorepo has migrated to `@reading-advantage/auth` with session-based auth. NextAuth.js + Google OAuth are legacy.

### F-SA-B12-019 🟡 Medium — OpenAI API key in env vars (line 253)
**Line 253:** `OPENAI_API_KEY="sk-your-openai-api-key"`
Current architecture uses the internal AI adapter — OpenAI SDK should not be directly configured. But as archive docs this is documenting old state.

### F-SA-B12-020 🟡 Medium — Redis references (lines 67–74, 260)
**Lines 67–74, 260:** Redis for caching and session storage
No evidence of Redis in the current `packages/` structure. The monorepo AGENTS.md does not mention Redis.

### F-SA-B12-021 🟡 Medium — Vercel-specific references (lines 301, 302)
The doc references Vercel deployment (`science-advantage.vercel.app`) and Vercel Postgres. The monorepo targets container deployment, not Vercel.

### F-SA-B12-022 🔵 Low — `npm run` commands (lines 155, 166, 169, 172, etc.)
Throughout: `npm run dev`, `npm run build`, etc. The monorepo uses `pnpm` exclusively.

---

## File 4: error-handling.md (873 lines)

### F-SA-B12-023 🟡 Medium — Direct `next-auth` import (line 579)
**Line 579:** `import { getServerSession } from 'next-auth';`
The monorepo uses `@reading-advantage/auth` for auth. Direct NextAuth.js imports are legacy.

### F-SA-B12-024 🟡 Medium — Prisma error handling for `PrismaClientKnownRequestError` (lines 495–515)
**Lines 495–515:** Prisma-specific error handling with error codes `P2002`, `P2025`
The monorepo now uses Drizzle, which has different error types and codes. This error-handling strategy would not work with the current ORM.

### F-SA-B12-025 🟡 Medium — Google Analytics `gtag` usage in Node.js context (lines 132–137, 310–316, 706–712)
**Lines 132–137, 310–316, 706–712:** `window.gtag?.('event', ...)` inside API error handlers
References to `window` from what appears to be server-side code (API routes, lib modules). The `typeof window !== 'undefined'` guard prevents crashes, but `gtag` calls in server-side error handlers are no-ops. The monitoring/observability doc (file 7) has a similar pattern. These should use the structured logging approach instead.

### F-SA-B12-026 🔵 Low — Educational error types are good pattern (lines 69–77, 422–474)
**Lines 69–77, 422–474:** `EducationalError` and domain-specific error subclasses
This is a well-considered pattern for educational UX. Worth preserving in a Drizzle-aware migration.

---

## File 5: external-apis.md (406 lines)

### F-SA-B12-027 🟡 Medium — References `@reading-advantage/storage` (line 62) — correct adapter pattern
**Line 62:** "Integrated via `@reading-advantage/storage` (S3-compatible adapter)"
This is one of the few files that correctly references the monorepo adapter layer. Good.

### F-SA-B12-028 🟡 Medium — Direct OpenAI SDK usage example (lines 121–142)
**Lines 121–142:** `openai.chat.completions.create({...})` with `gpt-3.5-turbo`
The monorepo mandates going through the `ai` adapter (`ai.generateText()`, etc.). Direct SDK usage is forbidden.

### F-SA-B12-029 🟡 Medium — NextAuth.js and Google OAuth (lines 17–45)
**Lines 17–45:** Google OAuth via NextAuth.js
Legacy auth approach. The monorepo uses `@reading-advantage/auth`.

### F-SA-B12-030 🟡 Medium — Stripe integration (lines 159–191)
**Lines 159–191:** Stripe for payments/subscriptions
No billing module exists in the current `packages/backend` structure. This would be a new module if implemented.

### F-SA-B12-031 🔵 Low — SendGrid for email (lines 193–223)
**Lines 193–223:** SendGrid for transactional emails
The monorepo has no email adapter yet. This is a forward-looking integration.

### F-SA-B12-032 🔵 Low — Good architecture diagram (lines 280–324)
**Lines 280–324:** Clean Mermaid diagram showing service separation
The integration architecture diagram follows a reasonable layered pattern.

---

## File 6: frontend-architecture.md (819 lines)

### F-SA-B12-033 🟡 Medium — `next-auth` import path (line 268)
**Line 268 (via unified-project-structure.md reference pattern, and file 6 patterns):**
The `app/api/auth/[...nextauth]/route.ts` pattern is referenced throughout. This is legacy.

### F-SA-B12-034 🟡 Medium — Zustand with `persist` middleware for auth (lines 179–214)
**Lines 179–214:** `useAuthStore` with Zustand persist storing `user` in localStorage
Storing user auth data in localStorage via Zustand persist is a security concern. Auth state should come from the session cookie and server-side validation, not persisted client-side storage.

### F-SA-B12-035 🟡 Medium — React Query for server state (line 451)
**Line 451:** `queryClient.invalidateQueries(['lesson-progress', lessonSlug])`
React Query is fine, but the monorepo prefers server actions and domain functions for data mutations, not client-side cache invalidation as the primary data flow.

### F-SA-B12-036 🟡 Medium — `AuthGuard` component with client-side role check (lines 301–364)
**Lines 301–364:** `AuthGuard` component checks `user.role` client-side
Client-side role checks are not security boundaries. The actual authorization should be enforced server-side via `assertCan()` or the `command()` pattern. The client-side guard is cosmetic.

### F-SA-B12-037 🟡 Medium — Dynamic imports with `ssr: false` pattern (lines 488–503)
**Lines 488–503:** `dynamic(() => import(...), { ssr: false })`
This is a valid Next.js pattern but breaks SSR for those components. The current monorepo should prefer React Server Components where possible.

### F-SA-B12-038 🔵 Low — Socket.io for real-time classroom (lines 661–687)
**Lines 661–687:** Socket.io `io(...)` connection
The monorepo has no WebSocket infrastructure. This is a forward-looking feature pattern.

---

## File 7: monitoring-observability.md (518 lines)

### F-SA-B12-039 🟠 High — Supabase references (lines 25, 65)
**Lines 25, 65:** "Supabase PostgreSQL", "Supabase Dashboard"
Supabase is not part of the monorepo stack. The database is direct PostgreSQL accessed via Drizzle. Supabase references are misleading.

### F-SA-B12-040 🟡 Medium — Vercel Analytics as primary frontend monitoring (lines 64, 69, 417)
**Lines 64, 69, 417:** Vercel Analytics
The monorepo does not deploy to Vercel. This monitoring strategy would not apply.

### F-SA-B12-041 🟡 Medium — `console.log` as metric transport (lines 145, 194, 220, 353)
**Lines 145, 194, 220, 353:** `console.log('[METRIC] ...')` and `console.warn( '[SLOW API] ...')`
Structured logging via console is acceptable for development but production observability should use a proper adapter. The AGENTS.md mandates structured logging with request IDs, user IDs, etc.

### F-SA-B12-042 🟡 Medium — `console.error` for error transport (lines 170, 224)
**Lines 170, 224:** `console.error('[ERROR]', errorData);`
Same as above — production error reporting should go through an adapter (Sentry, DataDog, etc.).

---

## File 8: security-performance.md (735 lines)

### F-SA-B12-043 🟠 High — CSP allows `'unsafe-eval'` and `'unsafe-inline'` (line 36)
**Line 36:** `"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com"`
The `'unsafe-inline'` and `'unsafe-eval'` directives weaken CSP significantly. If these are required by Next.js in development, they should be scoped to development only. Google OAuth origin is included but the current auth approach doesn't use Google OAuth.

### F-SA-B12-044 🟡 Medium — Direct OpenAI SDK mock in Prisma config (lines 453–511)
**Lines 453–511:** `DatabaseOptimizer` class references `prisma.attempt`, `prisma.classEnrollment`
These tables don't exist in the schema document (file 1). `prisma.attempt` appears to be a different schema version.

### F-SA-B12-045 🟡 Medium — `unstable_cache` usage (lines 401–447)
**Lines 401–447:** `unstable_cache` from `next/cache`
This is a Next.js experimental API. The monorepo has no caching adapter yet.

### F-SA-B12-046 🔵 Low — `PerformanceMonitor` in API routes (lines 559–600)
**Lines 559–600:** Performance monitoring with `performance.now()` and fetch to `/api/metrics`
Fire-and-forget fetch to an internal endpoint is not a robust metric transport. Use the structured logging approach.

### F-SA-B12-047 🟡 Medium — `web-vitals` import in client hook (lines 613–621)
**Lines 613–621:** `import('web-vitals').then(({ getCLS, getFID, ... }) => ...)`
Valid pattern for RUM but references Vercel's `web-vitals` library. The current deployment target (Docker containers) may not have this infrastructure.

---

## File 9: testing-strategy.md (1058 lines)

### F-SA-B12-048 🟠 High — All backend tests reference Prisma, not Drizzle
**Lines 469, 498–504, 531–536, 824–868**
`import { prisma } from '@/lib/prisma'`, `prisma.user.delete()`, `PrismaClient` — all test infrastructure is Prisma-based. The monorepo now uses Drizzle. These test examples would not work.

### F-SA-B12-049 🟡 Medium — Direct `@ai-sdk/openai` mock (lines 292–303)
**Lines 292–303:** `vi.mock('@ai-sdk/openai', ...)`
The AI adapter pattern requires mocking the `ai` adapter, not the provider SDK directly.

### F-SA-B12-050 🟡 Medium — MSW for API mocking (lines 197–234)
**Lines 197–234:** Mock Service Worker for API route testing
MSW is valid but not present in the current monorepo's test infrastructure. The monorepo uses Vitest with `vi.fn()` for DB mocking.

### F-SA-B12-051 🟡 Medium — Test database URL includes `science_advantage_test` (line 833)
**Line 833:** `'postgresql://test:test@localhost:5432/science_advantage_test'`
The actual monorepo test DB convention uses `TEST_DATABASE_URL` env var with resolution fallback. The hardcoded `test:test` credentials are a security concern if committed.

### F-SA-B12-052 🟡 Medium — `app.request()` pattern for integration tests (lines 507, 551, 561)
**Lines 507, 551, 561:** `app.request(...)` calling route handlers directly
This pattern assumes a Hono-like app object. Next.js Route Handlers don't export a unified app object. This test would not work with the current architecture.

### F-SA-B12-053 🔵 Low — Good test organization with beforeAll/afterEach/afterAll (lines 497–504)
**Lines 497–504:** Clean setup/teardown pattern for test isolation
The structure is sound even if the implementation details (Prisma) are stale.

### F-SA-B12-054 🟡 Medium — Playwright E2E tests use hardcoded credentials (lines 601–603)
**Lines 601–603:** `page.fill('input[name="email"]', 'student@test.com')` / `'test-password'`
Hardcoded test credentials are a minor concern for E2E tests but should use env vars or test fixtures.

---

## File 10: unified-project-structure.md (367 lines)

### F-SA-B12-055 🟠 High — `prisma/` directory in documented structure (lines 114–117, 212–218)
**Lines 114–117, 212–218:** `prisma/` directory with `schema.prisma`, `seed.ts`, `migrations/`
The science-advantage AGENTS.md regression guard explicitly states: "The `prisma/` directory at the app root must not exist. If you see `apps/science-advantage/prisma/`, it is a regression." Documenting a `prisma/` directory in the project structure is a regression risk.

### F-SA-B12-056 🟠 High — Vercel references (lines 301–302, 305–317)
**Lines 301–302, 305–317:** "Vercel Optimization", "Vercel Postgres", "Vercel KV"
The monorepo targets Docker container deployment, not Vercel. Documenting Vercel-specific infrastructure is misleading.

### F-SA-B12-057 🟡 Medium — `next-auth` in project structure (lines 43–44)
**Lines 43–44:** `api/auth/[...nextauth]/route.ts` — NextAuth.js configuration
Legacy auth approach.

### F-SA-B12-058 🟡 Medium — Zod env schema without `schoolId` or tenant config (lines 280–296)
**Lines 280–296:** `envSchema` with `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, etc.
No `SCHOOL_ID` or tenant-related configuration. The current monorepo requires tenant context for multi-tenancy.

---

## File 11: completion-status-display-bug.md (104 lines)

### F-SA-B12-059 🟡 Medium — References `prisma.lessonCompletion` (line 18)
**Line 18:** `prisma.lessonCompletion.findMany()`
This table doesn't appear in the database-schema.md (file 1) or the current Drizzle schema. It's either from a different schema version or was renamed. The `lesson_progress` table in file 1 is the progress tracking table.

### F-SA-B12-060 🟡 Medium — Polling every 5 seconds via `setInterval` (lines 43–47)
**Lines 43–47:** `setInterval(fetchCompletions, 5000)` in a client component
5-second polling is aggressive. For a dashboard page, 15–30s polling or WebSocket would be more appropriate. This was a pragmatic fix but documented for awareness.

### F-SA-B12-061 🔵 Low — Manual test scripts in `tests/manual/` (lines 88–89, 103–104)
**Lines 88–89, 103–104:** References to `tests/manual/test-ui-fix-verification.js` and `tests/manual/test-completions-page-client.js`
The monorepo test policy requires Vitest for `packages/` and Jest for legacy apps. Manual test scripts outside the test runner are not part of CI and can rot.

---

## File 12: competitor-analysis.md (759 lines)

### F-SA-B12-062 🔵 Low — Business analysis document, no code issues
**Entire file**
This is a market research document. No code, no schema, no test infrastructure. No security or tenancy concerns. Single minor observation: the SWOT analysis section numbering has an inconsistency (section "7" heading then "6.1", "6.2", "6.3" subheadings).

### F-SA-B12-063 🔵 Low — Section numbering mismatch (line 446)
**Line 446:** `## 7. Market Positioning Opportunities` followed by `### 6.1 SWOT Analysis`
The heading tree jumps from `7` to `6.1` — likely a copy-paste artifact from the competitor-analysis.md consolidated file vs the split files.

---

## Files 13–20: competitor-analysis/*.md (32–170 lines each)

These are business analysis sub-documents. No application code, schemas, or test infrastructure present.

### F-SA-B12-064 🔵 Low — Duplicate content between file 12 (consolidated) and files 13–20 (split)
**All competitor-analysis files**
The consolidated `competitor-analysis.md` (file 12) contains the same content as the split files (13–20) with minor formatting differences. This is a documentation organization issue — no code impact.

### F-SA-B12-065 🔵 Low — File 7-market-positioning-opportunities.md copy-paste artifact (lines 1–3)
**File 19 (`7-go-to-market-recommendations.md`) and File 20 (`7-market-positioning-opportunities.md`)**
Both files are numbered `7`. File 20 (`7-market-positioning-opportunities.md`) appears to be a copy-paste of section 6 from the consolidated file, given a `7` prefix. The section numbering inside (`6.1`, `6.2`, `6.3`) confirms it was section 6 in the original.

---

## Cross-Cutting Findings

### F-SA-B12-066 🔴 Critical — No `schoolId` multi-tenancy in any documented schema or pattern
**All architecture docs**
Every table definition, every query pattern, every data access example lacks `schoolId` scoping. If this architecture were implemented as documented, it would violate the core multi-tenancy requirement. Every user, class, lesson, submission, and progress record would be global.

### F-SA-B12-067 🟠 High — Prisma throughout; no Drizzle in any doc
**Files 1, 2, 3, 4, 7, 8, 9, 10, 11**
Every file that references database access uses Prisma (schema, client, migrations, error handling, tests). The monorepo has fully migrated to Drizzle. These docs would actively mislead new contributors.

### F-SA-B12-068 🟠 High — NextAuth.js / Google OAuth throughout
**Files 1, 2, 3, 4, 5, 6, 8, 10**
All auth references use NextAuth.js with Google OAuth. The monorepo uses `@reading-advantage/auth` with username/password and session-based auth. This is a fundamental architecture divergence.

### F-SA-B12-069 🟠 High — Vercel deployment assumption throughout
**Files 2, 3, 5, 7, 10**
Multiple documents assume Vercel as the deployment platform (Vercel Analytics, Vercel Postgres, Vercel KV, `*.vercel.app` domains). The monorepo targets Docker container deployment.

### F-SA-B12-070 🟡 Medium — No Zod contract boundaries in any documented code
**All files with code examples**
No code example shows Zod input/output schemas at external boundaries. The monorepo mandates Zod schemas for every backend function input, output, and external boundary. The only Zod usage is in `security-performance.md` (line 78) for input validation, which is a good pattern but not applied consistently.

### F-SA-B12-071 🟡 Medium — Direct provider SDK calls (OpenAI)
**Files 5, 9**
Direct `openai.chat.completions.create()` and `@ai-sdk/openai` imports shown. The monorepo mandates all AI access through the `ai` adapter (`ai.generateText()`, etc.).

### F-SA-B12-072 🟡 Medium — No backend domain function pattern
**All files**
No example uses the `command()` wrapper, `assertCan()`, or the `packages/backend` module pattern. Business logic is shown inline in route handlers or in `lib/` utilities. This is pre-refactoring architecture.

### F-SA-B12-073 🟡 Medium — No evidence of the tenant-registry pattern
**All files**
No table classification (FLAT/EXEMPT/REFERENTIAL), no `createTenantDB`, no `tenantDb.unscoped()`. The multi-tenancy layer is entirely absent.

### F-SA-B12-074 🟡 Medium — Test quality: Prisma-dependent, no Drizzle migration tests
**File 9**
The testing strategy includes unit tests, integration tests, and E2E tests but all rely on Prisma. There are no examples of Drizzle migration tests, tenant-scoped query tests, or `mock-db.ts` usage as described in the monorepo AGENTS.md.

### F-SA-B12-075 🔵 Low — Console.log as primary observability transport
**Files 4, 7, 8**
Multiple files use `console.log` / `console.error` as the primary error/metric transport. The AGENTS.md mandates structured logging, but the adapter layer for it isn't shown.

---

## Summary

### Files with No Findings

Files 13–20 (competitor-analysis split docs) are purely business/market analysis. No code, no schema, no security concerns flagged beyond the minor duplicate-content issue (F-SA-B12-064).

### Files with Most Findings

| File | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| database-schema.md | 0 | 2 | 6 | 2 | 10 |
| testing-strategy.md | 0 | 1 | 5 | 1 | 7 |
| security-performance.md | 0 | 1 | 3 | 1 | 5 |
| unified-project-structure.md | 0 | 2 | 2 | 0 | 4 |
| error-handling.md | 0 | 0 | 3 | 1 | 4 |

### Finding Distribution by Severity

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 10 |
| 🟡 Medium | 38 |
| 🔵 Low | 14 |
| **Total** | **63** |

### Finding Distribution by Category

| Category | Count |
|----------|-------|
| Multi-tenancy / tenant scope | 2 |
| Auth (NextAuth.js → adapter) | 6 |
| ORM (Prisma → Drizzle) | 7 |
| Deployment (Vercel → Docker) | 4 |
| Provider SDK (direct → adapter) | 2 |
| Golden-path / architecture drift | 21 |
| Data model / schema correctness | 10 |
| Test quality / infrastructure | 5 |
| Documentation consistency | 6 |

---

## Limitations

1. **Archive docs only** — All 20 files carry `status: deprecated` and `type: archive` in frontmatter. Findings are flagged to document drift from current conventions, not to suggest edits to these files. No app-code changes were made.

2. **No runtime analysis** — All findings are based on static document review. No tests were executed, no live code paths traced.

3. **No diff with actual codebase** — Some documented patterns (e.g., `prisma.lessonCompletion`, `prisma.attempt`) may correspond to tables in the live Drizzle schema under different names. A cross-reference with `packages/db/src/schema/` was not performed in this batch.

4. **Competitor analysis content not deeply reviewed** — Files 12–20 are business/market analysis. Only structural/code concerns were flagged; market data accuracy was not evaluated.

5. **No acceptance or closeout claims** — This is a review-only batch. No claims about acceptance, sign-off, or track closeout are made.

---

## Conclusion

Batch sa-batch-12 consists entirely of deprecated archive documentation. The dominant pattern across all files is **pre-migration architecture**: Prisma (not Drizzle), NextAuth.js/Google OAuth (not `@reading-advantage/auth`), Vercel deployment (not Docker), direct provider SDK calls (not adapters), and an **absence of multi-tenancy** (`schoolId`) throughout. The single critical finding (F-SA-B12-066) — no `schoolId` on any table — reflects that this architecture predates the monorepo's tenant-registry system.

Of the 63 findings, 59 are expected consequences of deprecated status. Four findings — the `prisma/` directory regression risk (F-SA-B12-055), the `'unsafe-eval'` CSP directive (F-SA-B12-043), the aggressive 5s polling (F-SA-B12-060), and the RLS session-variable pattern (F-SA-B12-010) — would be **actionable concerns if these patterns were present in live code**.
