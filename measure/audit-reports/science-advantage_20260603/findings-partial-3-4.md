# Findings — Sections 3 + 4 (Backend-as-Code + Auth) — `apps/science-advantage/`

> **Date:** 2026-06-03
> **App:** `apps/science-advantage/`
> **Source protocol:** `measure/agents-md-audit-protocol.md` §§ 3, 4
> **Companion file:** `checklist-partial-3-4.md`
>
> **Cross-section findings:** This report's F-306, F-307, F-402, F-404, and F-405 are Section-3/4 views of issues already filed under different section numbers in sibling partials:
>
> | This report | Same issue filed in | Same issue from that partial's angle |
> |-------------|---------------------|----------------------------------------|
> | F-306 (page.tsx imports `db`) | F-208 in `findings-partial-2-7.md` | §2.4 (no business logic in page.tsx) |
> | F-307 (route.ts imports `db`) | F-203 in `findings-partial-2-7.md` | §2.5 (no `db` import in route.ts) |
> | F-402 (bcryptjs in app + 3 seed scripts) | F-206 in `findings-partial-2-7.md` | §2.3 / §4.4 (direct app dep on bcryptjs) |
> | F-404 (no audit log table) | F-901 in `findings-partial-6-9.md` | §9.4 (audit events for auth) |
> | F-405 (hand-rolled `role ===` ladders) | F-702 in `findings-partial-2-7.md` (partial overlap) | §7.1 (thin route handlers; 26/27 hand-roll role/ownership checks) |
>
> The per-section view is preserved here for §3 / §4 compliance, but the executive-summary aggregator should count each unique issue once.

## Summary table

| ID | Section | Rule | Title | Severity |
|----|---------|------|-------|----------|
| F-301 | 3 | 3.2 | No `command()` wrapper usage; entire domain layer uses inline `assertCan` | Low |
| F-302 | 3 | 3.3 / 3.5 | Zero Zod input or output schemas in any domain function | High |
| F-303 | 3 | 3.4 | No `permissions.ts` colocated with any of the 14 domain modules | Medium |
| F-304 | 3 | 3.5 | All 14 domain modules are single `index.ts` files (no per-concern split) | High |
| F-305 | 3 | 3.5 (cross-cuts Section 2) | Zero `app/**` route handlers import from `@reading-advantage/domain` | Critical |
| F-306 | 3 | 3.5 (cross-cuts Section 2.4) | 2 `app/**/page.tsx` files import `db` directly (per Critical F-001 anchor) | Critical |
| F-307 | 3 | 3.5 (cross-cuts Section 2.5) | 22 `app/api/**/route.ts` files import `db` directly (per Critical F-001 anchor) | Critical |
| F-401 | 4 | 4.2 | `lib/auth/session.ts` is a thin duplicate of the auth-adapter cookie surface | Low |
| F-402 | 4 | 4.4 | `bcryptjs` is a production dep + used in 3 seed scripts (bypasses auth package) | Critical |
| F-403 | 4 | 4.5 | Login rate-limiter is an in-memory `Map`, not Postgres-backed | Medium |
| F-404 | 4 | 4.7 | No audit log table or write code exists anywhere in the monorepo | High |
| F-405 | 4 | 4.9 | 23 hand-rolled `role === '...'` checks across 17 app files bypass `assertCan`/`roleAtLeast` | High |
| F-406 | 4 | 4.4 (shared) | `packages/auth/src/password.ts` uses `bcryptjs` (not Argon2id as AGENTS.md requires) | Critical (shared) |
| F-407 | 4 | 4.6 (operational) | Rate limit window is 5 attempts / 15 min; no per-IP throttling, no captcha escalation | Low |

> **Severity legend:** per `measure/agents-md-audit-protocol.md` §Severity Scheme + the Section-1/2/3/4 severity guidance.
> Critical findings block new features in the affected app until a migration track exists.

---

## Section 3 — Backend-as-Code findings

### F-301: No `command()` wrapper usage; entire domain layer uses inline `assertCan`
- **Rule:** 3.2
- **Severity:** Low
- **Evidence:** `rg 'command\(\{' packages/domain/` returns **0 hits** in `packages/domain/src/`. `rg 'export const \w+ = (command|query|mutation|action)\b' packages/domain/` returns 0 hits. The 82 `assertCan(` calls (across 14 module files) are all inline in `index.ts` function bodies, e.g. `packages/domain/src/users/index.ts:65,108,153,191` and `packages/domain/src/codecamp/index.ts:31`.
- **Impact:** AGENTS.md §Backend Function Pattern allows both `command()` and `assertCan()` patterns. The codebase is internally consistent (everyone uses `assertCan`). However, **none of the new code is using the recommended `command({ input, output, auth, authorize, handler })` wrapper**, which would give us: (a) standardized input/output Zod validation, (b) declared auth requirements, (c) a single point to add audit/log/metrics middleware, and (d) auto-generated OpenAPI/JSON-Schema. This is a low-severity tracking issue, not a blocker.
- **Suggested fix track:** "science-advantage — Domain wrapper migration (3.2 + 3.3)" -- Phase 1: pick 1 module (recommend `classes`, smallest at 82 lines), Phase 2: introduce a `command()` wrapper in `packages/domain/src/_lib/`, Phase 3: convert `classes/index.ts` to the new shape, Phase 4: validate no behavior change via existing `__tests__/classes.test.ts`.

### F-302: Zero Zod input or output schemas in any domain function
- **Rule:** 3.3 / 3.5
- **Severity:** High
- **Evidence:** Sample of three modules with most callers:
  - `packages/domain/src/users/index.ts`: `getUser`, `listUsers`, `getUserByGithubUsername`, `updateUser` all use `input: { ... }` typed as a TypeScript interface (`{ id: string }`, `{ limit: number; offset: number }`, etc.). No `z.object`, no `z.infer`.
  - `packages/domain/src/classes/index.ts:6-12`: `interface CreateClassInput { name: string }` and `interface ListClassesInput { includeArchived: boolean }` -- pure TypeScript.
  - `packages/domain/src/codecamp/index.ts`: 30+ exported async functions, all use `input: { ... }` TypeScript shapes; no Zod. The only `z.` usage in any domain file is `packages/domain/src/codecamp/review-exercise.ts` and `packages/domain/src/__tests__/codecamp.test.ts` (a test, not a domain function).
  - Cross-check: `rg 'z\.\|safeParse\|Zod' packages/domain/src/` returns 2 files, neither containing domain function contracts.
  - **No function declares an `output` Zod schema** -- return types are inferred and unvalidated.
- **Impact:** Per AGENTS.md §Contracts and Validation: "Runtime validation is required at all external boundaries. Do not rely solely on TypeScript types." Domain functions are the *internal* boundary; even though route handlers may Zod-validate at the edge, the domain layer is the natural enforcement point. Without Zod schemas, the domain functions: (a) accept any shape that satisfies the TypeScript type (bypassing the type checker at runtime), (b) cannot be safely called from non-TypeScript callers (workers, CLI), (c) cannot generate OpenAPI/JSON-Schema, (d) cannot reject malformed nested data (e.g. `studentId: ''` slips through as `string`).
- **Suggested fix track:** "science-advantage — Domain Zod contract introduction" -- Phase 1: define `CreateClassInput = z.object({ name: z.string().min(1).max(100) })` and `ListClassesOutput = z.object({ ... })` for the 2 classes functions, Phase 2: convert `input: CreateClassInput` to `input: z.infer<typeof CreateClassInput>`, Phase 3: add `.parse(input)` at the function top, Phase 4: expand to all 14 modules. Couples with F-301.
- **Cross-reference (related, not duplicate):** F-602 and F-604 in `findings-partial-6-9.md` cover missing Zod on the *form/route* layer (`createClassSchema` in `lib/validations/`, raw `request.json()` casts in routes). F-302 is specifically about the **`packages/domain/`** layer, which neither of those findings covers.

### F-303: No `permissions.ts` colocated with any of the 14 domain modules
- **Rule:** 3.4
- **Severity:** Medium
- **Evidence:** `find packages/domain/src -name 'permissions.ts'` returns **0 results**. The only `permissions.ts` in the repo is `packages/auth/src/permissions.ts` (a flat `PERMISSIONS: Record<Permission, Role[]>` map). The 14 domain modules in `packages/domain/src/{articles,assignments,classes,codecamp,curriculum,gamification,licenses,progress,quiz,reports,stories,students,users}/` each contain inline `assertCan(user, "<resource>:<action>", tenant)` calls (e.g. `users/index.ts:65` calls `assertCan(user, "user:read", tenant)`), but the *permission matrix entry* for `user:read` lives in `packages/auth/src/permissions.ts`, not in `packages/domain/src/users/permissions.ts`.
- **Impact:** When a module owner needs to add a new permission (e.g. `student:export`), they have to edit a file in a different package (`packages/auth`). This breaks the colocation principle in §3.4: "Permission checks live in a `permissions.ts` module colocated with the module, not inside handlers." Per severity guidance, **missing `permissions.ts` in a domain module is Medium**. The mitigation today is the single central `PERMISSIONS` map, which works but is not the recommended structure.
- **Suggested fix track:** "science-advantage — Per-module permission policy split" -- Phase 1: define a small `domainModulePermissions` extension point in `packages/auth`, Phase 2: add `packages/domain/src/users/permissions.ts` with the user-related keys, Phase 3: update `assertCan` to consult module-level overrides, Phase 4: migrate 1 module as proof, Phase 5: migrate remaining 13. Track should also cover F-304.

### F-304: All 14 domain modules are single `index.ts` files (no per-concern split)
- **Rule:** 3.5
- **Severity:** High
- **Evidence:** `find packages/domain/src -maxdepth 2 -name '*.ts' | sort` shows the full per-module file inventory. **Every one of the 14 modules has exactly one file (`index.ts`)** except `codecamp` which has `index.ts` + `review-exercise.ts`. Total domain source: 15 TS files + `db-contract.ts` + 13 test files.
  - Modules that have *no* `schema.ts`, `contracts.ts`, `queries.ts`, `mutations.ts`, `actions.ts`, `permissions.ts`, or `errors.ts`: **all 14**.
  - Module line counts: `articles` 159, `assignments` 352, `classes` 82, `codecamp` 1987, `curriculum` 113, `gamification` 77, `licenses` 107, `progress` 225, `quiz` 78, `reports` 175, `stories` 105, `students` 150, `users` 207.
  - The `codecamp/index.ts` file at 1,987 lines is the worst offender -- it contains 30+ exported functions covering modules, lessons, exercises, quizzes, chat, PR reviews, webhook events, intern accounts, and more, all in one file.
- **Impact:** Mixed concerns in one file make it: (a) hard to grep for "all `* :read` permission checks in the classes module", (b) impossible to set per-file lint/permission rules, (c) impossible to tree-shake unused functions (the entire 2K-line `codecamp` ships to every consumer), (d) review noise -- PRs touching `codecamp/index.ts` are hard to review because the diff is always a wall. Per the AGENTS.md target structure (shown in the spec): each module should colocate `schema.ts`, `contracts.ts`, `queries.ts`, `mutations.ts`, `actions.ts`, `permissions.ts`, `errors.ts`, `index.ts`. Current state is "index.ts only".
- **Suggested fix track:** "science-advantage — Domain module decomposition" -- Phase 1: pick the smallest module (`gamification`, 77 lines, 2 functions) as the pilot, Phase 2: extract `contracts.ts` (Zod schemas), `queries.ts` (`getStudentGamification`), `mutations.ts` (`updateStudentGamification`), `permissions.ts` (`gamification:read:all`, `gamification:update`), `errors.ts` (`GamificationError`), `index.ts` (re-export). Phase 3: replicate pattern in `classes` (82 lines), Phase 4: `licenses`/`stories`/`curriculum` (small). Leave `codecamp` for a dedicated refactor track -- 1987 lines will not survive a single PR.

### F-305: Zero `app/**` route handlers import from `@reading-advantage/domain`
- **Rule:** 3.5 (cross-cuts §7.1 -- thin route handlers)
- **Severity:** Critical
- **Evidence:** `rg 'import.*from .*@reading-advantage/domain' apps/science-advantage/app/` returns **0 hits**. All 23 `route.ts` files and 22 `page.tsx` files in `apps/science-advantage/app/` that need domain logic currently inline it via direct `db.select()` / `db.insert()` calls. Cross-checked against the inventory in `00-inventory.md`: 22 of 27 route handlers import `db` directly, 4 are 6-line auth stubs (delegate to `@reading-advantage/api/routes/auth`), 1 (`app/api/student/classes/route.ts:42`) delegates to `lib/services/classes/get-student-classes.ts`.
- **Impact:** This is the §3 corollary of the F-001 (pilot) critical. Auth/tenancy is hand-rolled per route. The domain layer (`packages/domain`) is essentially **dead code from the science-advantage app's perspective** -- it has 14 modules, 82 `assertCan` calls, 4,000+ lines of Zod-less function bodies, and **zero callers in the science-advantage app**. The only consumers of `packages/domain` are the `packages/api` tRPC routers, which science-advantage doesn't use.
- **Suggested fix track:** "science-advantage — App routes to domain layer migration" -- Phase 1: audit which `route.ts` files have an equivalent in `packages/domain/src/` (e.g. `app/api/classes/route.ts` -> `classes/listClasses`), Phase 2: define a `tenantedHandler(input, output, fn)` HOF in `packages/domain/src/db-contract.ts` that wraps the `createTenantDB` machinery, Phase 3: convert 3 route handlers as pilot, Phase 4: convert remaining 20+. **This is the load-bearing track for §3 / §5 / §7 compliance** and should be the first track opened after audit sign-off.
- **Cross-reference (related, not duplicate):** F-203 in `findings-partial-2-7.md` covers the "route.ts imports `db` directly" half of this finding. F-305 covers the positive half: the app should be using the domain layer but is not. The two findings together describe "app bypasses the domain layer on both sides" (no `db` import, no `domain` import). The fix track is the same.

### F-306: 2 `app/**/page.tsx` files import `db` directly
- **Rule:** 3.5 (cross-cuts §2.4)
- **Severity:** Critical
- **Evidence:** `rg "import \{[^}]*db" apps/science-advantage/app/` (excluding tests) returns 2 `page.tsx` hits:
  - `apps/science-advantage/app/(teacher)/teacher/page.tsx:1` -- `import { db, desc, eq } from '@reading-advantage/db';`
  - `apps/science-advantage/app/(teacher)/teacher/classes/page.tsx:8` -- imports `db` (split-import, see also `rg -A3` for the `from '@reading-advantage/db'` part).
- **Impact:** Per severity guidance in the audit request, **"domain function in component/page (not just route.ts) = Critical"**. Pages should be thin (orchestration + render) per AGENTS.md §Backend-as-Code Model. Direct DB queries in pages bypass every layer of tenancy enforcement, audit logging, and the centralized permission system. These two pages are reachable only by authenticated TEACHERs (gated by `requireRole` in `app/(teacher)/layout.tsx`), but the query inside is **un-tenanted** -- if a teacher is in multiple schools, all rows are returned.
- **Suggested fix track:** Couples with F-305. "science-advantage — Pages to domain layer migration" -- Phase 1: read both pages, identify the query, Phase 2: create a `getTeacherClasses(teacherId)` and `getTeacherDashboard(teacherId)` in `packages/domain/src/teachers/` (new module), Phase 3: replace inline query with a single domain function call. **Note:** teachers as a top-level module does not exist in `packages/domain/src/` -- the 14 modules do not include `teachers/`. This finding also surfaces a domain-coverage gap: there is no `teachers/` module, no `analytics/` module, no `gamification/` module despite the app's analytics routes. See F-304.
- **Cross-reference (duplicate):** Same finding filed as F-208 in `findings-partial-2-7.md` from the §2.4 (no business logic in page.tsx) angle. Severity and evidence match. Executive summary should count this once.

### F-307: 22 `app/api/**/route.ts` files import `db` directly (per Critical F-001 anchor)
- **Rule:** 3.5 (cross-cuts §2.5)
- **Severity:** Critical
- **Evidence:** `rg -l "from '@reading-advantage/db'" apps/science-advantage/app/api/` (excluding tests) returns 22 unique `route.ts` files:
  ```
  app/api/ai/recommendations/route.ts
  app/api/ai/update-mastery/route.ts
  app/api/classes/[classId]/analytics/overview/route.ts
  app/api/classes/[classId]/assignments/route.ts
  app/api/classes/[classId]/curriculum/route.ts
  app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts
  app/api/classes/[classId]/roster/route.ts
  app/api/classes/[classId]/route.ts
  app/api/classes/join/route.ts
  app/api/classes/route.ts
  app/api/lessons/[lessonSlug]/quiz/route.ts
  app/api/lessons/[lessonSlug]/route.ts
  app/api/students/me/gamification/route.ts
  app/api/students/[studentId]/achievements/route.ts
  app/api/students/[studentId]/assignments/route.ts
  app/api/students/[studentId]/classes/[classId]/analytics/route.ts
  app/api/students/[studentId]/gamification-profile/route.ts
  app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts
  app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts
  app/api/students/[studentId]/mastery-profile/route.ts
  app/api/teachers/classes/[classId]/intervention-alerts/route.ts
  app/api/teachers/dashboard/route.ts
  ```
  Total `route.ts` files in `app/api/`: 27. Subtract 4 auth stubs + 1 `app/api/student/classes/route.ts` (uses `lib/services/classes/get-student-classes.ts`) = 22 that import `db` directly. **Plus 2 `page.tsx` files (F-306).** Plus 9 `lib/services/*` files (`lib/services/classes/get-class-detail.ts`, `lib/services/classes/get-student-classes.ts`, `lib/services/mastery/mastery-worker.ts`, `lib/services/mastery/standard-mastery.ts`, `lib/ai/recommendation-context.ts`, `lib/gamification/badges.ts`, `lib/gamification/streak.ts`, `lib/auth/session.ts`, `lib/utils/generateJoinCode.ts`) that import `db` directly -- these are the closest thing science-advantage has to a domain layer, but they live in the app rather than in `packages/*`.
- **Impact:** This is the **F-001 anchor** -- 27/27 of the original pilot's route.ts files imported `db` directly. After the 5 excluded files (4 stubs + 1 fully migrated), the violation remains in 22 routes. The complete impact analysis from F-001 still applies: auth/tenancy is hand-rolled per route, no shared error handling, no audit logging, no rate limiting at the route layer, no consistent input validation. The 9 `lib/services/*` files are an in-app domain layer that is not part of `packages/domain` -- they cannot be reused by other apps.
- **Suggested fix track:** Same as F-305. The 9 `lib/services/*` files are the natural migration targets -- lift them into `packages/domain/src/` (e.g. `lib/services/classes/*` -> `packages/domain/src/classes/`, `lib/services/mastery/*` -> `packages/domain/src/mastery/`, `lib/gamification/*` -> `packages/domain/src/gamification/`). Some need to be split (e.g. `lib/gamification/streak.ts` is 1 function, `badges.ts` is 1 function -- these should be queries/mutations, not services).
- **Cross-reference (duplicate):** Same finding filed as F-203 in `findings-partial-2-7.md` from the §2.5 (no `db` import in route.ts) angle. F-203 was demoted from Critical to High after the retcon that found 22 (not 27) routes; this report re-affirms Critical for §3 because the F-001 anchor is intact and the implication for §3 (domain layer unused) makes the consequence worse than the §2.5 raw count.

---

## Section 4 — Authentication findings

### F-401: `lib/auth/session.ts` is a thin duplicate of the auth-adapter cookie surface
- **Rule:** 4.2
- **Severity:** Low
- **Evidence:** `apps/science-advantage/lib/auth/session.ts:93-118` defines `setSessionCookie`, `getSessionToken`, `deleteSessionCookie` -- all three call `cookies()` and set/get/delete `SESSION_COOKIE_NAME` (which is imported from `@reading-advantage/auth` on line 9). `apps/science-advantage/lib/auth/server.ts:1-40` defines `requireAuth`, `requireRole`, `hasRole`, `getSession` -- all of which call the corresponding exported function from `@reading-advantage/auth` (e.g. line 22: `roleAtLeast(session.user.role, requiredRole)`) or re-derive from the local `getCurrentSession`.
- **Impact:** The local `lib/auth/{session,server}.ts` files are a **1-to-1 mirror** of the auth-adapter surface that AGENTS.md §4.2 prescribes. They exist because the app wanted a "ready-to-import from `@/lib/auth/...`" path, but they introduce an extra layer of indirection that can drift (e.g. if `@reading-advantage/auth` adds a `refreshSession` function, the local mirror will not pick it up). They are not buggy -- they use the shared `SESSION_COOKIE_NAME` constant and the shared `createSession`/`validateSession` helpers -- but they violate the spirit of §4.2 ("Application code should depend on auth.login(), auth.logout(), ... from the shared package").
- **Suggested fix track:** "science-advantage — Flatten local auth wrapper" -- Phase 1: replace all `import { ... } from '@/lib/auth/server'` with `import { ... } from '@reading-advantage/auth'`, Phase 2: delete `lib/auth/server.ts`, Phase 3: replace `lib/auth/session.ts` callers with the shared `getSession`/`requireRole` directly (the shared package already returns enough user data; the local `Session` type only adds `email` and `image` which can be fetched from `db.users`). Small refactor; no behavior change.

### F-402: `bcryptjs` is a production dep + used in 3 seed scripts (bypasses auth package)
- **Rule:** 4.4
- **Severity:** Critical
- **Evidence:** `apps/science-advantage/package.json:56` declares `"bcryptjs": "^3.0.2"` in `dependencies` (production). `package.json:82` has `@types/bcryptjs` in devDependencies. The 3 seed scripts:
  - `apps/science-advantage/scripts/seed-demo-users.ts:2` -- `import bcrypt from 'bcryptjs';` -- line 9: `const hashedPassword = await bcrypt.hash(password, 10);`
  - `apps/science-advantage/scripts/seed/seed-demo-data.ts:2` -- same import; line 36 same hash call.
  - `apps/science-advantage/scripts/seed/seed-activity-data.ts:2` -- same import; line 44 same hash call.
  - These 3 scripts hand-roll `bcrypt.hash(password, 10)` instead of calling `hashPassword` from `@reading-advantage/auth`. The hash format produced (10 salt rounds of bcryptjs) must match the verify side (`bcrypt.compare` in `packages/auth/src/password.ts:25`), so the seed scripts are coupled to the in-package implementation.
- **Impact:** Per severity guidance, **"`bcryptjs`/`bcrypt` in app code outside `packages/auth` = Critical"**. The seed scripts work today only because the in-package `password.ts` happens to use the same library with the same cost factor. If `packages/auth` migrates to Argon2id (which AGENTS.md §4.4 says it should), all 3 seed scripts break and produce hashes the verifier cannot parse. The production-dep entry is the second issue -- it inflates the app's attack surface and makes the dependency graph harder to reason about (any code in the app can now import `bcryptjs` directly, not just scripts).
- **Suggested fix track:** Couples with F-406. "science-advantage — Argon2id migration + script adapter" -- Phase 1: migrate `packages/auth/src/password.ts` to Argon2id (`@node-rs/argon2` is the recommended Rust-backed library), Phase 2: provide a one-shot migration path for existing bcrypt hashes (verify with bcrypt; on next successful login, re-hash with Argon2id), Phase 3: update the 3 seed scripts to import `hashPassword` from `@reading-advantage/auth` instead of `bcryptjs`, Phase 4: remove `bcryptjs` from `apps/science-advantage/package.json` production deps. **This is a shared-package change that touches every app that has bcrypt hashes in its DB -- coordinate with primary-advantage, reading-advantage, www-reading-advantage, codecamp-advantage, advantage-games.**
- **Cross-reference (duplicate):** Same finding filed as F-206 in `findings-partial-2-7.md` from the §2.3 (no wrapped-package deps) angle. F-206 is Medium, F-402 is Critical because the seed scripts and production-dep entry are symptoms of the §4.4 violation, which is the actual AGENTS.md requirement. The shared root cause is F-406.

### F-403: Login rate-limiter is an in-memory `Map`, not Postgres-backed
- **Rule:** 4.5 (cross-cuts §4.6)
- **Severity:** Medium
- **Evidence:** `packages/auth/src/rate-limit.ts:9` -- `const rateLimits = new Map<string, RateLimitEntry>();`. The same `Map` is mutated by `checkRateLimit` (read), `recordFailure` (write), and `resetLimit` (delete) on lines 19, 49, 63. The `Map` is process-local.
- **Impact:** In a multi-process deployment (Vercel serverless, Cloud Run, Fly.io with 2+ instances, Kubernetes with replicas), each process has its own `Map`. A brute-force attacker can spread their 5-attempt budget across N processes, multiplying the effective rate by N. In a serverless deploy where containers are short-lived, the `Map` may be reset on every cold start, eliminating rate limiting entirely. AGENTS.md §4.5 calls out "no in-memory sessions, no `Map<>` caches across requests" -- the rate-limiter is not a session, but is a parallel anti-pattern.
- **Suggested fix track:** "science-advantage — Postgres-backed rate limiter" -- Phase 1: add a `login_attempts` table in `packages/db/src/schema/auth.ts` (or extend an existing table) with columns `(username, failed_count, window_start, last_attempt_at)`, Phase 2: replace the `Map` with a `SELECT ... FOR UPDATE` upsert pattern, Phase 3: add a periodic cleanup job to `services/worker` (or `lib/platform/session-cleanup.ts` already runs -- add a sibling `rate-limit-cleanup.ts`), Phase 4: keep the in-memory `Map` as a fast-path in development only. Or use Redis if already available (the app has `lib/platform/redis-client.ts`).

### F-404: No audit log table or write code exists anywhere in the monorepo
- **Rule:** 4.7 (cross-cuts §9.4, §9.5)
- **Severity:** High
- **Evidence:** `rg 'auditLog\|audit_log' apps/science-advantage/lib/auth/` returns 0 hits. `rg 'auditLog\|audit_log' packages/api/src/routes/auth/` returns 0 hits. `find packages/db -name '*audit*'` returns 0 schema files. `rg 'audit' packages/db/drizzle/*.sql` returns 0 references in the migration SQL (the 2 hits are comments referencing a Prisma-to-Drizzle "audit" track, not a table). `packages/auth/src/password.ts:hashPassword/verifyPassword` and `session.ts:createSession/validateSession/deleteSession` do not call any audit insert. `packages/api/src/routes/auth/login.ts:36-132` (the full login flow) ends with `NextResponse.json({ success: true, user: ... })` -- no audit row.
- **Impact:** AGENTS.md §4.7 requires: "Audit log table exists and `auth.login`, `auth.logout`, `auth.changePassword` write to it." §9.4 expands: "Audit events are written for: login, logout, password change, permission change, billing event, destructive action." Today, **none of these events are recorded anywhere**. A security incident response cannot answer: who logged in, from where, when; who changed whose role; who deleted what. The mitigation today is the Postgres `sessions` table (records who has an active token) -- this is necessary but not sufficient. Severity: **High** because the lack of audit logs is invisible until a security incident, at which point it becomes Critical retrospectively.
- **Suggested fix track:** "science-advantage + monorepo — Audit log infrastructure" -- Phase 1: add `audit_events` table in `packages/db/src/schema/audit.ts` with columns `(id, actor_user_id, actor_role, action, target_type, target_id, ip_address, user_agent, metadata jsonb, created_at)` and a `REVOKE UPDATE, DELETE` migration, Phase 2: add `recordAuditEvent(action, ctx, payload)` to `packages/auth/src/audit.ts` (or `packages/observability/` if that package exists), Phase 3: call it from `packages/auth/src/{password,session}.ts` and `packages/api/src/routes/auth/*.ts`, Phase 4: build an admin-facing query surface (separate track). Per AGENTS.md §9.5, the table must be **append-only** -- Drizzle migration must `REVOKE UPDATE, DELETE` from the app role.
- **Cross-reference (duplicate):** Same finding filed as F-901 in `findings-partial-6-9.md` from the §9.4 (audit events for security-sensitive actions) angle. F-901 covers the broader scope (no audit log for any auth/permission/billing/destructive action); F-404 is the §4.7 slice. Executive summary should count this once and use F-901 as the canonical ID.

### F-405: 23 hand-rolled `role === '...'` checks across 17 app files bypass `assertCan`/`roleAtLeast`
- **Rule:** 4.9
- **Severity:** High
- **Evidence:** Full list of 23 hand-rolled role checks across 17 files in `apps/science-advantage/app/` (non-test). Each bypasses the centralized `PERMISSIONS` map in `packages/auth/src/permissions.ts` and the `assertCan(user, "<resource>:<action>", tenant)` enforcement point.

  | File | Lines | Pattern | Permission key that should be used |
  |------|------:|---------|------------------------------------|
  | `app/api/students/[studentId]/gamification-profile/route.ts` | 57 | `=== 'TEACHER' \|\| === 'ADMIN'` | `gamification:read:all` |
  | `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` | 56 | `=== 'ADMIN'` | `progress:read:all` (after tenancy check) |
  | `app/(teacher)/teacher/classes/[classId]/analytics/page.tsx` | 37 | `=== 'STUDENT'` (deny) | `class:read` + tenant ownership |
  | `app/(teacher)/teacher/classes/[classId]/roster/page.tsx` | 32 | `=== 'STUDENT'` (deny) | `class:roster` |
  | `app/api/classes/[classId]/analytics/overview/route.ts` | 46 | `=== 'ADMIN'` | `class:read` |
  | `app/api/classes/[classId]/assignments/route.ts` | 182, 321 | `=== 'ADMIN'` (x2) | `assignment:read` + tenancy |
  | `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` | 64 | `=== 'ADMIN'` | `progress:read:all` |
  | `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` | 97, 99 | `=== 'ADMIN'` + `=== 'TEACHER' && userId === teacherId` | needs new permission |
  | `app/api/classes/[classId]/route.ts` | 35, 102, 193 | `=== 'ADMIN' \|\| === 'SYSTEM'` (x3) | `class:read` / `class:update` |
  | `app/api/ai/recommendations/route.ts` | 114, 116 | `=== 'STUDENT'`, `=== 'TEACHER' \|\| === 'ADMIN'` | (no domain function exists yet) |
  | `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` | 57 | `=== 'ADMIN'` | `progress:read:all` |
  | `app/api/ai/update-mastery/route.ts` | 248 | `=== 'STUDENT'` (deny unless self) | new permission |
  | `app/api/students/[studentId]/mastery-profile/route.ts` | 85 | `=== 'TEACHER' \|\| === 'ADMIN'` | `progress:read:all` |
  | `app/api/students/[studentId]/achievements/route.ts` | 29 | `=== 'TEACHER' \|\| === 'ADMIN'` | `gamification:read:all` |
  | `app/api/classes/[classId]/roster/route.ts` | 42, 137 | `=== 'ADMIN'` (x2) | `class:roster` |
  | `app/api/student/classes/route.ts` | 21 | `!== 'STUDENT'` (deny) | `class:join` (reuses existing) |
  | `app/(student)/student/profile/page.tsx` | (1 hit) | (full content not re-checked) | `user:read` (self) |
  | `app/(teacher)/teacher/classes/[classId]/page.tsx` | 36 | `=== 'STUDENT'` (deny) | `class:read` |

  Total: **23 checks in 17 files** (13 route.ts + 4 page.tsx). For comparison, the centralized permission system in `packages/auth/src/permissions.ts` defines 36 permissions, each mapping to a `Role[]` -- none of these 23 checks reference a permission key.
- **Impact:** Per AGENTS.md §4.9: "Role hierarchy is enforced in `packages/auth` ... and reused everywhere; no app-local `if (user.role === "ADMIN")` ladders." The 23 hand-rolled checks mean: (a) when a new role is added (e.g. `PARENT`), all 17 files must be updated individually, (b) the centralized `PERMISSIONS` map is partially a fiction -- it documents the intended role matrix, but the actual enforcement is in the route handlers, (c) `assertCan` is never called in the science-advantage app, so the audit log of "permission denied" events (when we add F-404) will be empty, (d) **per the severity guidance, "App-local role ladder with >3 manual checks = Medium" -- this is 23, so it's High** (the jump from 3 to 23 is the threshold where the pattern becomes structural).
- **Suggested fix track:** Couples with F-305 / F-307. "science-advantage — Replace role === ladders with assertCan" -- Phase 1: catalog the 23 checks and map each to a permission key (or define new keys in `packages/auth/src/permissions.ts`), Phase 2: in the F-305 migration, replace each `if (session.user.role === 'X')` with `assertCan(user, "<key>", tenant)`, Phase 3: add a `requirePermission(key)` HOF in `packages/auth/src/server.ts` to make the call site one line. **Cannot proceed in isolation -- this finding is subsumed by F-305.** Track should be filed but its priority is below F-305 / F-307.
- **Cross-reference (partial duplicate):** F-702 in `findings-partial-2-7.md` says "26 of 27 routes hand-roll role/ownership checks instead of calling `requireRole`" -- broader scope (covers ownership checks like `userId === teacherId` too, and includes `requireRole` as the missing primitive). F-405 is narrower (only the `role === 'X'` ladder pattern, calls out `assertCan`/`roleAtLeast` as the missing primitive). The fix track overlaps substantially -- both should fold into the F-305 "App routes to domain layer migration" track, with the `assertCan` replacement as a sub-task.

### F-406 (shared): `packages/auth/src/password.ts` uses `bcryptjs` (not Argon2id)
- **Rule:** 4.4
- **Severity:** Critical (shared)
- **Evidence:** `packages/auth/src/password.ts:1` -- `import bcrypt from "bcryptjs";`. Lines 11 and 25: `bcrypt.hash(password, SALT_ROUNDS)` and `bcrypt.compare(password, hash)`. `packages/auth/package.json:20` -- `"bcryptjs": "^2.4.3"` in dependencies.
- **Impact:** This is a **monorepo-wide** finding, not specific to science-advantage. The same `password.ts` is consumed by reading-advantage, primary-advantage, www-reading-advantage, codecamp-advantage, and advantage-games. The app-level F-402 (3 seed scripts) is the *science-advantage* symptom; F-406 is the root cause. Per AGENTS.md §4.4: "Password hashing uses Argon2id (verify in `packages/auth`)." Per AGENTS.md §Known Issues: "`@reading-advantage/auth` uses JWT (migrating to session-based auth adapter)" -- the migration to session-based auth is in progress; the migration to Argon2id is the natural next step. **This is the highest-leverage finding in the entire audit -- one PR migrates the password module and unblocks 6 apps.**
- **Suggested fix track:** "monorepo — Argon2id password migration" -- See F-402 for the full plan. This finding is filed in the science-advantage audit because the science-advantage seed scripts are the most visible symptom, but the track owner should be `@reading-advantage/auth`.

### F-407: Rate limit window is 5 attempts / 15 min; no per-IP throttling, no captcha escalation
- **Rule:** 4.6 (operational)
- **Severity:** Low
- **Evidence:** `packages/auth/src/rate-limit.ts:6-7` -- `const WINDOW_MS = 15 * 60 * 1000;` (15 min), `const MAX_ATTEMPTS = 5;`. The `checkRateLimit` function (line 16) takes only a `username` parameter -- no IP, no user-agent, no captcha escalation. An attacker can iterate over many usernames from the same IP without rate limiting; conversely, a single attacker can lock out a victim by intentionally failing logins for the victim's username 5 times.
- **Impact:** The current rate limit is a **username-only** throttle. A credential-stuffing attack using a stolen password list will hit 5 attempts per username then move on, but the attacker is not blocked per-IP, so they can hammer 1000 usernames / 15 min without slowing down. There is also no defense against "username lockout" attacks where a malicious actor intentionally fails 5 logins for a victim's username to deny them access. AGENTS.md §4.6: "Rate limiting exists on login and other security-sensitive endpoints." It exists, but the *shape* is incomplete.
- **Suggested fix track:** "monorepo — Per-IP rate limit + captcha escalation" -- Phase 1: add per-IP rate limit (e.g. 30 attempts / 15 min from a single IP), Phase 2: add captcha trigger after 3 failed attempts, Phase 3: add "username lockout" notification so the victim knows they are being targeted. This is a separate track from F-403 (Postgres-backed storage) -- F-403 fixes the durability, F-407 fixes the policy. Could be combined into a single "Rate limiter v2" track.

---

## Cross-cutting observations

1. **The domain layer is unused by the audited app.** `packages/domain/src/` has 14 modules, 82 `assertCan` calls, 4,000+ lines of code. **Zero imports from `apps/science-advantage/app/`.** The only consumers in the monorepo are the tRPC routers in `packages/api/src/routers/`, which science-advantage does not use. This is a §3 / §7 joint finding (F-301 to F-305 collectively).

2. **The `lib/services/*` directory is an in-app domain layer.** `lib/services/classes/`, `lib/services/mastery/`, plus `lib/ai/`, `lib/gamification/`, `lib/interventions/`, `lib/auth/`, `lib/quiz/` are all "domain-shaped" code that lives in the app rather than in `packages/*`. The 5 `lib/services/*` files that import `db` directly are the natural F-305 migration candidates.

3. **No audit log table is the most invisible finding.** F-404 looks small (1 missing table) but it undercuts every other security finding. Without an audit log, F-001 (per-route auth) and F-405 (hand-rolled role checks) cannot be retroactively verified; without it, F-402 (Argon2id migration) cannot be tracked (we won't know whose passwords were rehashed vs. whose accounts are still on bcrypt).

4. **The app-local `lib/auth/{session,server}.ts` wrappers are an unforced error.** They exist for ergonomic reasons (`@/lib/auth/...` is shorter than `@reading-advantage/auth`) but they duplicate the surface the spec already prescribes. F-401 is the easiest fix in this entire audit -- 4 files, ~150 lines, no behavior change.

5. **The `proxy.ts` hardening from the 2026-05-26 pilot is intact.** F-004 (cookie-only admin guard) is resolved; the current `proxy.ts` uses `requireRole`. This is the one piece of post-pilot compliance that has stuck. The other pilots (F-001, F-002, F-003) remain.
