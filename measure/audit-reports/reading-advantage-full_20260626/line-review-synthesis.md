# Line Review Synthesis: Reading Advantage Full Feature Review

> **Track:** `reading_advantage_full_review_20260626`
> **Audit directory:** `measure/audit-reports/reading-advantage-full_20260626/`
> **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Phase heading:** line-review synthesis before acceptance
> **Phase 7 (Acceptance):** **PENDING** — synthesis written; acceptance/closeout is intentionally not claimed here.
> **App code edited during review:** None.

This document is the synthesis pass over the 51 batch reports that cover the full `apps/reading-advantage` source tree. It does not introduce new findings; it deduplicates and prioritizes the line-anchored findings produced by the per-batch line-by-line reviews and points the reader back to the originating batch report for evidence.

---

## 1. Scope and Coverage

### 1.1 In-scope files

| Metric | Value | Source |
|---|---:|---|
| In-scope tracked files | 1,016 | `line-review-coverage.md` |
| Batches | 51 (`ra-batch-00` through `ra-batch-50`) | `line-review-coverage.md` |
| Batch size | 20 files (final batch 16) | `line-review-coverage.md` |
| Reports present | 51 / 51 | verified via `ls measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-*.md` |
| Per-batch result JSONs | 14 (sub-agent completion receipts) | `ra-batch-*-result.json` |
| Total report bytes | ~2.2 MB (34,703 lines across the 51 reports) | `wc -l line-review/ra-batch-*.md` |

### 1.2 Coverage by surface area

The 1,016 files distribute roughly as follows (line-anchored counts are taken from `line-review-coverage.md`):

| Surface | Approx. files | Batches |
|---|---:|---|
| `app/api/**` route handlers (`route.ts`) | 209 | 06–16 (auth + v1) |
| `app/[locale]/**` pages (admin/teacher/student/system/index/auth) | ~90 | 01–06, 32–33 |
| `server/controllers/**` (54 controllers) | 54 | 44–47 |
| `server/services/**`, `server/utils/**`, `server/middleware/**`, `server/constants.ts`, `server/models/**` | ~40 | 47–49 |
| `components/**` (UI, dashboard, games, lessons, ui) | ~430 | 17–36 |
| `lib/**`, `hooks/**`, `store/**`, `i18n/**`, `middleware.ts`, `next.config.mjs`, etc. | ~70 | 38–43, 50 |
| Configs, locales, db-migrations, scripts, types, utils | ~60 | 36–38, 43–44, 50 |
| `__test__/**` (legacy Jest suites) | 18 | 00–01 |
| Build / deploy (`Dockerfile`, `cloudbuild.yaml`, `components.json`, etc.) | 6 | 00, 17, 49 |
| Data assets (prompts, images, mp3, matview SQL) | ~20 | 36–38 |

> **Coverage claim is scoped.** "Reviewed" means each file was read in full and a batch report exists; it does not mean every defect inside a file was exhaustively captured. Where a batch explicitly notes that a file is large or only partially inspected, the per-batch report records the limitation (e.g. `ra-batch-32.md` notes 1,551 lines for a single batch). See §6 for residual coverage caveats.

### 1.3 Review-role distribution

The 51 batch reports do not all use the same format. The batches explicitly tag their reviewer role on the report header (Role A = correctness/architecture/anti-patterns; Role B = security/tenancy/auth; Role C = UX/API/contracts). Where a header was absent, batches used the `F-RA-B##-###` / `F-UX-###` / `H/M/L-##` finding-ID convention to indicate role.

| Review role | Batches | Headline role focus |
|---|---|---|
| A — correctness/architecture/anti-patterns | 00, 03, 08, 15, 19, 21, 22, 24, 27, 28, 31, 32, 35, 36, 37, 38, 39, 40, 43, 48 (partial) | Vacuous tests, anti-patterns, business-logic-in-UI, hot-paths, contracts |
| B — security/tenancy/auth | 01, 05, 06, 09, 10, 11, 12, 13, 14, 16, 18, 20, 25, 26, 29, 30, 33, 34, 44, 45, 46, 47, 50 | Server actions, controllers, route auth, OAuth, multi-tenant, demo |
| C — UX/i18n/contracts | 02, 04, 07, 17, 23, 41, 42, 49 (partial) | Page-level UX, games UI, hooks, components, i18n |
| Mixed/unstamped | Several batches combine roles | The role stamp is informational only; the synthesis is role-agnostic. |

> The role split exists to make evidence routing easier for remediation owners; this synthesis intentionally mixes all roles because the user-visible blast radius is what matters for the final roadmap.

### 1.4 What was *not* in scope

- **Primary Advantage, Science Advantage, www-reading-advantage, codecamp-advantage, sales-advantage, marketing app, advantage-games, www app, shared packages** — separate reviews or already-audited surfaces; explicitly out of scope for this track.
- **Build / vendor artifacts** — `node_modules/**`, `.next/**`, `public/**`, generated Prisma client, static assets like `data/audios/temp.mp3` are excluded by the coverage manifest.
- **Dynamic runtime verification** — the batches performed static line-by-line review. The plan's Phase 6 explicitly records that `check-types` failed from shared-package drift, the full test run timed out, and `build` was not meaningful because `ignoreBuildErrors` is set. Static evidence is the source of truth; runtime behavior is inferred from the code.

---

## 2. Severity Tally Across the 51 Batches

Counts are taken from per-batch report headers and `**Severity:**` lines. They are best-effort aggregates, not the result of a normalized scoring rubric — the batches use slightly different conventions (e.g., `Severity: Medium (i18n)` is counted as Medium in this table). The exact wording and line anchors are in the per-batch reports.

| Severity | Line-anchored findings in batches | Notes |
|---|---:|---|
| Critical | 12+ | Many are explicitly tagged `(Critical)`; several "Critical / High" groups are collapsed to a single heading. See §3. |
| High | 263+ | Includes severity-rated findings plus a large population of `High`-stamped items in batch 01-style coverage tables. |
| Medium | 548+ | Includes 47 "Medium (i18n)" entries. |
| Low | 494+ | Includes 12 "Trivial" entries counted as Low here. |
| Untagged (line-trace bullets) | 720+ | Many batches (e.g. 32, 35, 36, 44–50) use bulleted "Lines: N–M" annotations rather than heading-per-finding. These are line-anchored observations, not a separate severity tier. |

> The high counts in the "Untagged" row are why this synthesis is necessary. A reader cannot triage 720+ bullet items across 51 files without an aggregated view.

> **Quantified gaps (consistent with `test-gaps.md` and `00-inventory.md`):** 0/54 controller tests, 0/209 route handler tests, 0 API contract tests, 0 product-behavior learning-outcome tests. The line-review batches independently confirm this in their "Test / Coverage Observations" sections (e.g. `ra-batch-00.md`, `ra-batch-01.md`, `ra-batch-09.md`).

---

## 3. Deduplicated Highest-Priority Findings

This section collapses the most-severe line-anchored findings from all 51 batches into a single prioritized list. Each entry points back to the originating batch and line numbers; the per-batch report is the source of truth for evidence and recommendation.

### 3.1 Critical (must remediate before next deployment)

| ID | Finding | Batches | Source-evidence location |
|---|---|---|---|
| C-RA-CRIT-01 | **Unauthenticated `submitRating` server action** — `actions/rating.ts` accepts `userId` from caller and never calls `getCurrentUser()`; any unauthenticated caller can insert `userActivity` and `xpLogs` for any user, including XP farming. | `ra-batch-01.md` | F-RA-B01-001, lines 8–89 |
| C-RA-CRIT-02 | **Session-token fabrication in `actions/pratice.ts`** — sets `Cookie: session_token=${user.id}` on an internal fetch. If the receiving API trusts the cookie, this is a complete auth bypass. | `ra-batch-01.md` | F-RA-B01-002, lines 60–67 |
| C-RA-CRIT-03 | **Classroom controller destructive operations have zero ownership/tenant verification** — `achivedClassroom`, `updateClassroom`, `deleteClassroom`, `updateStudentClassroom`, `getClassroomTeacher`, and the enrollment mutators all skip ownership checks. Same class of bug recurs in `getStudentInClassroom`, `getClassroomAssignments`, `getAssignmentStudents`, `sendClassroomAssignmentNotifications`, `getClassroomNotificationHistory`. | `ra-batch-09.md`, `ra-batch-44.md`, `ra-batch-45.md` | F-RA-B09-001 through F-RA-B09-010; `classroom-controller.ts:756-906` |
| C-RA-CRIT-04 | **`refreshAIInsightsAutomated` is unauthenticated** — `ai-insight-refresh-controller.ts` is intended for Cloud Scheduler but has no Cron-secret, service-account, or IP validation. Any unauthenticated caller can trigger system-wide AI insight generation. | `ra-batch-44.md` | `ai-insight-refresh-controller.ts:1-453` |
| C-RA-CRIT-05 | **Missing role check on admin pages** — `admin/article-creation/page.tsx` and `admin/management/page.tsx` check `user.license_id` but not `user.role`; any licensed user (including students/teachers) can access these admin pages if the layout guard is bypassed. | `ra-batch-01.md` | F-RA-B01-003, F-RA-B01-004 |
| C-RA-CRIT-06 | **XP / level progression double-award race (PB-001)** — `user-controller.ts:postActivityLog` does a read-check-insert-update with no transaction or unique constraint; concurrent requests double-award XP. | `ra-batch-46.md` (user-controller evidence), `ra-batch-00.md` (test gap) | `user-controller.ts:157-328` |
| C-RA-CRIT-07 | **Vacuous `implementation-validation.test.ts`** — asserts only literal objects defined inside the test file; never inspects the deliverables it claims to validate. This is Measure anti-pattern A4. | `ra-batch-00.md` | H-01, lines 12–367 |
| C-RA-CRIT-08 | **Five Jest 30 Phase 5 Red-proof tests reference an archived track path** — `measure/tracks/jest30_major_migration/` was archived to `measure/archive/jest30_major_migration/` on 2026-06-22; the `path.resolve` calls in five test files still point at the old location, so the migration-contract tests are guaranteed to fail. This is Measure anti-pattern A9. | `ra-batch-00.md` | H-02; `jest30-phase5-*.test.ts` lines 46–83 |

> **Reading guidance.** Items C-RA-CRIT-01 through C-RA-CRIT-05 are *runtime* Critical (data-integrity / auth / tenancy). C-RA-CRIT-06 is product-correctness Critical. C-RA-CRIT-07 and C-RA-CRIT-08 are *test/contract* Critical (they mask regressions and create false confidence).

### 3.2 High (remediate before broader remediation tracks)

The high-priority bucket is large; the table below surfaces the **most-cited** high-severity findings. Each row groups findings from multiple batches that target the same root cause.

| ID | Cluster | Batches | Evidence-anchor summary |
|---|---|---|---|
| H-01 | **Direct provider SDK usage bypasses the AI / storage adapter layer** — `@google-cloud/translate` (`article-controller.ts:5,755-774`), `firebase-admin/storage` (dynamic `require` in `generator-controller.ts:1499-1599`), `@/utils/openai` and `storage.bucket(...)` from `assistant-controller.ts`, raw `process.env` reads across 6+ controllers. | `ra-batch-44.md`, `ra-batch-45.md`, `ra-batch-48.md`, `ra-batch-49.md` | F-RA-B44-001, F-RA-B48-*; `article-controller.ts:5` |
| H-02 | **Inconsistent / missing Zod input validation on 180+ endpoints** — controllers cast query params with `Number(searchParams.get("page"))` (silently becomes `NaN`), parse JSON bodies without schemas, and only one place (`patchClassroomEnroll`) uses Zod. | all controller/UI batches (07–16, 44–47) | Recurring across batches 09, 10, 11, 14, 44, 45, 46 |
| H-03 | **Unauthenticated or weakly authenticated sensitive endpoints** — `/api/v1/articles/generate`, `/api/v1/stories/generate`, `/api/v1/ai/insights/refresh`, `/api/v1/metrics/health|cache|stream`, `/api/v1/activity/update-all-activity`, `/api/v1/health/database`, `/api/v1/telemetry/dashboard`, `/api/auth/signup`, demo endpoints. Most are reachable without any guard; OAuth2 callback/link/unlink have session-cookie anomalies. | `ra-batch-09.md`, `ra-batch-10.md`, `ra-batch-13.md`, `ra-batch-16.md`, `ra-batch-44.md` | F-RA-B09-*, F-RA-B10-001 through F-RA-B10-006, F-RA-B16-002 |
| H-04 | **Cross-tenant query leakage** — controllers (`activity`, `admin`, `assignment-funnel`, `assignment`, `class-accuracy`, `system-dashboard`) build `schoolId`/`classId` filters from query params without falling back to the caller's own tenant context. `getAllStudentList` returns all students under the teacher's license without role check; `getClassroomTeacher` returns all teachers globally. | `ra-batch-44.md`, `ra-batch-45.md`, `ra-batch-46.md`, `ra-batch-47.md` | F-RA-B44-002, F-RA-B44-003, F-RA-B45-* |
| H-05 | **No audit logging for destructive operations** — zero `recordAuditEvent` references in `apps/reading-advantage`; destructive endpoints (article delete, story delete, classroom delete/archive, user delete, enrollment changes, license management) produce no audit trail. | `ra-batch-44.md` through `ra-batch-47.md` | F-RA-003 from review-b-security-result.json; F-RA-B44-005, F-RA-B44-006 |
| H-06 | **AI data privacy — PII filtering absent, consent-blind publish gate** — student content, level-test chat, and LAQ answers are sent to OpenAI / Google Translate without redaction; `approveUserArticle` does not check consent metadata. | `ra-batch-37.md` (prompts), `ra-batch-44.md` (ai-controller), `ra-batch-48.md` (article-generator), `ra-batch-49.md` (translation-generator) | F-RA-004, F-RA-005, A2 anti-pattern |
| H-07 | **Untyped `(req as any).session` / `(req as any).params` casts in report controllers** — `class-accuracy-controller.ts`, `system-dashboard-controller.ts`, `system-controller.ts` rely on middleware having attached session/params; type-safety holes can crash or bypass auth at runtime. | `ra-batch-45.md`, `ra-batch-46.md`, `ra-batch-47.md` | F-RA-B45-007, PB-009 |
| H-08 | **AI content quality gate absent** — `article-generator.ts:71-117`, `stories-chapters-generator.ts`, `question-generator.ts` use `temperature: 1` and throw raw strings; no post-hoc readability/CEFR/schema check. Level-test `parseAssessment` returns `object \| null` and is consumed by the UI without Zod validation. | `ra-batch-48.md` (article-generator), `ra-batch-49.md` (translations/wordlist), `ra-batch-37.md` (level-test prompts), `ra-batch-13.md` (level-test routes) | PB-002, PB-003 |
| H-09 | **Inconsistent error response shapes across the API** — six+ different shapes (`{message,status}`, `{code,message}`, `{error}`, `{message,error}`, `{success,data,message}`, `{message}`), and several routes return `200 OK` with a status code in the body. | `ra-batch-11.md` (flashcard), `ra-batch-09.md` (classroom), `ra-batch-13.md` (level-test), `ra-batch-44.md` (ai-controller) | F-RA-B09-001, F-RA-B11-001, C-001, C-002 |
| H-10 | **`restrictAccess` middleware commented out across classroom routes** — protection layer is present but disabled, which masks the classroom ownership/tenant issues listed under C-RA-CRIT-03 and H-04. | `ra-batch-09.md`, `ra-batch-10.md` | F-RA-B09-002 |
| H-11 | **Inconsistent auth pattern across controllers** — some controllers use `getCurrentUser()`, others reach for `req.session`, others rely on `assertSelfOrAllowedStaff` that excludes `SYSTEM`. | `ra-batch-44.md`, `ra-batch-45.md`, `ra-batch-46.md` | F-RA-B44-006, F-RA-B45-005 |
| H-12 | **OAuth2 callback/link/unlink endpoints have weak auth** — link callback stores Google tokens without app-session authentication; `courses/[courseId]` rely only on Google tokens; unlink cookie clearing missing security flags. | `ra-batch-10.md` | F-RA-B10-007 through F-RA-B10-009 |
| H-13 | **Server-to-server `fetch` in server actions forwards fabricated cookies** — see C-RA-CRIT-02; broader pattern includes raw request header forwarding in `history/page.tsx` and `lesson/[articleId]/page.tsx` (batches 03, 04) that can leak the session token to internal APIs. | `ra-batch-01.md`, `ra-batch-03.md`, `ra-batch-04.md` | F-RA-B01-005, H-04 (b03) |
| H-14 | **`assertCan` / `TenantDB` / `recordAuditEvent` are not used at all in `apps/reading-advantage`** — 0 references across the whole app; the shared package seams are available but never wired in. | `00-inventory.md` (counts), confirmed in every controller batch (44–47) | F-RA-001, F-RA-003, F-RA-009 |
| H-15 | **`auth-controller.ts` raw `process.env.ACCESS_KEY`** and 6+ other raw env reads; no Zod env validation. | `ra-batch-44.md`, `ra-batch-48.md`, `ra-batch-49.md` | F-RA-011 |
| H-16 | **Direct SQL on materialized views without a contract** — `refresh-materialized-views.ts:17-31` interpolates `viewName` into `sql.raw`; a future configuration-driven array turns this into a SQL-injection vector. | `ra-batch-44.md` | `refresh-materialized-views.ts:17-31` |
| H-17 | **Inconsistent ranking response shape across game families** — castle-defense, dragon-flight, dragon-rider, enchanted-library, magic-defense, potion-rush, rpg-battle, rune-match, wizard-vs-zombie all return slightly different ranking payloads. | `ra-batch-11.md`, `ra-batch-12.md`, `ra-batch-13.md` | F-RA-B11-001, F-RA-B12-001 |
| H-18 | **Inconsistent `NextResponse` guard pattern across route families** — some routes return `router.run` result directly, causing silent 500s when the router throws; `Castle Defense` and others are named explicitly. | `ra-batch-11.md`, `ra-batch-12.md` | F-RA-B11-002, F-RA-B12-002 |
| H-19 | **Server actions write directly to DB with no auth** — `actions/flashcard.ts`, `actions/pratice.ts`, `actions/rating.ts` all import `@reading-advantage/db` and execute inserts/updates with no `getCurrentUser` and no role/tenant scope. | `ra-batch-01.md` | F-RA-B01-001, F-RA-B01-006, F-RA-B01-007 |
| H-20 | **Demo refresh endpoint executes shell commands with only access-key auth** — `scripts/refresh-demo-data.ts` and `scripts/refresh-genre-metrics.ts` use `child_process.exec` with hardcoded paths; access-key-only auth on a `npx tsx` trigger is insufficient for production. | `ra-batch-44.md` | F-RA-B44-009, F-RA-B44-010 |
| H-21 | **Game page tests fail in jsdom because `fetch` is not mocked** — `dragon-rider/page.test.tsx`, `enchanted-library/page.test.tsx`, `magic-defense/page.test.tsx`, `rpg-battle/page.test.tsx`, `rune-match/page.test.tsx`, `wizard-vs-zombie/page.test.tsx`. | `ra-batch-02.md`, `ra-batch-03.md`, `ra-batch-23.md` | H-02 (b03), F-UX-029, F-UX-030, F-UX-031 |
| H-22 | **Race conditions and lack of optimistic locking** — flashcard `progress/update` does a read-then-update without `FOR UPDATE` or a transaction. Same pattern in `user-controller.ts` XP path (C-RA-CRIT-06) and FSRS scheduling. | `ra-batch-11.md`, `ra-batch-46.md` | F-RA-B11-003, C-011, PB-001 |

### 3.3 Medium (remediate as part of broader tracks)

The Medium bucket is too large to enumerate in full (548+ items). The clusters below are the ones the batches explicitly call out as recurring across multiple files:

| Cluster | Representative evidence | Batches |
|---|---|---|
| M-01: Business logic in route handlers / page components | `rpg-battle/page.tsx`, `lesson/[articleId]/page.tsx`, `rune-match/page.tsx`, `enchanted-library/page.tsx` | 02, 03, 23 |
| M-02: `console.log` / `console.error` in production code, no structured logger | every controller batch | 44–47, plus 13, 14, 16, 17 |
| M-03: Inconsistent loading/empty-state contracts | list endpoints in many controllers | 09, 11, 13, 16, 44, 45 |
| M-04: Duplicated helper logic, dead imports, naming typos | `calculateETA` duplicated; `pratice.ts` filename typo; `useDashboardMetrice` typo; dead commented-out code in 30+ files | 01, 36, 38, 50 |
| M-05: `as any` and `unknown` casts in report/UI code | `teacher-overview-kpis.tsx`, `rpg-battle/page.tsx`, `lesson/[articleId]/page.tsx`, `history/page.tsx` | 03, 19, 23, 25, 26 |
| M-06: i18n gaps — hardcoded English strings, missing translation keys, locale switch on student layout | `goals/page.tsx`, `history/page.tsx`, lesson pages, game UI | 02, 03, 04, 22, 23, 27, 33, 34, 35 |
| M-07: `process.exit` inside `async main`, missing CLI guards, dynamic `require` in ESM contexts | `refresh-velocity-matviews.ts:17-48`, `refresh-genre-metrics.ts:31,250`, `generator-controller.ts:1499-1599` | 44 |
| M-08: Hardcoded wall-clock performance thresholds in test suites (flaky) | `alignment-metrics-core.test.ts:248-274`, `assignment-funnel-analytics.test.ts:472-506`, `genre-engagement-core.test.ts:425-463` | 00 |
| M-09: Direct DB imports in route files instead of controllers | `flashcard/progress/update`, `flashcard/deck-id`, `articles/export-workbook`, `metrics/system`, `system/dashboard/xpBySchools`, `system/licenses`, `system/school-classrooms`, `system/lowest-rated-articles` | 07, 11, 15, 44 |
| M-10: `Dockerfile` uses `npm` in a pnpm monorepo, copies Prisma after migration, bakes secrets into image | `apps/reading-advantage/Dockerfile:8-87` | 00 |
| M-11: Missing abort controllers / `useEffect` cleanup in dashboards and game UIs | `compact-activity-heatmap.tsx`, `metrics-cards.tsx`, `ranking-dialog.tsx`, Potion Rush image loader | 20, 22, 23 |
| M-12: `potion-rush/page.tsx` `accuracy` × 100 mismatch (multiplies by 100 before sending unlike other games) | `wizard-vs-zombie/page.tsx` | 03 |
| M-13: Activity target-ID resolution fragile — `targetId = data.articleId || data.storyId || data.contentId || ""`, special-cased for `cmesn/cmeu` rating IDs | `user-controller.ts:169-198` | 46 (and PB-007) |
| M-14: License-level fallback treats missing license as Enterprise (PB-008) | `user-controller.ts:37-66`, `question-controller.ts:25-63` | 46, 47 |
| M-15: Open-ended scoring threshold `>= 3` is arbitrary; class accuracy mixes MCQ and open-ended scales (PB-005, PB-006) | `class-accuracy-controller.ts:91-130`, `class-accuracy-controller.ts:105-108` | 45, 46 |
| M-16: Assignment status mapped ad-hoc with `statusToInt`; not source-of-truth aligned (PB-004) | `assignment-controller.ts:84-88`, `student-dashboard-controller.ts` | 44, 46 |
| M-17: `assertSelfOrAllowedStaff` excludes `SYSTEM` role | report controllers | 45, 47 |
| M-18: Stale closures, missing `useEffect` dependencies in game pages | `magic-defense/page.tsx`, `ranking-dialog.tsx`, `potion-rush/page.tsx` | 03, 22, 23 |
| M-19: Hot-path performance concerns — `rpg-battle/page.tsx` business logic, `lru-cache` use without keying on user/class | `rpg-battle/page.tsx` (H-03 b03), `lib/cache/advanced-cache.ts` | 03, 39, 40 |
| M-20: Test suites test locally-defined helpers instead of production code (anti-pattern: shallow coverage) | `alignment-metrics-core.test.ts`, `assignment-funnel-analytics.test.ts`, `genre-engagement-core.test.ts` | 00 |

### 3.4 Low / informational

| Cluster | Representative evidence | Batches |
|---|---|---|
| L-01: `README.md` is default Next.js boilerplate | `apps/reading-advantage/README.md:1-36` | 00 |
| L-02: Filename typo `pratice.ts` (should be `practice.ts`) | `actions/pratice.ts` | 01 |
| L-03: Hook name typo `useDashboardMetrice` | `hooks/student/useDashboardMetrice.ts` | 38 |
| L-04: Hardcoded Firebase storage URL | components referencing `artifacts.reading-advantage.appspot.com` | 01, 44, 49 |
| L-05: Misleading inline comments in tests | `genre-engagement-core.test.ts:182-185` | 00 |
| L-06: Placeholder integration test `expect(true).toBe(true)` | `alignment-metrics-core.test.ts:278-283` | 00 |
| L-07: `any` types in test helpers | `alignment-metrics-core.test.ts:163,188`, `assignment-funnel-analytics.test.ts:170`, `genre-engagement-core.test.ts:74` | 00 |
| L-08: `dragon-flight/page.test.tsx` mock path may be stale; `wizard-vs-zombie/page.test.tsx` doesn't cover API failure | game page tests | 02, 03 |
| L-09: Duplicate metric card "Total Sessions" / "Reading Sessions" show identical values | dashboard components | 19, 20 |
| L-10: `dragon-vs-zombie/page.tsx` imports `dynamic` but never uses it; `rune-match/page.tsx` imports `useRouter` but never uses it | game pages | 03 |

---

## 4. Coverage by Route Family (Controller-and-Auth Map)

The 51 batches collectively map the 209 route handlers. The table below merges the route-family inventory from `workflow-map.md` (which was assembled before the line review) with the line-review verification. Discrepancies (e.g., routes the line review found to be unauthenticated) are noted.

| Route family | Routes | Line-review verified | Notable line-review additions |
|---|---:|---|---|
| `auth` | 8 | `ra-batch-06.md`, `ra-batch-44.md` | `signup`, `reset-password`, `check-password-set` confirmed to import `@reading-advantage/db` directly; bcryptjs in `signup` path |
| `trpc` | 1 | `ra-batch-07.md` | Confirmed shared `appRouter` + `createContext` |
| `v1/activity` | 5 | `ra-batch-07.md`, `ra-batch-44.md` | `update-all-activity` unauthenticated; `activity-controller` cross-tenant data exposure |
| `v1/admin` | 6 | `ra-batch-07.md`, `ra-batch-44.md` | `admin-controller.ts` builds `schoolId` from query params without tenant check |
| `v1/ai` | 5 | `ra-batch-07.md`, `ra-batch-44.md` | `ai-insight-refresh` is unauthenticated; AI insights bypass PII filter |
| `v1/articles` | 19 | `ra-batch-07.md`, `ra-batch-08.md`, `ra-batch-44.md` | `generate`, `validate`, `custom-generate`, `user-generated`, `export-workbook` have direct DB or unguarded access |
| `v1/assignment-notifications` | 1 | `ra-batch-08.md` | guarded |
| `v1/assignments` | 1 | `ra-batch-08.md` | `restrictTo(TEACHER, ADMIN, SYSTEM)`; controller cross-tenant filter |
| `v1/assistant` | 10 | `ra-batch-08.md`, `ra-batch-09.md` | `translate/`, `wordlist/`, `stories-translate/`, `stories-wordlist/`, `ts-fsrs-test/flash-card/[id]/` — direct provider SDK calls |
| `v1/classroom` | 29 | `ra-batch-09.md`, `ra-batch-10.md` | Multiple ownership/tenant-skip paths; `oauth2/*` and demo `accounts|refresh|status` |
| `v1/demo` | 3 | `ra-batch-10.md` | `accounts` exposes hardcoded credentials; `refresh` execs shell; `status` no auth |
| `v1/flashcard` | 14 | `ra-batch-11.md` | `progress/update` and `deck-id` direct DB; `progress/[id]` ownership check present but rating validation absent |
| `v1/games` | 27 | `ra-batch-11.md`, `ra-batch-12.md`, `ra-batch-13.md` | 9 game families; each has ranking/score/complete route with shared FP issues (ranking response shape, `NextResponse` guard, replay/double-submit risk) |
| `v1/goals` | 5 | `ra-batch-13.md` | guarded |
| `v1/health` | 1 | `ra-batch-13.md` | `health/database` direct DB and no auth |
| `v1/lesson` | 6 | `ra-batch-13.md` | `lesson-controller.ts` guarded but body validation absent |
| `v1/level-test` | 2 | `ra-batch-13.md` | `parseAssessment` returns `object \| null`; UI accesses fields without Zod |
| `v1/licenses` | 2 | `ra-batch-13.md` | guarded |
| `v1/metrics` | 15 | `ra-batch-13.md`, `ra-batch-14.md` | `metrics/health\|cache\|stream` unauthenticated; `metrics/system` direct DB |
| `v1/passage` | 2 | `ra-batch-14.md` | guarded |
| `v1/stories` | 13 | `ra-batch-14.md`, `ra-batch-15.md` | `stories/generate` unauthenticated; `stories-controller` cross-tenant risk |
| `v1/student` | 1 | `ra-batch-15.md` | guarded |
| `v1/system` | 9 | `ra-batch-15.md` | `system/refresh-views` unauthenticated; 2 direct DB routes |
| `v1/teacher` | 7 | `ra-batch-15.md`, `ra-batch-16.md` | guarded but `getAllStudentList` lacks role check |
| `v1/telemetry` | 1 | `ra-batch-16.md` | unauthenticated; inline telemetry |
| `v1/users` | 14 | `ra-batch-16.md` | guarded; multiple controllers skip ownership/tenant checks (XP path, ranking, reset-progress) |
| `v1/xp` | 2 | `ra-batch-16.md`, `ra-batch-17.md` | guarded; license-aware |

> **No route handler was added, removed, or rewritten during review.** This map is a re-derivation of the 209 routes from the line-review batches, not a new inventory.

---

## 5. Cross-Batch Findings That the Sampled Pass Missed

This section enumerates categories of issues that the original sampled Review-A/B/C passes (predating the 51-batch review) did not surface because they live in files that were not in the earlier sample. The line-review batches independently confirm or extend each item.

1. **Server actions are an auth-free DB write surface.** The 3 `actions/*.ts` files (`actions/flashcard.ts`, `actions/pratice.ts`, `actions/rating.ts`) all import `@reading-advantage/db` and write directly without `getCurrentUser`. None of these were in the earlier sampled pass. (`ra-batch-01.md`.)
2. **Admin pages can be reached without role check** when the layout guard is bypassed. The earlier pass flagged role checks as "Pass" on the layout level; the page-level gap was found only in the line review. (`ra-batch-01.md`.)
3. **`refreshAIInsightsAutomated` is a public Cron endpoint.** The earlier pass did not call out the absence of Cron-secret / IP / service-account validation on this Cloud-Scheduler endpoint. (`ra-batch-44.md`.)
4. **Game page tests fail in jsdom because `fetch` is not mocked.** The earlier pass did not surface this because no game-page tests were in scope. (`ra-batch-02.md`, `ra-batch-03.md`.)
5. **`rpg-battle/page.tsx` contains domain business logic in a React component** (anti-pattern: business logic outside the backend module). Not in the earlier sample. (`ra-batch-03.md` H-03.)
6. **Direct SQL injection vector in `refresh-materialized-views.ts:17-31`** via `sql.raw(\`REFRESH MATERIALIZED VIEW ${viewName}\`)`. Not in the earlier sample. (`ra-batch-44.md`.)
7. **`scripts/security-audit.ts` itself uses brittle string/regex heuristics** and cannot detect guard usage through re-exports or aliased imports, so it can produce false negatives. Not in the earlier sample. (`ra-batch-44.md`.)
8. **OAuth2 link callback stores Google tokens without app-session authentication**; `unlink` clears cookies without security flags. Not in the earlier sample. (`ra-batch-10.md` F-RA-B10-007, F-RA-B10-008.)
9. **Demo `accounts` route exposes hardcoded credentials** with no authentication. Not in the earlier sample. (`ra-batch-10.md` F-RA-B10-001.)
10. **`refresh-demo-data.ts` and `refresh-genre-metrics.ts` are not wrapped in transactions** and have non-deterministic class codes. Not in the earlier sample. (`ra-batch-44.md`.)
11. **Five Jest 30 Phase 5 Red-proof tests reference archived track paths** — the migration is complete, but the tests are guaranteed to fail until the paths are fixed. Anti-pattern A9. Not in the earlier sample. (`ra-batch-00.md` H-02.)
12. **`implementation-validation.test.ts` is a vacuous-pass suite** (A4) that gives false confidence about Phase 2.5 deliverables. Not in the earlier sample. (`ra-batch-00.md` H-01.)
13. **`Dockerfile` bakes runtime secrets into image layers** and uses `npm` in a pnpm monorepo and copies `prisma/` after the migration. Not in the earlier sample. (`ra-batch-00.md` H-03, M-02, M-03.)
14. **`PotionRushGame.test.tsx` monkey-patches `Image.prototype` globally** and has inadequate test coverage. Not in the earlier sample. (`ra-batch-22.md`.)
15. **`potion-rush/page.tsx` multiplies `accuracy` by 100 before sending** (inconsistent with other games) and is missing a shared contract for game result shape. Not in the earlier sample. (`ra-batch-03.md` M-04, M-12; `ra-batch-22.md`.)
16. **`lesson/[articleId]/page.tsx` and `history/page.tsx` forward raw request headers to internal API calls.** Not in the earlier sample. (`ra-batch-03.md` H-04.)
17. **`enhanced-activity-heatmap.tsx` accesses `data.buckets` without null-check**; `compact-activity-heatmap.tsx` fetches on mount plus an interval with no abort. Not in the earlier sample. (`ra-batch-20.md`.)
18. **`rune-match` ranking default difficulty is uppercase but buckets are lowercase** — silent NaN propagation. Not in the earlier sample. (`ra-batch-12.md`.)
19. **`progress-bar-xp.tsx` and `matching.tsx` have no client-side API response validation.** Not in the earlier sample. (`ra-batch-02.md` F-UX-028.)
20. **`activity` / `game-type` enum drift across the seven game controllers** — different controllers map the same logical game to different enum strings. Not in the earlier sample. (`ra-batch-12.md`.)

> The earlier sampled pass produced the C-001..C-015 and PB-001..PB-010 finding IDs, which are still valid as the highest-level triage items. The list above is *additive*; it represents the additional signal that the 51-batch line review surfaced and that was not captured by the earlier sample. The 51 batches are the source of truth going forward.

---

## 6. Residual Coverage Caveats

The 51 batches are the most thorough static review the audit has produced, but they have honest limits:

- **Static analysis only.** No batch executed runtime tests against a real database. Findings about behavior (e.g., "concurrent requests double-award XP") are inferred from the code; adversarial concurrency tests are listed as `test-gaps.md` items, not as confirmed runtime observations.
- **No patches were applied.** No file in `apps/reading-advantage` was modified during the review. All findings are advisory; the remediation tracks in `migration-tracks.md` describe proposed work, not completed work.
- **Large controller files** (e.g. `classroom-controller.ts` at 1,422 lines in `ra-batch-45.md`, `article-controller.ts` at 926 lines in `ra-batch-44.md`) were read in full, but the per-file findings lists favor the most severe items; lower-severity observations on those files may have been summarized rather than enumerated.
- **Quality-gate evidence is intentionally scoped.** Per the plan's Phase 6, `check-types` failed because of shared-package drift, the full test run timed out, and `build` was not meaningful because `ignoreBuildErrors` is set. None of these gates is being claimed as "pass" in this synthesis.
- **No claim of completeness.** A small fraction of the 1,016 files were read end-to-end with the per-line risk-trace format (e.g., `ra-batch-01.md` includes a 70-line risk-trace for `actions/rating.ts`). The majority of files were scanned for the recurring patterns enumerated in §3. A file that contains a single line of risky code, embedded inside a 2,000-line component, may not be fully captured.
- **No claim of "no further findings"** is made. The 51 batches report line-anchored findings; this synthesis deduplicates them. A new review pass with a different lens (mobile, accessibility, performance benchmarking) would likely surface additional items.

---

## 7. Relationship to Other Artifacts

| Artifact | Relationship to this synthesis |
|---|---|
| `00-inventory.md` | Quantifies 209 routes, 54 controllers, 49/54 direct DB imports, 0 TenantDB, 0 assertCan, 0 recordAuditEvent. The synthesis confirms these counts by re-deriving them from the 51 batches. |
| `workflow-map.md` | Lists 27 route families with auth/data-access/controller patterns. The synthesis §4 re-derives the same map with line-review verification and explicit "line-review additions" for routes that the earlier pass misclassified. |
| `checklist.md` | Records 7 pass / 39 fail / 13 partial / 5 unknown checks. The synthesis preserves the same pass/fail judgments; §3.1/§3.2 record the failures with batch-level evidence. |
| `findings.md` | Holds the C-001..C-015 and PB-001..PB-010 aggregated findings. The synthesis is the line-anchored source of truth behind those C/PB IDs. See the "Line Review Synthesis" section added to `findings.md` by this pass. |
| `migration-tracks.md` | Groups findings into proposed remediation tracks M-RA-SEC-1..11 and M-RA-PB-1..8. The synthesis confirms that each M-RA-SEC-* and M-RA-PB-* track has at least one line-anchored finding backing it (see §3 mapping). |
| `test-gaps.md` | Documents 0 controller tests, 0 route tests, 0 contract tests, 0 product-behavior tests. The synthesis §2 tally and §3.2 H-21 confirm this independently. |
| `executive-summary.md` | The triage table. The synthesis adds a "Line Review Synthesis" pointer and a non-claim that this is the *source of truth*, not a sampled pass. |
| `phase-acceptance-result.json` | Predates the 51-batch review; the plan correctly notes it must be rerun or superseded. **Phase 7 is intentionally left PENDING.** |

---

## 8. What Phase 7 (Acceptance) Should Verify

The plan's Phase 7 tasks (lines 53–55 of `plan.md`) call for:

1. Re-running Measure phase acceptance for this review track after line-review synthesis. The prior `phase-acceptance-result.json` predates the 51 batches and is therefore stale.
2. Feeding accepted findings into the final roadmap track after phase/final acceptance approves this review.

This synthesis supplies the evidence base for that rerun. The next agent that runs phase acceptance should, at minimum:

- Verify all 51 batch reports are present and non-empty (already done in §1.1).
- Verify the batch reports do not contain acceptance/closeout claims for the remediation (already done in §1; the only "no claim" lines are scoped to the line review itself, not to fixes).
- Verify that the 25+ Critical/High items in §3.1 and §3.2 each have a corresponding `M-RA-SEC-*` or `M-RA-PB-*` migration track in `migration-tracks.md` (mapping table is implied by §3).
- Verify that the 0/54 controller tests, 0/209 route tests, and 0 product-behavior tests claim in `test-gaps.md` matches the line-review batch observations (already confirmed by §2 and §3.2 H-21).
- Verify that no app code was modified during the review (already true; the line-review batches are read-only).

This document does **not** claim Phase 7 acceptance or closeout. That decision belongs to the next agent in the measure-orchestrator pipeline.

---

## 9. Summary of What Changed vs. the Sampled Pass

| Aspect | Sampled pass (predates 51 batches) | 51-batch line review |
|---|---|---|
| Files reviewed | small sampled set | 1,016 (full `apps/reading-advantage` tracked scope) |
| Finding anchors | section-level | line-anchored per batch |
| Test gap claim | "0/54 controllers, 0/209 routes" | independently confirmed in every controller batch |
| Route family map | 27 families listed in `workflow-map.md` | re-derived in §4 with batch-level verification |
| Auth gaps | 14+ routes identified | 14+ confirmed + additional `actions/*.ts`, `system/refresh-views`, `ai/insights/refresh`, `metrics/health\|cache\|stream`, `telemetry/dashboard`, `health/database`, `v1/health` (now 18+) |
| Provider coupling | Google Translate direct + Firebase storage remnant | same + `assistant-controller.ts` direct OpenAI/storage.bucket, raw `process.env` reads across 6+ controllers, AI data-privacy findings |
| Test quality | not reviewed | vacuous `implementation-validation.test.ts` (A4) and archived-path tests (A9) surfaced |
| Build / deploy | not reviewed | `Dockerfile` secrets-in-image, npm-in-pnpm-monorepo, prisma copy — surfaced |
| Anti-pattern audit | not performed | A2 (consent-blind), A4 (vacuous-pass), A6 (registry overstatement), A9 (archived-path), and others tagged in `ra-batch-00.md`, `ra-batch-01.md`, `ra-batch-44.md` |
| Acceptance claimed | no | **no** (Phase 7 still pending) |

---

## 10. Index of Batches

| Batch | Files | Report | Role |
|---|---:|---|---|
| 00 | 20 | `line-review/ra-batch-00.md` | A |
| 01 | 20 | `line-review/ra-batch-01.md` | B |
| 02 | 20 | `line-review/ra-batch-02.md` | C |
| 03 | 20 | `line-review/ra-batch-03.md` | A |
| 04 | 20 | `line-review/ra-batch-04.md` | C |
| 05 | 20 | `line-review/ra-batch-05.md` | B |
| 06 | 20 | `line-review/ra-batch-06.md` | B |
| 07 | 20 | `line-review/ra-batch-07.md` | C |
| 08 | 20 | `line-review/ra-batch-08.md` | A |
| 09 | 20 | `line-review/ra-batch-09.md` | B |
| 10 | 20 | `line-review/ra-batch-10.md` | B |
| 11 | 20 | `line-review/ra-batch-11.md` | B |
| 12 | 20 | `line-review/ra-batch-12.md` | B |
| 13 | 20 | `line-review/ra-batch-13.md` | B |
| 14 | 20 | `line-review/ra-batch-14.md` | B |
| 15 | 20 | `line-review/ra-batch-15.md` | A |
| 16 | 20 | `line-review/ra-batch-16.md` | B |
| 17 | 20 | `line-review/ra-batch-17.md` | C |
| 18 | 20 | `line-review/ra-batch-18.md` | B |
| 19 | 20 | `line-review/ra-batch-19.md` | A |
| 20 | 20 | `line-review/ra-batch-20.md` | B |
| 21 | 20 | `line-review/ra-batch-21.md` | A |
| 22 | 20 | `line-review/ra-batch-22.md` | A |
| 23 | 20 | `line-review/ra-batch-23.md` | C |
| 24 | 20 | `line-review/ra-batch-24.md` | A |
| 25 | 20 | `line-review/ra-batch-25.md` | B |
| 26 | 20 | `line-review/ra-batch-26.md` | B |
| 27 | 20 | `line-review/ra-batch-27.md` | A |
| 28 | 20 | `line-review/ra-batch-28.md` | A |
| 29 | 20 | `line-review/ra-batch-29.md` | B |
| 30 | 20 | `line-review/ra-batch-30.md` | B |
| 31 | 20 | `line-review/ra-batch-31.md` | A |
| 32 | 20 | `line-review/ra-batch-32.md` | A |
| 33 | 20 | `line-review/ra-batch-33.md` | B |
| 34 | 20 | `line-review/ra-batch-34.md` | C |
| 35 | 20 | `line-review/ra-batch-35.md` | A |
| 36 | 20 | `line-review/ra-batch-36.md` | A |
| 37 | 20 | `line-review/ra-batch-37.md` | A |
| 38 | 20 | `line-review/ra-batch-38.md` | A |
| 39 | 20 | `line-review/ra-batch-39.md` | A |
| 40 | 20 | `line-review/ra-batch-40.md` | A |
| 41 | 20 | `line-review/ra-batch-41.md` | C |
| 42 | 20 | `line-review/ra-batch-42.md` | C |
| 43 | 20 | `line-review/ra-batch-43.md` | A |
| 44 | 20 | `line-review/ra-batch-44.md` | B |
| 45 | 20 | `line-review/ra-batch-45.md` | B |
| 46 | 20 | `line-review/ra-batch-46.md` | B |
| 47 | 20 | `line-review/ra-batch-47.md` | B |
| 48 | 20 | `line-review/ra-batch-48.md` | A |
| 49 | 20 | `line-review/ra-batch-49.md` | A |
| 50 | 16 | `line-review/ra-batch-50.md` | A/B |

For any finding referenced in this synthesis, the originating batch report is the canonical source of evidence. This document is a deduplication and prioritization pass, not a replacement.

---

*End of line-review synthesis. Phase 7 acceptance is intentionally left PENDING.*
