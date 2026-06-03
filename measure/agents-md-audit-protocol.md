# AGENTS.md Compliance Audit Protocol

> **Purpose.** A repeatable, agent-runnable protocol for auditing apps in this monorepo against the architectural requirements in `AGENTS.md`. Produces a per-rule pass/fail checklist, classified findings, and a list of migration tracks required to reach compliance.
>
> **Scope.** All apps under `apps/*` plus the shared `packages/*`. Out of scope: third-party dependencies and CI infrastructure (covered by separate review tracks).
>
> **Cadence.** One-time baseline per app + re-audit at the end of every migration track that touches the audited app.

---

## Changelog

| Version | Date | Deltas |
|---------|------|--------|
| v1.1 | 2026-06-03 | (1) Added §3.6 domain-layer import rule (F-305). (2) Added §4.10 seed-script hash rule (F-402). (3) Added §5.10 no in-memory Map rule (F-403). (4) Added §9.7 audit-log-present rule (F-404/F-901). (5) Documented multiline-safe severity counting method in §Severity Scheme. (6) Moved graph.db check from §11.6 to §14 Pre-audit Preconditions with CI gate. |
| v1.0 | 2026-06-03 | Pilot draft (science-advantage). |

---

## How to Use This Protocol

1. **Pilot:** science-advantage is the pilot. Run the protocol end-to-end, then refine the checklist based on what was ambiguous or missing.
2. **Roll out:** apply the refined protocol to the remaining 5 apps (reading-advantage, primary-advantage, www-reading-advantage, codecamp-advantage, advantage-games).
3. **Re-audit:** any track that lands code in an audited app must re-run the relevant section of the checklist in its final phase before archival.

An audit is **always** scoped to one app at a time. Shared packages (`packages/*`) are audited separately because they are the surface area the apps *should* depend on — auditing them produces the "north star" against which the apps are measured.

---

## Audit Output

Every audit produces four artifacts, stored in `measure/audit-reports/<app>_<yyyymmdd>/`:

1. `checklist.md` — completed pass/fail/N/A checklist (this protocol, filled in)
2. `findings.md` — list of failures, each classified Critical/High/Medium/Low, with file/line references
3. `migration-tracks.md` — proposed Measure tracks to resolve findings, grouped by phase
4. `executive-summary.md` — one-page summary: total rules, % pass, top 5 risks, recommended next 3 tracks

A row is added to `measure/tech-debt.md` for every Critical and High finding. Medium and Low findings are batched into a single row per app.

---

## Severity Scheme

| Severity | Definition | Action |
|----------|------------|--------|
| **Critical** | Architectural breach that defeats a core AGENTS.md guarantee (e.g. API routes import `db` directly, bypassing the domain layer; direct SDK coupling to a provider; missing multi-tenant scoping on a query path). | Block new features in the affected app until a migration track exists. |
| **High** | Violation that will compound (e.g. 100+ files importing a provider SDK, no test coverage on a domain module, business logic in a Server Action). | Open a migration track in the next planning cycle. |
| **Medium** | Localized violation that does not compound in the short term (e.g. one file with raw SQL, one component with hardcoded English in a fully-localized app). | Batch into a quarterly cleanup track. |
| **Low** | Style, tooling, or documentation gap (e.g. missing JSDoc, ignoreBuildErrors still on, IDE config drift). | Triage when nearby code is touched. |

Severity is decided by the auditor, not the rule. A missing JSDoc on a public function is Low; a missing JSDoc on a security-sensitive auth utility is High. Use judgment.

> **Counting method for `route.ts` files:** Use a multiline-safe grep (`rg -l "from ['\"]@reading-advantage/db['\"]" app/`) to enumerate direct DB imports. Single-line grep undercounts when imports span multiple lines. The F-001 anchor's "27 of 27" count was single-line; the multiline-safe retcon is 22 of 27. Critical threshold (≥25) and High threshold (10–24) are sensitive to this distinction.

---

## Per-Rule Pass/Fail Convention

For each checklist item, record one of:

- **PASS** — the rule is satisfied
- **FAIL** — the rule is violated; record file/line evidence in `findings.md`
- **N/A** — the rule does not apply to this app (record why)
- **DEFERRED** — known to be open and already tracked in `measure/tech-debt.md` (link the row)

A rule with mixed status (e.g. some files pass, some fail) is recorded as **FAIL** with a count: e.g. `FAIL (203/209 route.ts files import db directly)`.

---

# Checklist

> Every item maps to a section in `AGENTS.md`. The Section column lets auditors cross-reference back to the spec.

## 1. Provider Neutrality & Adapters

> *AGENTS.md §Primary Stack, §Storage, §AI, §Auth, §Provider Neutrality Rule*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 1.1 | No direct imports of provider SDKs (AWS, Google Cloud, OpenAI, Anthropic, Firebase, Stripe, Resend, etc.) in `apps/<app>/` outside of an explicit `adapters/` or `lib/adapters/` directory. | Provider Neutrality Rule | | |
| 1.2 | All storage access goes through `@reading-advantage/storage` (or an app-local `storage/` adapter). No `@aws-sdk/*`, `@google-cloud/*`, `minio`, `b2` imports. | Storage | | |
| 1.3 | All AI access goes through an AI adapter (e.g. `@reading-advantage/ai` or app-local `lib/ai/`). No direct `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, `ai` (Vercel AI SDK at the call site) imports in route handlers, server actions, or components. | AI | | |
| 1.4 | All email/notification access goes through an adapter. No direct `nodemailer`, `resend`, `sendgrid` imports outside an adapter. | Provider Neutrality Rule | | |
| 1.5 | No direct import of `firebase/app`, `firebase/auth`, `firebase/firestore` anywhere. | Auth | | |
| 1.6 | Adapter modules export an interface (`StorageClient`, `AIClient`, `EmailClient`, etc.) and the implementation is selected by env var, not by import. | Provider Neutrality Rule | | |

## 2. Package Boundaries & Architecture

> *AGENTS.md §Monorepo Structure, §Package Responsibilities, §Backend-as-Code Model*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 2.1 | The app lives in `apps/<app>/` and depends on `packages/*` only — never the other way around. | Monorepo Structure | | |
| 2.2 | Package dependency order is respected: `db → auth → types → domain → api/webhooks`. No circular deps; no `api` → `app` imports. | Monorepo Structure | | |
| 2.3 | `apps/<app>/package.json` has no dependencies that should live in `packages/*` (e.g. `drizzle-orm`, `zod`, `@aws-sdk/*` only when a shared adapter exists). | Monorepo Structure | | |
| 2.4 | No business logic in `apps/<app>/app/**/page.tsx`, `layout.tsx`, `route.ts`, `actions.ts`, or React components. Page components may orchestrate and render — they must not contain domain rules, DB queries beyond simple reads, or validation logic. | Backend-as-Code Model | | |
| 2.5 | No `import { db } from "..."` or `import db from "@/lib/db"` inside `app/**/route.ts` files. | Backend-as-Code Model | | |
| 2.6 | No raw SQL (`$queryRaw`, `prisma.$queryRaw`, `pg`, `postgres` tagged templates) outside `packages/db` and `packages/domain`. | Database | | |
| 2.7 | Scripts that touch the database live in `apps/<app>/scripts/` or `scripts/` and use the shared db client — no ad-hoc `psql` invocations from CI. | Monorepo Hygiene | | |
| 2.8 | `apps/<app>/prisma/` directory does not exist (or contains only legacy migrations marked for deletion in a follow-up). | Database | | |

## 3. Backend-as-Code Model

> *AGENTS.md §Backend-as-Code Model, §Backend Function Pattern*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 3.1 | Business logic is implemented in `packages/domain/<module>/` (or equivalent). For every backend capability there is a domain function or a `command()` wrapper. | Backend-as-Code Model | | |
| 3.2 | New code uses the `command()` wrapper (`input`, `output`, `auth`, `authorize`, `handler`). Existing `assertCan()` pattern is acceptable. | Backend Function Pattern | | |
| 3.3 | Every domain function declares an input Zod schema and an output Zod schema. | Contracts and Validation | | |
| 3.4 | Permission checks live in a `permissions.ts` module colocated with the module, not inside handlers. | Authentication vs Authorization | | |
| 3.5 | Domain modules colocate: `schema.ts`, `contracts.ts`, `queries.ts`, `mutations.ts`, `actions.ts`, `permissions.ts`, `errors.ts`, `index.ts`. | Backend-as-Code Model | | |
| 3.6 | Every `app/**/route.ts` and `app/**/page.tsx` that needs data imports from `@reading-advantage/domain` (not from `@reading-advantage/db`). Captures the F-305 root cause: app code must go through the domain layer, not directly to the DB package. | Backend-as-Code Model | | |

## 4. Authentication & Authorization

> *AGENTS.md §Authentication, §Permissions*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 4.1 | Auth uses the shared `@reading-advantage/auth` package — no `next-auth`, `@auth/*`, custom JWT signing, or Firebase Auth in the app. | Auth Philosophy | | |
| 4.2 | App code only calls the auth adapter surface: `auth.login()`, `auth.logout()`, `auth.getCurrentUser()`, `auth.requireUser()`, `auth.requireRole()`, `auth.changePassword()`. No direct reads of cookies, `getServerSession`, or token parsing. | Auth Adapter | | |
| 4.3 | No JWT secret signing/verifying in app code. (Library internals OK inside `packages/auth`.) | Auth Philosophy | | |
| 4.4 | Password hashing uses Argon2id (verify in `packages/auth`). No `bcrypt`, `bcryptjs`, `crypto.scrypt`, or hand-rolled hashing in app code. | Authentication Requirements | | |
| 4.5 | Sessions are backed by PostgreSQL (`packages/auth` + `packages/db`). No in-memory sessions, no `Map<>` caches across requests. | Authentication Requirements | | |
| 4.6 | Rate limiting exists on login and other security-sensitive endpoints. | Authentication Requirements | | |
| 4.7 | Audit log table exists and `auth.login`, `auth.logout`, `auth.changePassword` write to it. | Observability | | |
| 4.8 | `proxy.ts` (or `middleware.ts`) at the app boundary calls `requireRole` / `requireUser` from `@reading-advantage/auth` — not cookie-presence checks. | Auth Adapter | | |
| 4.9 | Role hierarchy is enforced in `packages/auth` (ADMIN ⊃ TEACHER ⊃ STUDENT, etc.) and reused everywhere; no app-local `if (user.role === "ADMIN")` ladders. | Permissions | | |
| 4.10 | Any script that creates users calls `hashPassword` from `@reading-advantage/auth` — not `bcrypt.hash` directly. Captures F-402: 3 science-advantage seed scripts hand-rolled `bcrypt.hash(password, 10)`. | Authentication Requirements | | |

## 5. Database & Multi-Tenancy

> *AGENTS.md §Database*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 5.1 | All schema lives in `packages/db/src/schema/`. The app contains no `schema.prisma` and no Drizzle schema files. | Database | | |
| 5.2 | All app queries use the shared `db` client from `packages/db`. No second `pg`, `postgres-js`, or `mysql2` client instances in app code. | Database | | |
| 5.3 | Every read/write that touches tenant-scoped data includes a `schoolId` (or equivalent tenant) predicate. | Multi-Tenancy | | |
| 5.4 | Tenant scoping is enforced by `TenantDB` (or equivalent wrapper) — not by hand-rolled `where: { schoolId: user.schoolId }` in every call site. | Multi-Tenancy | | |
| 5.5 | No `prisma`/`@prisma/client` imports anywhere in the app. | Database | | |
| 5.6 | Migrations are generated via `drizzle-kit generate`, live in `packages/db/drizzle/`, and are committed to the repo. No ad-hoc `db push` in CI. | Migrations | | |
| 5.7 | Migrations are applied before the dependent app code deploys (CI enforces ordering). | Migrations | | |
| 5.8 | Destructive migrations (DROP, ALTER TYPE, column removal) have an ADR or comment justifying the change. | Migrations | | |
| 5.9 | Drizzle relations are used for JOIN-by-foreign-key patterns; raw SQL is reserved for views, CTEs, and matviews. | Database | | |
| 5.10 | No `new Map<string, X>()` for rate-limit, session, or session-cleanup state in app code. In-memory Maps are not shared across serverless instances and reset on cold start. Use Postgres-backed state (e.g. `login_attempts` table) or a shared cache (Redis). Captures F-403. | Database | | |

## 6. Validation & Contracts

> *AGENTS.md §Contracts and Validation*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 6.1 | Every external boundary (Route Handler, Server Action, webhook, tRPC procedure, worker trigger, CLI) has an input Zod schema. | Contracts and Validation | | |
| 6.2 | No `JSON.parse(req.body)` / `req.json()` / `formData` → typed value paths that skip Zod validation. | Contracts and Validation | | |
| 6.3 | Env vars are validated at boot via Zod (`@reading-advantage/config` or app-local `lib/env.ts`). Missing/invalid env causes process exit, not silent defaults. | Contracts and Validation | | |
| 6.4 | Types in the app are inferred from Zod (`z.infer<typeof Schema>`) wherever possible — no parallel hand-written types that drift. | Contracts and Validation | | |
| 6.5 | AI structured outputs use `generateObject` (or equivalent) with a Zod schema. No `JSON.parse(aiText)` round-trips. | AI | | |
| 6.6 | Forms on the client use the same Zod schema as the server (shared via `packages/types` or `@reading-advantage/contracts`). | Contracts and Validation | | |

## 7. Transport Independence

> *AGENTS.md §tRPC Policy, §Route Handlers vs API Services*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 7.1 | `app/**/route.ts` files are thin: parse input → call domain function → return response. No DB access, no permission logic, no business validation. | tRPC Policy | | |
| 7.2 | `app/**/actions.ts` (Server Actions) are thin: same shape as route handlers. | Backend-as-Code Model | | |
| 7.3 | Core domain functions do not import from `next/`, `@trpc/`, `hono`, or any transport library. | tRPC Policy | | |
| 7.4 | Public API endpoints (mobile, third-party) live in `services/api/`, not as Next.js Route Handlers. | Route Handlers vs API Services | | |
| 7.5 | Webhook ingress (GitHub, Stripe, etc.) lives in `packages/webhooks/` or `services/api/webhooks/`, not as Route Handlers inside apps. | Route Handlers vs API Services | | |

## 8. Storage, AI, Workers

> *AGENTS.md §Storage, §AI, §Jobs and Workers*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 8.1 | Long-running work (AI generation, file processing, report generation, LLM review) is dispatched to a worker (`/services/worker` or package-level job). Not awaited inside a request handler. | Jobs and Workers | | |
| 8.2 | AI prompts, tools, and structured-output schemas are versioned and colocated with the owning backend module — not inlined in route handlers. | AI | | |
| 8.3 | AI prompts are loaded as constants or files, not concatenated from user input. Prompt-injection guards exist on user-influenced prompts. | AI | | |
| 8.4 | Worker jobs are infrastructure adapters; the actual job logic lives in `packages/domain/`. | Jobs and Workers | | |
| 8.5 | File uploads/downloads go through the storage adapter with signed URLs — no direct public bucket URLs in user-facing code. | Storage | | |

## 9. Observability

> *AGENTS.md §Observability*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 9.1 | All backend functions emit structured logs (JSON or pino-style) with at least: `requestId`, `userId`, `operation`, `latencyMs`. | Logging | | |
| 9.2 | No `console.log` / `console.error` in production code (test files OK). | Logging | | |
| 9.3 | Error reporting (Sentry, OpenTelemetry, equivalent) is wired and captures unhandled errors. | Observability | | |
| 9.4 | Audit events are written for: login, logout, password change, permission change, billing event, destructive action. | Audit Logs | | |
| 9.5 | Audit log table is append-only (no UPDATE/DELETE grants in DB migrations or app code). | Audit Logs | | |
| 9.6 | Request tracing is enabled for at least the API surface (tRPC/Routes/Server Actions). | Observability | | |
| 9.7 | `audit_events` table exists in `packages/db/src/schema/` AND is append-only (REVOKE UPDATE, DELETE). No app code issues UPDATE or DELETE against the audit table. Captures F-404 / F-901. | Audit Logs | | |

## 10. Testing

> *AGENTS.md §Testing*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 10.1 | Test framework is Vitest for `packages/*` and the app (or Jest for legacy — see Known Issues). No mix within a single package. | Project-Specific Testing | | |
| 10.2 | Every domain function, tRPC router, and auth utility has a test in `src/__tests__/*.test.ts` (or `__test__/` for Jest). | Project-Specific Testing | | |
| 10.3 | Unit tests mock the DB with `vi.fn()` / `jest.fn()` (no real Postgres for unit tests). | Project-Specific Testing | | |
| 10.4 | Integration tests exist for at least: auth flow, multi-tenant boundary, one happy-path per router. | Project-Specific Testing | | |
| 10.5 | `pnpm turbo run test` exits 0 in the audited app. | Project-Specific Testing | | |
| 10.6 | Coverage is reported (Vitest `--coverage` or equivalent) and trends are tracked. | Testing | | |
| 10.7 | `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` is not set in `next.config.ts` (or `tsconfig.json`). | Build Quality | | |
| 10.8 | CI runs lint, type-check, and test on every PR. | Project-Specific Testing | | |

## 11. Documentation

> *AGENTS.md §Documentation Standards*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 11.1 | Every exported function, class, interface, and type alias in `packages/*` has a JSDoc comment with description, `@param`, `@returns`. | JSDoc for All Functions | | |
| 11.2 | `@throws` is documented for any function that throws or returns Result-style errors. | JSDoc for All Functions | | |
| 11.3 | JSDoc does not repeat TypeScript types. | JSDoc for All Functions | | |
| 11.4 | Each backend module has a top-of-file comment explaining its purpose, scope, and ownership. | JSDoc for All Functions | | |
| 11.5 | `apps/<app>/AGENTS.md` (or `CLAUDE.md` / `README.md` section) summarizes app-specific deviations from the monorepo spec. | JSDoc for All Functions | | |
| 11.6 | *(Moved to §14.1 — graph.db is now a CI-gated precondition, not a documentation check.)* | — | — | — |

## 12. Monorepo Hygiene

> *AGENTS.md §Version Policy, §Build & Test*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 12.1 | Pinned versions in `package.json` and `pnpm-lock.yaml` are committed. | Version Policy | | |
| 12.2 | No uncommitted local scripts (`.ts`, `.mjs`, `.sh`) under `apps/<app>/` outside `scripts/`. | Monorepo Hygiene | | |
| 12.3 | The app builds in isolation: `pnpm turbo run build --filter=<app>` succeeds. | Build & Test | | |
| 12.4 | Lint passes: `pnpm turbo run lint --filter=<app>` exits 0. | Build & Test | | |
| 12.5 | Type-check passes: `pnpm turbo run check-types --filter=<app>` exits 0. | Build & Test | | |
| 12.6 | Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). | Commit Style | | |
| 12.7 | Tracks used to land non-trivial changes are referenced in commit messages. | Commit Style | | |

## 13. Workflow & Tooling

> *AGENTS.md §Measure Workflow*

| # | Check | Section | Status | Evidence |
|---|-------|---------|--------|----------|
| 13.1 | Significant changes reference a Measure track in `measure/tracks/`. No drive-by refactors of scope >1 day. | Measure Workflow | | |
| 13.2 | `measure/tech-debt.md` is current and <50 lines. | Tech Debt Registry | | |
| 13.3 | `measure/lessons-learned.md` is current and <50 lines. | Lessons Learned | | |
| 13.4 | The app's `package.json` `name` matches `apps/<app>/package.json#name` and follows the `@reading-advantage/*` (or `app-*`) convention. | Monorepo Structure | | |
| 13.5 | No `TODO`/`FIXME`/`XXX` comments without a tracking issue or tech-debt row. | Tech Debt Registry | | |
| 13.6 | Secrets are not committed. `.env*` files are git-ignored. | Security | | |

## 14. Pre-audit Preconditions

> These checks must pass before starting an audit. If any fail, abort the audit and fix the precondition first.

| # | Check | Section | Status | Evidence |
|---|-------|---------| | |
| 14.1 | `build-graph stats ./graph.db` reports `Total files > 0`. If 0, the graph is empty and every `build-graph search`/`callers`/`deps` query will return empty results, forcing the audit to fall back to grep-only. Run `build-graph scan . ./graph.db` to rebuild. | Codebase Graph | | |
| 14.2 | `graph.db` mtime is within the last 24 hours (per AGENTS.md §Codebase Graph "fresh" definition). If stale, re-scan. | Codebase Graph | | |
| 14.3 | `scripts/ci/check-graph-db.sh` exists and is executable. This CI gate prevents merges when graph.db is empty. | CI | | |

> **Why §14 exists (F-1003 incident):** The 2026-06-03 science-advantage pilot audit ran against an empty `graph.db` (0 nodes, 0 edges, 0 files; 69 KB on disk). Every `build-graph` query returned empty results, forcing the audit to use manual `rg` for every section. The "query before grep" guidance was not enforceable. Making graph.db a CI-gated precondition (not a documentation rule) ensures this cannot recur silently.

---

# Audit Procedure

1. **Setup**
   - Create the report directory: `measure/audit-reports/<app>_<yyyymmdd>/`
   - Open a new Measure track: `measure/tracks/agents_md_audit_<app>_<yyyymmdd>/` with `metadata.json` + `spec.md` (this protocol as the spec) + `plan.md` (one task per section: 1–13).
   - Run `build-graph scan . ./graph.db` to refresh the knowledge graph; the audit will query it.

2. **Discovery (Section 0)**
   - Inventory: list of all `app/**/route.ts`, `app/**/actions.ts`, `lib/`, `components/`, `prisma/`, `scripts/`. Use `build-graph stats` and `build-graph search` with relevant keywords.
   - Capture: package.json deps, `next.config.ts`, `proxy.ts`/`middleware.ts`, `tsconfig.json`, `vitest.config.ts`, CI workflow.
   - Output: `00-inventory.md` with file counts and pointers.

3. **Static analysis per section**
   - Use `build-graph deps` and `build-graph callers` to traverse the graph.
   - Use `Grep` for provider SDK names, `prisma`, `firebase`, `bcrypt`, `console.log`, `JSON.parse(req.`, `$queryRaw`, `getServerSession`, `cookies()`, `headers()`.
   - For each item, record PASS/FAIL/N/A/DEFERRED with file:line evidence in `checklist.md`.

4. **Manual review (judgment calls)**
   - The static checks above find *violations*. A finding is only Critical/High if it actually breaks the AGENTS.md guarantee. Inspect 1–2 examples per failure to confirm the pattern.
   - Examples that look like violations but are acceptable:
     - `import { db } from "..."` inside a `lib/db.ts` adapter that wraps the shared client
     - `JSON.parse` of an env var already validated by Zod at boot
     - `console.log` in a test setup file

5. **Classify findings**
   - For each FAIL, write a row in `findings.md`:
     ```md
     ### F-007: 27 route.ts files import db directly
     - **Rule:** 2.5
     - **Severity:** Critical
     - **Evidence:** `app/api/students/route.ts:12`, `app/api/lessons/route.ts:8`, ... (26 more)
     - **Impact:** Auth/tenancy enforcement is per-route. No way to add audit logging, rate limiting, or shared error handling consistently.
     - **Suggested fix track:** "science-advantage — Domain-Layer API Migration" (Phase 1: audit, Phase 2: scaffold TenantDB + 1 router, Phase 3: migrate remaining 26)
     ```
   - Sort findings by severity. Add a summary table at the top.

6. **Generate migration tracks**
   - Group findings into proposed Measure tracks in `migration-tracks.md`. Use the standard track shape: `metadata.json` + `spec.md` + `plan.md`.
   - Track sizing rule: a track should be ≤15 plan tasks. If a finding needs more, split it.
   - Critical findings become blocking tracks. High findings become next-quarter tracks. Medium/Low are batched.

7. **Write executive summary**
   - One page. Total rules, % pass, top 5 risks, recommended next 3 tracks.

8. **Update tech-debt and tracks registry**
   - Add a Critical/High row per finding in `measure/tech-debt.md`.
   - Add the proposed tracks to `measure/tracks.md` under a "Pending Tracks — Audit Findings" section.
   - Reference the audit report in `measure/index.md`.

9. **Present to user**
   - Share `executive-summary.md` + top 3 proposed tracks. Wait for sign-off before opening track tickets.

---

# Pilot: science-advantage

The science-advantage pilot ran on 2026-05-26 as a one-off (see `measure/tech-debt.md` row `audit_20260526`). The findings were:

- **F-001 (Critical):** 27 `route.ts` files import `db` directly; 0 use `@reading-advantage/domain`, `assertCan`, or `TenantDB`. Auth/tenancy is hand-rolled per route.
- **F-002 (Critical):** 360 tsc errors / 386 lines, 4 lint errors / 6 warnings. Blockers include: ~354 testing-library matcher narrowing in `*.test.tsx` (need `@testing-library/jest-dom/vitest` types wired into `vitest.unit.setup.ts`); 2 INTERN role widening in `lib/auth/session.ts`; 2 missing-sibling-module errors in `lib/auth/{password,rate-limit}.test.ts`; 3 ProcessEnv narrowing; 4 next@16 duplicate-instance type identities; 4 misc. Lint: 4 `react-hooks/immutability` errors in `components/features/teacher/analytics/`.
- **F-003 (Medium):** `/assignments` page is a hardcoded stub. Pre-existing, not a Track 3 regression.
- **F-004 (Critical — shared):** `proxy.ts` admin guard checked cookie presence only, not token validity or role. (Same vulnerability also present in codecamp-advantage; resolved 2026-05-26 by `proxy_admin_guard_hardening_20260526`.)

The protocol above was reverse-engineered from this pilot. Open question to confirm before the formal run: should the protocol be retroactively applied to the 2026-05-26 findings, or is the protocol forward-looking only?

---

# Open Questions

- [ ] **Re-audit trigger.** Should re-audits run automatically when a migration track's PR merges, or only when a human requests it? The protocol currently says "track PR merges" but tooling does not exist yet.
- [ ] **Coverage threshold.** AGENTS.md says ">80%" but does not enforce. Should the protocol record a FAIL when coverage drops below 80% on a domain module?
- [ ] **Per-rule weights.** Per the user's choice on 2026-06-03, the protocol uses pass/fail only. If trends become useful later, we can add a "criticality × blast radius" matrix without changing the check items.
- [ ] **App-specific deviations.** Some apps (e.g. `www-reading-advantage`) intentionally deviate from parts of AGENTS.md (e.g. no domain layer because it has no domain). The protocol should record these as N/A with a justification, not as FAIL.

---

# Maintenance

This protocol is living documentation. When a new AGENTS.md rule is added or a rule becomes obsolete, update this checklist in the same change. When a check item is consistently FAIL across all audited apps, it likely indicates the protocol is asking too much — demote it to a "Recommended" footnote or remove it.

Version: 1.1 (2026-06-03)
