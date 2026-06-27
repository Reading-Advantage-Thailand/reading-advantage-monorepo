# Findings: Science Advantage Full Review (Deduplicated)

> **Track:** `science_advantage_review_20260626`
> **Source:** 37 batch reports under `line-review/` (922 raw `F-SA-B##-###` IDs)
> **Status:** Findings inventory only. **No remediation was performed.** No claim is made that any defect was fixed. Acceptance/closeout PENDING.

This document deduplicates the per-batch findings into themed entries, **separates runtime/code findings from stale-documentation/planning findings**, and routes every entry back to its source batch ID(s) for evidence. Severities are as reported by the originating batches.

---

# PART I — RUNTIME / CODE FINDINGS (actionable, live code)

## CR — Critical (live code)

### CR-01: Cross-tenant gamification mutation — no authz, no tenant scope
- **Severity:** Critical / High. **Source:** sa-batch-22 (F-SA-B22-001, -003, -019, -020, -061, -062).
- `awardXp` and `updateStreakForProfile` fetch/update a `gamificationProfiles` row (FLAT, has `schoolId`) by raw `profileId` using the raw `db` client, with **no authorization check and no tenant scoping**. Any caller can manipulate any profile's XP/streak across schools.

### CR-02: Direct Sentry SDK import in recommendations route
- **Severity:** Critical. **Source:** sa-batch-02 (F-SA-B02-084).
- `app/api/ai/recommendations/route.ts` imports `* as Sentry from '@sentry/nextjs'` and calls `Sentry.captureException` directly, bypassing the observability adapter (provider-neutrality violation).

### CR-03: Analytics route uses redirect-based auth instead of JSON 401
- **Severity:** Critical. **Source:** sa-batch-04 (F-SA-B04-002).
- `students/[studentId]/classes/[classId]/analytics/route.ts` uses `requireAuth()` which redirects; API consumers receive an HTML redirect instead of JSON 401.

### CR-04: Tenant-isolation tests are a no-op (fixtures omit `schoolId`)
- **Severity:** Critical / High. **Source:** sa-batch-04 (F-SA-B04-001, -004); corroborated sa-batch-25 (F-SA-B25-001), sa-batch-32 (F-SA-B32-004), sa-batch-35 (F-SA-B35-006).
- Analytics test `seedScenario` and several seeders insert users/rows without `schoolId`. With `users.schoolId` null, `createTenantDB` injects a filter that matches nothing/everything as a no-op, so tenant-isolation tests give **false confidence** and may also fail at runtime with NOT NULL violations.

### CR-05: Missing server-side auth on teacher analytics deep page
- **Severity:** Critical. **Source:** sa-batch-01 (F-SA-B01-001); related sa-batch-02 (F-SA-B02-001/026).
- `app/(dashboard)/teacher/.../lessons/[lessonId]/page.tsx` and two analytics pages render with no `requireRole()`/`requireAuth()`; the `(dashboard)` group has no protective layout. Defense-in-depth relies solely on the API.

### CR-06: Route/schema contract mismatches
- **Severity:** Critical (test/contract). **Source:** sa-batch-05 (F-SA-B05-001, -002).
- (a) `"me"` student alias rejected by a `z.string().uuid()` schema → route 400 while test expects 200. (b) `limit` test expects clamping to max but `masteryQuerySchema.max(100)` strictly rejects → 400 vs expected 200. Indicates either tests or contracts are wrong; both surfaces ship.

## HI — High (live code)

### HI-01: `lib/services/**` lack auth + tenant scoping
- **Source:** sa-batch-24 (F-SA-B24-036, -037, -044, -045, -051, -056, -057).
- `get-class-detail.ts`, `get-student-classes.ts`, `mastery-worker.ts` take bare IDs, no user context, no `assertCan()`, raw `db`, no `schoolId` filter — cross-school read/trigger by guessing IDs.

### HI-02: `getClassDetailWithCurriculum` bypasses TenantDB
- **Source:** sa-batch-02 (F-SA-B02-003/020/023), sa-batch-24 (F-SA-B24-036/037).
- Used by analytics/class/roster pages; FLAT tables queried with raw `db`, no `schoolId`. Page-level ownership checks mitigate today but the function has no guard if reused.

### HI-03: `lib/gamification/**` and `badges.ts` use raw `db`
- **Source:** sa-batch-21 (F-SA-B21-056, -057), sa-batch-22 (F-SA-B22-016/067 test duplication).

### HI-04: Redis platform layer is a permanent stub
- **Source:** sa-batch-23 (F-SA-B23-015, -016).
- Real Upstash/node-redis clients return `createInMemoryClient()`; in-memory fallback creates a new store per call (not a singleton). Cache effectively non-functional in production; data lost on restart.

### HI-05: Grade-4 seed data violates seeder Zod contract
- **Source:** sa-batch-33 (F-SA-B33-001, -002).
- Grade-4 question banks don't match the seeder's contract; grade-4 lesson files are bare `LessonContent` not `LessonsFile`. `pnpm seed --grade=4` would hard-fail.

### HI-06: Seed scripts unsafe by default
- **Source:** sa-batch-32 (F-SA-B32-003), sa-batch-35 (F-SA-B35-001, -006).
- `create-test-users.ts` seeds privileged accounts with a hardcoded weak password and no production guard; seed scripts run against any `DATABASE_URL` with no environment guard; demo users seeded without `schoolId`.

### HI-07: Weak AI hash-secret fallback
- **Source:** sa-batch-21 (F-SA-B21-034).
- `AI_RECOMMENDER_HASH_SECRET` falls back to hardcoded `'science-advantage'`, bypassing the `.refine` length check → predictable, non-secret hash.

### HI-08: Vercel build invokes Prisma in a Drizzle-only app
- **Source:** sa-batch-36 (F-SA-B36-001).

### HI-09: Test contradicts route/permission table
- **Source:** sa-batch-36 (F-SA-B36-002) — `student-classes.test.ts` 403 case contradicts the route and the permission table.

### HI-10: Business logic embedded in components; systemic missing JSDoc
- **Source:** sa-batch-08 (F-SA-B08-001, -002), sa-batch-07.
- `quiz-player.tsx` (689 lines) mixes data-fetch, hashing, scoring, orchestration; JSDoc systematically absent on exported components.

### HI-11: Scripts content/schema divergence
- **Source:** sa-batch-32 (F-SA-B32-001), sa-batch-35 (F-SA-B35-002/003/008/009).
- Divergent duplicate `LessonContent` schema producing incompatible output; `maxScore` hardcoded; timing always 0; swallowed seeding errors; idempotency key ≠ unique constraint.

## ME — Medium (live code, representative)

- **ME-01** `update-mastery/route.ts` maps unknown errors to 202/QUEUED; fragile body cloning; redundant `getCurrentSession()` in catch — sa-batch-03 (F-SA-B03-001, -002, -014).
- **ME-02** `get-class-analytics-overview.ts` duplicated/likely-wrong `averageScorePercentage` — sa-batch-03 (F-SA-B03-004).
- **ME-03** `create-assignment.ts` does not verify lesson ∈ class curriculum — sa-batch-03 (F-SA-B03-007).
- **ME-04** `student-classes` route bypasses domain layer — sa-batch-04 (F-SA-B04-003).
- **ME-05** Client API fetches lack `classId` → potential cross-class IDOR — sa-batch-09 (F-SA-B09-012).
- **ME-06** No Zod validation at client API boundary in 3 components — sa-batch-10.
- **ME-07** `client-logger` gags all output in production → dead error logging — sa-batch-10 (F-SA-B10-022).
- **ME-08** Unbounded in-memory intervention cache (memory leak) — sa-batch-22 (F-SA-B22-031).
- **ME-09** Env schema: critical vars optional, not required at boot — sa-batch-21 (F-SA-B21-029).
- **ME-10** Backend `mastery.ts` uses TS types not Zod; missing authz — sa-batch-25 (F-SA-B25-004, -005).
- **ME-11** `lib/utils` clipboard imports a React component module — sa-batch-25 (F-SA-B25-008).
- **ME-12** Badge tenancy gaps (cluster) — sa-batch-21 (F-SA-B21-045–051).
- **ME-13** `convert-md-to-structured.ts` overwrites input in place, no backup — sa-batch-32 (F-SA-B32-002).
- **ME-14** Stale-closure hazard in mastery-profile polling — sa-batch-08.
- **ME-15** Full-page reload to refetch quiz (SPA anti-pattern) — sa-batch-08.
- **ME-16** `tsconfig.json` excludes many test files from type-check — sa-batch-36 (F-SA-B36-003).

## LO — Low / Info (live code, representative)
- Silent catches without logging — sa-batch-02 (F-SA-B02-014), sa-batch-09 (F-SA-B09-002), sa-batch-35 (F-SA-B35-008).
- `as unknown as UserContext` cast — sa-batch-02 (F-SA-B02-029).
- Emoji in production UI — sa-batch-02 (F-SA-B02-038).
- `index`-as-React-key — sa-batch-07 (F-SA-B07-008), sa-batch-08.
- Fragile error-message string matching for 404/403 — sa-batch-03 (F-SA-B03-006), sa-batch-05.
- `waitForTimeout` flaky e2e waits — sa-batch-02 (F-SA-B02-032/033).
- `dev-interventions.ts` raw `db`, no schoolId (dev CLI) — sa-batch-32.
- Deprecated `document.execCommand('copy')` — sa-batch-25 (F-SA-B25-009).
- Dead code: unused `seedAuditEvents` helper — sa-batch-02 (F-SA-B02-046).

---

# PART II — STALE DOCUMENTATION / PLANNING FINDINGS (mislead-risk, not running code)

> These do not affect running application correctness. They are surfaced because agents/contributors can discover and trust them. Many archived files carry `status: deprecated` frontmatter.

## DOC-01: Prisma → Drizzle stale references (largest doc cluster)
- **Severity:** High (in active/authority docs) to Low (historical). **Source:** sa-batch-00 (F-SA-B00-013/014/016/019/020), sa-batch-12 (F-SA-B12 cluster), sa-batch-17 (F-SA-B17-001/012), sa-batch-26, sa-batch-27 (F-SA-B27-007/008/018/019/025/026/027/030/032).
- `GEMINI.md`, `README.md`, `tech-stack.md`, issue templates, archived architecture docs and track plans still reference `prisma/schema.prisma`, `npx prisma generate`, `prisma-zod-generator`.

## DOC-02: Auth-model drift (Google OAuth / NextAuth)
- **Severity:** High (where in authority/active spec) to Info (archive). **Source:** sa-batch-00 (F-SA-B00-013/015), sa-batch-26 (F-SA-B26-023/024/025), sa-batch-27 (F-SA-B27-009/011), sa-batch-29 (F-SA-B29-022).
- Docs/specs assert Google-OAuth-only / NextAuth; app uses username/password via `@reading-advantage/auth`. **Some checked acceptance criteria are not verifiably true** (F-SA-B26-025).

## DOC-03: `npm` → `pnpm` tool mismatch
- **Source:** sa-batch-00 (F-SA-B00-004/017), sa-batch-17.

## DOC-04: No multi-tenancy in planning docs
- **Source:** sa-batch-12 (F-SA-B12-066), sa-batch-15 (F-SA-B15-011), sa-batch-27 (F-SA-B27-024), sa-batch-30 (F-SA-B30-014), sa-batch-31 (F-SA-B31-028).

## DOC-05: Placeholder/boilerplate track specs & plans
- **Severity:** High. **Source:** sa-batch-29 (F-SA-B29-002/003/012), sa-batch-30 (F-SA-B30-009/011), sa-batch-31 (F-SA-B31-025/026).
- `redis_actual_integration` and `teacher_dashboard_surfaces` pair one-line specs with generic skeleton plans; weakest + highest-risk tracks (shared infra + cross-tenant teacher data).

## DOC-06: Legacy BMAD process references
- **Source:** sa-batch-00 (F-SA-B00-002), sa-batch-17 (F-SA-B17-027).

## DOC-07: Config / supply-chain hygiene
- **Source:** sa-batch-00 — `.opencode/mcp.json` `@latest`+`-y` (F-SA-B00-010, medium), `.opencode/opencode.json` trailing comma (F-SA-B00-011), `.gitignore` `\n.tmp/` literal bug (F-SA-B00-009).

## DOC-08: Microservices/API-gateway assumptions conflict with monorepo golden path
- **Source:** sa-batch-14 (PRD), sa-batch-15. Mitigated by `status: deprecated`.

## DOC-09: Stale top-level test summary
- **Source:** sa-batch-01 (F-SA-B01-002) — `TEST_SUMMARY.md` documents Prisma test infra, wrong port 5433.

## DOC-10: Measure framework safety note
- **Source:** sa-batch-28 (F-SA-B28-011) — "CRITICAL UNATTENDED RULES" auto-approve any "Proceed?" prompt; no guard against destructive confirmations.

---

# PART III — POSITIVE / "NO FINDING" CONFIRMATIONS (selected)
- DSAR export feature: exemplary tests + tenant isolation (sa-batch-02 files 13–15).
- Grade-4 question content/keys scientifically accurate on spot-check (sa-batch-33 F-SA-B33-009; sa-batch-35).
- Integration harness uses isolated `_test` DB + Drizzle migrate (sa-batch-36).
- AI adapter usage correct (sa-batch-19).
- Anti-pattern checks A2/A6 not triggered (sa-batch-01).

---

*Findings inventory complete. No remediation performed. Each entry routes to its source batch ID. Acceptance/closeout PENDING.*
