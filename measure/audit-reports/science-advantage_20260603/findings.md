# Science-Advantage AGENTS.md Audit — Findings

> **Audit target:** `apps/science-advantage/`
> **Audit date:** 2026-06-03
> **Protocol:** `measure/agents-md-audit-protocol.md` (v1.0 pilot)
> **Source partials:** `findings-partial-1.md`, `findings-partial-2-7.md`, `findings-partial-3-4.md`, `findings-partial-5.md`, `findings-partial-6-9.md`, `findings-partial-10-11.md`, `findings-partial-12-13.md`
> **Companion:** `checklist.md`, `migration-tracks.md`, `executive-summary.md`
> **Severity:** `Critical` | `High` | `Medium` | `Low` (per protocol §Severity Scheme)

## Headline reclassification

The 2026-05-26 one-off audit (row `audit_20260526` in `measure/tech-debt.md`) recorded "27 of 27 `route.ts` import `db` directly" as a Critical finding. The current re-audit **reclassifies** that as the **symptom** of a deeper **architectural root cause** and merges three Critical findings into one umbrella:

| New umbrella finding | F-305 (App does not use domain layer) — root cause |
|----------------------|-----------------------------------------------------|
| **Merged with**       | F-501 (no `schoolId` predicates) + F-502 (no `TenantDB`) — same root cause: the app bypassed the tenancy + permission infrastructure entirely |
| **Subsumes**          | F-203 (22 route.ts import `db`), F-208 (2 page.tsx import `db`), F-306 (page.tsx), F-307 (route.ts), F-405 (23 hand-rolled `role ===` checks), F-701 (5 spot-checked route.ts are fat), F-702 (26 of 27 routes hand-roll authz) — all are symptoms of "the app never adopted the domain layer" |
| **New tech-debt row** | `audit_20260603_domain_bypass` (Critical) in `measure/tech-debt.md` |

The reasoning: **F-203 / F-306 / F-307 / F-405 / F-701 / F-702 are not independent findings — they are six views of the same architectural gap**. F-305 is the positive form of the same gap ("domain layer is unused"). F-501 / F-502 are the tenancy view of the same gap (no `TenantDB` adoption). The fix track is one: get the app to import from `@reading-advantage/domain` (and use `TenantDB`). All seven findings collapse into Track 1 of `migration-tracks.md`.

---

## Severity rollup

| Severity | Unique findings | Notes |
|----------|----------------|-------|
| **Critical** | 7 | F-305 (umbrella, root), F-501, F-502, F-402, F-406, F-404/F-901 (counted once), F-1001, F-1003 |
| **High** | 8 | F-203, F-208, F-306, F-307, F-405, F-701, F-702 (all subsumed under F-305), F-601, F-1002, F-1204, F-1205 |
| **Medium** | 11 | F-101, F-205, F-206, F-303, F-403, F-501 (re-classified — see F-305 umbrella), F-502 (re-classified), F-504, F-602, F-902, F-903, F-904, F-905, F-1201, F-1207, F-1301, F-1306 |
| **Low** | 19 | F-102, F-201, F-202, F-204, F-207, F-401, F-407, F-603, F-604, F-703, F-704, F-705, F-906, F-1101, F-1102, F-1202, F-1203, F-1305 |
| **Total** | **45 finding IDs** (some subsumed/duplicated) / **~38 unique issues** | See per-section tables below for canonical IDs |

> When the same issue is filed under multiple section numbers (e.g. F-203 / F-208 / F-306 / F-307 / F-701 / F-702 are all "route.ts imports `db` directly" from different angles), the count above double-counts. The unique-issue count is ~38; the 12-track plan in `migration-tracks.md` consolidates further.

---

## Section 1 — Provider Neutrality (F-1xx)

### F-101: `lib/ai/` couples directly to provider SDKs without an interface boundary

- **Rule:** 1.1, 1.3, 1.6
- **Severity:** **Medium**
- **Evidence:**
  - `apps/science-advantage/lib/ai/recommendation-service.ts:2-4` — `import { generateObject } from 'ai'`, `import { createOpenAI } from '@ai-sdk/openai'`, `import { createGoogleGenerativeAI } from '@ai-sdk/google'`
  - `lib/ai/recommendation-service.ts:55-61` — provider client instantiated directly, gated only by env-var API-key presence
  - `lib/ai/recommendation-service.ts:63-76` — `resolveModel()` branches on model-id string prefix (`gemini` vs default), not on an injected `AIClient` reference
  - `lib/ai/image-generator.ts:1,34-42` — `experimental_generateImage` imported; `ensureApiKey()` mutates `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY` at call time
  - `lib/ai/image-generator.ts:106-115` — `generateWithModel()` passes raw model-id string to `experimental_generateImage`
  - `package.json:22,23,37` — `@ai-sdk/google`, `@ai-sdk/openai`, `ai` are direct app dependencies
  - **No `AIClient`/`AIClientProvider`/`LLMClient` interface exported anywhere in `lib/ai/`**
  - Positive reference: `lib/platform/redis-client.ts:3` (`RedisClient` interface), `lib/platform/cache-adapter.ts:1,14` (`RedisLike` + `CacheAdapter`), `lib/platform/rate-limit-store.ts:1` (`RateLimitStore`), `lib/platform/session-cleanup.ts:1` (`SessionStore`)
- **Impact:** Two provider SDKs plus the unified `ai` Vercel SDK are all imported by `lib/ai/`. Adding a third provider (Anthropic, Mistral, OpenRouter) requires editing `recommendation-service.ts` and `image-generator.ts`; tests must re-mock the SDK. The env-mutating pattern in `image-generator.ts:30,39` is fragile (concurrent requests with unset env vars would race). The lack of an interface also blocks the §3 backend-as-code migration: domain functions cannot accept an `AIClient` parameter and be unit-tested without a real network.
- **Suggested fix track:** **Track 5** (`ai_adapter_package_20260603`) — Shared `packages/ai` + `lib/ai/` refactor.

### F-102: No storage, email, or shared-AI adapter packages exist for science-advantage to consume

- **Rule:** 1.2, 1.4
- **Severity:** **Low** (latent)
- **Evidence:**
  - No `apps/science-advantage/lib/storage/` or `lib/email/` directory
  - No `packages/ai/` or `packages/storage/` directory in the monorepo (`ls packages/` returns `api auth auth-client config db domain reading-advantage-scripts types ui utils webhooks` — neither `ai` nor `storage` is present)
  - `apps/science-advantage/.env.example:34-36` declares `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_KEY_FILE` — env vars validated by no Zod schema, consumed by no code
  - `docs/archive/architecture/external-apis.md:62,195` describes GCS + SendGrid as "Integrated via @google-cloud/storage SDK" — corresponding source code does not exist
- **Impact:** When storage/email are added for real, the most direct path is `@google-cloud/storage` or `resend` in a route handler — the exact §1.1 violation F-101 documents. The missing `packages/ai` also means F-101's fix would have to land as an app-local adapter first and later be lifted to a shared package.
- **Suggested fix track:** **Track 6** (`storage_package_20260603`) — create `packages/storage` (and future `packages/email`); may combine with Track 5.

### F-101 + F-102 bundled into Track 5 + Track 6.

---

## Section 2 — Package Boundaries (F-2xx)

### F-201: App has direct deps on `drizzle-orm`, `zod`, `bcryptjs` (should be wrapped)

- **Rule:** 2.3
- **Severity:** **Low**
- **Evidence:** `apps/science-advantage/package.json:56,59,74` — `"bcryptjs": "^3.0.2"`, `"drizzle-orm": "^0.44.0"`, `"zod": "^3.25.76"`
- **Impact:** Any app that imports `drizzle-orm` directly bypasses the per-tenant wrapper and can write queries without `schoolId` predicates. Same risk for `zod` and `bcryptjs`.
- **Suggested fix track:** Resolves naturally as part of Track 1 (App→Domain) — once domain services own the logic, direct `drizzle-orm` and `zod` usage in routes disappears.

### F-202: App has direct deps on AI SDK packages

- **Rule:** 2.3, 1.3
- **Severity:** **Low**
- **Evidence:** `package.json:22,23,55` — `"@ai-sdk/google": "^2.0.36"`, `"@ai-sdk/openai": "^2.0.68"`, `"ai": "^5.0.95"`
- **Impact:** Tight coupling to Vercel AI SDK + OpenAI/Google providers. AGENTS.md §AI: "Application code must not depend directly on provider SDKs."
- **Suggested fix track:** Resolves as part of Track 5.

### F-203: 22 of 27 `app/**/route.ts` import `db` directly (F-001 retcon) — **SUBSUMED under F-305**

- **Rule:** 2.5
- **Severity:** **High** (originally; subsumed under F-305)
- **Evidence (22 files):**
  ```
  app/api/ai/recommendations/route.ts:6
  app/api/ai/update-mastery/route.ts:4
  app/api/classes/[classId]/analytics/overview/route.ts:2
  app/api/classes/[classId]/assignments/route.ts:2
  app/api/classes/[classId]/curriculum/route.ts:2
  app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts:2
  app/api/classes/[classId]/roster/route.ts:2
  app/api/classes/[classId]/route.ts:2
  app/api/classes/join/route.ts:2
  app/api/classes/route.ts:10
  app/api/lessons/[lessonSlug]/quiz/route.ts:2
  app/api/lessons/[lessonSlug]/route.ts:2
  app/api/students/me/gamification/route.ts:2
  app/api/students/[studentId]/achievements/route.ts:2
  app/api/students/[studentId]/assignments/route.ts:4
  app/api/students/[studentId]/classes/[classId]/analytics/route.ts:2
  app/api/students/[studentId]/gamification-profile/route.ts:2
  app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts:2
  app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts:2
  app/api/students/[studentId]/mastery-profile/route.ts:3
  app/api/teachers/classes/[classId]/intervention-alerts/route.ts:5
  app/api/teachers/dashboard/route.ts:2
  ```
  5 that are clean: 4 auth stubs + `app/api/student/classes/route.ts:42` (uses `lib/services/classes/get-student-classes.ts`)
- **Impact:** Auth/tenancy enforcement is per-route. No way to add audit logging, rate limiting, or shared error handling consistently.
- **Note:** The 2026-05-26 pilot F-001 row said "27 of 27 route.ts files import db". This audit supersedes that with the multiline-safe count of 22. The row in `measure/tech-debt.md` is being updated, not duplicated.

### F-204: Drizzle `sql\`\`` helper used in 2 routes + 1 service + 1 script

- **Rule:** 2.6
- **Severity:** **Low** (not strictly a §2.6 violation — Drizzle's typed `sql\`\`` is the Drizzle way)
- **Evidence:** `app/api/teachers/dashboard/route.ts:163`; `app/api/teachers/classes/[classId]/intervention-alerts/route.ts:166`; `lib/services/mastery/standard-mastery.ts:68`; `scripts/dev-interventions.ts:78`
- **Impact:** These fragments escape type-safe Drizzle column references. Not a §2.6 violation, but should be tracked alongside F-203.
- **Suggested fix track:** Folds into Track 1.

### F-205: Legacy `apps/science-advantage/prisma/` directory still present (56 files, no `schema.prisma`)

- **Rule:** 2.8
- **Severity:** **Medium**
- **Evidence:** `prisma/` contains `data/content/grade-4/` (20 JSON), `seed-data/` (24 JSON), `seed-functions/update-seed-files.ts`, `__tests__/` (empty). 56 files total. No `schema.prisma`; no `migrations/`.
- **Impact:** Confusing for new contributors.
- **Suggested fix track:** **Track 12** (housekeeping batch).

### F-206: `bcryptjs@3.0.2` direct dep in app (cross-references §4.4)

- **Rule:** 2.3, 4.4
- **Severity:** **Medium** (originally; subsumed under F-402/F-406 Critical)
- **Evidence:** `apps/science-advantage/package.json:56` — `"bcryptjs": "^3.0.2"` (production); `lib/auth/{server,session}.ts` use it for password hashing
- **Impact:** AGENTS.md §4.4 requires Argon2id in `packages/auth`.
- **Note:** F-206 is the §2.3 evidence; the §4.4 violation is F-402 (Critical) — same root cause. Both roll up into **Track 3** (Argon2id).

### F-207: 14 scripts call `db` directly instead of delegating to `lib/services/*` or `packages/domain`

- **Rule:** 2.7, 3.1
- **Severity:** **Low**
- **Evidence:** 14 scripts import `db` from `@reading-advantage/db`: `scripts/{dev-interventions,migrate-lesson-content,test-curriculum-endpoint,create-test-users,seed-demo-users,backfill-thai-titles,backfill-mastery}.ts` + `scripts/seed/{seed-demo-data,seed-curriculum-units,seed-lessons,seed-activity-data,seed-questions,seed-standards}.ts`
- **Impact:** Scripts duplicate domain logic. If the domain function changes (e.g. `recordStandardMastery` gains a new field), the backfill script must be updated separately.
- **Suggested fix track:** Folds into Track 1.

### F-208: 2 of 22 `page.tsx` files import `db` and run multi-step query orchestration — **SUBSUMED under F-305**

- **Rule:** 2.4
- **Severity:** **High** (originally; subsumed under F-305)
- **Evidence:**
  - `app/(teacher)/teacher/page.tsx:1-20` — imports `db, desc, eq`; queries `scienceClasses` with `where(eq(scienceClasses.teacherId, session.user.id))`, `orderBy`, `limit(10)`. Borderline acceptable (1 query, 9 lines).
  - `app/(teacher)/teacher/classes/page.tsx:3-43` — imports `count, db, desc, eq, inArray`. Two queries + JS `Map<classId, count>` merge. Multi-step orchestration.
- **Impact:** Multi-tenancy predicates are spread between page and domain.

---

## Section 3 — Backend-as-Code (F-3xx)

### F-301: No `command()` wrapper usage; entire domain layer uses inline `assertCan`

- **Rule:** 3.2
- **Severity:** **Low**
- **Evidence:** `rg 'command\(\{' packages/domain/` returns **0 hits**. 82 `assertCan(` calls across 14 module files, all inline in `index.ts`.
- **Impact:** AGENTS.md allows both patterns. The codebase is internally consistent. But **none of the new code uses the recommended `command({ input, output, auth, authorize, handler })` wrapper**, which would give standardized Zod validation, declared auth, audit/log middleware, OpenAPI/JSON-Schema generation.
- **Suggested fix track:** **Track 8** (Domain Module Decomposition) — when modules are split, the `command()` wrapper is introduced for the new `mutations.ts` files.

### F-302: Zero Zod input or output schemas in any domain function

- **Rule:** 3.3, 3.5
- **Severity:** **High**
- **Evidence:** `packages/domain/src/users/index.ts`, `classes/index.ts`, `codecamp/index.ts` — all use `input: { ... }` TypeScript interfaces. No `z.object`, no `z.infer`. No `output` Zod schema on any function.
- **Impact:** Domain functions accept any shape that satisfies the TypeScript type (bypassing runtime type checks). Cannot be safely called from non-TypeScript callers (workers, CLI). Cannot generate OpenAPI/JSON-Schema.
- **Suggested fix track:** **Track 7** (Zod Boundary Hardening) — combined with the route-level Zod work; **Track 8** (Domain Module Decomposition) for the `packages/domain/src/` side.

### F-303: No `permissions.ts` colocated with any of the 14 domain modules

- **Rule:** 3.4
- **Severity:** **Medium**
- **Evidence:** `find packages/domain/src -name 'permissions.ts'` returns 0 results. Only `packages/auth/src/permissions.ts` (flat `PERMISSIONS: Record<Permission, Role[]>` map) exists.
- **Impact:** When a module owner needs to add a new permission, they edit a file in a different package. Breaks the colocation principle in §3.4.
- **Suggested fix track:** **Track 8** (Domain Module Decomposition) — add `packages/domain/src/users/permissions.ts`, etc.

### F-304: All 14 domain modules are single `index.ts` files (no per-concern split)

- **Rule:** 3.5
- **Severity:** **High**
- **Evidence:** `find packages/domain/src -maxdepth 2 -name '*.ts' | sort` shows every module has exactly one file (`index.ts`) except `codecamp` which has `index.ts` + `review-exercise.ts`. Total: 15 TS files. Module line counts: `articles` 159, `assignments` 352, `classes` 82, `codecamp` **1987**, `curriculum` 113, `gamification` 77, `licenses` 107, `progress` 225, `quiz` 78, `reports` 175, `stories` 105, `students` 150, `users` 207.
- **Impact:** Mixed concerns; hard to grep for "all `*:read` checks in the classes module"; impossible to tree-shake; review noise — PRs touching `codecamp/index.ts` are walls of diff.
- **Suggested fix track:** **Track 8** (Domain Module Decomposition).

### F-305: Zero `app/**` route handlers import from `@reading-advantage/domain` — **CRITICAL ROOT CAUSE**

- **Rule:** 3.5 (cross-cuts §7.1 — thin route handlers)
- **Severity:** **Critical** (umbrella; subsumes F-203, F-208, F-306, F-307, F-405, F-701, F-702)
- **Evidence:** `rg 'import.*from .*@reading-advantage/domain' apps/science-advantage/app/` returns **0 hits**. All 23 `route.ts` files and 22 `page.tsx` files that need domain logic currently inline it via direct `db.select()` / `db.insert()` calls.
- **Impact:** Auth/tenancy is hand-rolled per route. The domain layer (`packages/domain`) is essentially **dead code from the science-advantage app's perspective** — 14 modules, 82 `assertCan` calls, 4,000+ lines of Zod-less function bodies, and **zero callers in the science-advantage app**. The only consumers of `packages/domain` are the tRPC routers in `packages/api`, which science-advantage doesn't use.
- **Fix track:** **Track 1** (App→Domain Migration) — the load-bearing track.

### F-306: 2 `app/**/page.tsx` files import `db` directly — **SUBSUMED under F-305**

- **Rule:** 3.5 (cross-cuts §2.4)
- **Severity:** **Critical** (originally; subsumed under F-305)
- **Evidence:** `app/(teacher)/teacher/page.tsx:1` — `import { db, desc, eq } from '@reading-advantage/db'`; `app/(teacher)/teacher/classes/page.tsx:8` — same import.
- **Note:** Same finding as F-208 (§2.4 angle) and F-305 (§3.5 angle). Executive summary should count this once under F-305.

### F-307: 22 `app/api/**/route.ts` files import `db` directly — **SUBSUMED under F-305**

- **Rule:** 3.5 (cross-cuts §2.5)
- **Severity:** **Critical** (originally; subsumed under F-305)
- **Evidence:** 22 unique `route.ts` files (full list under F-203 above).
- **Note:** Same finding as F-203 (§2.5 angle) and F-305 (§3.5 angle). The 9 `lib/services/*` files are the natural migration targets — lift them into `packages/domain/src/`.

---

## Section 4 — Authentication (F-4xx)

### F-401: `lib/auth/session.ts` is a thin duplicate of the auth-adapter cookie surface

- **Rule:** 4.2
- **Severity:** **Low**
- **Evidence:** `apps/science-advantage/lib/auth/session.ts:93-118` defines `setSessionCookie`, `getSessionToken`, `deleteSessionCookie` — all call `cookies()` and set/get/delete `SESSION_COOKIE_NAME` (imported from `@reading-advantage/auth` on line 9). `lib/auth/server.ts:1-40` defines `requireAuth`, `requireRole`, `hasRole`, `getSession`.
- **Impact:** Local mirror duplicates the adapter surface. Not buggy — uses shared `SESSION_COOKIE_NAME` — but violates spirit of §4.2.
- **Suggested fix track:** **Track 3** (Argon2id + Auth Adapter Flatten) — bundles F-401 + F-402 + F-406.

### F-402: `bcryptjs` is a production dep + used in 3 seed scripts (bypasses auth package) — **CRITICAL**

- **Rule:** 4.4
- **Severity:** **Critical** (shared; cross-cuts §2.3)
- **Evidence:** `apps/science-advantage/package.json:56` declares `"bcryptjs": "^3.0.2"` in `dependencies` (production). 3 seed scripts hand-roll `bcrypt.hash(password, 10)`:
  - `apps/science-advantage/scripts/seed-demo-users.ts:2,9`
  - `apps/science-advantage/scripts/seed/seed-demo-data.ts:2,36`
  - `apps/science-advantage/scripts/seed/seed-activity-data.ts:2,44`
- **Impact:** Per AGENTS.md §4.4: "`bcryptjs`/`bcrypt` in app code outside `packages/auth` = Critical". The 3 seed scripts work today only because `packages/auth/src/password.ts` happens to use the same library. If `packages/auth` migrates to Argon2id, all 3 break.
- **Suggested fix track:** **Track 3** (Argon2id + Auth Adapter Flatten) — root cause is F-406.

### F-403: Login rate-limiter is an in-memory `Map`, not Postgres-backed

- **Rule:** 4.5 (cross-cuts §4.6)
- **Severity:** **Medium**
- **Evidence:** `packages/auth/src/rate-limit.ts:9` — `const rateLimits = new Map<string, RateLimitEntry>();`. Process-local.
- **Impact:** Multi-process deploys (Vercel serverless, Cloud Run, K8s replicas) each have their own `Map`. Cold starts may reset it. AGENTS.md §4.5 calls out "no in-memory sessions, no `Map<>` caches across requests" — the rate-limiter is a parallel anti-pattern.
- **Suggested fix track:** **Track 10** (Postgres-Backed Rate Limiter v2).

### F-404: No audit log table or write code exists anywhere in the monorepo — **CRITICAL**

- **Rule:** 4.7 (cross-cuts §9.4, §9.5)
- **Severity:** **Critical** (shared)
- **Evidence:** 0 `auditLog`/`audit_log` hits anywhere in `packages/db`, `packages/auth`, `packages/api`, or `apps/science-advantage/`. No audit insert in `packages/auth/src/{password,session}.ts` or `packages/api/src/routes/auth/*.ts`. `docs/prd/requirements.md:NFR9` requires "comprehensive audit logging for all user actions and data access" — not implemented.
- **Impact:** Compliance-relevant (SOC 2, district procurement, GDPR data-access requests). Security incidents cannot be triaged.
- **Suggested fix track:** **Track 4** (Audit Log Infrastructure).

### F-405: 23 hand-rolled `role === '...'` checks across 17 app files bypass `assertCan`/`roleAtLeast` — **SUBSUMED under F-305**

- **Rule:** 4.9
- **Severity:** **High** (originally; subsumed under F-305)
- **Evidence:** 23 hand-rolled role checks across 17 files in `apps/science-advantage/app/` (non-test). Each bypasses the centralized `PERMISSIONS` map and the `assertCan(user, "<resource>:<action>", tenant)` enforcement point. Full list in `findings-partial-3-4.md`.
- **Impact:** When a new role is added (e.g. `PARENT`), all 17 files must be updated individually. `assertCan` is never called in the app, so the future audit log of "permission denied" events will be empty.

### F-406: `packages/auth/src/password.ts` uses `bcryptjs` (not Argon2id as AGENTS.md requires) — **CRITICAL (shared)**

- **Rule:** 4.4
- **Severity:** **Critical** (shared, monorepo-wide)
- **Evidence:** `packages/auth/src/password.ts:1,11,25` — `import bcrypt from "bcryptjs"`, `bcrypt.hash`, `bcrypt.compare`. `packages/auth/package.json:20` — `"bcryptjs": "^2.4.3"`.
- **Impact:** Per AGENTS.md §4.4: "Password hashing uses Argon2id (verify in `packages/auth`)." The same `password.ts` is consumed by reading-advantage, primary-advantage, www-reading-advantage, codecamp-advantage, and advantage-games. **The highest-leverage finding in the entire audit — one PR migrates the password module and unblocks 6 apps.**
- **Suggested fix track:** **Track 3** (Argon2id + Auth Adapter Flatten).

### F-407: Rate limit window is 5 attempts / 15 min; no per-IP throttling, no captcha escalation

- **Rule:** 4.6 (operational)
- **Severity:** **Low**
- **Evidence:** `packages/auth/src/rate-limit.ts:6-7` — `WINDOW_MS = 15 * 60 * 1000`, `MAX_ATTEMPTS = 5`. `checkRateLimit(username)` — no IP, no user-agent, no captcha.
- **Impact:** Username-only throttle. Credential-stuffing attack can iterate over many usernames from the same IP without rate limiting. No defense against "username lockout" attacks.
- **Suggested fix track:** **Track 10** (Postgres-Backed Rate Limiter v2) — bundles F-403 + F-407.

---

## Section 5 — Database & Multi-Tenancy (F-5xx)

### F-501: Zero `schoolId` predicates in any of the 27 `route.ts` files; 19/68 schema tables have no `schoolId` column at all — **CRITICAL ROOT CAUSE (merges with F-305)**

- **Rule:** 5.3
- **Severity:** **Critical**
- **Evidence:**
  - `rg 'schoolId' apps/science-advantage/app/api/` → **0 hits** (all 27 production `route.ts` files)
  - `rg 'schoolId' apps/science-advantage/` (whole app) → **9 hits, 0 in production code**: 3 in test fixtures; 6 in archived docs
  - Schema-level: `rg 'schoolId' packages/db/src/schema/` → **3 hits across 3 tables**: `users` (`users.ts:29`), `classrooms` (`classrooms.ts:9`), `licenses` (`licenses.ts:15`). The 19 `science_*` tables in `packages/db/src/schema/science.ts` have **no `schoolId` column**.
- **Impact:** Two concrete risks:
  1. If a teacher's `users.schoolId` is changed (e.g. transfer to another school), their previous `scienceClasses` ownership persists — they retain full access to all prior classes' data.
  2. If a student has `users.schoolId = schoolA` and is enrolled in a class owned by a `schoolB` teacher (which the join-code model permits), the student can read `scienceQuestionResponses` and `scienceStandardMastery` for that class.
- **Note:** F-501 + F-305 = same architectural root cause. Both roll into **Track 2** (TenantDB & schoolId Adoption) and **Track 1** (App→Domain).

### F-502: App does not use `createTenantDB` (`packages/domain/src/db-contract.ts`); tenancy is hand-rolled per route — **CRITICAL ROOT CAUSE (merges with F-305)**

- **Rule:** 5.4
- **Severity:** **Critical** (originally filed High; re-classified Critical under F-305 umbrella)
- **Evidence:** `rg 'createTenantDB|TenantDB' apps/science-advantage/` → 0 hits. 16+ sites in `packages/api/src/routers/*.ts` and `packages/webhooks/src/github.ts` use it correctly.
- **Note:** Same root cause as F-305. Folds into Track 1 + Track 2.

### F-503: Most destructive migration is well-commented inline but has no formal ADR; `0012_codecamp_intern_role.sql` has zero comments

- **Rule:** 5.8
- **Severity:** **Medium**
- **Evidence:** `packages/db/drizzle/0003_slow_firebrand.sql` has 59 lines with extensive inline comments. `0012_codecamp_intern_role.sql` is **1 line with zero comments** (`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'INTERN';`). No `docs/adr/` directory exists.
- **Impact:** Destructive migrations rely on inline comments; future contributor has no central index of "why was this column dropped?"
- **Suggested fix track:** **Track 12** (housekeeping batch).

### F-504: Zero `relations()` declarations in `packages/db/src/schema/`; 3 sites of raw `sql\`\`` in app code (not views/CTEs)

- **Rule:** 5.9
- **Severity:** **Medium**
- **Evidence:** `rg 'relations\(' packages/db/src/schema/` → 0 hits. 3 `sql\`\`` sites in app code (`lib/services/mastery/standard-mastery.ts:68`, `app/api/teachers/dashboard/route.ts:163`, `app/api/teachers/classes/[classId]/intervention-alerts/route.ts:166`).
- **Impact:** Every JOIN is hand-written with `eq()` predicates; verbose and error-prone. 3 `sql\`\`` sites are legitimate uses for arithmetic/column references, but isolated.
- **Suggested fix track:** **Track 8** (Domain Module Decomposition) — when modules are split, the JOINs are folded into `queries.ts` files with `relations()` blocks.

---

## Section 6 — Validation & Contracts (F-6xx)

### F-601: 21 `route.ts` files skip Zod validation; 4 use raw `request.json()` with hand-rolled `typeof` checks

- **Rule:** 6.1, 6.2
- **Severity:** **High**
- **Evidence:**
  - **`request.json()` without Zod** (4 sites): `app/api/lessons/[lessonSlug]/quiz/route.ts:245-253`; `app/api/classes/[classId]/assignments/route.ts:158-166, 297-305`; `app/api/classes/[classId]/roster/route.ts:113-121`; `app/api/classes/[classId]/route.ts:111+`
  - **No `request.json()` validation at all** (15+ routes reading query/path/header params without Zod)
  - **Routes that DO validate correctly (6/27):** `classes/join/route.ts:44`, `classes/route.ts:59`, `students/[studentId]/mastery-profile/route.ts:106` (query), `ai/update-mastery/route.ts:232`, `ai/recommendations/route.ts:302`, `teachers/classes/[classId]/intervention-alerts/route.ts:65` (query)
- **Impact:** 2 unvalidated `request.json()` sites are **destructive handlers** (assignments POST/DELETE, roster DELETE). Per protocol, raw `JSON.parse(req.json())` in a security-sensitive handler is High.
- **Suggested fix track:** **Track 7** (Zod Boundary + Env Hardening).

### F-602: `lib/env.ts` Zod schema covers only 5 of 22+ env vars; many reads in `lib/ai/*` and `lib/config/*` bypass it

- **Rule:** 6.3
- **Severity:** **Medium**
- **Evidence:** `lib/env.ts:3-15` declares 5 fields. 17+ unvalidated env reads in `lib/ai/recommendation-service.ts:55-60`, `lib/ai/image-generator.ts:29-39`, `lib/config/ai.ts:15-24`, `lib/config/ai-images.ts:14-20`, `lib/config/features.ts:2-4`, `lib/analytics.ts:17`, `lib/auth/session.ts:97`, `proxy.ts:25`. `DATABASE_URL` defaults to `postgresql://localhost:5432/test` — test-only URL silently used in production.
- **Impact:** Missing `OPENAI_API_KEY`/`GEMINI_API_KEY` causes silent runtime fallback. A misspelled `AI_RECOMMENDER_HASH_SECRET` is not caught until first request. Lenient `DATABASE_URL` default is a real production risk.
- **Suggested fix track:** **Track 7** (Zod Boundary + Env Hardening).

### F-603: Two Zod schemas for the same domain (`createClassSchema` + `createClassFormSchema`)

- **Rule:** 6.4
- **Severity:** **Low**
- **Evidence:** `lib/validations/class.ts:26-30, 38-42` (server), `:50-58` (form). Form pipes through server schema's field constraints. No hand-written parallel types.
- **Impact:** Two schemas to update if a field is added. Mitigated by `.pipe()`.
- **Suggested fix track:** **Track 7**.

### F-604: Form schemas live in app-local `lib/validations/` instead of a cross-cutting `packages/types`

- **Rule:** 6.6
- **Severity:** **Low**
- **Evidence:** `lib/validations/{class,student-classes}.ts` are app-local. `packages/types` exists but is not consumed by `apps/science-advantage/`.
- **Impact:** Drift risk across apps.
- **Suggested fix track:** Out of scope for science-advantage alone; surface as a multi-app track. **Track 7** (Zod Boundary) can pre-stage the cross-app extraction.

---

## Section 7 — Transport (F-7xx)

### F-701: All 5 spot-checked `route.ts` files are fat (159–624 lines, multiple inline DB calls) — **SUBSUMED under F-305**

- **Rule:** 7.1
- **Severity:** **High** (originally; subsumed under F-305)
- **Evidence (5 spot-checked):**
  | File | Lines | Inline DB calls | Validation | Notes |
  |------|------:|----------------:|-----------|-------|
  | `app/api/ai/update-mastery/route.ts` | **624** | ~20 | `z.object({ attemptId })` | Worst-case: 60-line `loadAttemptContext` + 200-line transaction + mastery-grade math + in-memory rate limiter + PG error-code branching |
  | `app/api/lessons/[lessonSlug]/quiz/route.ts` | 519 | ~15 | inline `if (!attemptId \|\| !responses)`, no Zod | Embeds quiz-grading loop with `gradeAnswer()` + `calculateXpForQuiz()` + `awardXp()` + `updateStreakForProfile()` + `checkBadgeConditions()` + `processMasteryRun()` — should be a single `submitQuizAttempt` domain function |
  | `app/api/ai/recommendations/route.ts` | 400 | ~7 | `z.object({ attemptId })` | 145-line `loadAttemptWithRelations` helper; hand-rolled `authorizeAttempt()` (103-132) instead of `requireRole` |
  | `app/api/classes/[classId]/assignments/route.ts` | 364 | ~7 | **none** — uses `body as { ... }` (F-704) | 3 handlers; each hand-rolls the same role check |
  | `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` | 287 | ~5 | `z.object({ limit, severity, cursor, since, refresh })` | Uses Drizzle `sql\`0.6\`` (F-204) |

### F-702: 26 of 27 routes hand-roll role/ownership checks instead of calling `requireRole` — **SUBSUMED under F-305**

- **Rule:** 7.1, 4.2
- **Severity:** **High** (originally; subsumed under F-305)
- **Evidence:** `app/api/ai/recommendations/route.ts:103-132` — custom `authorizeAttempt()`; `app/api/classes/route.ts:38-89` — manual `session.user.role !== 'TEACHER' && 'ADMIN'`; `app/api/classes/[classId]/assignments/route.ts:24, 141-155, 280-294` — same pattern × 3; etc. Two routes are correct: `app/api/teachers/dashboard/route.ts:16` (uses `requireRole('TEACHER')`); `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts:35` (uses `requireAuth()`).
- **Note:** Same root cause as F-305. The 26 hand-rolled checks are symptoms of "no domain function to call."

### F-703: `packages/domain/src/codecamp/index.ts:1952` embeds GitHub `fetch()` with inline `headers` in domain

- **Rule:** 7.3
- **Severity:** **Low** (cross-cutting; not in science-advantage codebase)
- **Evidence:** `packages/domain/src/codecamp/index.ts:1946-1969` — `getPracticeIssues()` makes `fetch('https://api.github.com/...')` with `headers: { Accept: "application/vnd.github.v3+json" }` and `next: { revalidate: 300 }` (Next.js ISR extension on `RequestInit`).
- **Impact:** Domain code reaches out to an external provider directly. The `next: { revalidate: 300 }` cast ties the function to Next.js's extended `RequestInit` type.
- **Suggested fix track:** Folds into **Track 6** (Storage/Integrations package).

### F-704: `app/api/classes/[classId]/assignments/route.ts` POST/DELETE use raw `body as { ... }` casts, no Zod

- **Rule:** 7.1, 6.1
- **Severity:** **Low**
- **Evidence:** `app/api/classes/[classId]/assignments/route.ts:158-159, 297-298` — `const { lessonId, dueAt } = body as { lessonId?: string; dueAt?: string };` and same for `assignmentId`.
- **Impact:** Malformed body crashes in an uncontrolled way. `lib/validations/class.ts` already has `createClassSchema` — assignments should have the equivalent.
- **Suggested fix track:** Folds into **Track 7** (Zod Boundary Hardening).

### F-705: 4 auth `route.ts` stubs at `app/api/auth/*/route.ts` (6 lines each) — verify if dead code

- **Rule:** 7.1
- **Severity:** **Low** (information-only)
- **Evidence:** `app/api/auth/{impersonate,login,logout,session}/route.ts` (6 lines each) delegate to `packages/api/src/routes/auth/{login,logout,session,impersonate}.ts`.
- **Impact:** If auth UI posts to these endpoints, they work. If auth UI posts to tRPC/RPC, the stubs are dead code.
- **Suggested fix track:** **Track 12** (housekeeping batch) — `rg 'app/api/auth/(login|logout|session|impersonate)'` should show the references; if 0, delete.

---

## Section 9 — Observability (F-9xx)

### F-901: No `auditLog` table in `packages/db/src/schema/`; no auth/permission/billing/destructive-action events written — **CRITICAL**

- **Rule:** 9.4, 9.5
- **Severity:** **High** (per protocol; promoted to Critical under audit reclassification — see F-404)
- **Note:** F-404 (auth angle) and F-901 (observability angle) are the same issue filed under two section numbers. Executive summary counts F-404 once.
- **Suggested fix track:** **Track 4** (Audit Log Infrastructure).

### F-902: 67 `console.log/error/warn/info` hits in production code

- **Rule:** 9.2
- **Severity:** **Medium** (per protocol: "10+ console.* in production = Medium")
- **Evidence:** 67 hits. 25 in `app/`, 30 in `components/`, 8 in `lib/`, 3 in `proxy.ts`. 4 in `intervention-alerts-widget.tsx` ship as `console.log("[Telemetry] ...")` to prod.
- **Impact:** Unstructured; client-side errors lost in production.
- **Suggested fix track:** **Track 9** (Observability Stack).

### F-903: No Sentry / OpenTelemetry / equivalent error reporter; no `instrumentation.ts`

- **Rule:** 9.3
- **Severity:** **Medium**
- **Evidence:** 0 `Sentry`/`@sentry/*`/`opentelemetry`/`@opentelemetry/*` packages or code references; no `instrumentation.ts` at app root.
- **Impact:** Unhandled errors in route handlers are silently swallowed.
- **Suggested fix track:** **Track 9** (Observability Stack).

### F-904: Structured logger does not auto-propagate `requestId` / `userId` / `latencyMs`; 5 largest `route.ts` files emit zero structured logs

- **Rule:** 9.1
- **Severity:** **Medium**
- **Evidence:** `lib/observability/logger.ts:1-37` does not auto-attach request context. 5 largest route.ts files: `app/api/ai/update-mastery/route.ts` (624 lines, does emit `logger.*` but no `requestId`/`latencyMs`); `app/api/lessons/[lessonSlug]/quiz/route.ts` (519, zero); `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (412, zero); `app/api/ai/recommendations/route.ts` (400, `logger.warn`/`error` no context); `app/api/classes/[classId]/assignments/route.ts` (364, zero). No `AsyncLocalStorage` usage.
- **Impact:** Without `requestId`, correlating a client error to a server log line is impossible. Without `latencyMs`, SLO dashboards cannot be built.
- **Suggested fix track:** **Track 9** (Observability Stack).

### F-905: No request tracing; `traceId` field is not a real OTel span

- **Rule:** 9.6
- **Severity:** **Medium**
- **Evidence:** 0 `trace(`/`span(`/`opentelemetry` matches. 4 `traceId` references in `lib/ai/recommendation-service.ts:97, 126, 144, 153` are an opaque payload field, never tied to an HTTP request header.
- **Impact:** Cross-service traces (web → AI → OpenAI) cannot be assembled.
- **Suggested fix track:** **Track 9** (Observability Stack).

### F-906: `lib/observability/logger.ts` is a console-sink wrapper (no pino / winston / OTel exporter)

- **Rule:** 9.1 (sub-aspect)
- **Severity:** **Low**
- **Evidence:** `lib/observability/logger.ts:13-23` uses `console.*` only. `lib/observability/metrics.ts:15` logs JSON to `console.info`. No `pino`/`winston`/`bunyan` packages.
- **Impact:** Logs are not ECS-compatible JSON lines, not batched, not sent to a centralized log store.
- **Suggested fix track:** Subsumed by **Track 9**.

---

## Section 10 — Testing (F-10xx)

### F-1001: `ignoreBuildErrors: true` masks 360 tsc errors in `next.config.ts:25` — **CRITICAL**

- **Rule:** 10.7
- **Severity:** **Critical** (per protocol: `ignoreBuildErrors: true` with ≥100 tsc errors is Critical)
- **Evidence:** `apps/science-advantage/next.config.ts:25` — `ignoreBuildErrors: true,`. Baseline 360 tsc errors / 386 lines (decomposed: ~354 testing-library matcher narrowing in `*.test.tsx`; 2 INTERN role widening in `lib/auth/session.ts:40,79`; 2 missing-sibling-module errors; 3 ProcessEnv narrowing; 4 next@16 duplicate-instance type identities; 4 misc).
- **Impact:** Every `pnpm turbo run build` for science-advantage is a green signal that does not reflect type safety. F-1002 explains why this hasn't surfaced in CI.
- **Suggested fix track:** **Track 11** (CI Alignment + tsc Blocker Resolution).

### F-1002: App-local CI workflow uses `npm`, runs only lint + build, masks 360 tsc errors

- **Rule:** 10.8
- **Severity:** **High**
- **Evidence:** `apps/science-advantage/.github/workflows/ci.yml` uses `cache: 'npm'`, `cache-dependency-path: package-lock.json`, `run: npm ci` (no `package-lock.json` exists at app root); runs only `npm run lint` (no `test`, no `check-types`, no `build`); references `NEXTAUTH_URL`/`NEXTAUTH_SECRET` not in `.env.example`.
- **Impact:** Structural reason F-1001 hasn't been addressed: CI passes with `ignoreBuildErrors: true` + `npm run lint` only.
- **Suggested fix track:** **Track 11** (CI Alignment + tsc Blocker Resolution).

### F-1003: `graph.db` is empty — audit coverage degraded — **CRITICAL**

- **Rule:** 11.6
- **Severity:** **Critical** (protocol-level)
- **Evidence:** `build-graph stats ./graph.db 2>&1` returns `Total nodes: 0, Total edges: 0, Total files: 0`. File is 69 KB on disk but empty of indexed symbols.
- **Impact:** Every section audit that relied on `build-graph` got empty results; fell back to manual `rg`. Future audits will hit the same problem.
- **Suggested fix track:** **Track 11** (CI Alignment) — fold in `build-graph scan` as a CI precondition, plus a "graph.db must be non-empty" gate. **Pre-audit chore** before next re-audit.

---

## Section 11 — Documentation (F-11xx)

### F-1101: JSDoc is file-level not per-export in some domain modules

- **Rule:** 11.1, 11.2, 11.4
- **Severity:** **Medium**
- **Evidence:** `students/`, `licenses/`, `curriculum/`, `progress/`, `reports/`, `gamification/`, `assignments/`, `stories/` have file-level JSDoc. `codecamp/review-exercise.ts` and `codecamp/index.ts` do not. The 2026-05-30 JSDoc track claim of "153 functions documented" used file-level counting.
- **Impact:** `build-graph` and IDE tooling can only summarize a function if the function itself has JSDoc.
- **Suggested fix track:** **Track 8** (Domain Module Decomposition) — when modules are split, per-export JSDoc is added.

### F-1102: App-local `AGENTS.md` references Prisma and `npm`

- **Rule:** 11.5
- **Severity:** **Low**
- **Evidence:** `apps/science-advantage/AGENTS.md` and `CLAUDE.md` still reference Prisma and `npm install`.
- **Impact:** New agent/developer will reach for the wrong toolchain.
- **Suggested fix track:** **Track 12** (housekeeping batch).

---

## Section 12 — Monorepo Hygiene (F-12xx)

### F-1201: 51/57 deps are `^`-ranged; only 6 are pinned

- **Rule:** 12.1
- **Severity:** **Medium**
- **Evidence:** `apps/science-advantage/package.json` L22-96 — every dep except 6 uses `^`. Pinned entries: `next@16.0.0`, `react@19.2.0`, `react-dom@19.2.0`, `eslint-config-next@16.0.0`, `@types/react@19.2.2`, `@types/react-dom@19.2.2`. `pnpm-lock.yaml` is committed at monorepo root.
- **Impact:** AGENTS.md §Version Policy says "pinned in `package.json`". `^` contradicts the wording; pnpm-lock.yaml provides effective pinning at install time, so practical risk is low.
- **Suggested fix track:** **Track 12** (housekeeping batch).

### F-1202: Stray `.log` files at app root not in `.gitignore`

- **Rule:** 12.2
- **Severity:** **Low**
- **Evidence:** `apps/science-advantage/{gemini_design_update,visual_refresh_track}.log` exist; untracked. `.gitignore` covers `*-debug.log*` but no generic `*.log`.
- **Impact:** Cosmetic.
- **Suggested fix track:** **Track 12**.

### F-1203: Build "passes" only because `ignoreBuildErrors: true` masks ~370 tsc errors

- **Rule:** 12.3
- **Severity:** **Low** (informational; F-1001 / F-1205 carry the real severity)
- **Suggested fix track:** **Track 11**.

### F-1204: `pnpm turbo run lint --filter=science-advantage` exits 1

- **Rule:** 12.4
- **Severity:** **High**
- **Evidence:** 4 `react-hooks/immutability` errors in `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186`; 6 `@typescript-eslint/no-unused-vars` warnings in `lib/gamification/badges.ts:114,202`.
- **Impact:** CI gate fails for this app.
- **Suggested fix track:** **Track 11**.

### F-1205: `pnpm turbo run check-types` skips the app entirely; ~370 tsc errors when run directly

- **Rule:** 12.5
- **Severity:** **High**
- **Evidence:** `apps/science-advantage/package.json` has no `check-types` script. `turbo.json` `check-types` task resolves to workspace-deps only and silently skips the app. Direct `npx tsc --noEmit` shows ~370 errors.
- **Impact:** ~370 type errors accumulate without any CI gate.
- **Suggested fix track:** **Track 11**.

### F-1206: 50/50 commits follow Conventional Commits — **PASS**

- **Rule:** 12.6
- **Severity:** — (no finding)
- **Note:** Positive observation.

### F-1207: 7/50 commits reference a track ID (all in body, 0/50 in subject)

- **Rule:** 12.7
- **Severity:** **Medium**
- **Evidence:** 7/50 in body; 0/50 in subject line. 43/50 no track link (most belong to the archived `prisma_drizzle_science_controllers_20260505` migration).
- **Impact:** `git log --grep <track-id>` cannot surface the work done under a track.
- **Suggested fix track:** **Track 12**.

---

## Section 13 — Workflow & Tooling (F-13xx)

### F-1301: 3 of 5 largest refactors ship without any track reference

- **Rule:** 13.1
- **Severity:** **Medium**
- **Evidence:** 5 largest diffs in last 100 commits touching `apps/science-advantage/`: 3 of 5 (529, 437, 440 lines) ship without any track reference; belong to `prisma_drizzle_science_controllers_20260505` but commits don't link.
- **Impact:** `git log --grep` cannot surface the work done under a track; the per-track `plan.md` is decoupled from the commit graph.
- **Suggested fix track:** **Track 12**.

### F-1302-F-1304: **PASS** (no findings)

- F-1302: `measure/tech-debt.md` = 39 lines, science-advantage findings tracked. **Note:** the 4 new Critical rows in this audit push it to 44 lines (still ≤ 50 cap).
- F-1303: `measure/lessons-learned.md` = 49 lines. **Note:** exactly at the cap; any new science-advantage lessons should replace older ones.
- F-1304: `package.json#name` = `science-advantage` ✓

### F-1305: 5 orphan in-code `TODO` comments in non-test source files

- **Rule:** 13.5
- **Severity:** **Low**
- **Evidence:** 5 in-code TODOs in `lib/gamification/badges.ts:115`, `app/api/lessons/[lessonSlug]/route.ts:125,144`, `app/api/classes/[classId]/curriculum/route.ts:135,142`. None tracked.
- **Impact:** Each orphan is a future contributor's "I wonder if this is still needed?"
- **Suggested fix track:** **Track 12**.

### F-1306: App-local CI workflow uses `npm` + `package-lock.json` (neither committed at app root), lacks `test` step, and references env vars (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`) not in `.env.example`

- **Rule:** 13.6
- **Severity:** **Medium**
- **Evidence:** `apps/science-advantage/.github/workflows/ci.yml:631-634` — `cache-dependency-path: package-lock.json` (file does not exist at app root), `npm ci`, runs only `lint` + `build`, references `NEXTAUTH_URL`/`NEXTAUTH_SECRET`/`DATABASE_URL` not in `.env.example`.
- **Impact:** App-local CI workflow is dead/drifted. Monorepo root CI covers the app, so the local workflow is redundant AND broken.
- **Suggested fix track:** **Track 12** (or **Track 11** — both apply; pick one).

---

## Cross-section finding consolidations

| Issue | Filed under | Subsumed into |
|-------|-------------|---------------|
| App bypasses domain layer | F-203, F-208, F-305, F-306, F-307, F-701, F-702 | **F-305 umbrella** → Track 1 |
| 23 hand-rolled `role ===` checks | F-405, F-702 (partial) | **F-305 umbrella** → Track 1 |
| Multi-tenancy gap (no `schoolId` / no `TenantDB`) | F-501, F-502 | **F-305 umbrella** + Track 2 |
| Argon2id + `bcryptjs` in app | F-206, F-402, F-406 | Track 3 |
| Audit log missing | F-404, F-901 | Track 4 |
| AI adapter / provider SDK coupling | F-101, F-202 | Track 5 |
| Storage/email packages missing | F-102, F-703 | Track 6 |
| Zod boundary + env | F-601, F-602, F-302, F-603, F-604, F-704 | Track 7 |
| Domain module decomposition | F-301, F-303, F-304, F-504, F-1101 | Track 8 |
| Observability stack | F-902, F-903, F-904, F-905, F-906 | Track 9 |
| Rate limiter v2 | F-403, F-407 | Track 10 |
| CI + tsc + lint alignment | F-1001, F-1002, F-1003, F-1204, F-1205 | Track 11 |
| Housekeeping batch | F-205, F-705, F-1201, F-1202, F-1203, F-1207, F-1301, F-1305, F-1306, F-1102 | Track 12 |

---

## Tech-debt rows to add to `measure/tech-debt.md`

| Finding | Severity | Status | Notes |
|---------|----------|--------|-------|
| `audit_20260603_domain_bypass` (F-305 umbrella) | **Critical** | Open | New umbrella; supersedes prior `audit_20260526` row's "27 route.ts import db" for science-advantage (which used a 27/27 count; the multiline-safe retcon is 22/27, all of which are symptoms of this finding). Subsumes F-203, F-208, F-305, F-306, F-307, F-405, F-701, F-702. |
| `audit_20260603_tenancy_gap` (F-501, F-502) | **Critical** | Open | Zero `schoolId` predicates; 19/68 schema tables have no `schoolId` column; app does not use `createTenantDB`. Merges with F-305 root cause. |
| `audit_20260603_argon2id_required` (F-402, F-406) | **Critical** | Open | Monorepo-wide: `packages/auth/src/password.ts` uses `bcryptjs` (not Argon2id); 3 science-advantage seed scripts hand-roll `bcrypt.hash`; `bcryptjs@3.0.2` is a direct app production dep. One PR migrates the shared package; unblocks 6 apps. |
| `audit_20260603_audit_log_missing` (F-404, F-901) | **Critical** | Open | No `auditLog`/`audit_log` table anywhere in the monorepo; 0 audit writes on login/logout/password change/permission change/destructive action. SOC 2 / GDPR / district-procurement blocker. |
| `audit_20260603_housekeeping_batch` (F-205, F-705, F-1001, F-1002, F-1003, F-1101, F-1102, F-1201, F-1202, F-1203, F-1204, F-1205, F-1207, F-1301, F-1305, F-1306) | Medium / Low | Open | Batched housekeeping: prisma/ dir relocation, auth-stub verification, tsc/lint blocker resolution (covered by `auth_strategy_review` already), pinned-deps, stray logs, `graph.db` rebuild, JSDoc, AGENTS.md drift, TODO backfill, CI workflow cleanup, commit-hygiene backfill. |

> **Note:** F-1001 (`ignoreBuildErrors: true`) is already in `measure/tech-debt.md` row `auth_strategy_review` (2026-05-03, L19). The audit re-classifies it as Critical per protocol guidance but the row is not duplicated; instead, the `audit_20260603_housekeeping_batch` row references the existing `auth_strategy_review` for the underlying tsc/lint blockers.

---

**End of findings.** See `migration-tracks.md` for the 12-track plan and `checklist.md` for the full checklist.
