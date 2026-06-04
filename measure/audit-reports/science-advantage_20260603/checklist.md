# Science-Advantage AGENTS.md Audit — Checklist

> **Audit target:** `apps/science-advantage/`
> **Audit date:** 2026-06-03
> **Protocol:** `measure/agents-md-audit-protocol.md` (v1.0 pilot, 13 sections, 80+ checks)
> **Source partials:** `checklist-partial-1.md`, `checklist-partial-2-7.md`, `checklist-partial-3-4.md`, `checklist-partial-5.md`, `checklist-partial-6-9.md`, `checklist-partial-10-11.md`, `checklist-partial-12-13.md`
> **Companion:** `findings.md` (severity-classified evidence), `migration-tracks.md` (12 proposed tracks), `executive-summary.md` (one-page)

## Legend

- **PASS** — rule satisfied
- **FAIL** — rule violated; severity in `findings.md`
- **PARTIAL** — partially satisfied; sub-finding filed
- **N/A** — rule not applicable to this app
- **DEFERRED** — depends on a future track; see `migration-tracks.md`

## Section 1 — Provider Neutrality & Adapters

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 1.1 | No direct provider SDK imports | **FAIL** | `lib/ai/recommendation-service.ts:2-4` (Vercel `ai`, `@ai-sdk/openai`, `@ai-sdk/google`); `lib/ai/image-generator.ts:1` (`ai`, `experimental_generateImage`); `package.json:22,23,37` |
| 1.2 | Storage via adapter | **N/A** | No `lib/storage/`; no `@aws-sdk/*`/`@google-cloud/*`/`minio` imports; GCS env vars declared but unused |
| 1.3 | AI via adapter | **FAIL** | `lib/ai/` is consumed but exports concrete functions only — no `AIClient` interface boundary |
| 1.4 | Email via adapter | **N/A** | No `lib/email/`; no `nodemailer`/`resend`/`sendgrid`; SendGrid in archived docs only |
| 1.5 | No Firebase | **PASS** | 0 `firebase/*` imports anywhere in `apps/science-advantage/` |
| 1.6 | Adapter modules export interface | **FAIL** | `lib/platform/{redis-client,cache-adapter,rate-limit-store,session-cleanup}.ts` pass; `lib/ai/` fails — no `AIClient` interface |

**Section 1 score: 1/4 PASS, 1 N/A, 4 fail-or-fail-mixed → 50%.**

## Section 2 — Package Boundaries

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 2.1 | App in `apps/` | **PASS** | `apps/science-advantage/` exists; no `packages/science-advantage*` |
| 2.2 | Dependency order | **PASS** | All 7 workspace deps flow app → packages; 0 reverse imports |
| 2.3 | No wrapped-package deps | **FAIL** | `package.json:56,59,74` declare `bcryptjs`, `drizzle-orm`, `zod`; `package.json:22,23,55` declare `@ai-sdk/google`, `@ai-sdk/openai`, `ai` |
| 2.4 | No business logic in pages | **FAIL** | `app/(teacher)/teacher/page.tsx:1` (1 select + UI dispatch); `app/(teacher)/teacher/classes/page.tsx:3` (2 selects with `count()`, `inArray`, `groupBy`) |
| 2.5 | No direct `db` import in `route.ts` | **FAIL** | 22 of 27 `app/**/route.ts` import `db` from `@reading-advantage/db` (multiline-safe scan; 5 clean: 4 auth stubs + `app/api/student/classes/route.ts`) |
| 2.6 | No raw SQL outside `db`/`domain` | **PASS (observation)** | 4 typed `sql\`\`` sites in app code; 0 `prisma.$queryRaw`/`pg`/`postgres`; test cleanup uses `sql\`DELETE\`` extensively (acceptable) |
| 2.7 | Scripts use shared client | **PASS (observation)** | 0 `psql`/`pg_dump`/`prisma db` CLI bypasses; 14 scripts import `db` directly (a §3.1 concern more than §2.7) |
| 2.8 | No app-level `prisma/` | **FAIL** | `prisma/` exists with 56 files (no `schema.prisma`); legacy seed-data bucket; should be relocated to `scripts/seed-data/` |

**Section 2 score: 4 PASS, 4 FAIL → 50%.**

## Section 3 — Backend-as-Code

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 3.1 | Domain modules exist | **PASS** | 14 modules in `packages/domain/src/`; all re-exported from barrel |
| 3.2 | `command()` or `assertCan()` pattern | **PARTIAL PASS** | 0 `command()` wrappers; 82 `assertCan` calls in 14 modules (existing pattern; AGENTS.md allows both) |
| 3.3 | Zod input/output schemas on domain functions | **FAIL** | All inputs are TypeScript interfaces; 0 `z.object` / `z.infer` in any domain function (except `codecamp/review-exercise.ts`) |
| 3.4 | `permissions.ts` per module | **FAIL** | 0 `permissions.ts` files in `packages/domain/src/`; only `packages/auth/src/permissions.ts` (central map) |
| 3.5 | Module file layout (`schema.ts`/`contracts.ts`/`queries.ts`/etc.) | **FAIL** | Every module is a single `index.ts`; `codecamp/index.ts` is 1,987 lines |

**Section 3 score: 1 PASS, 1 partial, 3 FAIL → 20%.**

## Section 4 — Authentication

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 4.1 | No `next-auth` / `@auth/*` / Firebase Auth in app | **PASS** | 0 hits in source code; legacy NextAuth-era hits only in `docs/archive/` |
| 4.2 | Auth adapter only (no `getServerSession`, cookie/header reading) | **PARTIAL PASS** | 3 `cookies()` calls in `lib/auth/session.ts:94,108,116` use shared `SESSION_COOKIE_NAME`; `lib/auth/{session,server}.ts` are thin duplicates of the shared adapter surface |
| 4.3 | No JWT signing/verifying in app | **PASS** | 0 JWT usage; sessions are opaque Postgres tokens |
| 4.4 | Argon2id in `packages/auth` only; no bcrypt in app | **FAIL** | `packages/auth/src/password.ts:1,11,25` uses `bcryptjs`; `apps/science-advantage/package.json:56` adds `bcryptjs@3.0.2` in production; 3 seed scripts use `bcrypt.hash(password, 10)` directly |
| 4.5 | Postgres-backed sessions | **PARTIAL PASS** | Sessions in Postgres; **but** `packages/auth/src/rate-limit.ts:9` uses in-memory `Map` for login throttling |
| 4.6 | Rate limiting on login + sensitive endpoints | **PARTIAL PASS** | 5 attempts / 15 min by username only; no per-IP, no captcha, durability caveat (in-memory `Map`) |
| 4.7 | Audit log table + writes on auth events | **FAIL** | 0 `auditLog`/`audit_log` table anywhere in the monorepo; 0 `audit.*login`/`audit.*logout` calls in code; `auth.login` records session but writes no security event |
| 4.8 | `proxy.ts` calls `requireRole` from `@reading-advantage/auth` | **PASS** | `proxy.ts:487,517` use `requireRole`; pilot F-004 hardening intact (no cookie-presence-only check) |
| 4.9 | Role hierarchy from `packages/auth`; no app-local `role === '...'` ladders | **FAIL** | 23 hand-rolled `role ===` checks across 17 app files (13 routes + 4 pages) bypass `assertCan`/`roleAtLeast` |

**Section 4 score: 5 PASS, 2 FAIL, 2 partial → 56%.**

## Section 5 — Database & Multi-Tenancy

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 5.1 | Schema in `packages/db`, no app-level schema | **PASS** | All 68 `pgTable` defs in `packages/db/src/schema/`; 0 in `apps/science-advantage/`; `prisma/schema.prisma` absent |
| 5.2 | Single shared db client | **PASS** | 0 `new Pool`/`new Client`/`drizzle(` outside `packages/db/src/client.ts:14`; 168 imports of `db` from `@reading-advantage/db` in the app |
| 5.3 | `schoolId` predicate on every tenant-scoped read/write | **FAIL** | 0 `schoolId` in any of 27 `route.ts`; 19 of 68 schema tables have no `schoolId` column; science-advantage uses user-centric model (teacherId/studentId ownership) |
| 5.4 | Tenant scoping enforced by `TenantDB` wrapper | **FAIL** | 0 `createTenantDB`/`TenantDB` in `apps/science-advantage/`; 16+ sites in `packages/api`/`packages/webhooks` use it correctly |
| 5.5 | No `prisma` / `@prisma/client` in app code | **PASS** | 9 hits — all non-source (archived docs, JSDoc, path strings); 0 real imports |
| 5.6 | Migrations generated via `drizzle-kit generate` | **PASS** | 17 migration files in `packages/db/drizzle/`; `lib/test/run-drizzle-migrate.ts` is the test path |
| 5.7 | Migrations applied before dependent app code deploys | **DEFERRED** | Root `ci.yml` runs `pnpm build` + `pnpm test` (no explicit migration step); app-local CI runs `lint` + `build` only; Vercel `buildCommand` not inspected |
| 5.8 | Destructive migrations reviewed (DROP/ALTER TYPE/column removal) | **PARTIAL** | `0003_slow_firebrand.sql` is well-commented; `0012_codecamp_intern_role.sql` has **zero comments**; no `docs/adr/` directory |
| 5.9 | Drizzle `relations()` used; raw SQL reserved for views/CTEs | **FAIL** | 0 `relations()` declarations in `packages/db/src/schema/`; 3 raw `sql\`\`` sites in app code (arithmetic / column refs, not views) |

**Section 5 score: 4 PASS, 2 FAIL, 1 partial → 60%.**

## Section 6 — Validation & Contracts

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 6.1 | Zod at every external boundary | **FAIL** | 6 of 27 routes Zod-validate; 21 skip (use ad-hoc `typeof` checks or skip validation); 4 `request.json()` sites hand-roll ad-hoc checks |
| 6.2 | No raw `JSON.parse`/`req.json()` skipping Zod | **FAIL** | 9 `request.json()` call sites; 5 immediately Zod-validate; **4 do not** (`lessons/.../quiz/route.ts:245`, `classes/[classId]/assignments/route.ts:158,297`, `classes/[classId]/roster/route.ts:113`, `classes/[classId]/route.ts:111`) |
| 6.3 | Env vars validated at boot via Zod | **PARTIAL PASS** | `lib/env.ts:3-15` covers 5 of 22+ env vars declared in `.env.example`; 17+ unvalidated reads in `lib/ai/*`, `lib/config/*`, `proxy.ts` |
| 6.4 | Types inferred from Zod | **PASS** | 28 `z.infer<>` uses; no hand-written parallel types |
| 6.5 | AI structured outputs use `generateObject` + Zod | **PASS** | `lib/ai/recommendation-service.ts:16-32,79` uses `recommendationSchema`; 0 `JSON.parse(aiText)` round-trips |
| 6.6 | Forms use same Zod schema as server (via shared package) | **PARTIAL PASS** | `joinClassSchema` shared; `createClassSchema` + `createClassFormSchema` are two distinct schemas (legitimate separation); schemas live in app, not in `packages/types` |

**Section 6 score: 2 PASS, 2 FAIL, 2 partial → 33%.**

## Section 7 — Transport

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 7.1 | `route.ts` files are thin | **FAIL** | 5 spot-checked routes exceed 50 lines (range 159–624) with multiple inline `db.*` calls; only 4 of 27 are thin (4 auth stubs at 6 lines each) |
| 7.2 | `actions.ts` are thin | **N/A** | 0 `actions.ts` files; vacuously satisfied |
| 7.3 | No transport imports in domain | **PARTIAL PASS** | 0 `next/`/`@trpc/`/`hono` imports in `packages/domain/src/`; **but** `packages/domain/src/codecamp/index.ts:1952` embeds GitHub `fetch()` with inline `headers` and `next: { revalidate: 300 }` cast |
| 7.4 | Public APIs in `services/api/` | **N/A** | No `services/` directory; all endpoints are internal Next.js Route Handlers |
| 7.5 | Webhooks in `packages/webhooks/` | **PASS** | `packages/webhooks/src/{github,github-client,health}.ts`; 0 webhook endpoints hosted in the app |

**Section 7 score: 1 PASS, 1 FAIL, 3 N/A → 50% (excluding N/A).**

## Section 9 — Observability

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 9.1 | Structured logs with `requestId`/`userId`/`operation`/`latencyMs` | **PARTIAL PASS** | `lib/observability/logger.ts:1-37` exists but does NOT auto-propagate `requestId`/`latencyMs`; 5 largest route.ts files emit zero structured logs in hot paths |
| 9.2 | No `console.log`/`console.error` in production code | **FAIL** | **67 hits** in production code (threshold ≥10 = Medium; 67 decisively above): 25 `app/`, 30 `components/`, 8 `lib/`, 3 `proxy.ts` |
| 9.3 | Error reporting (Sentry / OpenTelemetry / equivalent) wired | **FAIL** | 0 `Sentry`/`@sentry/*`/`opentelemetry`/`@opentelemetry/*` packages or code references; 6 archived-doc mentions only; no `instrumentation.ts` |
| 9.4 | Audit events for security-sensitive actions | **FAIL** | No audit-log table; no auth/permission/billing/destructive-action event writes |
| 9.5 | Audit log table is append-only | **FAIL (N/A precursor)** | Vacuously true — table does not exist |
| 9.6 | Request tracing enabled for the API surface | **FAIL** | No `trace(`/`span(`/`opentelemetry`/`@vercel/otel`; 4 `traceId` references in `lib/ai/` are an opaque field, not a real span |

**Section 9 score: 0 PASS, 5 FAIL, 1 partial → 0%.**

## Section 10 — Testing

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 10.1 | Single test framework (Vitest only) | **PASS** | 0 `jest` config; 4 Vitest configs; Playwright for E2E |
| 10.2 | Tests for every domain function | **DEFERRED** | 88 test files across 5 conventions; per-function coverage not re-verified |
| 10.3 | Mock DB in unit tests | **PASS** | `vi.fn()`/`vi.mock()` patterns; `vitest.unit.setup.ts` confirms isolation |
| 10.4 | Integration tests exist | **PASS** | `vitest.integration.config.ts` + `*.integration.test.ts` convention |
| 10.5 | Test command exits 0 | **DEFERRED** | `pnpm turbo run test --filter=science-advantage` not re-run (hardware constraint); baseline was green per `jsdoc_shared_packages_20260530` archive |
| 10.6 | Coverage reported | **PASS** | `vitest.config.ts:26`, `vitest.unit.config.ts:22`, `vitest.scripts.config.ts:20` all configure `coverage:` |
| 10.7 | No `ignoreBuildErrors` | **FAIL — Critical** | `next.config.ts:25` has `ignoreBuildErrors: true`; baseline 360 tsc errors / 386 lines (tested by `auth_strategy_review`) |
| 10.8 | CI runs all gates | **FAIL — High** | App-local `ci.yml` uses `npm` + `package-lock.json` (neither matches monorepo pnpm); runs only `lint` + `build`; no `test` step; references NextAuth-era env vars not in `.env.example` |

**Section 10 score: 4 PASS, 2 FAIL, 2 DEFERRED → 67% (excluding DEFERRED).**

## Section 11 — Documentation

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 11.1 | JSDoc on exports | **DEFERRED** | 8 of 10 domain modules have file-level JSDoc; 2 (`codecamp/index.ts`, `codecamp/review-exercise.ts`) lack per-export JSDoc |
| 11.2 | `@throws` documented | **DEFERRED** | Same root cause as 11.1; resolves when F-302 lands |
| 11.3 | No type repetition in JSDoc | **PASS** | Sampled 3 JSDoc comments; no `@param {string} foo` form |
| 11.4 | Module top-of-file comment | **PASS** | 8 of 10 domain modules start with `/**` block; same 2 exceptions as 11.1 |
| 11.5 | App-specific deviations documented | **PASS** | `apps/science-advantage/AGENTS.md`, `CLAUDE.md`, `README.md` exist (caveat: Prisma + `npm` references — F-1102) |
| 11.6 | `graph.db` current | **FAIL — Critical** | `build-graph stats ./graph.db 2>&1` → `Total nodes: 0, Total edges: 0, Total files: 0` (file is 69 KB but empty of indexed symbols) |

**Section 11 score: 2 PASS, 1 FAIL, 3 DEFERRED → 67% (excluding DEFERRED).**

## Section 12 — Monorepo Hygiene

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 12.1 | Pinned versions in `package.json` | **FAIL** | 51 of 57 deps use `^` ranges; 6 pinned (next, react, react-dom, eslint-config-next, @types/react, @types/react-dom) |
| 12.2 | No rogue scripts / stray files | **PASS (caveat)** | 2 untracked `.log` files at app root (`gemini_design_update.log`, `visual_refresh_track.log`); no `.sh`; `tsbuildinfo` files gitignored |
| 12.3 | Build passes | **PASS (caveat)** | `pnpm turbo run build --filter=science-advantage` → 9/9 green; masked by `ignoreBuildErrors: true` (~370 tsc errors) |
| 12.4 | Lint passes | **FAIL — High** | `pnpm turbo run lint --filter=science-advantage` exits 1; 4 `react-hooks/immutability` errors in `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186`; 6 `@typescript-eslint/no-unused-vars` warnings in `lib/gamification/badges.ts:114,202` |
| 12.5 | Type-check passes | **FAIL — High** | `package.json` has no `check-types` script; `pnpm turbo run check-types` silently skips the app; direct `tsc --noEmit` shows ~370 errors |
| 12.6 | Conventional Commits | **PASS** | 50/50 commits match `(feat|fix|chore|docs|refactor|test|perf|build|ci|style)(scope):` regex |
| 12.7 | Track refs in commit messages | **FAIL** | 7/50 commits have track ID in body; 0/50 in subject line; 43/50 no track link (most belong to the archived `prisma_drizzle_science_controllers_20260505` migration) |

**Section 12 score: 3 PASS, 4 FAIL → 43%.**

## Section 13 — Workflow & Tooling

| # | Check | Status | Evidence (file:line) |
|---|-------|--------|----------------------|
| 13.1 | Significant changes tracked | **FAIL** | 3 of 5 largest diffs (829 / 437 / 440 lines) ship without any track reference; belong to `prisma_drizzle_science_controllers_20260505` but commits don't link |
| 13.2 | `measure/tech-debt.md` ≤ 50 lines | **PASS** | 39 lines; science-advantage findings tracked (`auth_strategy_review` 2026-05-03, `audit_20260526` 2026-05-26, `science-advantage-ui` 2026-05-25) |
| 13.3 | `measure/lessons-learned.md` ≤ 50 lines | **PASS** | 49 lines; 13 science-advantage lessons recorded (M:N junctions, client-bundle leaks, postgres-js error shapes, etc.) |
| 13.4 | `package.json#name` matches `apps/<app>/` | **PASS** | `apps/science-advantage/package.json:2` = `"name": "science-advantage"` |
| 13.5 | No orphan `TODO`/`FIXME`/`XXX` | **FAIL** | 5 orphan in-code TODOs in `lib/gamification/badges.ts:115`, `app/api/lessons/[lessonSlug]/route.ts:125,144`, `app/api/classes/[classId]/curriculum/route.ts:135,142` |
| 13.6 | No committed secrets | **PASS (caveat)** | `.env.local` is gitignored; `.env.example` has only placeholder values; app-local `ci.yml:21` hardcodes `NEXTAUTH_SECRET: ci-secret` (test value, not a real secret — drift finding) |

**Section 13 score: 4 PASS, 2 FAIL → 67%.**

## Overall rollup

| Section | PASS | FAIL | Partial | N/A | DEFERRED | Score (PASS / non-N/A) |
|---------|-----:|-----:|--------:|----:|---------:|----------------------:|
| 1 Provider Neutrality | 1 | 2 | 0 | 2 | 0 | 50% |
| 2 Package Boundaries | 4 | 4 | 0 | 0 | 0 | 50% |
| 3 Backend-as-Code | 1 | 3 | 1 | 0 | 0 | 20% |
| 4 Authentication | 5 | 2 | 2 | 0 | 0 | 56% |
| 5 Database | 4 | 2 | 1 | 0 | 1 | 60% |
| 6 Validation | 2 | 2 | 2 | 0 | 0 | 33% |
| 7 Transport | 1 | 1 | 0 | 3 | 0 | 50% |
| 9 Observability | 0 | 5 | 1 | 0 | 0 | 0% |
| 10 Testing | 4 | 2 | 0 | 0 | 2 | 67% |
| 11 Documentation | 2 | 1 | 0 | 0 | 3 | 67% |
| 12 Monorepo Hygiene | 3 | 4 | 0 | 0 | 0 | 43% |
| 13 Workflow | 4 | 2 | 0 | 0 | 0 | 67% |
| **Total** | **31** | **30** | **7** | **5** | **6** | **49%** |

> Severity per check is in `findings.md`. Sections 8 (storage) and the storage/AI/workers cluster of §8 are subsumed by §1 (provider neutrality) in this audit's framing.

## Notes for protocol v1.1 (post-pilot refinements)

The pilot surfaced the following protocol adjustments for the next app:

1. **Add a §3.6 "Domain layer unused" rule** — currently the F-305 root is hard to express in the existing ruleset. F-305 falls between §2.5 and §3.5. Adding a dedicated rule for "every `app/**/route.ts` should import from `@reading-advantage/domain`" makes the rule auditable.
2. **Add a §4.10 "Seed scripts use adapter hash" rule** — the bcryptjs-in-seed-script pattern (F-402) is currently caught by §4.4 only via inspection. A dedicated rule "scripts that create users must call `hashPassword` from `@reading-advantage/auth`" is more enforceable.
3. **Add a §5.10 "No in-memory `Map` for security state" rule** — F-403 (login rate limiter) and F-401 (session cleanup Map) would both fall under a single rule.
4. **Add a §9.7 "Audit log present" rule** — currently F-404/F-901 are buried in §4.7 and §9.4. A dedicated rule is easier to scan and gate.
5. **Severity guidance for protocol §Severity Scheme** — the F-203 retcon (27 → 22) shows that the "10–24 = High, 25+ = Critical" thresholds are sensitive to multiline-safe scanning. Document the counting method.
6. **`graph.db` is now §11.6 — but should be a CI gate, not a documentation rule** — a "graph.db must be non-empty" check should be added to the audit's preconditions, not to the section being audited.

---

**End of checklist.** See `findings.md` for severity-classified evidence and `migration-tracks.md` for the 12 proposed tracks.
