# Sections 2 + 7 — Boundaries + Transport

> **App:** `apps/science-advantage/`
> **Date:** 2026-06-03
> **Inventory consumed:** `00-inventory.md` (767 source files / 27 route.ts / 0 actions.ts / 22 page.tsx / 70+ lib/ / ~120 components/)

---

## Section 2

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 2.1 | App in `apps/` | **PASS** | `apps/science-advantage/` exists. `ls packages/` shows only shared packages (`api, auth, auth-client, config, db, domain, reading-advantage-scripts, types, ui, utils, webhooks`) — no `science-advantage*` package. |
| 2.2 | Dependency order | **PASS** | `pnpm --filter=science-advantage list --depth=0` shows 7 workspace deps, all flow app → packages: `@reading-advantage/{api,auth,auth-client,db,domain,ui,utils}`. Grep for `science-advantage` inside `packages/*/package.json` returned zero hits — no reverse imports. |
| 2.3 | No wrapped-package deps | **FAIL** | `apps/science-advantage/package.json` directly depends on `drizzle-orm@0.44.0`, `zod@3.25.76`, `bcryptjs@3.0.2` (production) and `ai@5.0.95` + `@ai-sdk/google@2.0.36` + `@ai-sdk/openai@2.0.68` (also production). These should be wrapped by `@reading-advantage/{db,types,auth,ai}`. |
| 2.4 | No business logic in pages/components | **FAIL** | 2 of 22 `page.tsx` files import `db` from `@reading-advantage/db` and run multi-step query orchestration: `app/(teacher)/teacher/page.tsx:1` (1 select + UI dispatch), `app/(teacher)/teacher/classes/page.tsx:3` (2 selects with `count()`, `inArray`, `groupBy`). All 5 spot-checked `components/**/*.tsx` (`teacher-dashboard-classes.tsx`, `quiz-player.tsx`, `class-analytics-overview.tsx`, `create-class-form.tsx`, `student-mastery-profile*`) are presentation-only — no DB imports, no business rules. |
| 2.5 | No direct `db` import in `route.ts` | **FAIL** | 22 of 27 `app/**/route.ts` files import `db` from `@reading-advantage/db` (multiline-safe scan). The 5 that don't: 4 auth stubs (`app/api/auth/{impersonate,login,logout,session}/route.ts` — 6 lines each, delegate to `@reading-advantage/api/routes/auth`) and `app/api/student/classes/route.ts` (42 lines, uses `lib/services/classes/get-student-classes`). **F-001 anchor update: was 27, now 22.** |
| 2.6 | No raw SQL outside `db`/`domain` | **PASS** (with observation) | No `prisma.$queryRaw`, `$executeRaw`, `pg`, or `postgres` tagged templates found. Four sites use Drizzle's typed `sql\`\`` helper: `app/api/teachers/dashboard/route.ts:163`, `app/api/teachers/classes/[classId]/intervention-alerts/route.ts:166`, `lib/services/mastery/standard-mastery.ts:68`, `scripts/dev-interventions.ts:78`. These are Drizzle SQL fragments (e.g. `lt(masteryLevel, sql\`0.6\`)`), not raw string SQL — strictly outside the §2.6 prohibition. Test cleanup files use `sql\`DELETE FROM ...\`` extensively (~16 hits) which is acceptable test hygiene. `packages/api/` and `packages/webhooks/` have zero raw SQL hits. |
| 2.7 | Scripts use shared client | **PASS** (with observation) | `rg 'psql\|pg_dump\|prisma db' scripts/` returns zero hits for CLI bypasses. 14 scripts import `db` from `@reading-advantage/db` (seed scripts, backfills, dev tools). However, scripts call `db` directly rather than delegating to `lib/services/*` or `packages/domain` — this is a §3.1 (backend-as-code) concern more than a §2.7 concern. `prisma/` in path strings (e.g. `scripts/seed/seed-curriculum-units.ts:47` -> `../../prisma/seed-data/...`) refers to the legacy seed-data directory, not the Prisma CLI. |
| 2.8 | No app-level `prisma/` | **FAIL** | `prisma/` exists at app root with **56 files**: `data/content/grade-4/{lessons,questions}/` (20 JSON), `seed-data/{curriculum-units,lessons,questions,standards}/` (24 JSON), `seed-functions/update-seed-files.ts` (38 lines, the only `.ts`), `__tests__/` (empty), `seed-data/README.md`. **No `schema.prisma`, no `migrations/`, no `prisma`/`@prisma/client` in `package.json`** — Prisma is fully removed. The directory is a legacy seed-data bucket and should be relocated to `scripts/seed-data/` then deleted. |

**Section 2 score:** 4 PASS, 4 FAIL. **Pass rate: 50%.**

---

## Section 7

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 7.1 | `route.ts` files are thin | **FAIL** | 5 spot-checked routes (`update-mastery`, `quiz`, `recommendations`, `assignments`, `intervention-alerts`, `lessons/[lessonSlug]`, `lessons/[lessonId]/analytics`, `teachers/dashboard`, `mastery-profile`, `lessons/[lessonSlug]`) all exceed 50 lines (range 159–624) and contain **multiple inline `db.select()`/`db.insert()`/`db.transaction()` calls** with hand-rolled role/ownership checks instead of `requireRole`. Only 4 of 27 routes are thin (the 4 auth stubs at 6 lines each). `app/api/lessons/[lessonSlug]/quiz/route.ts` (519 lines) contains 2 `export async function` handlers, ~15 `db.*` calls, and embeds a quiz-grading loop with `gradeAnswer()` and `calculateXpForQuiz()` — this is the canonical "fat route" example. |
| 7.2 | `actions.ts` are thin | **N/A** | 0 `actions.ts` files in `app/`. Rule satisfied vacuously. |
| 7.3 | No transport imports in domain | **PASS** (with observation) | `rg 'from .next/\|from .@trpc/\|from .hono' packages/domain/` -> 0 hits. `rg 'cookies\|headers\|getServerSession' packages/domain/src/` -> 0 hits. **However**, `packages/domain/src/codecamp/index.ts:1952` contains `headers: { Accept: "application/vnd.github.v3+json" }` and `fetch(url, ...)` — GitHub API transport concern embedded in the `codecamp` subpackage. This is a soft §7.3 finding (not a strict `next/`/`@trpc/`/`hono` import) and is cross-cutting across the monorepo, not science-advantage-specific. |
| 7.4 | Public APIs in `services/api/` | **N/A** | No `services/` directory exists at the monorepo root. No public/mobile API surface for science-advantage. All 27 endpoints are internal Next.js Route Handlers consumed by the same app's React Server Components / Client Components. |
| 7.5 | Webhooks in `packages/webhooks/` | **PASS** | `packages/webhooks/src/` contains `github.ts` + `github-client.ts` + `health.ts` (proper webhook ingress). `rg 'stripe\|github\|webhook\|svix' app/api/` in science-advantage returns 0 hits. The app does not host webhook endpoints. |

**Section 7 score:** 1 PASS, 1 FAIL, 3 N/A. **Pass rate (excluding N/A): 50%.**

---

## Cross-section observations (not in either checklist section, but surfaced during the audit)

| # | Finding | Section overlap | Note |
|---|---------|----------------|------|
| X-1 | `lib/auth/session.ts` imports `db` directly and is used by 12+ route handlers. It is the de-facto auth helper layer, not yet migrated to `@reading-advantage/auth`'s `requireUser`/`requireRole` adapter. | §2.5, §4.2 | Routinely used in routes that ALSO import `db` — the two layers are coupled. |
| X-2 | `lib/auth/server.ts` provides `requireAuth`/`requireRole` (the adapter surface) and is used by most `page.tsx` files and 1 route (`students/[studentId]/lessons/[lessonId]/analytics/route.ts:16`). However, the other 26 routes call `getCurrentSession` and hand-roll role/ownership checks. | §2.5, §4.2 | Authz is inconsistent: pages use the adapter, routes don't. |
| X-3 | `app/api/classes/[classId]/assignments/route.ts` (364 lines) has `POST` and `DELETE` handlers that use `body as { lessonId?: string }` and `body as { assignmentId?: string }` casts (lines 159, 298) — no Zod schema, raw `request.json()`. | §2.5, §6.1, §6.2 | Direct typed-cast bypass of validation contract. |
| X-4 | `app/api/classes/route.ts:25` imports `ZodError` from `zod` directly. The route then handles validation via inline JSON-body checks, not a Zod `safeParse()`. | §6.1 | Importing Zod but not using it. |
| X-5 | `app/(student)/assignments/page.tsx` is a 27-line hardcoded stub (F-003 from pilot, pre-existing). | §2.4 | No business logic — the violation is the missing feature, not a logic leak. |

---

## Severity tally (preliminary — see `findings-partial-2-7.md` for detail)

| Severity | Section 2 | Section 7 | Total |
|----------|-----------|-----------|-------|
| Critical | 0 | 0 | 0 |
| High     | 2 (F-203, F-208) | 2 (F-701, F-702) | 4 |
| Medium   | 2 (F-205, F-206) | 1 (F-703) | 3 |
| Low      | 2 (F-201, F-204) | 1 (F-704) | 3 |
| N/A      | — | 2 (7.2, 7.4) | 2 |

> **Note on F-001 retcon.** The pilot one-off audit (2026-05-26) recorded 27 of 27 `route.ts` files importing `db` directly. The current re-scan (multiline-safe) shows 22 of 27. The 5 that are clean: 4 auth stubs (already delegated to `@reading-advantage/api/routes/auth`) + 1 thin `app/api/student/classes/route.ts` (delegates to `lib/services/classes/get-student-classes`). F-001 severity remains **High** (22 > 10 threshold from the protocol severity scheme; Critical requires 25+).
