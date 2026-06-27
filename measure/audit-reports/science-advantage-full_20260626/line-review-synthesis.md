# Line Review Synthesis: Science Advantage Full Feature Review

> **Track:** `science_advantage_review_20260626`
> **Parent track:** `monorepo_feature_review_masterplan_20260626`
> **Audit directory:** `measure/audit-reports/science-advantage-full_20260626/`
> **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Phase heading:** line-review synthesis before acceptance
> **Phase 4 (Acceptance) / Closeout:** **PENDING** — synthesis written; acceptance and closeout are intentionally **not** claimed here.
> **Remediation status:** **NONE.** No application code, test, config, doc, or seed file was edited during this review. This document reports findings only; it does **not** claim any defect was fixed.
> **App code edited during review:** None.

This document is the synthesis pass over the **37 batch reports** that cover the full `apps/science-advantage` tracked source tree. It does not introduce new findings; it deduplicates, classifies, and prioritizes the line-anchored findings produced by the per-batch line-by-line reviews and points the reader back to the originating batch ID for evidence.

---

## 1. Scope and Coverage

### 1.1 Coverage metrics

| Metric | Value | Source |
|---|---:|---|
| In-scope tracked files | 738 | `line-review-coverage.md` |
| Batches | 37 (`sa-batch-00` … `sa-batch-36`) | `line-review-coverage.md` |
| Reports present | 37 / 37 | `ls line-review/sa-batch-*.md` |
| Batch size | 20 files (final batch `sa-batch-36` = 18) | `line-review-coverage.md` |
| Total report lines | 14,240 | `wc -l line-review/sa-batch-*.md` |
| Unique finding IDs emitted | 922 `F-SA-B##-###` IDs | `grep -hoE 'F-SA-B[0-9]+-[0-9]+'` |
| Exclusions | `.next/**`, `node_modules/**`, `public/**`, `coverage/**`, `.turbo/**` | `line-review-coverage.md` |

> **Coverage claim is scoped.** "Reviewed" means each file was read and a batch report exists; it does not mean every defect inside every file was exhaustively captured. The 922 finding IDs include `OK` / positive-pattern annotations as well as defects — the deduplicated defect inventory is in `findings.md`. Per-batch limitation notes (static-only analysis, no runtime execution) are preserved in each report and summarized in §6.

### 1.2 Coverage by surface area

| Surface | Batches | Notes |
|---|---|---|
| Repo meta / config / templates / top-level docs | 00 | `.env.example`, issue templates, `GEMINI.md`, `README.md`, design docs |
| App Router pages (admin/auth/student/system/teacher) | 01–02 | thin server pages + teacher analytics/class detail |
| API route handlers + their integration/unit tests | 02–05 | DSAR, AI recommendations, classes, lessons, students, teachers |
| Global app shell, contexts, UI components | 05–11 | gamification, lesson blocks, quiz, mastery profile, shadcn/ui |
| Archived docs (architecture, competitor, curriculum, front-end-spec) | 11–16 | `docs/archive/**` — pre-migration historical material |
| Active specs / PRD / sprint / project-brief docs | 15–17 | `docs/specs/**`, `docs/prd/**`, `docs/sprint/**` |
| `lib/**` runtime: AI, auth, observability, platform, gamification, schemas, services, validations | 18–26 | the bulk of business logic and its tests |
| Measure framework: archive tracks, active tracks, styleguides | 26–31 | track specs/plans/metadata |
| Root config (`next.config.ts`, `package.json`, `proxy.ts`, `playwright.config.ts`) | 31, 36 | |
| Scripts + seed data (grade-3/grade-4 lessons, questions, standards) | 31–35 | content-as-code, seeders |
| Sentry config, test harness (`vitest.*.config.ts`), `tsconfig`, `vercel.json` | 35–36 | |

### 1.3 What was *not* in scope / not assessable at this depth

- **`apps/science-advantage/.codex/skills/conductor.skill`** — committed as a binary Zip archive; not text-reviewable (sa-batch-00, F-SA-B00-001).
- **Runtime/dynamic behavior** — every batch is static analysis. No test was executed; red-phase TDD assertions are not distinguished from genuine regressions without a run (Phase 4 gate, PENDING).
- **Shared-package internals** — domain functions in `@reading-advantage/domain`, `@reading-advantage/auth`, `@reading-advantage/db` were referenced but their full call graphs were not re-audited beyond the science-advantage call sites.
- **Live API authorization** — several page-shell findings note that defense-in-depth depends on the downstream API enforcing tenancy; that enforcement was inspected where the route file was in-batch but not exercised at runtime.

---

## 2. Severity Tally Across the 37 Batches

Counts below are taken from each batch report's own summary block. They are reported per-batch because the batches did not all use an identical rubric; the aggregate is a derived sum and is **approximate** (some batches fold cross-cutting findings into a single ID, some count `OK`/positive observations separately). The authoritative deduplicated defect list lives in `findings.md`.

| Batch | Dominant content | Critical | High | Medium | Low | Info |
|---|---|---:|---:|---:|---:|---:|
| 00 | config/docs/templates | 0 | 4 | 4 | 10 | 5 |
| 01 | app pages | 1 | 0 | 1 | 2 | 0 |
| 02 | teacher pages + API + tests | 1 | 3* | 7 | 13 | — |
| 03 | API + domain + tests | 3 | 3 | 5 | 3 | 0 |
| 04 | API routes + tests | 2 | 2 | 6 | 6 | 0 |
| 05 | API routes + tests | 2 | 0 | 5 | 7 | — |
| 06 | gamification/lesson tests | 0 | 1 | 8 | 5 | — |
| 07 | lesson/quiz components + tests | 0 | 0 | 1 | 11 | 4 |
| 08 | student components | 0 | 2 | 8 | 10 | — |
| 09 | teacher analytics components | 0 | 1 | 11 | 12 | — |
| 10 | UI components | 0 | 0 | 3 | 9 | 6 |
| 11 | UI + archive docs | 0 | 0 | — | — | — |
| 12 | archived architecture docs | 1 | 10 | 38 | 14 | — |
| 13 | archived competitor/curriculum docs | 0 | 0 | 0 | 0 | ~10 |
| 14 | deprecated front-end-spec docs | 0 | 0 | low/info | — | — |
| 15 | PRD/content-template docs | 0 | 0 | 0 | low | 7+ |
| 16 | project-brief/specs docs | 0 | 0 | 0 | low | 7 |
| 17 | active specs/sprint docs | 0 | 0 | 3 | 10+ | 4 |
| 18 | instrumentation + audit tests | 0 | 0 | 0 | low | mostly positive |
| 19 | AI lib + tests | 0 | 0 | 7 | 3 | — |
| 20 | auth lib + ci-gates tests | 0 | 0 | — | — | — |
| 21 | config/env/forms/gamification | 0 | 4 | 12 | 14 | 24 |
| 22 | gamification (xp/streak) | 2 | 3 | 5 | 4 | — |
| 23 | observability/platform (redis) | 0 | 3 | 4 | 6 | 4 |
| 24 | schemas/services (lib) | 0 | 6+ | 16 | 9 | 9 |
| 25 | services/utils/validations | 0 | 0 | 4 | 9 | 2 |
| 26 | validations + archive specs | 0 | 3 | ~5 | ~5 | — |
| 27 | archived track specs/plans | 5 | 8 | 8 | 2 | 6 |
| 28 | measure archive + framework | 0 | 6 | 5 | 5 | 6 |
| 29 | active track specs/plans | 0 | 5 | 11 | 11 | — |
| 30 | active track specs/plans | 0 | 4 | 8 | 9 | — |
| 31 | track specs + root config | 0 | 5 | 9 | 17 | — |
| 32 | scripts | 0 | 2 | 4 | 5 | 4 |
| 33 | grade-4 seed data | 0 | 2 | 1 | 5 | 3 |
| 34 | thai seed-data JSON | 0 | 0 | 5 | 5 | — |
| 35 | seed scripts/standards | 0 | 1 | 8 | 11 | 4 |
| 36 | test harness/config | 0 | 2 | 1 | low | info |

`*` sa-batch-02 stamps the three `getClassDetailWithCurriculum` tenancy findings (F-SA-B02-003/020/023) as High in its rollup though they appear as Medium in the file-by-file table; this is preserved as reported.

**Derived aggregate (approximate, see caveat above):** Critical ≈ 17, High ≈ 75, Medium ≈ 200, Low ≈ 250, Info ≈ 130. The large Medium/Low/Info volume is dominated by stale documentation and planning artifacts (batches 11–17, 26–31), not by live code.

---

## 3. Runtime/Code Findings vs Stale-Documentation/Planning Findings

A defining characteristic of this app's review is that **the majority of high-severity findings live in documentation and planning artifacts, not in running code.** Separating the two is required by the spec ("separate runtime/code findings from stale documentation/planning findings"). The two classes are tracked separately throughout `findings.md` and `migration-tracks.md`.

### 3.1 Runtime / live-code findings (the actionable security & correctness set)

These are defects in code that ships or runs (route handlers, domain/lib functions, components, tests, seeders, build config). Highest-priority deduplicated set:

| Rank | ID(s) | Theme | Source batch | Severity |
|---|---|---|---|---|
| 1 | F-SA-B22-001, -003, -019, -020, -061, -062 | `awardXp` / `updateStreakForProfile` use raw `db`, no tenant scoping, **no authorization** → cross-tenant XP/streak manipulation | sa-batch-22 | Critical/High |
| 2 | F-SA-B24-036, -037, -044, -045, -051, -056, -057 | `lib/services/**` (`get-class-detail`, `get-student-classes`, `mastery-worker`) have no auth context and no `schoolId` scoping; raw `db` not `tenantDb` | sa-batch-24 | High |
| 3 | F-SA-B02-003/020/023, F-SA-B21-056, F-SA-B21-057 | `getClassDetailWithCurriculum` and `badges.ts`/`xp.ts`/`streak.ts` bypass `createTenantDB` on FLAT tables (page-level ownership checks mitigate but function has no guard) | sa-batch-02, -21 | High |
| 4 | F-SA-B02-084 | Direct `@sentry/nextjs` import in `app/api/ai/recommendations/route.ts` — provider-neutrality violation (must go through observability adapter) | sa-batch-02 | Critical |
| 5 | F-SA-B04-002 | Analytics route uses `requireAuth()` (redirect) instead of returning JSON 401 → API consumers get HTML redirect | sa-batch-04 | Critical |
| 6 | F-SA-B23-015, -016 | Redis platform layer is a permanent stub: real client never implemented, in-memory fallback creates a new store per call → cache effectively non-functional in prod | sa-batch-23 | High |
| 7 | F-SA-B33-001, -002 | Grade-4 seed data does not match the seeder's Zod contract; `pnpm seed --grade=4` would hard-fail on questions and lessons | sa-batch-33 | High |
| 8 | F-SA-B32-003 | `create-test-users.ts` seeds privileged accounts with a hardcoded weak password and no production guard | sa-batch-32 | High |
| 9 | F-SA-B35-001, F-SA-B32-003 | Seed scripts run against any `DATABASE_URL` with no environment guard | sa-batch-35, -32 | High |
| 10 | F-SA-B21-034 | `AI_RECOMMENDER_HASH_SECRET` falls back to a hardcoded literal, bypassing the length `.refine` → predictable, non-secret hash | sa-batch-21 | High |
| 11 | F-SA-B36-001 | `vercel.json` build command invokes Prisma in a Drizzle-only app | sa-batch-36 | High |
| 12 | F-SA-B01-001, F-SA-B02-001/026 | App Router pages with no server-side auth gate (delegated entirely to client components / API) | sa-batch-01, -02 | Critical/Medium |
| 13 | F-SA-B05-001, -002 | Route/schema contract bugs: `"me"` alias rejected by UUID schema; `limit` test expects clamping but `.max(100)` rejects | sa-batch-05 | Critical (test/contract mismatch) |
| 14 | F-SA-B04-001, F-SA-B04-004, F-SA-B25-001, F-SA-B32-004, F-SA-B35-006 | Test/seed fixtures omit `schoolId` on FLAT tables → TenantDB isolation is a **no-op under test**; tenant tests give false confidence | sa-batch-04, -25, -32, -35 | Critical/High |
| 15 | F-SA-B36-002 | `student-classes.test.ts` 403 case contradicts the route and the permission table | sa-batch-36 | High |
| 16 | F-SA-B03-001, -004, -007 | `update-mastery` maps unknown errors to 202/QUEUED; duplicated/likely-wrong `averageScorePercentage`; `create-assignment` doesn't verify lesson∈class curriculum | sa-batch-03 | High/Medium |
| 17 | F-SA-B08-001, -002, F-SA-B07 (business logic in components) | Systemic JSDoc absence + business logic embedded in client components (polling, hashing, quiz submission) | sa-batch-07, -08 | High |

### 3.2 Stale-documentation / planning findings (mislead-risk, not running code)

These are real and worth fixing (they actively mislead agents and contributors) but they are **not** live-code vulnerabilities. They cluster heavily and are deduplicated into a small number of themes:

| Theme | Representative IDs | Source batches | Notes |
|---|---|---|---|
| **Prisma → Drizzle stale references** | F-SA-B00-013/014/016/019/020, F-SA-B27-007/008/018/019/025/026/027/030/032, F-SA-B17-001/012, F-SA-B36 docs | 00, 12, 17, 26, 27 | Archived/active docs and track plans still reference `prisma/schema.prisma`, `npx prisma generate`, `prisma-zod-generator`. Largest single doc-drift cluster. |
| **Auth model drift (Google OAuth / NextAuth)** | F-SA-B00-013/015, F-SA-B26-023/024/025, F-SA-B27-009/011, F-SA-B29-022 | 00, 12, 26, 27, 29 | `GEMINI.md`, `tech-stack.md`, and a closed `critical_security` spec assert Google-OAuth-only; the app uses username/password via `@reading-advantage/auth`. Some **checked acceptance criteria are not verifiably true**. |
| **`npm` → `pnpm` tool mismatch** | F-SA-B00-004/017, F-SA-B17-100s | 00, 17 | README/templates/sprint docs use `npm`. |
| **No multi-tenancy in planning docs** | F-SA-B12-066, F-SA-B15-011, F-SA-B27-024, F-SA-B30-014, F-SA-B31-028 | 12, 15, 27, 30, 31 | Pre-migration architecture and several track specs never mention `schoolId` scoping. |
| **Placeholder/boilerplate track specs & plans** | F-SA-B29-002/003/012, F-SA-B30-009/011, F-SA-B31-025/026 | 29, 30, 31 | `redis_actual_integration`, `teacher_dashboard_surfaces` pair one-line specs with generic skeleton plans; weakest + highest-risk tracks. |
| **Legacy BMAD process references** | F-SA-B00-002, F-SA-B17-027 | 00, 17 | `story-with-agents.md` and sprint docs reference the retired BMAD multi-agent framework. |
| **Supply-chain / config hygiene** | F-SA-B00-010 (`@latest`+`-y`), F-SA-B00-011 (trailing comma), F-SA-B00-009 (`\n.tmp/`) | 00 | `.opencode/mcp.json`, `.opencode/opencode.json`, `.gitignore`. |

> The archived-doc findings in batches 12–16 are explicitly tagged in their reports as **historical / pre-migration material under `docs/archive/**`**; many carry `status: deprecated` frontmatter. They are NOT regressions in current code. They are surfaced because new agents can still discover and trust them.

---

## 4. Verified Golden-Path Patterns (carry forward to Reading & Primary)

These patterns were observed working correctly across multiple batches and are recommended as reusable migration exemplars. Detail and evidence in `baseline-patterns.md`.

1. **Thin server pages with delegated auth via `requireRole()`** — 19/20 pages in sa-batch-01 follow it; the lone outlier (F-SA-B01-001) is anomalous, which confirms the pattern is the norm.
2. **Domain-function contract `{ user, tenant, input }` with `assertCan()` inside the domain function** — all 8 API routes in sa-batch-05 follow it; `tenant.schoolId` sourced from the session, never the client.
3. **`createTenantDB(db, tenant)` then pass scoped db to domain function** — sa-batch-02 files 10 & 12 (`teacher/classes/page.tsx`, `teacher/page.tsx`); the *correct* counter-example to the raw-`db` deviations.
4. **Zod at external boundaries** — DSAR route `.refine()` XOR validation (sa-batch-02), `parseQuery`/`parsePath` helpers (sa-batch-05), `studentEnrolledClassesResponseSchema.parse()` on API responses (sa-batch-08), `zodResolver` forms (sa-batch-08).
5. **`runWithRequestContext` observability wrapper** on route handlers (sa-batch-02, files 15 & 19).
6. **Per-block error isolation** — `lesson-player.tsx` wraps each block in `BlockErrorBoundary` (sa-batch-07).
7. **DSAR export test design** — STORE-method ZIP reader, idempotent `onConflictDoNothing()` seeds, prefix-scoped cleanup, cross-tenant empty-result isolation test, "counts triple" invariant (sa-batch-02, files 13–14).
8. **Audit-tooling reproducibility** — `snapshotRgFiles`, `git check-ignore` hermetic probes, audit-to-track traceability tables (sa-batch-18, -23).
9. **ESLint config with audit trail** — track-ID-referenced exemptions, logger-sink separation (sa-batch-17, `eslint.config.mjs`).
10. **Idempotency via pipeline status table** — `masteryRun` status transitions + serialized transactions (sa-batch-17 student-profile spec; partially realized in `mastery-worker.ts`).
11. **Integration harness does it right** — `vitest.integration.setup.ts` resolves a `_test` DB URL and runs Drizzle migrations once (sa-batch-36), the correct counter-model to `vercel.json`'s Prisma call.

---

## 5. Patterns NOT to Generalize

Detail in `baseline-patterns.md` §"Do Not Generalize".

1. **Raw `db` import instead of `createTenantDB`** in `lib/services/**`, `lib/gamification/**` — this is the single most repeated live deviation (sa-batch-02, -21, -22, -24). Do **not** copy it into other apps; it is the source of the tenancy findings.
2. **In-memory TTL / Map caches presented as "Redis-parity"** — `lib/interventions/cache.ts`, `lib/platform/redis-client.ts` (sa-batch-21, -22, -23). Acceptable only single-instance; broken under horizontal scale and currently a permanent stub.
3. **Client components owning their own auth** — pages 1 & 9 in sa-batch-02 and the sa-batch-01 outlier. Weaker than the server-gate norm; do not generalize.
4. **Business logic embedded in React components** — polling, SHA-256 hashing, quiz scoring inside `.tsx` (sa-batch-07, -08). Violates "business logic belongs in `/packages/backend`."
5. **Manual hand-rolled validators instead of Zod** at boundaries (`validate-json.ts`, content/seed validators — sa-batch-24, -32). Predate the Zod migration; do not treat as the pattern.
6. **Prisma-era schema notation in spec docs** and **Google-OAuth auth contracts** — do not seed new specs from `tech-stack.md` or `GEMINI.md` (sa-batch-27, -00).
7. **`test.skip()` in test body / conditional `if (visible)` assertion guards** — false-pass risk (sa-batch-02 e2e, sa-batch-17 smoke).
8. **Direct provider SDK import** (`@sentry/nextjs`, `@opentelemetry/sdk-node` at app root) — go through the observability adapter (sa-batch-02, -18).

---

## 6. Residual Coverage Caveats

1. **Static analysis only** — no runtime execution; red-phase TDD tests (e.g. sa-batch-18 build-graph coverage, F-SA-B18-005) cannot be distinguished from genuine failures without the Phase 4 gate run (PENDING).
2. **Binary `.skill` file unreviewed** (sa-batch-00).
3. **Downstream API authorization** for client-delegated pages (sa-batch-01, -02, -09) was only partially verifiable; the API route had to be in-batch to confirm the tenant check.
4. **Domain-package internals** referenced from science-advantage were not re-audited.
5. **Test pass/fail at HEAD not confirmed** — several batches note tests may be intentionally RED per TDD phase.
6. **Aggregate severity counts are derived** from heterogeneous per-batch rubrics; treat `findings.md` as authoritative for the deduplicated defect set.

---

## 7. Relationship to Other Artifacts

| Artifact | Purpose |
|---|---|
| `00-inventory.md` | File/route/feature inventory and batch→surface map |
| `workflow-map.md` | Student/teacher/admin/system workflows traced to code & findings |
| `baseline-patterns.md` | Verified golden-path patterns + patterns not to generalize, with batch evidence |
| `checklist.md` | Spec/AGENTS.md compliance checklist with verification state (PENDING where runtime needed) |
| `findings.md` | Deduplicated defect inventory, runtime vs stale-doc separated, each → source batch ID |
| `migration-tracks.md` | Proposed science-specific and shared-platform remediation tracks (proposals only) |
| `test-gaps.md` | Missing/weak test coverage with batch evidence |
| `executive-summary.md` | Leadership-level rollup; acceptance/closeout PENDING |

---

## 8. What Phase 4 (Acceptance) Should Verify — PENDING

Acceptance and closeout are **not** claimed by this synthesis. When the Measure phase-acceptance runs, it should:

1. Run targeted `lint`, `check-types`, `test`, `build` gates for `apps/science-advantage` and record results (Phase 4, Task 1 — still `[b]`).
2. Confirm `pnpm seed --grade=4` against the F-SA-B33-001/002 finding (expected to hard-fail today).
3. Confirm whether the tenant-test no-op (F-SA-B04-001/004) means existing tenant-isolation tests are vacuous.
4. Spot-execute the cross-tenant XP/streak path (F-SA-B22-003) to confirm exploitability.
5. Decide which deduplicated findings are accepted into the final roadmap.

> Until then, **all plan.md tasks remain `[b]` (deferred:review-execution)** and no finding in this synthesis is marked remediated.

---

## 9. Index of Batches

`sa-batch-00` config/docs · `01` app pages · `02` teacher pages+API · `03` API+domain · `04` API routes · `05` API routes · `06` gamification/lesson tests · `07` lesson/quiz components · `08` student components · `09` teacher analytics components · `10` UI components · `11` UI+archive docs · `12` archived architecture · `13` competitor/curriculum docs · `14` front-end-spec docs · `15` PRD/templates · `16` project-brief/specs · `17` active specs/sprint · `18` instrumentation+audit tests · `19` AI lib · `20` auth/ci-gates · `21` config/env/forms/gamification · `22` xp/streak · `23` observability/platform · `24` schemas/services · `25` services/utils/validations · `26` validations+archive specs · `27` archived track specs · `28` measure archive+framework · `29` active tracks · `30` active tracks · `31` tracks+root config · `32` scripts · `33` grade-4 seed data · `34` thai seed data · `35` seed scripts/standards · `36` test harness/config.

---

*End of synthesis. No remediation performed. Acceptance/closeout PENDING.*
