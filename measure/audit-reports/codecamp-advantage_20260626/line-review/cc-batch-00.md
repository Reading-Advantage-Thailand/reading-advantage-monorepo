# Line Review — cc-batch-00

- Track: `codecamp_advantage_review_20260626`
- Batch: `cc-batch-00` (20 files)
- Reviewer model: `ark-code-latest` (Doubao-Seed-Code)
- Date: 2026-06-27
- Scope of this report: line-by-line review only. **No source code was edited.** This document makes **no acceptance or closeout claims**; it is input to the broader review track.
- Focus areas: curriculum/progression correctness, GitHub/webhook/AI integration risks, auth/role boundaries, production readiness, AGENTS.md compliance, test quality.

## Files Reviewed (20/20)

1. `apps/codecamp-advantage/.browserslistrc`
2. `apps/codecamp-advantage/.env.example`
3. `apps/codecamp-advantage/.gitignore`
4. `apps/codecamp-advantage/Dockerfile`
5. `apps/codecamp-advantage/app/[locale]/admin/[userId]/page.tsx`
6. `apps/codecamp-advantage/app/[locale]/admin/new-intern/page.tsx`
7. `apps/codecamp-advantage/app/[locale]/admin/page.tsx`
8. `apps/codecamp-advantage/app/[locale]/chat/page.tsx`
9. `apps/codecamp-advantage/app/[locale]/dashboard-content.tsx`
10. `apps/codecamp-advantage/app/[locale]/error.tsx`
11. `apps/codecamp-advantage/app/[locale]/layout.tsx`
12. `apps/codecamp-advantage/app/[locale]/lesson/[id]/page.tsx`
13. `apps/codecamp-advantage/app/[locale]/module/[slug]/page.tsx`
14. `apps/codecamp-advantage/app/[locale]/not-found.tsx`
15. `apps/codecamp-advantage/app/[locale]/page.tsx`
16. `apps/codecamp-advantage/app/api/auth/login/route.ts`
17. `apps/codecamp-advantage/app/api/auth/logout/route.ts`
18. `apps/codecamp-advantage/app/api/auth/reset-password/route.ts`
19. `apps/codecamp-advantage/app/api/auth/session/route.ts`
20. `apps/codecamp-advantage/app/api/chat/route.ts`

## Severity Legend

- **Critical** — security/data-integrity defect or broken core flow shipped to production.
- **High** — likely functional break, real security/abuse risk, or strong AGENTS.md violation.
- **Medium** — correctness/robustness gap, maintainability or UX risk.
- **Low** — minor/cosmetic, style, or nit.
- **Info** — observation, no action implied.

---

## Findings

### `app/api/chat/route.ts` + `lib/use-chat-stream.ts` (consumer of this route)

- **F-CC-B00-001 — High — AI streaming protocol mismatch breaks live chat streaming.**
  `route.ts:108` returns `result.toDataStreamResponse()`. In the OpenRouter adapter (`packages/ai/src/providers/openrouter.ts:184`) `toDataStreamResponse` is aliased to `result.toTextStreamResponse()`, which emits a **raw `text/plain` token stream**, not the AI-SDK data-stream protocol and not `text/event-stream`. The client (`lib/use-chat-stream.ts:78-79`) branches on `contentType.includes("text/event-stream")`; for a `text/plain` body this is false, so it falls to the `else` branch (`:121-122`) and calls `res.json()` on a non-JSON stream → throws → user sees the generic "having trouble responding" message (`:137-144`). Additionally, even if the event-stream branch were taken, it parses only lines prefixed `0:` (`:92`), which `toTextStreamResponse()` does not produce. Net effect: the streaming path appears to be non-functional end-to-end; only the non-streaming fallback (no API key, `route.ts:85-89`, which returns `{response}`) works. This is the central AI integration risk for the batch and should be verified against a running deployment. Cross-file finding; primary anchor `route.ts:108`, secondary `use-chat-stream.ts:78-122`.

- **F-CC-B00-002 — Medium — Per-instance in-memory rate limiter is not production-safe for multi-replica deploys.**
  `route.ts:65` calls `checkChatRateLimit(session.user.id)` backed by a module-level `Map` (`lib/rate-limit.ts:10`). On Cloud Run / multi-replica horizontal scaling each instance keeps its own counter, so effective limit = 30 × replica count, and limits reset on cold start. AGENTS.md treats AI cost/abuse controls as first-class; a shared store (Postgres/Redis) or documented single-instance constraint is warranted. Anchor `route.ts:64-71`, `rate-limit.ts:1-48`.

- **F-CC-B00-003 — Medium — Provider client constructed at module load with possibly-undefined API key.**
  `route.ts:12-15` calls `createOpenAI({ apiKey: process.env.OPENROUTER_API_KEY, ... })` at import time. The key-presence guard (`route.ts:85`) runs only later inside `POST`. If the SDK validates the key eagerly this throws at module init; if not, the client is created with `apiKey: undefined`. Construction should be lazy / guarded behind the same env check, and ideally routed through the AI adapter factory rather than instantiating `createOpenAI` directly in an app route. See also F-CC-B00-004 (adapter-bypass).

- **F-CC-B00-004 — Medium — Direct provider SDK usage in app route partially bypasses the AI adapter (AGENTS.md provider-neutrality).**
  `route.ts:2-3` imports `streamText` and `createOpenAI` from `@reading-advantage/ai` and wires the OpenRouter base URL/model (`route.ts:12-15`, `:102`) inside the application layer. AGENTS.md ("AI" + "Provider Neutrality Rule") requires app code to depend on adapter calls (`ai.streamText()`), not configure providers/base URLs directly. Provider/model selection and baseURL belong behind the adapter. Anchor `route.ts:2-15,101-106`.

- **F-CC-B00-005 — Low — Auth-error detection relies on string matching.**
  `route.ts:110` checks `error.message === "Authentication required"` to map to 401. Brittle: any change to `requireAuth`'s message silently turns 401 into 500. Prefer a typed error class. Anchor `route.ts:109-115`.

- **F-CC-B00-006 — Low — `maxTokens` legacy kwarg passed through app layer.**
  `route.ts:105` passes `maxTokens: 2048`. The adapter correctly remaps this to v5 `maxOutputTokens` (`openrouter.ts:173-175`), so this works today, but the app is coupled to the adapter's compatibility shim. Info-adjacent; recorded for consistency with the package-level `maxTokens`→`maxOutputTokens` migration. Anchor `route.ts:105`.

- **F-CC-B00-007 — Info — Tenant scoping correctly derived server-side.**
  `route.ts:60-62` builds tenant context from `session.user.schoolId` (never from client input) and passes `tenantDb` into `getChatContext`. This matches AGENTS.md multi-tenancy guidance. Positive observation.

### `app/api/auth/login/route.ts`

- **F-CC-B00-008 — Low — Error log may serialize sensitive `cause`.**
  `route.ts:9-17` JSON-logs `message`, `stack`, and `cause`. For an auth endpoint, ensure upstream `handleLogin` never attaches credentials/tokens to `error.cause`; otherwise they leak to Cloud Logging. Anchor `route.ts:15`. Mitigated in that the request body is not logged.

- **F-CC-B00-009 — Info — Thin route delegating to shared `@reading-advantage/api` handler.**
  Matches AGENTS.md "keep route handlers thin." Positive.

### `app/api/auth/logout/route.ts`

- **F-CC-B00-010 — Low — No local try/catch / error normalization.**
  `route.ts:2` re-exports `handleLogout` directly. Unlike login/reset-password (which wrap errors into a structured 500), logout has no app-level guard. Inconsistent error handling across the auth routes; acceptable if `handleLogout` is internally safe, but worth confirming. Anchor `route.ts:1-2`.

### `app/api/auth/reset-password/route.ts`

- **F-CC-B00-011 — Medium — Password-reset endpoint review depends on unseen shared handler; abuse controls not visible here.**
  `route.ts:7` delegates to `handleResetPassword`. This file cannot confirm rate limiting, token validation, or audit logging for a security-sensitive action (AGENTS.md requires audit logging + rate limiting for auth events). The route itself only does error wrapping. Flag for cross-batch verification of `@reading-advantage/api/routes/auth`. Anchor `route.ts:5-7`. (Out-of-batch dependency; see Limitations.)

### `app/api/auth/session/route.ts`

- **F-CC-B00-012 — Info — Direct re-export of `handleSession` for GET.**
  Thin and convention-aligned. No caching headers set here; confirm `handleSession` marks the response non-cacheable so session state is never served stale/shared by a CDN. Anchor `route.ts:1-2`.

### `app/[locale]/admin/page.tsx`

- **F-CC-B00-013 — High — Admin authorization is client-side only (gating pattern across all admin pages).**
  `admin/page.tsx:28,32` enable the queries with `{ enabled: user?.role === "ADMIN" }` and `:44` renders an "access denied" panel for non-admins. This is purely a UX gate; real authorization must live in the tRPC procedures (`listInterns`, `webhookEvents`, `getInternProgress`, `createIntern`, `updateInternGithubUsername`). If any of those procedures lack a server-side `assertCan`/role check, a non-admin can call them directly. This batch cannot see the routers, so this is a **must-verify** boundary, not a confirmed breach. Same pattern at `admin/[userId]/page.tsx:42,58` and `admin/new-intern/page.tsx:48`. Anchor `admin/page.tsx:26-33,44`.

- **F-CC-B00-014 — Low — Type annotations inconsistent between reducers.**
  `admin/page.tsx:97` annotates the reducer params explicitly, while `:107` (`interns?.reduce((s, i) => ...)`) relies on inference. Cosmetic inconsistency; the `?? 0` fallbacks are fine. Anchor `admin/page.tsx:97,107`.

- **F-CC-B00-015 — Low — Webhook outcome rendering assumes a closed value set.**
  `admin/page.tsx:149-155` styles only `outcome === "failed"` vs everything-else (amber). A successful/processed outcome would render amber as if it were a warning. Confirm the webhook outcome enum and intended color semantics. Anchor `admin/page.tsx:148-156`.

- **F-CC-B00-016 — Low — Repo URL display via naive string replace.**
  `admin/page.tsx:162` strips `https://github.com/` with `.replace`. Fine for github.com but silently no-ops for enterprise/alternate hosts. Minor. Anchor `admin/page.tsx:162`.

### `app/[locale]/admin/[userId]/page.tsx`

- **F-CC-B00-017 — Medium — Initial `githubUsername` state never syncs after async load.**
  `[userId]/page.tsx:44` seeds `useState(intern?.githubUsername ?? "")`. On first render `intern` is `undefined` (query gated/loading), so the input initializes to `""` and is **not** updated when `intern` arrives (no `useEffect` syncing). Admin opening the page sees an empty GitHub field even when a value exists, risking accidental overwrite to empty on save (`:123` sends `githubUsername || null`). Functional/UX correctness bug. Anchor `[userId]/page.tsx:44,123`.

- **F-CC-B00-018 — Low — `statusBadgeLabels` lookup can yield `undefined` for unknown status.**
  `[userId]/page.tsx:29-34,271` index by `review.reviewStatus`; an unexpected status string renders an empty badge. Add a fallback label. Anchor `[userId]/page.tsx:271`.

- **F-CC-B00-019 — Low — Loading gate ordering can flash for non-admins.**
  `[userId]/page.tsx:49` returns the skeleton while `dataLoading`, but the query is gated on `user?.role === "ADMIN"` (`:42`), so for non-admins `dataLoading` stays in its initial state; the access-denied branch (`:58`) is reached only after `authLoading` clears. Behavior is acceptable but the combined gating is subtle. Info/Low. Anchor `[userId]/page.tsx:39-58`.

### `app/[locale]/admin/new-intern/page.tsx`

- **F-CC-B00-020 — Medium — Client-side password policy is minimal and duplicated, not authoritative.**
  `new-intern/page.tsx:70-73` enforces only `password.length < 8`. AGENTS.md auth guidance (Argon2id, security-sensitive handling) implies the **server** must enforce password strength on `createIntern`; this UI check is bypassable. Confirm server-side validation exists in the mutation. Anchor `new-intern/page.tsx:70-76`.

- **F-CC-B00-021 — Low — GitHub username defaulting may produce unexpected handles.**
  `new-intern/page.tsx:75` submits `githubUsername: githubUsername || username`, and `:117-121` auto-mirrors username into the GitHub field until manually touched. If an admin clears the GitHub field intentionally, it silently falls back to the login username as a GitHub handle — which feeds PR-author matching in the webhook pipeline. Could cause mis-attribution of PR reviews. Worth confirming against webhook author-matching logic. Anchor `new-intern/page.tsx:75,117-121`.

### `app/[locale]/chat/page.tsx`

- **F-CC-B00-022 — Low — "New conversation" performs a full page reload.**
  `chat/page.tsx:44` uses `window.location.reload()` to reset the chat. Loses SPA state and is a blunt UX choice; resetting local message state would suffice. Also note this top-level chat does not pass `lessonId/moduleId`, so it has no lesson grounding (by design). Anchor `chat/page.tsx:44`.

- **F-CC-B00-023 — Low — `Enter`-to-send does not clear input and allows whitespace submits at UI level.**
  `chat/page.tsx:87,92` call `sendMessage(input)` but never reset `input`; the hook guards empty/whitespace (`use-chat-stream.ts:48`) but the stale text remains in the box after send. Minor UX. Anchor `chat/page.tsx:83-95`.

### `app/[locale]/dashboard-content.tsx`

- **F-CC-B00-024 — Medium — Module lock computation runs client-side over the full module list; correctness depends on `isModuleLocked`.**
  `dashboard-content.tsx:293-294` derive locked state via `isModuleLocked(mod.id, allModules)` / `getLockedByModuleTitle`. Progression-gating computed purely on the client means a user can still deep-link to `/module/[slug]` and `/lesson/[id]` regardless of lock (the lock only disables the button, `:116-125`). Verify server-side enforcement prevents progressing/locked-module access (e.g., quiz submit, theory-complete) — otherwise the curriculum gating is advisory only. Cross-file (depends on `lib/module-utils` + routers, out of batch). Anchor `dashboard-content.tsx:293-294`.

- **F-CC-B00-025 — Low — Portfolio project link rendered without validating URL origin.**
  `dashboard-content.tsx:249-256` renders `phase.portfolioProjectUrl` into an `href` with `target="_blank"`/`rel="noopener noreferrer"`. Safe rel is present; however the URL comes from seed/curriculum data — if ever user-influenced it could be `javascript:`-style. Currently curriculum-sourced, so Low. Anchor `dashboard-content.tsx:249-256`.

- **F-CC-B00-026 — Low — Progress percentages recomputed inline in multiple places.**
  `dashboard-content.tsx:266,274` duplicate the `completedLessons/totalLessons` rounding expression; `mod.progress` is used elsewhere (`:289`). Mild inconsistency between server-provided `progress` and locally recomputed phase percentages; ensure both use the same rounding to avoid mismatched displays. Anchor `dashboard-content.tsx:266,274`.

- **F-CC-B00-027 — Info — `getModuleIcon` slug heuristics are order-sensitive.**
  `dashboard-content.tsx:39-58` matches by `slug.includes(...)` in sequence; e.g. a slug containing both "api" and "nextjs" resolves to the first match. Cosmetic only (icon choice). Anchor `dashboard-content.tsx:39-58`.

### `app/[locale]/lesson/[id]/page.tsx`

- **F-CC-B00-028 — Medium — Quiz pass threshold inconsistency (70 vs 80) across the UI.**
  `lesson/[id]/page.tsx:303` invalidates/treats `data.score >= 70` as progress-worthy, and `:371-381` shows a green "Quiz submitted" panel unconditionally regardless of pass/fail. Meanwhile module/admin views badge `>= 80` as "default/good" (`module/[slug]` and `admin/[userId]:187,222`). The authoritative pass threshold must live server-side; confirm `submitQuiz` enforces it and that the UI's 70 vs 80 split is intentional. Curriculum-progression correctness risk. Anchor `lesson/[id]/page.tsx:303,371-381`.

- **F-CC-B00-029 — Medium — Quiz "submitted" UI claims success even on a failing score.**
  `lesson/[id]/page.tsx:373-381` always renders the green success panel after submit, displaying score but no pass/fail affordance, and the form cannot be retried (gated on `submitted`, `:361`). A failing intern sees a green "Quiz submitted!" with no retry path in this component. UX/progression defect. Anchor `lesson/[id]/page.tsx:361,373-382`.

- **F-CC-B00-030 — Low — Dead/no-op `handleComplete` and unused assistant-persistence path.**
  `lesson/[id]/page.tsx:424-429` `handleComplete` is an empty stub ("future enhancement") wired into `useChatStream.onComplete`. Assistant messages are therefore never persisted server-side, while user messages are (`:412-422`). Conversation history will be one-sided on reload (`chatHistory` maps assistant/user, `:404-410`). Functional gap in chat persistence. Anchor `lesson/[id]/page.tsx:424-429`.

- **F-CC-B00-031 — Low — Client-side UUID regex gate on lesson query.**
  `lesson/[id]/page.tsx:26` only enables the query if the id matches a UUID regex; a non-UUID id silently shows "Lesson not found" (`:52`) without calling the server. Acceptable defensive UX, but couples the client to the id format. Anchor `lesson/[id]/page.tsx:24-27`.

- **F-CC-B00-032 — Low — Hardcoded English strings in an i18n app.**
  Several user-facing strings bypass `next-intl`: `lesson/[id]/page.tsx:58` "Back to Dashboard", `:61` "Lesson not found", `:63` description, `:133` "Practice Exercise", `:141-145` workflow step labels/descriptions, `:355` "Explanation:", `:371-379` quiz strings, `:444,465,476` chat strings, `:532-536,573,583` issue-selector strings. Inconsistent localization (most of the file uses `tLesson`). Anchor as listed.

- **F-CC-B00-033 — Low — `expectedOutput` accessed via inline cast suggests schema/type drift.**
  `lesson/[id]/page.tsx:184` reads `(ex as { expectedOutput?: string | null }).expectedOutput`. Casting around the exercise type indicates the tRPC output type may not include `expectedOutput`; prefer fixing the contract type over a cast (AGENTS.md: inferred types from Zod contracts). Anchor `lesson/[id]/page.tsx:184`.

- **F-CC-B00-034 — Low — Workflow step statuses derived only from latest review per repo.**
  `lesson/[id]/page.tsx:119-152` reduces to latest review by `createdAt` and maps review status to a 5-step tracker. The `merge` step is shown as `in_progress` when `approved` (`:145`) — it never reaches a "completed/merged" terminal state from review data alone (merge isn't tracked). Confirm this is intended (merge happens off-platform). Anchor `lesson/[id]/page.tsx:145`.

### `app/[locale]/module/[slug]/page.tsx`

- **F-CC-B00-035 — Low — Quiz average uses `userScore > 0`, silently excluding legitimate zero scores.**
  `module/[slug]/page.tsx:49` filters `l.userScore !== null && l.userScore > 0` for the average. A genuine 0% quiz is excluded from the denominator, inflating the displayed average. Same `score > 0` gating in the lesson badge (`:228`). Confirm intended semantics (treat 0 as "not attempted" vs a real fail). Curriculum-metric correctness. Anchor `module/[slug]/page.tsx:49,228`.

- **F-CC-B00-036 — Low — `PrStatusBadge` config indexed without fallback.**
  `module/[slug]/page.tsx:187` `config[status]` assumes the union is exhaustive; an out-of-union status would throw on `c.className` (`:190`). The TS union protects compile-time only; server data drift would crash render. Anchor `module/[slug]/page.tsx:187-194`.

### `app/[locale]/error.tsx`

- **F-CC-B00-037 — Low — Error boundary copy is hardcoded (not localized).**
  `error.tsx:28-34` renders English-only "Something went wrong" / "Try again". This is a `[locale]`-segment boundary; consider localized copy. Acceptable given error boundaries can't easily use hooks/provider context. Anchor `error.tsx:28-34`.

- **F-CC-B00-038 — Info — Structured error logging present and digest captured.**
  `error.tsx:16-24` logs a structured JSON object including `digest`/`stack`, aligning with AGENTS.md observability. Positive. Note client `console.error` runs in the browser for client errors. Anchor `error.tsx:16-24`.

### `app/[locale]/not-found.tsx`

- **F-CC-B00-039 — Low — Uses bare `next/link` and English-only copy in a localized segment.**
  `not-found.tsx:1,13` import `Link` from `next/link` (not the locale-aware `@/i18n/navigation` used elsewhere) and hardcode English. The `href="/"` may drop the active locale. Minor; not-found localization is often acceptable. Anchor `not-found.tsx:1,13-18`.

### `app/[locale]/layout.tsx`

- **F-CC-B00-040 — Low — `params.locale` not used to set/validate the active locale.**
  `layout.tsx:17-22` ignores the route `[locale]` param and relies on `getLocale()`/`getMessages()` from request context. Works if middleware sets the locale, but the `<html lang>` derives from `getLocale()` rather than the URL segment; confirm they cannot diverge. Anchor `layout.tsx:22,26`.

- **F-CC-B00-041 — Info — Clean server layout, metadata localized via `getTranslations`.**
  `layout.tsx:9-15` produces localized metadata; structure is convention-aligned. Positive.

### `app/[locale]/page.tsx`

- **F-CC-B00-042 — Medium — Dashboard is dynamically imported with `ssr: false`, forcing client-only render of the main page.**
  `page.tsx:12-15` `dynamic(() => import("./dashboard-content"), { ssr: false })`. The primary authenticated landing page renders entirely client-side, hurting first-paint/SEO and meaning all curriculum data loads after hydration. May be intentional (auth-gated), but flag for production-readiness review. Anchor `page.tsx:12-15`.

- **F-CC-B00-043 — Low — Inline login error fallback string not localized.**
  `page.tsx:61` `err.message ... : "Login failed"` hardcodes English fallback while the rest uses `tl(...)`. Anchor `page.tsx:61`.

### `Dockerfile`

- **F-CC-B00-044 — Medium — `deps` stage copies entire `apps/` and `packages/` before install, weakening layer caching.**
  `Dockerfile:16-17` `COPY apps ./apps` + `COPY packages ./packages` before `pnpm install` (`:19`) means any source change busts the dependency-install layer, so every build re-installs. Best practice is to copy only manifests/lockfiles first, install, then copy sources. Build-time/cost concern. Anchor `Dockerfile:13-19`.

- **F-CC-B00-045 — Low — No `.dockerignore` referenced; risk of copying `node_modules`/`.next` into build context.**
  `Dockerfile:16-17` copy whole trees; without a `.dockerignore` (not in this batch) local `node_modules`/`.next` could bloat context or shadow installs. Verify `.dockerignore` exists at repo/app root. Anchor `Dockerfile:16-17`.

- **F-CC-B00-046 — Low — pnpm version pinned in Dockerfile (`8.15.8`) — confirm it matches root `packageManager`.**
  `Dockerfile:9` pins pnpm `8.15.8`. AGENTS.md/CI use the repo lockfile; a drift between this pin and the root `packageManager` field can cause `--frozen-lockfile` failures. Verify alignment. Anchor `Dockerfile:9,19`.

- **F-CC-B00-047 — Info — Good production hardening: non-root user, standalone output, telemetry disabled.**
  `Dockerfile:36-42` creates `nextjs` user and runs as non-root; standalone copy (`:39-40`) and `NEXT_TELEMETRY_DISABLED` (`:5,31`). Positive production-readiness signals. Anchor `Dockerfile:36-46`.

### `.env.example`

- **F-CC-B00-048 — Low — Documents `GITHUB_PRIVATE_KEY` as a flat env var; multiline PEM handling unspecified.**
  `.env.example:28` lists `GITHUB_PRIVATE_KEY=""`. PEM keys are multiline; the example does not indicate the expected encoding (single-line with `\n`, base64, etc.), a common deployment foot-gun for the GitHub App webhook integration. Document the format. Anchor `.env.example:26-30`.

- **F-CC-B00-049 — Info — No real secrets committed; placeholders only, and `.gitignore` excludes `.env*`.**
  `.env.example:19-30` use empty placeholders; `.gitignore:36` ignores `.env*`. Good secret hygiene. Anchor `.env.example` / `.gitignore:36`.

### `.gitignore`

- **F-CC-B00-050 — Low — `docker-compose.yml*` is gitignored (`:46`).**
  `.gitignore:46` ignores all `docker-compose.yml*`. If a canonical compose file is meant to be version-controlled for local DB/dev, this silently excludes it. Confirm intent. Anchor `.gitignore:46`.

- **F-CC-B00-051 — Info — `*.pem` ignored (`:27`) reinforces key hygiene.**
  Positive given the GitHub App private-key usage. Anchor `.gitignore:27`.

### `.browserslistrc`

- **F-CC-B00-052 — Info — Modern-only targets are intentional and documented with a track reference.**
  `.browserslistrc:1-13` drops legacy polyfills deliberately, tied to `codecamp_asset_render_blocking_20260608`. No action; recorded for completeness. The pinned dates/versions may need periodic refresh. Anchor `.browserslistrc:5-13`.

---

## Cross-Cutting Observations

- **Authorization is consistently enforced only in the client** across admin and progression UIs (F-CC-B00-013, F-CC-B00-024, F-CC-B00-020, F-CC-B00-028). The real security boundary is the tRPC routers/domain functions, which are **out of this batch** (cc-batch-02+ per the coverage manifest). These findings are flagged as must-verify against the server layer rather than confirmed vulnerabilities.
- **AI integration (F-CC-B00-001/003/004)** is the highest-impact technical risk in this batch: a probable broken streaming path plus partial adapter bypass. Recommend a runtime smoke test of `/api/chat` streaming before any acceptance.
- **Localization is uneven** in the lesson page and error/not-found boundaries (F-CC-B00-032, -037, -039, -043).

## Limitations

1. **No source edits were made**; this is a read-only review.
2. **Out-of-batch dependencies not reviewed here**: `@reading-advantage/api/routes/auth` (login/logout/reset/session handlers), the `codecamp` tRPC routers and domain functions (`getChatContext`, `submitQuiz`, `createIntern`, `listInterns`, `getInternProgress`, `updateInternGithubUsername`, etc.), `lib/module-utils`, `lib/trpc`, `lib/i18n-format`, `lib/pr-url`, and `@reading-advantage/auth` internals. Server-side authorization, password policy, rate-limit durability, and progression gating cannot be confirmed from this batch alone; findings F-CC-B00-011/013/020/024/028 depend on those files.
3. The streaming-protocol finding (F-CC-B00-001) was corroborated by reading the OpenRouter adapter (`packages/ai/src/providers/openrouter.ts:182-185`) and the client hook (`lib/use-chat-stream.ts`), but **was not validated against a running deployment**; behavior should be confirmed at runtime.
4. No build/test/lint commands were run as part of this line review; test-quality assessment is deferred to batches containing the `__tests__` files (cc-batch-01+).
5. Severity is reviewer judgment based on static reading; impact ratings for client-only gates assume the worst case (missing server checks) pending server-layer review.

## Acceptance / Closeout

This report makes **no acceptance or closeout claims**. It records findings only and defers all gating decisions to the track's review/acceptance phases.
