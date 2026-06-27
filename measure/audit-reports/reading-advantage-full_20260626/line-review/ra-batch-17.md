# Line Review — ra-batch-17

**Batch:** ra-batch-17
**Track:** reading_advantage_full_review_20260626
**Baseline SHA:** d348666be047b929d02c747120c32d2ea0fc53fc
**Files:** 20 (1 route, 2 JSON data files, 2 fonts, 2 binaries, 1 build config, 1 shadcn config, 8 admin React components, 2 client service modules)
**Diff from baseline:** None — all 20 files are unchanged since baseline.
**Review mode:** Line-by-line static review

---

## Scope

1. **API route:** `app/api/v1/xp/route.ts`
2. **Static assets:** `assets/fonts/CabinSketch-{Bold,Regular}.ttf`, `assets/json/level-test.json`, `assets/json/whats-my-level-mean.json`
3. **Committed binaries:** `cloud-sql-proxy`, `cloud-sql-proxy.exe`
4. **Build/config:** `cloudbuild.yaml`, `components.json`
5. **Client services:** `client/services/create-firestore-service.ts`, `client/services/fetch-helper.ts`, `client/services/firestore-client-services.ts`
6. **Admin React components:** `components/admin/article-creation.tsx`, `components/admin/classroom-report.tsx`, `components/admin/classroom-xp-comparison-chart.tsx`, `components/admin/dashboard-content.tsx`, `components/admin/license-selector.tsx`, `components/admin/reports-content.tsx`, `components/admin/reports.tsx`, `components/admin/teacher-assignments-table.tsx`

---

## Global Patterns Observed

### P1: Business Logic Lives in UI Components

Every admin component reviewed contains direct `fetch()` calls, state management, and domain decisions (approve article, compute XP, filter classrooms) inside React components. Per `AGENTS.md`:

> "Business logic must not live in: React components, Next.js pages, Route Handlers, Server Actions, Vendor SDK wrappers. These layers should orchestrate backend modules rather than implement domain behavior."

**Affected files:** `article-creation.tsx`, `classroom-report.tsx`, `classroom-xp-comparison-chart.tsx`, `dashboard-content.tsx`, `reports-content.tsx`, `reports.tsx`, `teacher-assignments-table.tsx`.

**Finding (F1, HIGH):** Domain behavior (article lifecycle, XP aggregation, assignment reporting) is implemented directly in client components. There is no evidence of backend modules in `/packages/backend` being orchestrated; instead the UI calls `/api/v1/*` endpoints inline.

### P2: Type Duplication Instead of Shared Contracts

`License`, `ClassroomData`, `TeacherAssignmentData`, and several article interfaces are re-declared locally in components instead of imported from `@reading-advantage/types` or a shared schema package.

**Affected files:** `dashboard-content.tsx`, `license-selector.tsx`, `reports-content.tsx`, `reports.tsx`, `classroom-xp-comparison-chart.tsx`, `article-creation.tsx`, `classroom-report.tsx`, `teacher-assignments-table.tsx`.

**Finding (F2, MEDIUM):** Local interface duplication violates the contract-first policy in `AGENTS.md` ("Use Zod as the standard contract system" / "TypeScript types should be inferred from Zod schemas whenever possible"). Drift between client and server contracts will not be caught by the compiler.

### P3: i18n Gaps and Untyped Translation Hooks

Multiple components cast `useScopedI18n` to `as any` and intermix hardcoded English strings with translated strings. Thai-language comments are also present in `article-creation.tsx`.

**Affected files:** `dashboard-content.tsx` (line 52), `license-selector.tsx` (line 37), `article-creation.tsx`, `classroom-report.tsx`, `reports.tsx`, `teacher-assignments-table.tsx`.

**Finding (F3, MEDIUM):** Untyped translation hooks defeat i18n compile-time safety, and hardcoded UI strings block localization.

### P4: Direct Cloud Storage URL Hardcoding

`article-creation.tsx` line 1575 constructs a background image URL directly against `storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/{article.id}.png`.

**Finding (F4, MEDIUM):** This couples the UI directly to Google Cloud Storage instead of the internal storage adapter described in `AGENTS.md` (`storage.getSignedUrl()`). Changing providers or buckets requires UI edits.

### P5: Client-Side Fetch Without Input Validation

All client-side `fetch()` helpers and component fetch calls assume JSON responses and construct URLs by string concatenation. No Zod validation of request payloads or responses.

**Affected files:** `fetch-helper.ts`, `create-firestore-service.ts`, all admin components.

**Finding (F5, HIGH):** Runtime contract validation is missing at the external boundary. Malformed responses will throw at `response.json()` or produce silently corrupt state.

### P6: Binary Blobs in Version Control

`cloud-sql-proxy` (32 MB ELF) and `cloud-sql-proxy.exe` (32 MB PE32+) are committed to the repository.

**Finding (F6, HIGH):** Large executable binaries in source control are a repository-bloat and supply-chain risk. They should be downloaded at build/deploy time or installed via a package manager, with checksum verification.

### P7: Anti-Pattern Audit (A3/A4/A5)

No test files, plan files, or "markers consistent"/"deliverable present"/"PASS=N FAIL=0" claims appear in this batch. A3/A4/A5 are not applicable to these application source files.

---

## File-by-File Review

### 1. `app/api/v1/xp/route.ts` (27 lines)

**Structure:** Thin Next.js Edge route using `next-connect` edge router. Applies `logRequest` and `protect` middleware, then delegates GET to `getXp30days`.

**Issues:**
- Line 8: `params: Promise<Record<string, never>>` is odd for a route with no dynamic segments; it signals a boilerplate type rather than an accurate contract.
- Line 18: `router.get(getXp30days) as any` — type-safety cast (consistent with P1 in other batches).
- Line 26: If `router.run` returns something other than `NextResponse`, throws a generic 500. No standardized error shape.
- No input validation on query parameters; `getXp30days` likely reads from `req.nextUrl.searchParams` in the controller, but the route does not validate them.

**Verdict:** Functionally thin, but contributes to the inconsistent route-handler typing pattern. OK for a route file, though input validation should be explicit.

---

### 2. `assets/fonts/CabinSketch-Bold.ttf` and `CabinSketch-Regular.ttf`

**Type:** TrueType fonts, 264 KB and 151 KB.

**Risk assessment:**
- Cabin Sketch is a Google Font released under the SIL Open Font License, so redistribution is permitted.
- Fonts are correctly placed in `/assets/fonts`.
- No malicious artifact indicators from `file` output.

**Verdict:** Low risk. OK as static assets.

---

### 3. `assets/json/level-test.json` (382 lines)

**Structure:** An array of CEFR levels (A0..C2). Each level has `points` and six questions. Each question has a `prompt` and three options labeled A, B, C.

**Issues:**
- **Finding (F7, HIGH):** There is **no answer key**. The JSON schema contains only `prompt` and `options`; it never marks which option is the correct answer. A placement test that cannot be scored automatically is functionally incomplete.
- **Finding (F8, MEDIUM):** Several "correct" options are grammatically acceptable but not uniquely correct, and some distractors are ambiguous. For example:
  - A2 Q3: "Should we take a taxi or walk?" — option A "Let's take a taxi, it's faster" is correct in context, but option B "Walking is health" is ungrammatical. The test conflates grammar knowledge with conversational appropriateness.
  - C1 Q3 UBI question: options A/B/C are all plausible opinions; without an answer key, scoring is impossible.
- No schema version or metadata (title, locale, author).

**Verdict:** F7 is a functional blocker if this file is intended for automated placement. The schema needs a `correctOption` field (or equivalent) and scoring rules.

---

### 4. `assets/json/whats-my-level-mean.json` (58 lines)

**Structure:** CEFR level descriptions keyed by level (A0, A0+, A1-, A1, etc.). Each contains a `General_Description` string.

**Issues:**
- No schema version or source attribution.
- Descriptions are informal and not aligned with any standard CEFR descriptor set, but they are readable.

**Verdict:** OK as presentational copy. Consider sourcing from a standardized CEFR descriptor dataset for consistency.

---

### 5. `cloud-sql-proxy` and `cloud-sql-proxy.exe`

**Type:** Executables (32 MB ELF x86-64 and 32 MB PE32+ console). The Linux binary has executable permissions and a newer timestamp (Mar 15 2025) than the Windows binary (Oct 6 2025).

**Issues:**
- **Finding (F6, HIGH):** Large binary blobs in version control. They inflate clone size, cannot be diffed, and introduce supply-chain risk if not reproducibly sourced.
- The Linux binary is marked executable (`rwxrwxr-x`) in the working tree.

**Verdict:** These should be removed from the repo and fetched/installed during CI or local setup with checksum verification.

---

### 6. `cloudbuild.yaml` (114 lines)

**Structure:** Google Cloud Build configuration: docker build → push → Cloud Run deploy → optional Discord notification.

**Issues:**
- **Finding (F9, HIGH):** Build args include secrets (`GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `VERTEX_PRIVATE_KEY`, `SERVICE_ACCOUNT_KEY`, `FIREBASE_PRIVATE_KEY`, `OPENAI_API_KEY`, `CLASSROOM_CLIENT_SECRET`, `DISCORD_WEBHOOK_URL`, etc.). Build args are captured in image layers and build logs. These should be mounted from Secret Manager or supplied via `--set-secrets` instead of `--set-env-vars`/`--build-arg`.
- Line 67: Build context is `./web`, but this `cloudbuild.yaml` lives in `apps/reading-advantage/`. In the monorepo target structure the app is `apps/reading-advantage`, not `./web`. This path may be a legacy artifact.
- Line 88: `--allow-unauthenticated` makes the service public. This is acceptable only if the application itself performs authentication, but it should be explicitly justified.
- Line 83: `--timeout=60m` is extremely generous for a web service build.
- No lint, type-check, or test steps before build/push.
- No caching strategy (`--cache-from`).

**Verdict:** F9 is a security concern. The build pipeline should move secrets out of build args/env vars and add CI quality gates.

---

### 7. `components.json` (21 lines)

**Structure:** shadcn/ui configuration.

**Issues:**
- Line 7: `tailwind.config.js` — the repo may already be on Tailwind v4 or TypeScript config. If so, this path is stale.
- Line 10: `cssVariables: false` — limits theming flexibility and dynamic color support.

**Verdict:** Minor configuration debt. Verify alignment with current Tailwind/shadcn version.

---

### 8. `client/services/create-firestore-service.ts` (106 lines)

**Structure:** Factory that returns CRUD-like functions (`fetchDoc`, `createDoc`, `updateDoc`, `deleteDoc`, `fetchAllDocs`, `fetchFilteredDocs`) for a given collection path.

**Issues:**
- **Finding (F10, HIGH):** Line 2 imports `ReadonlyHeaders` from `next/dist/server/web/spec-extension/adapters/headers`. This is a Next.js internal path. The file lives in `client/services` and is intended for client use, yet it imports a server-side adapter. This will break in client bundles if the import is not tree-shaken, and it creates a forbidden cross-boundary dependency.
- Line 4: `type ApiRecord = Record<string, any>` — `any` disables type safety for all records handled by this service.
- No Zod validation of `data` or responses.
- `fetchData<void>` for create/update/delete assumes the server returns an empty body. If the API returns JSON, this typing is wrong.
- `headers || undefined` in `createDoc` (line 29) is redundant; `headers` is already `ReadonlyHeaders | undefined`.
- URL construction uses string concatenation and manual query encoding (line 94) rather than `URLSearchParams`.

**Verdict:** F10 is a correctness/architecture concern. The service needs a proper headers type, input/output validation, and removal of the internal Next.js import.

---

### 9. `client/services/fetch-helper.ts` (27 lines)

**Structure:** Generic `fetch` wrapper that shows a toast on error and throws.

**Issues:**
- **Finding (F11, MEDIUM):** UI toasts are triggered from a data-fetching utility, coupling network code to presentation. Per `AGENTS.md`, UI layers should be thin and not mix concerns.
- Line 12: `await response.json()` in the error path can throw if the server returns HTML (e.g., a Next.js error page), producing a secondary unhandled exception.
- No request timeout, retry, or abort handling.
- `console.error(error)` logs in production.
- Line 19: `error.message` may be undefined; the fallback should be applied safely.

**Verdict:** Should be replaced with an adapter that returns structured errors and lets callers decide how to surface them.

---

### 10. `client/services/firestore-client-services.ts` (11 lines)

**Structure:** Instantiates the generic service for `users` and `licenses/records`.

**Issues:**
- Imports `User`, `License`, `LicenseRecord`, and `DBCollection` from `@/server/models/*` into client code. This is a cross-boundary import from `server` to `client`.
- No validation of the types at runtime.

**Verdict:** Minor, but aligns with F2 (missing shared contracts) and F10 (cross-boundary imports).

---

### 11. `components/admin/article-creation.tsx` (1,658 lines)

**Structure:** Very large client component implementing article generation, preview/edit, save, approve, and management tabs.

**Issues:**
- **Finding (F12, HIGH):** Massive component containing domain workflow (generate → edit → save → approve → publish). This should be split into backend actions and smaller UI components.
- **Finding (F13, HIGH):** Direct `fetch()` calls to `/api/v1/articles/generate/custom-generate/*` without input/output validation.
- **Finding (F14, MEDIUM):** Background image URL hardcoded to `storage.googleapis.com` (F4).
- **Finding (F15, MEDIUM):** `document.body.style.pointerEvents = "auto"` is used in multiple places (lines 417, 521, 603, 743, 888) to forcibly reset pointer events after dialogs. This is fragile and indicates dialog state-management issues.
- **Finding (F16, MEDIUM):** Loading progress is fake: random increments (line 343), capped at 98% until completion, and messages chosen randomly. This misleads users about actual progress.
- **Finding (F17, MEDIUM):** `handleEditArticle` wraps `setState` calls in `Promise.all` and then `setTimeout(..., 0)` (lines 622-655). React state setters do not need to be awaited; this is unnecessary complexity.
- **Finding (F18, MEDIUM):** `checkContentChanged` only compares `title`, `passage`, `summary`, `imageDesc`. Other fields (`cefr_level`, `wordCount`, etc.) are ignored, so the "Save Edit" vs "Save As Draft" decision may be incorrect.
- **Finding (F19, LOW):** Hardcoded English strings mixed with `t(...)` calls (e.g., lines 1322-1324, 1476-1477, 1512, 254-274).
- **Finding (F20, LOW):** Mixed Thai-language comments (lines 200, 570-571, 573, 618, 658-659, 665, 724, 775-779, 782, 785, 803).
- **Finding (F21, LOW):** `isArticlePublished` returns true for `approved` or `published`, but the local state update in `confirmApproval` sets `"approved"` while the API might persist `"published"`.
- **Finding (F22, LOW):** `getStatusBadge` accepts `ArticleStatus` but `UserArticle.status` is typed as `string`, allowing runtime values outside the config map.

**Verdict:** This file is the clearest example of P1. It needs significant decomposition: backend actions for article lifecycle, a separate hook for the API layer, and smaller presentational components.

---

### 12. `components/admin/classroom-report.tsx` (616 lines)

**Structure:** Classroom detail report with summary cards, student table, and XP chart.

**Issues:**
- **Finding (F23, MEDIUM):** Client-side fetch to `/api/v1/classroom/xp-per-students/${classId}` with `baseUrl` fallback to `http://localhost:3000` (lines 105-108). This is fragile for production and SSR.
- **Finding (F24, MEDIUM):** `xpData` is typed as `any` (line 93).
- **Finding (F25, LOW):** Hardcoded English labels ("Classroom Information", "Grade", "Status", "Created", "Total Students", etc.).
- **Finding (F26, LOW):** Mobile detection via `window.innerWidth` inside `useEffect` causes hydration/content mismatch risk.
- **Finding (F27, LOW):** `averageLevel.toFixed(1)` is safe here because of the prior guard, but `totalXP.toLocaleString()` is rendered conditionally on `isClient`, creating a hydration mismatch avoidance pattern.

**Verdict:** Typical admin report component. Main concerns are hardcoded strings and client-side data fetching that could be server-fetched.

---

### 13. `components/admin/classroom-xp-comparison-chart.tsx` (785 lines)

**Structure:** Recharts-based bar/line chart comparing classroom XP across time ranges, including a custom date range picker.

**Issues:**
- **Finding (F28, MEDIUM):** Lines 133-136 contain an empty `useEffect` for custom date range. It is dead code.
- **Finding (F29, MEDIUM):** `activeClassrooms` filter logic assumes `customRangeData` has the same `ClassroomData` shape as `classes`, but the hook may return a different structure. This is type-unsafe.
- **Finding (F30, MEDIUM):** When `timeRange === "custom"` but no `customRangeData` is available, the chart silently falls back to `classroom.xpData?.week` (line 194). This is misleading UX.
- **Finding (F31, MEDIUM):** `React.memo` custom comparison (lines 761-784) uses `JSON.stringify` on the entire `classes` array. For large datasets this deep comparison can be slower than a re-render.
- **Finding (F32, LOW):** Hardcoded English labels ("Classroom XP Comparison", "Time Range", "Today", "This Week", etc.).
- **Finding (F33, LOW):** `topClassroom` is accessed without guard in some JSX branches (line 230), though the rendering code later guards it.

**Verdict:** Functional chart component, but contains dead code, fragile custom-range handling, and an expensive memo comparison.

---

### 14. `components/admin/dashboard-content.tsx` (200 lines)

**Structure:** Dashboard shell that selects a license and renders summary cards/charts.

**Issues:**
- **Finding (F34, MEDIUM):** `fetchDashboardData` does not check `response.ok` before calling `response.json()`. Non-2xx responses will throw into the catch block with limited context.
- **Finding (F35, MEDIUM):** After selecting a license, the component calls `/api/v1/admin/dashboard?licenseId=${licenseId}` and then renders `dashboardData.license[0]`. If the API returns a license different from the requested one, the UI will show stale/mismatched data.
- **Finding (F36, LOW):** `useScopedI18n(... ) as any` (line 52) defeats i18n type safety.
- **Finding (F37, LOW):** Duplicate local `License` interface (F2).

**Verdict:** Minor issues. The license fetch mismatch is the main concern.

---

### 15. `components/admin/license-selector.tsx` (74 lines)

**Structure:** Reusable license dropdown.

**Issues:**
- **Finding (F38, LOW):** `useScopedI18n(... ) as any` (line 37).
- **Finding (F39, LOW):** Duplicate local `License` interface (F2).

**Verdict:** Clean, small component. Only typed-i18n and contract duplication issues.

---

### 16. `components/admin/reports-content.tsx` (121 lines)

**Structure:** Wrapper that conditionally shows license selector and fetches classrooms for SYSTEM role.

**Issues:**
- **Finding (F40, MEDIUM):** `useEffect` with empty dependency array (line 74) fetches classrooms only when `selectedLicenseId !== userLicenseId`. If the initial selection equals `userLicenseId` (the common case for non-SYSTEM or default selection), no fetch occurs, which is correct. But `handleLicenseChange` always fetches, even when re-selecting the user's own license. This can cause redundant fetches.
- **Finding (F41, LOW):** Duplicate `License` and `ClassroomData` interfaces (F2).
- **Finding (F42, LOW):** Hardcoded "Loading classroom data...".

**Verdict:** Minor redundancy and type duplication.

---

### 17. `components/admin/reports.tsx` (609 lines)

**Structure:** Classroom list report with table, filters, summary cards, and XP comparison chart.

**Issues:**
- **Finding (F43, MEDIUM):** `debugAll: process.env.NODE_ENV === 'development'` (line 370) enables React Table debug logging in dev. This is fine in dev but indicates the table config is not production-tuned.
- **Finding (F44, MEDIUM):** Column visibility dropdown uses `DropdownMenuItem` with `onClick` to toggle visibility and a manual checkmark. It should use `DropdownMenuCheckboxItem` for accessibility and keyboard state.
- **Finding (F45, LOW):** Extensive hardcoded English strings ("Classroom Name", "Code", "Teacher", "Grade", "Students", "Created", "Status", "Reports", "Total Classrooms", etc.).
- **Finding (F46, LOW):** `chartProps` is memoized with `licenseId: undefined` explicitly typed as `undefined`. This is awkward; the prop can simply be omitted.

**Verdict:** Typical report component. Main concerns are i18n gaps and the checkbox pattern mismatch.

---

### 18. `components/admin/teacher-assignments-table.tsx` (992 lines)

**Structure:** Table of teacher assignments with filters, summary cards, mobile detail dialog, and server-side pagination params.

**Issues:**
- **Finding (F47, MEDIUM):** `currentPage` is sent to the API (`/api/v1/admin/teacher-assignments?page=${currentPage}`), but the React Table pagination controls call `table.previousPage()` / `table.nextPage()` which operate on the already-fetched local data. The API page and the table page are not synchronized. Changing a filter resets `currentPage` to 1 (correct), but the table page state is independent.
- **Finding (F48, MEDIUM):** Hardcoded English strings in the mobile dialog: "In Progress" and "Not Started" (lines 890, 899).
- **Finding (F49, LOW):** `summaryStats.uniqueTeachers` is computed only from the current page of data, not the full result set. The summary card label "Total Teachers" may undercount.
- **Finding (F50, LOW):** Completion-rate logic is duplicated in the table cell (lines 321, 369-370) and in the dialog (lines 930-937, 910-918).
- **Finding (F51, LOW):** `handleRowClick` opens the detail dialog only on mobile. Desktop rows are not clickable, but there is no obvious desktop alternative to open details.

**Verdict:** The pagination mismatch (F47) is the most significant functional concern. Other issues are UX/localization debt.

---

## Finding Summary

| ID | Severity | File(s) | Description |
|----|----------|---------|-------------|
| F1 | HIGH | All admin components | Business logic implemented directly in React components instead of backend modules |
| F2 | MEDIUM | dashboard-content, license-selector, reports-content, reports, classroom-xp-comparison-chart, article-creation, classroom-report, teacher-assignments-table | Local interface duplication instead of shared Zod-derived contracts |
| F3 | MEDIUM | dashboard-content, license-selector, article-creation, classroom-report, reports, teacher-assignments-table | Untyped `useScopedI18n(... ) as any` and hardcoded English strings |
| F4 | MEDIUM | article-creation.tsx | Direct GCS URL hardcoding instead of storage adapter |
| F5 | HIGH | fetch-helper.ts, create-firestore-service.ts, all admin components | No runtime input/output validation at client-server boundary |
| F6 | HIGH | cloud-sql-proxy, cloud-sql-proxy.exe | Large executable binaries committed to source control |
| F7 | HIGH | level-test.json | No answer key; placement test cannot be scored automatically |
| F8 | MEDIUM | level-test.json | Some questions/distractors are ambiguous or conflate grammar with conversational fit |
| F9 | HIGH | cloudbuild.yaml | Secrets passed as build args and env vars, captured in image layers/logs |
| F10 | HIGH | create-firestore-service.ts | Imports `ReadonlyHeaders` from Next.js internal server path in client service |
| F11 | MEDIUM | fetch-helper.ts | Toast UI coupled to network layer; JSON parse failure not handled in error path |
| F12 | HIGH | article-creation.tsx | 1,658-line component contains full article lifecycle domain workflow |
| F13 | HIGH | article-creation.tsx | Direct fetch calls without validation for article generation/save/approve |
| F14 | MEDIUM | article-creation.tsx | GCS background image URL hardcoded (same as F4) |
| F15 | MEDIUM | article-creation.tsx | Forced `document.body.style.pointerEvents` manipulation after dialogs |
| F16 | MEDIUM | article-creation.tsx | Fake loading progress using random increments |
| F17 | MEDIUM | article-creation.tsx | Unnecessary `Promise.all` + `setTimeout(0)` around `setState` |
| F18 | MEDIUM | article-creation.tsx | Content-change check ignores non-text fields |
| F19 | LOW | article-creation.tsx | Hardcoded English strings mixed with translations |
| F20 | LOW | article-creation.tsx | Thai-language comments in code |
| F21 | LOW | article-creation.tsx | Status mapping assumes `"approved"`; API may use `"published"` |
| F22 | LOW | article-creation.tsx | `UserArticle.status` typed as `string` but cast to `ArticleStatus` |
| F23 | MEDIUM | classroom-report.tsx | Client-side fetch with `localhost:3000` fallback and `any`-typed response |
| F24 | MEDIUM | classroom-report.tsx | `xpData: any` |
| F25 | LOW | classroom-report.tsx | Hardcoded English labels |
| F26 | LOW | classroom-report.tsx | `window.innerWidth` mobile detection hydration risk |
| F27 | LOW | classroom-report.tsx | Conditional `toLocaleString()` to avoid hydration mismatch |
| F28 | MEDIUM | classroom-xp-comparison-chart.tsx | Empty `useEffect` for custom date range (dead code) |
| F29 | MEDIUM | classroom-xp-comparison-chart.tsx | Assumes `customRangeData` has same shape as `classes` |
| F30 | MEDIUM | classroom-xp-comparison-chart.tsx | Silent fallback to `week` XP when custom range data missing |
| F31 | MEDIUM | classroom-xp-comparison-chart.tsx | `JSON.stringify` deep comparison in `React.memo` |
| F32 | LOW | classroom-xp-comparison-chart.tsx | Hardcoded English chart labels |
| F33 | LOW | classroom-xp-comparison-chart.tsx | `topClassroom` accessed before guard |
| F34 | MEDIUM | dashboard-content.tsx | `response.ok` not checked before parsing dashboard data |
| F35 | MEDIUM | dashboard-content.tsx | Rendered license may mismatch selected license after fetch |
| F36 | LOW | dashboard-content.tsx | `useScopedI18n(... ) as any` |
| F37 | LOW | dashboard-content.tsx | Local `License` interface duplicate |
| F38 | LOW | license-selector.tsx | `useScopedI18n(... ) as any` |
| F39 | LOW | license-selector.tsx | Local `License` interface duplicate |
| F40 | MEDIUM | reports-content.tsx | Redundant classroom fetch when re-selecting user's own license |
| F41 | LOW | reports-content.tsx | Local `License`/`ClassroomData` interface duplicates |
| F42 | LOW | reports-content.tsx | Hardcoded loading text |
| F43 | MEDIUM | reports.tsx | `debugAll: true` in development table config |
| F44 | MEDIUM | reports.tsx | Column visibility uses `DropdownMenuItem` instead of `DropdownMenuCheckboxItem` |
| F45 | LOW | reports.tsx | Hardcoded English strings |
| F46 | LOW | reports.tsx | Awkward `licenseId: undefined as undefined` memoization |
| F47 | MEDIUM | teacher-assignments-table.tsx | API page param and React Table page state are not synchronized |
| F48 | MEDIUM | teacher-assignments-table.tsx | Hardcoded English strings in mobile dialog |
| F49 | LOW | teacher-assignments-table.tsx | "Total Teachers" counts only current page |
| F50 | LOW | teacher-assignments-table.tsx | Completion-rate logic duplicated in cell and dialog |
| F51 | LOW | teacher-assignments-table.tsx | Row click opens detail dialog only on mobile |

**Findings by severity:** HIGH: 9, MEDIUM: 23, LOW: 20

**Blocking concerns:**
- F6/F9 (binary blobs + secrets in build pipeline) are security/supply-chain risks.
- F7 (missing answer key in level-test.json) is a functional blocker if the placement test is meant to be scored.
- F10 (Next.js internal import in client service) is a runtime/build risk.
- F12/F13 (article-creation.tsx domain workflow and unvalidated API calls) are significant architecture/correctness concerns.

**Pattern concerns:**
- P1 (business logic in UI) and P2 (local type duplication) affect nearly every file in the batch.
- P3 (i18n gaps/untyped hooks) and P5 (no validation) are systemic across the admin UI.

---

## Recommendations

1. **Extract domain workflows to backend modules** per `AGENTS.md`, especially the article lifecycle in `article-creation.tsx`.
2. **Introduce shared Zod contracts** for article, license, classroom, and assignment shapes; derive TypeScript types from them.
3. **Remove binary blobs** from version control; install `cloud-sql-proxy` in CI/dev scripts with checksum verification.
4. **Refactor `cloudbuild.yaml`** to use Secret Manager / `--set-secrets` and add lint/type-check/test steps.
5. **Add an answer key** to `level-test.json` or document that scoring happens externally.
6. **Replace `fetch-helper.ts`** with an adapter that returns typed, validated results and lets UI layers handle toasts.
7. **Fix `create-firestore-service.ts`** cross-boundary import and add runtime validation.
8. **Run `pnpm turbo run lint` and `pnpm turbo run check-types`** on the affected packages to confirm which of the flagged issues are already caught by CI.
