# Line-by-Line Review — Batch `cc-batch-01`

- **Track:** `codecamp_advantage_review_20260626`
- **Batch:** `cc-batch-01`
- **Reviewer model:** `ark-code-latest` (Doubao-Seed-Code)
- **Date:** 2026-06-27
- **Scope:** 20 files listed in `/tmp/opencode/cc-batch-01`
- **Focus areas:** curriculum/progression correctness, GitHub/webhook/AI integration risks, auth/role boundaries, production readiness, AGENTS compliance, test quality
- **Constraint:** read-only review; no source code edited. No acceptance/closeout claims made.

Finding ID scheme: `F-CC-B01-###`. Severity legend: **Critical** (security/data-loss/prod outage), **High** (incorrect behavior, integration break), **Medium** (correctness/robustness gap), **Low** (style/maintainability/doc), **Info** (observation, no action required).

---

## Files reviewed (20/20)

1. `apps/codecamp-advantage/app/api/trpc/[trpc]/route.ts`
2. `apps/codecamp-advantage/app/error.tsx`
3. `apps/codecamp-advantage/app/globals.css`
4. `apps/codecamp-advantage/app/layout.tsx`
5. `apps/codecamp-advantage/app/not-found.tsx`
6. `apps/codecamp-advantage/app/webhooks/github/pr/route.ts`
7. `apps/codecamp-advantage/cloudbuild.yaml`
8. `apps/codecamp-advantage/components/__tests__/fork-instruction.test.tsx`
9. `apps/codecamp-advantage/components/__tests__/language-switcher.test.tsx`
10. `apps/codecamp-advantage/components/__tests__/lesson-content.test.tsx`
11. `apps/codecamp-advantage/components/__tests__/review-history.test.tsx`
12. `apps/codecamp-advantage/components/__tests__/workflow-tracker.test.tsx`
13. `apps/codecamp-advantage/components/fork-instruction.tsx`
14. `apps/codecamp-advantage/components/header.tsx`
15. `apps/codecamp-advantage/components/language-switcher.tsx`
16. `apps/codecamp-advantage/components/lesson-content.tsx`
17. `apps/codecamp-advantage/components/providers.tsx`
18. `apps/codecamp-advantage/components/review-history.tsx`
19. `apps/codecamp-advantage/components/workflow-tracker.tsx`
20. `apps/codecamp-advantage/docs/assessment-rubric.md`

---

## 1. `app/api/trpc/[trpc]/route.ts`

Context read: `packages/api/src/context.ts` (`createContext`/`getAuthToken`).

- **F-CC-B01-001 — Info — L9-12.** Context is created by passing only the `authorization` header into `createContext`. `getAuthToken` (context.ts L21-30) reads `session_token` from `next/headers` cookies first, then falls back to the Bearer header. Because `createContext` itself calls `cookies()`, the cookie path still works even though this handler does not forward cookies explicitly — the auth-by-cookie flow is intact. No action; documenting that the header pass-through is a secondary path and the primary path is cookie-based.
- **F-CC-B01-002 — Low — L4-14.** `handler` has no try/catch and no structured logging around `fetchRequestHandler`. Errors thrown during context creation are largely swallowed inside `createContext`, but an unexpected throw here would surface as an unlogged 500. Consider wrapping with the structured-log pattern used in `error.tsx`/`context.ts` for production observability (AGENTS "Observability" section).
- **F-CC-B01-003 — Info — L9.** `createContext` is invoked per request via an inline closure that re-reads the header each call — correct. No memoization bug.

## 2. `app/error.tsx`

- **F-CC-B01-004 — Low — L16-24.** Logs via `console.error(JSON.stringify(...))` inside a `"use client"` component. This executes in the browser, not on the server, so the comment "server-side observability via Cloud Logging" (L7) is misleading: client error boundaries log to the browser console, which Cloud Logging will not capture unless a client telemetry sink is wired up. Either correct the JSDoc or forward the error to a server endpoint. Severity Low (cosmetic/observability accuracy).
- **F-CC-B01-005 — Info — L9-37.** Recovery affordance (`reset`) and styling are appropriate; uses design tokens (`text-destructive`, `bg-primary`). No action.

## 3. `app/globals.css`

- **F-CC-B01-006 — Medium — L33-52 (and `.dark` L55-74).** Color tokens are defined as bare HSL channel triplets (e.g. `--background: 0 0% 100%;`) but the `@theme inline` block (L7-25) maps `--color-background: var(--background)` directly without an `hsl()` wrapper. With Tailwind v4 `@theme inline`, a raw `0 0% 100%` value will not resolve to a valid color unless consumers wrap it in `hsl(...)`. This is a common Tailwind v3→v4 migration pitfall. **Verify** that components actually render correct colors (the value should typically be `hsl(var(--background))` in the theme mapping, or the channel values should be full color values). If colors render, downgrade to Info; if not, this is a visible styling break. Not verified at runtime in this read-only review.
- **F-CC-B01-007 — Info — L1-2.** Imports `tailwindcss` and `tw-animate-css`. Ensure `tw-animate-css` is a declared dependency (not verified in this batch — package.json out of scope).

## 4. `app/layout.tsx`

- **F-CC-B01-008 — Medium — L9-14.** The root layout returns `children` directly with no `<html>`/`<body>` element. The `<html>`/`<body>` tags live in `app/[locale]/layout.tsx` (confirmed via grep). Next.js App Router conventionally requires the root layout to render `<html>` and `<body>`; relying solely on a nested locale layout is a known next-intl pattern but can produce hydration/validateDOMNesting warnings and is fragile across Next.js upgrades. Confirm this matches the project's established next-intl setup; if intentional, document it. Severity Medium pending confirmation.
- **F-CC-B01-009 — Info — L3-7.** Metadata is static and reasonable. `globals.css` is imported in the locale layout, not here — acceptable given the structure above.

## 5. `app/not-found.tsx`

- **F-CC-B01-010 — Low — L13-18.** Uses `next/link` `Link` (not the locale-aware `@/i18n/navigation` `Link` used elsewhere, e.g. `header.tsx` L3). `href="/"` will bypass locale prefixing and may drop the active locale on 404 recovery. For locale consistency, prefer the i18n `Link`. Severity Low (UX/i18n consistency).
- **F-CC-B01-011 — Info — L8-20.** Otherwise clean; styled, accessible CTA.

## 6. `app/webhooks/github/pr/route.ts`

Context read: `packages/webhooks/src/github.ts` (Hono handler).

- **F-CC-B01-012 — Medium — L7-14.** The route rewrites `url.pathname = "/pr"` to match the Hono sub-app route. This is a brittle coupling: if the Hono route prefix changes, this silently breaks. The query string and original path are discarded. Acceptable as an adapter shim, but document the contract that the Hono app mounts `POST /pr`.
- **F-CC-B01-013 — Medium — L10-14.** The forwarded `Request` copies `headers` and re-buffers the body via `arrayBuffer()`. The webhook signature verification (github.ts L82-113) depends on the **raw** body bytes. Re-buffering through `arrayBuffer()` and reconstructing a `Request` preserves bytes, so HMAC should still validate — but any header normalization by the runtime (e.g., header casing, dropping `content-length`) could affect downstream parsing. The signature is computed over the text body (github.ts L90 `c.req.text()`), so this is likely safe; flagged for explicit verification because webhook signature mismatches are a high-cost failure mode.
- **F-CC-B01-014 — Info — L3-4.** Correctly pins `runtime = "nodejs"` and `dynamic = "force-dynamic"` — required because the webhook needs Node crypto for HMAC and must not be statically cached. Good.
- **F-CC-B01-015 — High — github.ts L257-265 (integration risk surfaced via this route).** In the webhook path a new PR review is created with a synthesized `prUser` (role `INTERN`, `schoolId: null`). The same `createPrReview` domain function is exposed via `protectedProcedure` in the tRPC router (`packages/api/src/routers/codecamp.ts` L358-372) where it runs as the authenticated user. Two distinct callers (webhook `systemUser`/`prUser` vs. interactive intern) create rows through the same path. Confirm the domain layer's authorization (`assertCan`) treats `SYSTEM`/`INTERN` consistently and that `schoolId: null` does not bypass tenant scoping on a FLAT table. This is the highest-risk integration boundary in the batch and should be cross-checked against the domain `codecamp` module review. (Domain module out of this file batch; flagged for the curriculum/auth reviewer.)
- **F-CC-B01-016 — Medium — github.ts L318-329.** Lesson completion on approved review is best-effort and swallows errors with only a `console.error`. A failed `completeApprovedPrReviewLesson` leaves the review `approved` but the lesson incomplete — a silent progression inconsistency. Recommend persisting a retry signal or an audit event rather than only logging. (Surfaced because route.ts is the production entry point for this flow.)

## 7. `cloudbuild.yaml`

- **F-CC-B01-017 — High — L45 & L54-63.** The Cloud Run service is deployed with `--allow-unauthenticated` **and** a separate step binds `allUsers` to `roles/run.invoker`. This makes the service fully public. For an app handling intern auth, GitHub App secrets, and AI keys, public ingress is expected for the web UI, but confirm the webhook endpoint and tRPC mutations enforce auth/signature at the app layer (they do per github.ts L82+ and `protectedProcedure`). The redundant explicit `allUsers` binding (L54-63) is unnecessary given `--allow-unauthenticated` and broadens the IAM surface; remove one. Severity High due to public exposure + secret-bearing service.
- **F-CC-B01-018 — Medium — L18-34.** The `migrate-db` and `doctor-check` steps each run `pnpm install --frozen-lockfile` from scratch on `node:20-slim`, duplicating a full install. Beyond slow/expensive builds, running migrations via `node:20-slim` with `corepack enable` but no explicit pnpm version pin risks corepack prompting/failing in CI. Pin the pnpm version (e.g., `packageManager` field reliance) and consider caching. Production-readiness/robustness.
- **F-CC-B01-019 — Medium — L23.** Migrations run with `DATABASE_URL="$$DIRECT_DATABASE_URL"`. The migrate step runs **before** `deploy-cloudrun` (good ordering per AGENTS "Migrations" — migrate before dependent code). However, there is no gate preventing deploy if `migrate-db` partially applies and then `doctor-check` fails — Cloud Build stops on failure by default, so a failed doctor-check blocks deploy (correct). Confirm `doctor --check` is non-mutating. Info-leaning Medium.
- **F-CC-B01-020 — Low — L47.** `--add-cloudsql-instances=reading-advantage:asia-southeast1:cloud-sql` hardcodes the shared Cloud SQL instance across projects. Per the deploy skill this is intentional for shared instances, but the connection name is not parameterized by `$PROJECT_ID`, so this file is not portable across environments. Document or templatize.
- **F-CC-B01-021 — Low — L9/L48.** Image tag uses only `$BUILD_ID` (no `:latest` or git-sha alias) and env var `NEXT_PUBLIC_API_URL` is baked at deploy. `NEXT_PUBLIC_*` values are inlined at **build** time in Next.js, not deploy time — setting it as a Cloud Run runtime env var (L48) will **not** affect already-built client bundles. Verify the build step (Dockerfile, out of batch) receives this at build time; otherwise the public API URL is wrong in the client. Potentially High if the client depends on it; downgraded to Low pending Dockerfile review (out of scope).

## 8. `components/__tests__/fork-instruction.test.tsx`

- **F-CC-B01-022 — Medium — L31-35, L47, L61, L73-78.** Tests assert on raw translation **keys** (`step1Title`, `openOnGitHub`, `prUrlPlaceholder`, `invalidPrUrl`) because the global setup (`lib/__tests__/setup.ts` L6-17) mocks `useTranslations` to echo the key. This validates structure but provides **no protection against missing translation keys** in the actual `en`/`th` message catalogs. A key can be deleted from the catalog and these tests still pass. Recommend at least one test that renders with the real message provider, or a separate catalog-completeness test. Test-quality gap.
- **F-CC-B01-023 — Medium — L52-62.** The "shows git clone command" test asserts the SSH form `git clone git@github.com:org/repo.git`. The component (fork-instruction.tsx L82-86) renders **both** an HTTPS clone block and an SSH variant; the test only covers the SSH text and never asserts the primary HTTPS command (L82). Coverage of the main affordance is missing.
- **F-CC-B01-024 — Low — L64-79.** The invalid-URL test sets `not-a-url` and asserts the button is disabled. It does not cover the partial-valid case (`https://github.com/...` without `/pull/\d+`), which is the more likely user error and is the exact branch `isValidPrUrl` (fork-instruction.tsx L35-36) guards. Add a boundary case.
- **F-CC-B01-025 — Low — L8-16.** The mutation mock returns `{ id, reviewStatus }` but `handleSubmitPr` (component L38-42) ignores the return and just sets `submitted`. No test asserts the `mutateAsync` was called with `{ exerciseRepoId, prUrl }`. The actual submit side-effect (the core behavior) is untested — both passing tests only check enable/disable state, not that clicking submits the correct payload.

## 9. `components/__tests__/language-switcher.test.tsx`

- **F-CC-B01-026 — Info — L8-15.** This file locally re-mocks `next-intl` and `@/i18n/navigation`, overriding the global setup mock. The local `next-intl` mock only provides `useLocale`, not `useTranslations` — fine because `LanguageSwitcher` does not call `useTranslations`. Correct and well-scoped.
- **F-CC-B01-027 — Low — L57-66.** "uses native button elements" test is somewhat redundant with the accessibility-label tests, but harmless. Good coverage of `aria-current`, `role=group`, and locale-switch navigation. This is the strongest test file in the batch.

## 10. `components/__tests__/lesson-content.test.tsx`

- **F-CC-B01-028 — Medium — L1-3 (relies on global setup).** `LessonContent` (lesson-content.tsx L1) imports `useTranslations` but the component is **not** marked `"use client"` and the test relies on the global `next-intl` mock. Same key-echo limitation as F-CC-B01-022: empty-state assertions check `/noContent/i` which is the translation key, not real copy. Acceptable for unit structure but does not validate catalog completeness.
- **F-CC-B01-029 — Low — L96-99.** The "unknown lesson type" test uses `@ts-expect-error` to pass an invalid `type`. This validates the runtime fallback but the production type is constrained to `LessonResponse["type"]`; the defensive `EmptyContent` fallback (component L38) is good, but the test documents a path that types should prevent. Keep, but note the value is defensive-only.
- **F-CC-B01-030 — Info — L43-53, L101-131.** Good coverage of missing-code, missing-sections, whitespace preservation, and code-block rendering. The `key={section.heading ?? index}` (component L62) could collide if two sections share a heading; no test covers duplicate-heading sections. Minor.

## 11. `components/__tests__/review-history.test.tsx`

- **F-CC-B01-031 — Medium — L15-16, L80-83.** Many assertions use `getAllByText(/.../i).length >= 1` against translation keys. Because the status label, the status message, and the timeline step labels can all echo similar key substrings (e.g. `statusNeedsChanges` vs `statusNeedsChangesMsg`), these loose regex/`getAllByText` matches can pass even if the wrong element rendered. Tests are over-permissive and would not catch a label/message swap. Tighten with exact role/label queries.
- **F-CC-B01-032 — Low — L99-110.** Empty-string summary test asserts no `feedback` heading — but the component (review-history.tsx L106) gates the summary block on truthy `summary`, so empty string correctly hides it. Good edge case. Note the component renders `feedback` as a `<p>` (L108), not a heading, so `queryByRole("heading", { name: /feedback/i })` (L108) would never match regardless of state — the assertion is trivially true and gives false confidence.

## 12. `components/__tests__/workflow-tracker.test.tsx`

- **F-CC-B01-033 — Low — L20, L66.** `issueLabel` is asserted by key text (`t("issueLabel", {number, title})`); since the mock echoes the key and ignores params (setup.ts L9-11), the test cannot detect a broken interpolation of `{number}`/`{title}`. The actual rendered intern-facing string is never validated.
- **F-CC-B01-034 — Info — L32-47.** Good use of `data-step-id`/`data-status` attributes and `aria-label` queries for status assertions — more robust than text matching. The empty-steps and unknown-step-id edge cases are covered. Reasonable test quality.

## 13. `components/fork-instruction.tsx`

- **F-CC-B01-035 — Medium — L30-33.** `prReviewByPrUrl` query is enabled whenever `prUrl.startsWith("https://github.com/")`, which is looser than the `isValidPrUrl` check (L35-36, requires `/pull/\d+$`). This fires backend queries for incomplete URLs as the user types (e.g. `https://github.com/o`), causing wasted authenticated tRPC round-trips and potential rate pressure. Gate the query on `isValidPrUrl` instead.
- **F-CC-B01-036 — Low — L38-42.** `handleSubmitPr` calls `mutateAsync` without a try/catch. On rejection (e.g., duplicate PR — the router maps this error, codecamp.ts L515 test), the promise rejects unhandled and `setSubmitted(true)` never runs, but there is **no user-facing error surfaced** for the submit failure (only the client-side invalid-URL message at L133 exists). Add error handling/toast for mutation failure. Production-UX gap.
- **F-CC-B01-037 — Low — L91.** Branch-name generation `feature/{repoDescription.toLowerCase().replace(/\s+/g, "-")}` does not strip non-URL-safe characters (slashes, special chars, leading/trailing hyphens). A description like "Auth & Login" yields `feature/auth-&-login`, an invalid/awkward git branch name shown to interns as guidance. Sanitize more thoroughly.
- **F-CC-B01-038 — Low — L48-97.** The 5-step instruction array hardcodes icon-to-step mapping by index. Adding/removing a step requires editing two parallel arrays (`[1,2,3,4,5]` and `icons`). Fragile but contained. Low.
- **F-CC-B01-039 — Info — L29-42.** `createPrReview` correctly invoked via the `trpc` adapter (no direct backend coupling). Aligns with AGENTS adapter rule.

## 14. `components/header.tsx`

- **F-CC-B01-040 — Medium — L42-45.** `handleLogout` calls `await logout()` then `window.location.reload()`. A full page reload to reset auth state is heavy and loses SPA state; it also will not redirect away from auth-gated routes (the reloaded page may 404/redirect inconsistently). Prefer router navigation + auth-context invalidation. Production-readiness/UX.
- **F-CC-B01-041 — Medium — L69-77.** Admin link visibility is gated on `user?.role === "ADMIN"` **client-side only**. This is correct as a UI affordance, but it must not be the only authorization layer — the `/admin` route and its tRPC procedures must independently enforce the ADMIN role server-side. Confirm server-side enforcement exists (admin routes out of this batch). Flag per AGENTS auth/role-boundary focus: client role checks are presentation, not authorization.
- **F-CC-B01-042 — Low — L33, L38.** Login error handling surfaces `err.message` directly to the UI (`setLoginError(err instanceof Error ? err.message : "Login failed")`). If the auth client propagates raw backend error strings, this risks leaking internal detail (e.g. "user not found" vs "invalid password" enabling user enumeration). Prefer a generic "Invalid username or password" message for failed logins. Security/auth UX.
- **F-CC-B01-043 — Info — L120.** Username placeholder `"intern1"` hints at seeded credentials; acceptable for an internal bootcamp app but avoid suggesting real account names in production builds.

## 15. `components/language-switcher.tsx`

- **F-CC-B01-044 — Low — L12-14.** `switchLocale` is typed to `"th" | "en"` but the broader app locale set is not cross-checked here; if a third locale is ever added, this component silently won't support it (no type error because the literal union is local). Minor maintainability; consider deriving from the shared locale config.
- **F-CC-B01-045 — Info — L17-37.** Strong accessibility: `role="group"`, per-button `aria-label`, `aria-current`. Matches its test file. Good.

## 16. `components/lesson-content.tsx`

- **F-CC-B01-046 — Medium — L1, L24.** Component imports `useTranslations` and is used in tests without `"use client"`. If this renders in a Server Component context, `useTranslations` from `next-intl` requires either a client boundary or the server variant (`getTranslations`). Confirm the consuming page marks the boundary; otherwise this is a runtime error in production RSC. (The sibling components all declare `"use client"`; this one does not.) Flag for verification.
- **F-CC-B01-047 — Low — L50-53.** `content` is typed `Record<string, unknown>` and `sections` is filtered by `typeof s === "object" && s !== null` but **not** validated against `TheorySection` shape — `heading`/`body`/`code` are read as if strings without runtime checks. Malformed AI/DB content (e.g. `heading: 42`) would render `42` or `[object Object]`. Per AGENTS "Runtime validation is required at all external boundaries," lesson content from the DB should be Zod-validated before render. Medium-leaning; downgraded to Low because data originates server-side, not directly from untrusted input.
- **F-CC-B01-048 — Info — L62.** `key={section.heading ?? index}` — see F-CC-B01-030 duplicate-heading collision note.

## 17. `components/providers.tsx`

- **F-CC-B01-049 — Medium — L10-13.** `getBaseUrl` returns `http://localhost:${PORT ?? 3000}` for server-side rendering. On Cloud Run the app listens on `PORT` (set by the platform) but server-side tRPC calls to `localhost:PORT` only work if the same process serves both. This is generally fine for Next.js self-calls, but hardcoding `http://localhost` breaks if the runtime expects a different host/protocol, and it ignores `NEXT_PUBLIC_API_URL` set in cloudbuild.yaml (L48). Confirm SSR tRPC calls actually resolve in production. Production-readiness.
- **F-CC-B01-050 — Low — L16.** `new QueryClient()` is created with no default options (no `staleTime`, no retry policy). For a data app this leads to aggressive refetching; consider sensible defaults. Minor.
- **F-CC-B01-051 — Info — L24.** `credentials: "same-origin"` correctly sends the `session_token` cookie for same-origin tRPC — consistent with the cookie-based auth in context.ts. Good.

## 18. `components/review-history.tsx`

- **F-CC-B01-052 — Medium — L54-67.** `getTimelineStepStatus` maps `reviewStatus` onto a 4-step order `["pending","reviewed","needs_changes","approved"]`. But `needs_changes` is **not** a linear progression after `reviewed` — a PR can go `reviewed → needs_changes → reviewed → approved` (rework loop per the rubric, assessment-rubric.md L170). Treating `needs_changes` as ordinal index 2 means: when status is `needs_changes`, the `reviewed` step shows "completed" and `approved` shows "pending" — but if the PR later returns to `reviewed`, the timeline regresses oddly. The linear model misrepresents the actual review state machine. Curriculum/progression correctness issue.
- **F-CC-B01-053 — Low — L21, L116.** `getStatusConfig` switch has no `default` branch; it relies on the union being exhaustive. If a new status (e.g. `merged`) is added to the type, this returns `undefined` and `config.className`/`config.icon` (L95-98) throw at runtime. Add a default/exhaustiveness guard.
- **F-CC-B01-054 — Info — L84-93.** Uses raw `<a target="_blank" rel="noopener noreferrer">` for the external PR link — correct for an external GitHub URL (i18n Link not needed here).

## 19. `components/workflow-tracker.tsx`

- **F-CC-B01-055 — Low — L30, L96-100.** `allCompleted` is `steps.length > 0 && steps.every(completed)`. Correct. But the celebratory banner has no `role="status"`/`aria-live`, so screen-reader users get no announcement on completion. Accessibility enhancement.
- **F-CC-B01-056 — Low — L86-90.** The connector line is only rendered for completed non-last steps and is `hidden sm:block` — purely decorative (`aria-hidden`). Fine. Note the connector logic won't draw a line for in-progress/pending transitions, making the visual timeline inconsistent. Cosmetic.
- **F-CC-B01-057 — Info — L20-26, L48.** Icon map with `?? <Circle>` fallback is robust; covered by test F-CC-B01-034. Good.

## 20. `docs/assessment-rubric.md`

- **F-CC-B01-058 — Medium — L13-14, L30.** Pass threshold is documented as "70% or above" and a failed quiz keeps the lesson `in_progress`. This is a **specification** that the quiz-grading domain logic must enforce. Confirm the backend quiz-completion function uses exactly `>= 70` (not `> 70`) and sets `in_progress` on failure. Doc-vs-code drift here would cause incorrect progression. The doc itself is internally consistent; flag is to ensure code matches (domain out of batch).
- **F-CC-B01-059 — Low — L18-20.** Policy states retries are unlimited with no cooldown and "most recent passing score is recorded." Verify the data model records the passing score (not the latest attempt score, which could be lower on a later fail). The phrase "most recent passing score" is ambiguous vs. "highest score." Clarify to avoid implementation ambiguity.
- **F-CC-B01-060 — Low — L96-97, L170.** Capstone is "Module 18" and remediation says `needs_changes` requires fixing on the **same branch** and re-requesting review ("do not open a new PR"). This aligns with the webhook's `synchronize`-event re-review path (github.ts L146) — good cross-consistency. However, the webhook only creates reviews for `opened`/`synchronize`; if an intern opens a **new** PR instead (violating the rule), the rubric expectation and system behavior diverge silently. Documentation/behavior alignment note.
- **F-CC-B01-061 — Info — L1-198.** Rubric is thorough, internally consistent, and operationally clear. No structural issues. Serves as the source of truth for grading dimensions; recommend linking it from the grading domain module for traceability.

---

## Cross-cutting observations

- **F-CC-B01-062 — Medium — i18n test strategy (files 8-12).** The global `next-intl` mock (`lib/__tests__/setup.ts`) echoing translation keys means **no component test in this batch validates real translated copy or catalog completeness**. A whole class of bugs (missing `th`/`en` keys, broken interpolation) is invisible to this suite. Recommend adding a catalog-completeness test or at least one render-with-real-provider test per locale.
- **F-CC-B01-063 — Medium — client role gating (header.tsx) + public Cloud Run (cloudbuild.yaml).** The combination of a publicly-invokable service and client-only admin gating reinforces that server-side authorization must be airtight in the domain/router layer. This batch contains only UI/config/test files — the actual auth enforcement lives in `packages/api` / `packages/domain` (not in this batch). The auth/role-boundary focus area cannot be fully discharged from these 20 files alone.
- **F-CC-B01-064 — Low — AGENTS compliance.** UI components correctly use the `trpc` adapter and `@reading-advantage/auth-client` rather than provider SDKs (fork-instruction.tsx, providers.tsx, header.tsx) — consistent with the adapter rule. JSDoc is present on some exported functions (error.tsx, not-found.tsx, lesson-content.tsx, pr-url.ts) but **missing** on several exported components (`Header`, `ForkInstruction`, `LanguageSwitcher`, `ReviewHistory`, `WorkflowTracker`, `Providers`), violating the AGENTS "JSDoc for All Functions" standard. Low individually, additive across the batch.

---

## Limitations

- **Read-only:** No source files were modified; findings are advisory.
- **Batch scope:** Only the 20 files in `/tmp/opencode/cc-batch-01` were reviewed in depth. Several findings (F-CC-B01-015, 016, 041, 046, 049, 058, 059) depend on `packages/api`, `packages/domain` (`codecamp` module), `packages/auth`, the Dockerfile, and message catalogs that are **out of this batch**. I read supporting files (`context.ts`, `github.ts`, `codecamp.ts` router excerpt, `pr-url.ts`, `setup.ts`, vitest config) for context but did not audit them line-by-line — they belong to other batches.
- **No runtime verification:** Tailwind v4 token resolution (F-CC-B01-006), root-layout `<html>` placement (F-CC-B01-008), `NEXT_PUBLIC_API_URL` build-time inlining (F-CC-B01-021), SSR base URL resolution (F-CC-B01-049), and RSC boundary for `lesson-content` (F-CC-B01-046) were not executed/built; they are flagged for confirmation, not confirmed defects.
- **No tests run:** Test quality was assessed by reading; the suite was not executed. Pass/fail status of the listed tests is not asserted here.
- **No acceptance or closeout:** This report makes no acceptance, sign-off, or track-closeout determination. It is a line-review artifact only.

## Coverage confirmation

All 20 files in the batch list were read and reviewed. Findings `F-CC-B01-001` through `F-CC-B01-064` recorded above.
