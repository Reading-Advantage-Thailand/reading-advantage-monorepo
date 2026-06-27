# Cross-App Workflows — Deduplicated Findings

> **Track:** `cross_app_workflows_review_20260626`
> **Date:** 2026-06-27
> **Type:** Review-only synthesis. **No remediation performed.** Every finding cites at least one child review artifact and concrete finding IDs/counts.

Findings are organized by cross-app concern area. Each entry deduplicates symptoms from multiple app-level reviews into a shared root cause.

---

## CA-001: Auth/session adoption is fractured across apps (Critical)

**Root cause:** The shared `@reading-advantage/auth` and `@reading-advantage/auth-client` packages exist and work correctly (proven by science-advantage golden path), but app-level adoption is incomplete or broken in 6 of 7 apps.

**Evidence:**
- **Shared foundation:** F-SF-008 — Authorization logic scattered across API and domain; `packages/api/src/trpc.ts` hardcodes ADMIN/SYSTEM; domain functions contain inline `role ===` checks.
- **Reading Advantage:** C-RA-CRIT-01 (unauthenticated `submitRating`), C-RA-CRIT-02 (session-token fabrication), C-RA-CRIT-04 (unauthenticated `refreshAIInsightsAutomated`), C-RA-CRIT-05 (missing role check on admin pages), H-03 (18+ unauthenticated sensitive routes). 0/209 routes use `assertCan`.
- **Primary Advantage:** 72+ API routes and server actions lack authentication. 48 database queries lack tenant/schoolId scoping. `primary_advantage_full_20260626/executive-summary.md` §Security, §Fork-divergence.
- **Sales Advantage:** C3 — tRPC `roleSchema` enum lacks SALES_REP/SALES_ADMIN → `auth=null` → entire sales tRPC surface potentially unauthenticated at runtime (F-SALES-B00-030). C1 — Missing route/domain authorization on non-chat AI/write paths (F-SALES-B00-023, F-SALES-B00-027, F-SALES-B05-001 IDOR).
- **Marketing App:** LR-marketing-app-003-001/003 (campaigns unauthenticated), LR-004-002 (all 4 `/api/video/*` routes have no auth), LR-marketing-app-003-005 (API keys returned to any unauthenticated caller).
- **Advantage Games:** D-03 — Mock-only API layer; completion routes are `force-static` with no persistence, auth, or tenant scoping.

**Deduplication:** The F-SF-008 finding (authorization not centralized) from the shared foundation review is the root cause. Science Advantage demonstrates the fix works (thin server pages with `requireRole()`, domain function `assertCan()`). Reading and Primary need the same migration; Sales needs a role-enum fix; Marketing needs auth added; Games need a real server API.

---

## CA-002: Tenant isolation is untrustworthy across the monorepo (Critical)

**Root cause:** Tenant registry drift (F-SF-001: 9 unclassified tables), null-tenant TenantDB (F-SF-004), and vacuous referential-scope test (F-SF-005) mean tenant guarantees cannot be trusted in any app.

**Evidence:**
- **Shared foundation:** F-SF-001 — 9 exported Drizzle tables unclassified in tenant registry (`verificationTokens`, `userRoles`, `roles`, `articleActivityLogs`, `sentencsAndWordsForFlashcards`, `cardReviews`, `clozeTestGames`, `schoolAdmins`, `leaderboards`). Tenant-coverage CI gate red.
- **Shared foundation:** F-SF-004 — API context creates tenant-branded DB with `schoolId: null`; public procedures can pass a scoped-looking DB to domain code.
- **Shared foundation:** F-SF-005 — Referential-scoping static check is vacuous (returns false unconditionally).
- **Reading Advantage:** 0/209 routes use TenantDB. C-007 — Classroom controller destructive operations have zero ownership/tenant verification.
- **Primary Advantage:** 48+ database queries lack tenant/schoolId scoping. `primary_advantage_full_20260626/executive-summary.md` §Tenant isolation.
- **Science Advantage:** CR-01 — Cross-tenant gamification mutation (awardXp/updateStreakForProfile: no auth, no tenant scope, raw db by profileId). HI-01 — `lib/services/**` lack auth + tenant scoping. CR-04 — Vacuous tenant-isolation tests (fixtures omit schoolId).
- **CodeCamp Advantage:** CR-1 — Domain functions access REFERENTIAL tables through TenantDB without `unscoped()` → `TenantScopeError` at runtime (63/90 domain tests fail, confirmed against compiled build). CR-2 — Tenant-scope enforcement untestable (false-green mock).
- **Sales Advantage:** C2 — Cross-tenant exposure: admin reporting reads all reps across schools via `salesRawDb()` (F-SALES-B05-002); IDOR on attempt writes (F-SALES-B05-001).
- **Advantage Games:** D-04 — Leaderboard tables lack tenant key (xpLogs/gameRankings no schoolId; leaderboards unregistered → tenant-coverage CI red).

**Deduplication:** F-SF-001 is the single shared root cause: until all 9 tables are classified and the registry gate turns green, no app's tenant isolation can be fully trusted. The app-level symptoms (unscoped queries, vacuous tests, IDORs) are downstream effects of the registry being stale.

---

## CA-003: API boundary contracts are inconsistent and untested (Critical)

**Root cause:** No shared contract SSOT. Routers redefine schemas; error mapping uses string comparison; `@reading-advantage/types` has zero tests.

**Evidence:**
- **Shared foundation:** F-SF-007 — API routers duplicate contracts and map errors by strings (`.message ===`, `.startsWith()`, `.includes("not found")`). F-SF-017 — `@reading-advantage/types` has no test script.
- **Shared foundation:** F-SF-002 — API/type contract drift: sales `audioStorageKey` nullability and user role schemas disagree between `packages/api` and `packages/types`.
- **Reading Advantage:** C-001/H-09 — Inconsistent error response contracts (6+ different shapes across 209 routes). C-002/H-09 — HTTP status codes embedded in 200 OK response bodies. C-004/H-02 — No input validation on 180+ controllers. ~1/209 endpoints have Zod validation.
- **Primary Advantage:** 66 Critical findings including route/schema mismatches; flashcard API routes access non-existent Drizzle columns.
- **Science Advantage:** CR-06 — Route/schema contract mismatches: "me" alias rejected by uuid(), limit clamping conflict. ME-04 — `student-classes` route bypasses domain layer.
- **Sales Advantage:** C9 — Unvalidated boundaries (F-SALES-B00-022, F-SALES-B01-017/-019, F-SALES-B05-005). C13 — Schema/contract nullability drift for `audioStorageKey` (F-SALES-B04-001, F-SALES-B05-006).
- **Marketing App:** LR-004-001 — `generate-script` casts unvalidated `request.json()` into AI prompt; LR-marketing-app-003-004/-006 (campaign/settings PATCH no Zod).
- **Advantage Games:** D-01 — No shared completion contract; 5+ `/complete` payload shapes; D-02 — client-trusted XP, no validation.

**Deduplication:** F-SF-007 and F-SF-017 are the shared root causes. All apps that communicate with the shared API/router layer embed contract inconsistencies because there's no single Zod contract SSOT with tests.

---

## CA-004: Business logic leaks into transport layer (Critical)

**Root cause:** F-SF-003 (reports.teacherDashboard queries DB inside API router) is a pattern repeated in multiple apps.

**Evidence:**
- **Shared foundation:** F-SF-003 — `reports.teacherDashboard` imports Drizzle/schema and builds query inline in the tRPC router. F-SF-013 — Domain code leaks environment, logging, and HTTP concerns.
- **Reading Advantage:** 209 route handlers implement full business logic inline; 54 controllers are the business logic surface. No domain layer separation.
- **Science Advantage:** HI-10 — `quiz-player.tsx` (689 lines) mixes data-fetch, hashing, scoring, orchestration in a component. ME-04 — student-classes route bypasses domain layer.
- **CodeCamp Advantage:** H-2 — Synchronous LLM review inside webhook request path (AGENTS "Jobs and Workers" violation).
- **Sales Advantage:** F-SALES-B00-012 — Lesson-complete bypasses tRPC via one-off REST; F-SALES-B05-007 — Non-transactional multi-write in route.

---

## CA-005: AI adapter compliance is bypassed in 4+ apps (High)

**Root cause:** The `@reading-advantage/ai` package exists and works, but the barrel can pass through raw SDK (F-SALES-B03-010), and multiple apps use direct provider SDKs instead.

**Evidence:**
- **Shared foundation:** F-SF-021 — Legacy scripts use old `openai` v4 and direct `@google-cloud/storage`. F-SF-019 — `@reading-advantage/ai` has 13 pre-existing test failures.
- **Reading Advantage:** C-013 — Direct Google Cloud Translate SDK (provider lock-in). C-014 — Firebase Admin SDK remnant. PB-003 — AI-generated content lacks level/quality gate.
- **Primary Advantage:** Multiple direct provider SDK calls bypassing AGENTS.md adapters. `primary_advantage_full_20260626/executive-summary.md` §Medium-risk areas.
- **Sales Advantage:** C6 — AI barrel `index.ts` re-exports raw SDK functions/constructors; adapter is a pass-through, arch-guard can't see raw-SDK imports through it (F-SALES-B03-010, F-SALES-B03-005).
- **Marketing App:** LR-004-003 — Route handlers instantiate `createAIClient(...)` per request instead of using `ai.generateText()`.

**Deduplication:** F-SF-021 (legacy bypass) + the AI barrel leak (F-SALES-B03-010) are shared root causes. The barrel needs to stop re-exporting raw SDK functions; apps need to use `ai.generateText()` exclusively.

---

## CA-006: Storage adapter adoption is minimal (High)

**Root cause:** `@reading-advantage/storage` exists but is only adopted by science-advantage and sales-advantage. Reading and Primary use direct provider SDKs.

**Evidence:**
- **Shared foundation:** F-SF-022 — StorageClient interface missing `get()` download/read method. F-SF-021 — Legacy scripts use direct `@google-cloud/storage`.
- **Reading Advantage:** Content generation and file handling use direct Google Cloud Storage / Firebase Storage.
- **Primary Advantage:** Direct storage SDK calls; path traversal vulnerabilities in upload routes.
- **Science Advantage:** `packages/storage` used correctly.
- **Sales Advantage:** `packages/storage` used with `public:false`, user-keyed; FR-4 no-orphan invariant — positive.

---

## CA-007: Database migration governance is inconsistent (High)

**Root cause:** Missing migration sentinels (F-SF-006), Drizzle version drift (F-SF-014), and schema typos/contract drift across apps.

**Evidence:**
- **Shared foundation:** F-SF-006 — Missing sentinel probes for migrations 0022 and 0023. F-SF-014 — Drizzle ORM versions: db `^0.45.0`, domain `0.44.7`, auth/api `^0.44.0`. F-SF-025 — Table name typo `sentencsAndWordsForFlashcards`.
- **Primary Advantage:** Schema mismatch with shared Drizzle tables blocks flashcard API entirely. 
- **Science Advantage:** HI-05 — Grade-4 seed data violates seeder's Zod contract; `pnpm seed --grade=4` hard-fails. HI-08 — Vercel build invokes Prisma in Drizzle-only app.
- **CodeCamp Advantage:** F-CC-B07-034/038 — Uniqueness constraints backfilled in migration 0010 can halt deploy on duplicates.
- **Sales Advantage:** C13 — `audio_storage_key` NOT NULL in migration 0021 vs nullable schema; reconciled only by later 0023 (F-SALES-B04-001, F-SALES-B05-006).

---

## CA-008: Website claims are materially inaccurate vs product reality (High)

**Root cause:** Marketing website describes 9 products, only 4 have code directories. Launch dates are 6-18 months stale. Several product pages describe apps that don't exist.

**Evidence:**
- **www-reading-advantage:** LRF-001 — "Nine products" overstated; 4 apps have directories (Reading, Primary, Science, CodeCamp). LRF-002 — 6+ product pages claim "Launching/Coming in 2025." LRF-003 — "May 2026" datelines now past due. LRF-012 — Case studies are placeholder data under "Real Results." LRF-014 — Primary Advantage efficacy stats duplicated from Reading Advantage. LRF-013 — GPT-5 claimed for Primary Advantage (unverifiable).
- **Claims matrix:** 5 product pages (Math, STEM, Storytime, Tutor, Zhongwen) describe apps with no code directories. Multiple claims marked `[FAIL]` or `[NEEDS-PO]`.

---

## CA-009: Rate limiting is in-memory and not deployment-safe (High)

**Root cause:** Every app that implements rate limiting uses an in-memory `Map` (F-SF-010), which resets on process restart and doesn't coordinate across multiple instances.

**Evidence:**
- **Shared foundation:** F-SF-010 — `packages/auth/src/rate-limit.ts` uses in-memory Map. F-SF-011 — Cookie secure flag gated on NODE_ENV.
- **CodeCamp Advantage:** M-1 — In-memory rate limiter not multi-replica safe (F-CC-B00-002, F-CC-B04-023). Effective limit = 30 × instances.
- **Sales Advantage:** F-SALES-B01-025 — In-memory rate limiter non-durable across instances; limits multiplied on Cloud Run.
- **Pending track:** `rate_limiter_v2_20260603` (Postgres-backed) exists as a stub but is incomplete.

---

## CA-010: Test strategy is fragmented and provides false confidence (High)

**Root cause:** Test coverage varies from 0% (reading controllers/routes) to vacuous (science tenant tests, codecamp false-green mock) to testing the wrong thing (games e2e smoke only).

**Evidence:**
- **Shared foundation:** F-SF-017 — `@reading-advantage/types` has zero tests. F-SF-019 — `@reading-advantage/ai` has 13 pre-existing failures. F-SF-021 — Legacy scripts use `jest --passWithNoTests`. F-SF-005 — Vacuous referential-scope test.
- **Reading Advantage:** 0/54 controller tests, 0/209 route handler tests, 0 API contract tests, 0 auth flow tests. PB-010 — No product-level learning-outcome tests.
- **Primary Advantage:** No systematic test coverage.
- **Science Advantage:** CR-04 — Tenant-isolation tests are a no-op (fixtures omit schoolId). ME-16 — tsconfig excludes many test files from type-check.
- **CodeCamp Advantage:** CR-2 — Tenant-scope enforcement untestable (false-green mock). C-H-5 — Prod-smoke suites hit live production. C-H-7 — Phase-13 gate passes while documented decision is no-go.
- **Sales Advantage:** F-SALES-B04-002 — Router test mocks domain functions never exposed; audio path has no tRPC contract test. F-SALES-B05-017 — Differentiating audio/roleplay path largely untested.
- **Advantage Games:** C-13 — E2E smoke/screenshot only; no scoring assertions. C-15 — Canonical template won't compile.
- **Marketing App:** LR-marketing-app-001-002 — Tautological assertions. LR-marketing-app-002-003/004 — Stale "RED at HEAD" docblocks. LR-marketing-app-006-003 — Vitest `environment:"node"` vs DOM pages.

---

## CA-011: Observability is ad-hoc, unstructured, and bypasses adapters (Medium)

**Root cause:** No shared structured logging. Direct Sentry SDK imports bypass the observability adapter. console.log/error used in production across multiple apps.

**Evidence:**
- **Shared foundation:** F-SF-016 — Webhooks use unstructured production logging (console.* calls). F-SF-013 — Domain code leaks logging concerns.
- **Reading Advantage:** C-009/M-02 — `console.log` in production code across every controller batch.
- **Science Advantage:** CR-02 — Direct `@sentry/nextjs` import in AI route, bypassing observability adapter. ME-07 — `client-logger` gags all output in production.
- **Marketing App:** LR-marketing-app-003-008 — Login route uses `console.error`.
- **Sales Advantage:** F-SALES-B05-011 — Free-form `console.error` in evaluator fallback.

---

## CA-012: CodeCamp curriculum teaches security anti-patterns to interns (Medium)

**Root cause:** Interns are taught to build production code that violates AGENTS.md and current monorepo standards, and they are told they will contribute to the real app.

**Evidence:**
- **CodeCamp Advantage findings.md §2:** C-H-1 — Teaches bcrypt vs AGENTS Argon2id mandate. C-H-2 — Teaches AI SDK v4 APIs; app ships v5. C-H-3 — Auth middleware example trusts cookie presence, injects forgeable `x-user-id`. C-H-4 — Private-key/secret guidance puts RSA key + API key in `.env.local` with no Secret-Manager warning. C-H-11 — Wildcard CORS taught alongside cookie auth. Unescaped innerHTML interpolation taught as normal rendering. Dropped tenant scoping in getSession/updateProgress examples.

---

## CA-013: Advantage Games are not import-ready for Reading/Primary (High)

**Root cause:** Eleven import-contract gaps block embedding games into product apps.

**Evidence:**
- **Advantage Games findings.md §D:** D-01 — No shared completion contract (5+ payload shapes). D-02 — Client-trusted XP, no validation. D-03 — Mock non-persistent API. D-04 — Leaderboard tables unregistered, no schoolId → CI red. D-05 — No validated activity/game-type enum. D-06 — Host mutations lack Zod, trust cross-tenant lessonId. D-07 — English-only, hardcoded `/en/`. D-08 — Divergent content response keys. D-09 — Hardcoded SPA navigation. D-10 — Dead/missing integration guide. D-11 — Duplicated primitives, two competing builder skills.
- **26 games status:** All NOT-READY or AT-RISK. `game-readiness-matrix.md` in `advantage-games_20260626/`.

---

## Finding Count Summary

| Severity | Count |
|----------|------:|
| Critical | 4 (CA-001..CA-004) |
| High | 6 (CA-005..CA-010) |
| Medium | 3 (CA-011..CA-013) |
| **Total** | **13** |

These 13 synthesized findings consolidate ~3,089 app-level findings from 9 child reviews into deduplicated cross-app root causes.
