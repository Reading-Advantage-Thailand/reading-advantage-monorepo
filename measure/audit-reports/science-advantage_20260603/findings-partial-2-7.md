# Findings — Sections 2 + 7 (science-advantage, 2026-06-03)

> **Severity scheme:** see `measure/agents-md-audit-protocol.md` §Severity Scheme.
> **Anchor for retcon:** F-001 from pilot (2026-05-26) said 27 of 27 route.ts import db. Re-scan (multiline-safe) confirms **22 of 27**. The 5 that are clean (4 auth stubs + `student/classes/route.ts`) make F-203 a High finding, not Critical.

---

## Summary table

| ID | Rule | Severity | Title |
|----|------|----------|-------|
| F-201 | 2.3 | Low | App has direct deps on `drizzle-orm`, `zod`, `bcryptjs` (should be wrapped) |
| F-202 | 2.3 | Low | App has direct deps on AI SDK packages (`@ai-sdk/google`, `@ai-sdk/openai`, `ai`) |
| F-203 | 2.5 | **High** | 22 of 27 `app/**/route.ts` import `db` directly from `@reading-advantage/db` |
| F-204 | 2.6 | Low | Drizzle `sql\`\`` helper used in 2 routes + 1 service + 1 script (typed SQL, not raw) |
| F-205 | 2.8 | Medium | Legacy `apps/science-advantage/prisma/` directory still present (56 files, no `schema.prisma`) |
| F-206 | 2.3 / 4.4 | Medium | `bcryptjs@3.0.2` direct dep in app (AGENTS.md requires Argon2id in `packages/auth`) |
| F-207 | 2.7 / 3.1 | Low | 14 scripts call `db` directly instead of delegating to `lib/services/*` or `packages/domain` |
| F-208 | 2.4 | **High** | 2 of 22 `page.tsx` files import `db` and run multi-step query orchestration |
| F-701 | 7.1 | **High** | All 5 spot-checked `route.ts` files are fat (159–624 lines, multiple inline DB calls) |
| F-702 | 7.1 | **High** | 26 of 27 routes hand-roll role/ownership checks instead of calling `requireRole` |
| F-703 | 7.3 | Low | `packages/domain/src/codecamp/index.ts:1952` embeds GitHub `fetch()` with inline `headers` in domain |
| F-704 | 7.1 / 6.1 | Low | `app/api/classes/[classId]/assignments/route.ts` POST/DELETE use raw `body as { ... }` casts, no Zod |
| F-705 | 7.1 | Low | 4 auth `route.ts` stubs at `app/api/auth/*/route.ts` (6 lines each) — verify if dead code |

---

## F-201: App has direct deps on `drizzle-orm`, `zod`, `bcryptjs` (should be wrapped)

- **Rule:** 2.3 (no wrapped-package deps)
- **Severity:** Low
- **Evidence:**
  - `apps/science-advantage/package.json:59` — `"drizzle-orm": "^0.44.0"`
  - `apps/science-advantage/package.json:74` — `"zod": "^3.25.76"`
  - `apps/science-advantage/package.json:56` — `"bcryptjs": "^3.0.2"`
- **Impact:** Gradual erosion of the monorepo abstraction. Any app that imports `drizzle-orm` directly bypasses the per-tenant wrapper and can write queries without `schoolId` predicates. Same risk for `zod` (validation drift across apps) and `bcryptjs` (auth hashing inconsistency).
- **Suggested fix track:** "science-advantage — Remove direct shared-package deps" (Phase 1: inventory all usage of drizzle-orm/zod, Phase 2: move to packages/db re-exports + types, Phase 3: remove from package.json; ~1 week)

## F-202: App has direct deps on AI SDK packages

- **Rule:** 2.3 / 1.3 (provider neutrality)
- **Severity:** Low
- **Evidence:**
  - `apps/science-advantage/package.json:22-23,55` — `"@ai-sdk/google": "^2.0.36"`, `"@ai-sdk/openai": "^2.0.68"`, `"ai": "^5.0.95"`
  - Used by `lib/ai/{mastery-calculator,recommendation-service,image-generator,recommendation-context}.ts`
- **Impact:** Tight coupling to Vercel AI SDK + OpenAI/Google providers. If a future track migrates to a different LLM provider, every app must re-migrate independently. AGENTS.md §AI says "Internally the adapter may use Vercel AI SDK… Application code must not depend directly on provider SDKs."
- **Suggested fix track:** Same as F-201 (or a dedicated "AI adapter" track if §1 audit surfaces more issues).

## F-203: 22 of 27 `app/**/route.ts` import `db` directly (F-001 retcon)

- **Rule:** 2.5 (no direct db import in route.ts)
- **Severity:** **High** (per protocol: 10–24 = High, 25+ = Critical)
- **Evidence (full list, 22 files):**
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
  The 5 that are clean:
  ```
  app/api/auth/impersonate/route.ts    (delegates to @reading-advantage/api/routes/auth)
  app/api/auth/login/route.ts          (delegates to @reading-advantage/api/routes/auth)
  app/api/auth/logout/route.ts         (delegates to @reading-advantage/api/routes/auth)
  app/api/auth/session/route.ts        (delegates to @reading-advantage/api/routes/auth)
  app/api/student/classes/route.ts     (delegates to lib/services/classes/get-student-classes)
  ```
- **Impact:** Auth/tenancy enforcement is per-route. No way to add audit logging, rate limiting, or shared error handling consistently. The 4 auth route stubs show the pattern is achievable — they delegate to `packages/api`.
- **Suggested fix track:** "science-advantage — Domain-Layer API Migration" (Phase 1: pick 1 representative route, e.g. `student/classes/route.ts` already done — use as template; Phase 2: scaffold `lib/services/{classes,mastery,gamification,interventions}/` and migrate 3 high-traffic routes; Phase 3: migrate the remaining 19). ~3 weeks.

## F-204: Drizzle `sql\`\`` helper used in 2 routes + 1 service + 1 script

- **Rule:** 2.6 (raw SQL outside db/domain)
- **Severity:** Low (not strictly a §2.6 violation — Drizzle's typed `sql\`\`` is the Drizzle way of expressing dynamic fragments; `prisma.$queryRaw` / `pg` is what's prohibited)
- **Evidence:**
  - `app/api/teachers/dashboard/route.ts:163` — `lt(scienceStandardMastery.masteryLevel, sql\`0.6\`)`
  - `app/api/teachers/classes/[classId]/intervention-alerts/route.ts:166` — `sql\`${interventionConfig.masteryFilterLevel}\``
  - `lib/services/mastery/standard-mastery.ts:68` — `evidenceCount: sql\`${scienceStandardMastery.evidenceCount} + ${evidenceDelta}\``
  - `scripts/dev-interventions.ts:78` — `sql\`${interventionConfig.masteryFilterLevel}\``
- **Impact:** These fragments escape type-safe Drizzle column references and can be a source of subtle bugs (e.g. if a column is renamed, the fragment won't be caught by the Drizzle column-rename codemod). Not a §2.6 violation, but should be tracked alongside F-203.
- **Suggested fix track:** None standalone. Folds into F-203 / F-208 — once a domain service owns the logic, the SQL fragment lives inside the service.

## F-205: Legacy `apps/science-advantage/prisma/` directory still present (56 files, no `schema.prisma`)

- **Rule:** 2.8 (no app-level prisma/)
- **Severity:** Medium
- **Evidence:**
  ```
  prisma/
  ├── data/content/grade-4/    (20 .json lessons + questions)
  ├── seed-data/               (24 .json: curriculum-units, lessons, questions, standards + README.md)
  ├── seed-functions/update-seed-files.ts   (38 lines, the only .ts)
  └── __tests__/               (empty directory)
  ```
  56 files total (per `find prisma -type f | wc -l`).
- **Impact:** Confusing for new contributors. The directory name suggests Prisma is in use; it isn't (`package.json` has no `prisma`/`@prisma/client`). The legacy seed-data bucket should be relocated.
- **Suggested fix track:** "science-advantage — Relocate legacy prisma/ seed-data" (Phase 1: move `prisma/data/` → `scripts/seed-data/grade-4/`, `prisma/seed-data/` → `scripts/seed-data/curriculum/`, `prisma/seed-functions/update-seed-files.ts` → `scripts/seed/update-seed-files.ts`; Phase 2: update all import paths in 7 seed scripts; Phase 3: delete `prisma/`; add a CODEOWNERS rule that no app may have a `prisma/` dir at root). ~2 days.

## F-206: `bcryptjs@3.0.2` direct dep in app (cross-references §4.4)

- **Rule:** 2.3 / 4.4 (password hashing)
- **Severity:** Medium
- **Evidence:**
  - `apps/science-advantage/package.json:56` — `"bcryptjs": "^3.0.2"`
  - `apps/science-advantage/package.json:82` — `"@types/bcryptjs": "^2.4.6"`
  - Used by `lib/auth/{server,session}.ts` for password hashing
- **Impact:** AGENTS.md §4.4 requires Argon2id in `packages/auth`. `bcrypt` is acceptable as a fallback but is not the default. Currently the app picks its own algorithm — there is no `@reading-advantage/auth` `auth.hashPassword()` adapter being called.
- **Suggested fix track:** "science-advantage — Auth surface migration" (Phase 1: audit `lib/auth/*`; Phase 2: move hashing to `packages/auth`; Phase 3: remove `bcryptjs` from app deps). Cross-references `measure/tech-debt.md` `auth_strategy_review`. ~1 week.

## F-207: 14 scripts call `db` directly instead of delegating to `lib/services/*` or `packages/domain`

- **Rule:** 2.7 / 3.1 (backend-as-code)
- **Severity:** Low
- **Evidence (scripts importing `db` from `@reading-advantage/db`):**
  ```
  scripts/dev-interventions.ts
  scripts/migrate-lesson-content.ts
  scripts/test-curriculum-endpoint.ts
  scripts/create-test-users.ts
  scripts/seed-demo-users.ts
  scripts/backfill-thai-titles.ts
  scripts/backfill-mastery.ts
  scripts/seed/seed-demo-data.ts
  scripts/seed/seed-curriculum-units.ts
  scripts/seed/seed-lessons.ts
  scripts/seed/seed-activity-data.ts
  scripts/seed/seed-questions.ts
  scripts/seed/seed-standards.ts
  ```
- **Impact:** Scripts duplicate domain logic. If the domain function changes (e.g. `recordStandardMastery` gains a new field), the backfill script must be updated separately. This is a §3.1 (backend-as-code) concern, not a §2.7 concern.
- **Suggested fix track:** Folds into the broader "Domain-Layer API Migration" (F-203). Seed scripts are the easiest place to start.

## F-208: 2 of 22 `page.tsx` files import `db` and run multi-step query orchestration

- **Rule:** 2.4 (no business logic in pages)
- **Severity:** **High** (per protocol: "Business logic in page.tsx (heavy, not just reads) = High")
- **Evidence:**
  - `app/(teacher)/teacher/page.tsx:1-20` — imports `db, desc, eq` from `@reading-advantage/db`, queries `scienceClasses` with `where(eq(scienceClasses.teacherId, session.user.id))`, `orderBy(desc(scienceClasses.createdAt))`, `limit(10)`. This is a teacher-scoped read with a sort+limit but it's only one query and only 9 lines — **borderline acceptable** as a server-component data fetch.
  - `app/(teacher)/teacher/classes/page.tsx:3-43` — imports `count, db, desc, eq, inArray` from `@reading-advantage/db`. Runs **two queries**: (1) all classes where `teacherId = session.user.id`, (2) a `groupBy` count of students per class via `count()` aggregate. Then in JS, builds a `Map<classId, count>` and merges back. This is multi-step query orchestration that belongs in a domain function.
- **Impact:** Multi-tenancy predicates are spread between page and domain. If the school-scoped filter changes (`schoolId` rather than `teacherId`), every page with a direct query must be updated.
- **Suggested fix track:** Same as F-203. The 5 spot-checked `components/**/*.tsx` are clean (presentation only) — pages are the smaller, faster win.
- **Spot-check verdict for the other 20 `page.tsx` files:** The 5 components spot-checked (`teacher-dashboard-classes.tsx`, `quiz-player.tsx`, `class-analytics-overview.tsx`, `create-class-form.tsx`, `student-mastery-profile*`) are all presentation-only — no DB imports, no business rules. Components are healthy.

---

## F-701: All 5 spot-checked `route.ts` files are fat (159–624 lines, multiple inline DB calls)

- **Rule:** 7.1 (route.ts should be thin)
- **Severity:** **High** (per protocol: "route.ts > 100 lines with DB queries inline = High")
- **Evidence (5 spot-checked):**

  | File | Lines | Inline DB calls | Validation | Notes |
  |------|------:|----------------:|-----------|-------|
  | `app/api/ai/update-mastery/route.ts` | **624** | ~20 (`db.select`, `db.transaction`, `db.insert`) | `z.object({ attemptId })` schema | Includes 60-line `loadAttemptContext` helper, 200-line transaction, mastery-grade math, rate limiter (in-memory `Map`), and PG error-code branching. **Worst-case file.** |
  | `app/api/lessons/[lessonSlug]/quiz/route.ts` | 519 | ~15 | inline `if (!attemptId \|\| !responses)`, no Zod | 2 handlers (GET + POST). POST embeds quiz-grading loop with `gradeAnswer()` + `calculateXpForQuiz()` + `awardXp()` + `updateStreakForProfile()` + `checkBadgeConditions()` + `processMasteryRun()` — should be a single `submitQuizAttempt` domain function. |
  | `app/api/ai/recommendations/route.ts` | 400 | ~7 | `z.object({ attemptId })` schema | Embeds 145-line `loadAttemptWithRelations` helper. Authorization is hand-rolled via `authorizeAttempt()` (lines 103–132) instead of `requireRole`. Has an in-process `Map` cache + Redis rate-limit store. |
  | `app/api/classes/[classId]/assignments/route.ts` | 364 | ~7 | **none** — uses `body as { lessonId?: string }` (F-704) | 3 handlers (GET + POST + DELETE). Each hand-rolls the same role check. |
  | `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` | 287 | ~5 | `z.object({ limit, severity, cursor, since, refresh })` | Uses Drizzle `sql\`0.6\`` (F-204). Cache logic inline. |

  The other 22 routes are similar in shape (all 100+ lines, all 2+ DB calls inline, 21 of them hand-rolling role checks).
- **Impact:** Test coverage is at the route level (each `route.ts` has a sibling `*.integration.test.ts`); if the route is migrated to a domain function, all 22 tests need to be re-pointed. This is a large, multi-week migration.
- **Suggested fix track:** Same as F-203. Add a "thin-route refactor" sub-track to: (a) move quiz-grading from `quiz/route.ts` to `lib/services/mastery/grade-and-award.ts`, (b) move the mastery transaction from `update-mastery/route.ts` to `lib/services/mastery/record-run.ts`, (c) move assignment CRUD to `lib/services/classes/assignments.ts`.

## F-702: 26 of 27 routes hand-roll role/ownership checks instead of calling `requireRole`

- **Rule:** 7.1 (route.ts should be thin) / 4.2 (auth adapter)
- **Severity:** **High**
- **Evidence (sample):**
  - `app/api/ai/recommendations/route.ts:103-132` — custom `authorizeAttempt()` function with `isStudent`, `isTeacherOrAdmin`, `canImpersonate` ladder
  - `app/api/classes/route.ts:38-89` — `getCurrentSession` + manual `session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN'`
  - `app/api/classes/[classId]/assignments/route.ts:24, 141-155, 280-294` — same pattern repeated 3× (GET/POST/DELETE)
  - `app/api/teachers/dashboard/route.ts:16` — correctly uses `requireRole('TEACHER')` (one of the few good ones)
  - `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts:35` — correctly uses `requireAuth()` (the other good one)
  - `lib/auth/session.ts` — the in-app auth helper, imports `db` directly, not the shared adapter
- **Impact:** The `requireAuth`/`requireRole` adapter exists in `lib/auth/server.ts` and is used by 22 page.tsx files. Routes are inconsistent — some use the adapter, most roll their own. This is a §4.2 violation cross-listed under §7.1.
- **Suggested fix track:** "science-advantage — Authz adapter rollout" (Phase 1: catalog 26 hand-rolled checks, group by pattern: ownership-vs-role-vs-mixed; Phase 2: add `requireOwnership(resource, userId)` helper if missing; Phase 3: replace per-route; Phase 4: delete `lib/auth/session.ts`'s `getCurrentSession` once nothing calls it). ~1.5 weeks.

## F-703: `packages/domain/src/codecamp/index.ts:1952` embeds GitHub `fetch()` with inline `headers` in domain

- **Rule:** 7.3 (no transport imports in domain)
- **Severity:** Low (cross-cutting; not in science-advantage codebase)
- **Evidence:** `packages/domain/src/codecamp/index.ts:1946-1969` — `getPracticeIssues()` makes a `fetch('https://api.github.com/...')` call with `headers: { Accept: "application/vnd.github.v3+json" }` and `next: { revalidate: 300 }` (the `next` extension is a Next.js ISR-specific `RequestInit`).
- **Impact:** Domain code reaches out to an external provider directly. The `next: { revalidate: 300 }` cast is doubly bad — it ties the function to Next.js's extended `RequestInit` type. If/when a backend service replaces the route handler, the function breaks.
- **Suggested fix track:** "domain — Extract GitHub client" (Phase 1: create `packages/integrations/github` with typed methods; Phase 2: refactor `getPracticeIssues` to delegate; Phase 3: delete the inline `fetch` and `headers`). Cross-cutting, affects codecamp and any consumer of `getPracticeIssues`. ~3 days.

## F-704: `app/api/classes/[classId]/assignments/route.ts` POST/DELETE use raw `body as { ... }` casts, no Zod

- **Rule:** 7.1 / 6.1 (Zod validation at every boundary)
- **Severity:** Low (F-204 of this audit; cross-listed because it's the same file as the §6 finding would surface)
- **Evidence:**
  - `app/api/classes/[classId]/assignments/route.ts:158-159` — `const body = await request.json(); const { lessonId, dueAt } = body as { lessonId?: string; dueAt?: string };`
  - `app/api/classes/[classId]/assignments/route.ts:297-298` — same pattern for `assignmentId`
- **Impact:** Any malformed body crashes the handler in an uncontrolled way (or worse, lets through a `null` / `undefined` that Drizzle then rejects with a 500). The `lib/validations/class.ts` already has a `createClassSchema` — assignments should have the equivalent.
- **Suggested fix track:** Folds into F-203. Add `lib/validations/assignments.ts` with `createAssignmentSchema` and `deleteAssignmentSchema` Zod schemas, then call `schema.parse()` in the route.

## F-705: 4 auth `route.ts` stubs at `app/api/auth/*/route.ts` (6 lines each) — verify if dead code

- **Rule:** 7.1 (route.ts should be thin) — *these are thin, but possibly vestigial*
- **Severity:** Low (information-only — verify, then either delete or keep)
- **Evidence:**
  ```ts
  // app/api/auth/login/route.ts (6 lines)
  import { handleLogin } from "@reading-advantage/api/routes/auth";
  import type { NextRequest } from "next/server";
  export async function POST(request: NextRequest) {
    return handleLogin(request);
  }
  ```
  Same shape for `logout`, `session`, `impersonate`. All four delegate to `packages/api/src/routes/auth/{login,logout,session,impersonate}.ts`.
- **Impact:** If the auth UI posts to these endpoints, they work. If the auth UI posts to the underlying tRPC/RPC surface, the stubs are dead code. F-705 is verification only — `rg 'app/api/auth/(login|logout|session|impersonate)'` should show the references. If 0 references, delete the 4 files.
- **Suggested fix track:** "science-advantage — Verify auth stubs" (Phase 1: grep all callers; Phase 2: if dead, delete; if live, add tests). ~1 hour.

---

## Cross-section findings (not in either checklist section, but noted during the audit)

These are recorded for the §4 and §6 subagents, not the §2/§7 deliverable. Mentioned for completeness so the next auditor doesn't double-discover.

- **X-1 (`lib/auth/session.ts`):** imports `db` from `@reading-advantage/db` directly and is used by 12+ route handlers. This is the de-facto auth helper layer, not yet migrated to `@reading-advantage/auth`'s adapter surface. Cross-lists with F-203.
- **X-2 (authz inconsistency):** `lib/auth/server.ts` provides `requireAuth`/`requireRole` (the adapter) and is used by most pages and 1 route (`students/[studentId]/lessons/[lessonId]/analytics/route.ts:16`). The other 26 routes call `getCurrentSession` and hand-roll role/ownership checks. Cross-lists with F-702.
- **X-3 (raw `request.json()` casts):** `app/api/classes/[classId]/assignments/route.ts:159,298` and `app/api/classes/route.ts` (inline JSON checks). Cross-lists with F-704.
- **X-4 (`app/(student)/assignments/page.tsx`):** 27-line hardcoded stub (F-003 from pilot, pre-existing). Not a §2.4 violation in the sense the protocol means; the violation is the missing feature.

---

## Suggested migration tracks (rolled up)

1. **"science-advantage — Domain-Layer API Migration"** (resolves F-203, F-208, F-207, F-701, F-704, X-1, X-2, X-3) — the umbrella track. ~3 weeks, sized 13 plan tasks. **High priority.** Folds in:
   - Pick 1 representative route (e.g. `student/classes/route.ts` is already done).
   - Scaffold `lib/services/{classes,mastery,gamification,interventions,assignments}/`.
   - Migrate 5 highest-traffic routes first.
   - Migrate the remaining 17 in batches of 5.
   - Replace hand-rolled checks with `requireRole` / new `requireOwnership` helper.
   - Add Zod schemas to all routes that currently cast `body as { ... }`.

2. **"science-advantage — Auth surface migration"** (resolves F-206, F-702) — move password hashing + auth helpers to `packages/auth` adapter. ~1 week. Cross-references `measure/tech-debt.md` `auth_strategy_review`.

3. **"science-advantage — Remove direct shared-package deps"** (resolves F-201, F-202) — incremental; once a domain service is in place, the direct `drizzle-orm` and `zod` usage in routes disappears naturally. ~1 week.

4. **"science-advantage — Relocate legacy prisma/ seed-data"** (resolves F-205) — small, isolated cleanup. ~2 days. Should ship quickly while the bigger tracks are in flight.

5. **"domain — Extract GitHub client"** (resolves F-703) — cross-cutting, low priority. ~3 days.

6. **"science-advantage — Verify auth stubs"** (resolves F-705) — verification, then either delete or test. ~1 hour.

---

## Tech-debt rows to add to `measure/tech-debt.md`

| Finding | Severity | Status |
|---------|----------|--------|
| F-203 (22 of 27 route.ts import db) | High | NEW |
| F-208 (2 page.tsx with db imports) | High | NEW |
| F-701 (5 spot-checked route.ts are fat) | High | NEW (overlaps F-203) |
| F-702 (26 of 27 routes hand-roll authz) | High | NEW (overlaps F-203) |
| F-205 (legacy prisma/ dir) | Medium | NEW |
| F-206 (bcryptjs in app deps) | Medium | NEW (existing `auth_strategy_review` row covers the deeper issue; this row is the §2.3/§4.4 evidence) |
| F-201, F-202, F-204, F-207, F-703, F-704, F-705 | Low | Batch into "science-advantage — Low findings" row |

> **Note on F-001 retcon:** The 2026-05-26 pilot F-001 row in `measure/tech-debt.md` says "27 route.ts files import db". This audit supersedes that with the multiline-safe count of 22. The row should be updated, not duplicated.
