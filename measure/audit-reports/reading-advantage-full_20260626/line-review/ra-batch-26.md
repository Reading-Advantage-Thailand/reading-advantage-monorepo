# Line Review — ra-batch-26 (Review B: Security & Data Handling)

**Batch:** ra-batch-26
**Track:** reading_advantage_full_review_20260626
**Baseline SHA:** d348666be047b929d02c747120c32d2ea0fc53fc
**Files:** 20 (all React client/server components in `apps/reading-advantage/components/`)
**Diff from baseline:** None — all 20 files are unchanged since baseline.
**Review mode:** Line-by-line static security and data handling review

---

## Scope

| # | File | Category |
|---|------|----------|
| 1 | `components/games/vocabulary/rune-match/StartScreen.tsx` | Game UI |
| 2 | `components/games/vocabulary/wizard-vs-zombie/StartScreen.tsx` | Game UI |
| 3 | `components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.test.tsx` | Test |
| 4 | `components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx` | Game |
| 5 | `components/goals/create-goal-dialog.tsx` | Goals UI |
| 6 | `components/goals/goal-card.tsx` | Goals UI |
| 7 | `components/goals/goal-recommendations.tsx` | Goals UI |
| 8 | `components/goals/goals-page-content.tsx` | Goals UI |
| 9 | `components/googleClassroomButtonLink.tsx` | OAuth Integration |
| 10 | `components/handle-article.tsx` | Article Browser |
| 11 | `components/header.tsx` | Layout |
| 12 | `components/helpers/tailwind-indicator.tsx` | Dev Util |
| 13 | `components/icons.tsx` | Icons |
| 14 | `components/index/benefit-box.tsx` | Marketing |
| 15 | `components/index/book.tsx` | Marketing |
| 16 | `components/index/feature-box.tsx` | Marketing |
| 17 | `components/lesson/lesson-button.tsx` | Lesson Entry |
| 18 | `components/lesson/lesson-card.tsx` | Lesson |
| 19 | `components/lesson/lesson-cloze-test.tsx` | Lesson Exercise |
| 20 | `components/lesson/lesson-collapsible-notice.tsx` | Lesson UI |

---

## Global Patterns Observed

### P1: Widespread Missing CSRF Protection on State-Changing Requests

Six of the 20 components make POST, PATCH, or DELETE requests to backend API endpoints. None of them include a CSRF token header or parameter. Per the AGENTS.md requirement: "CSRF protection where applicable."

**Affected files:** `create-goal-dialog.tsx` (POST), `goal-card.tsx` (PATCH, DELETE), `goal-recommendations.tsx` (POST), `googleClassroomButtonLink.tsx` (GET with side-effects), `lesson-button.tsx` (POST), `lesson-cloze-test.tsx` (POST).

**Finding (F-RA-B26-001, HIGH):** All state-changing API calls from client components omit CSRF tokens. Without a SameSite cookie strategy or token-based CSRF defense, these endpoints are vulnerable to cross-site request forgery. The googleClassroomButtonLink.tsx uses GET for unlink (state-changing), which is additionally vulnerable to simple `<img>` tag CSRF.

### P2: User Identity Leakage in API URL Paths

Multiple components embed the `userId` directly in REST API URL paths rather than sending it in a session-authenticated request body or header.

**Affected files:** `lesson-button.tsx` (line 22), `lesson-cloze-test.tsx` (lines 309, 364, 532).

**Finding (F-RA-B26-002, HIGH):** User IDs appear in browser network logs, server access logs, proxy logs, and potentially browser history when embedded in URL paths. This is a privacy concern (FERPA-relevant for student data) and an information disclosure vector. The backend should identify the user from the session, not from a client-supplied URL parameter.

### P3: Silent Error Handling Without User Feedback

Most `fetch()` failure paths log to `console.error` but provide no user-facing feedback, leaving users unaware that their action (create goal, delete goal, link account) failed.

**Affected files:** `create-goal-dialog.tsx` (line 77), `goal-card.tsx` (lines 72, 90), `googleClassroomButtonLink.tsx` (line 22), `handle-article.tsx` (line 130), `lesson-cloze-test.tsx` (line 565).

**Finding (F-RA-B26-003, MEDIUM):** Silent failure on API calls degrades user trust and data integrity. Users may believe a goal was created/deleted when it was not, leading to inconsistent client/server state.

### P4: Sensitive Data in Console Logs

Several components log full API response payloads and error objects to `console.log`/`console.error`, including sentence content, activity log data with user IDs, and completion metadata.

**Affected files:** `lesson-cloze-test.tsx` (lines 305, 311, 314, 368, 374 — five `console.log` calls with API data), `googleClassroomButtonLink.tsx` (line 22 — logs error response data).

**Finding (F-RA-B26-004, MEDIUM):** Production console logging of API responses exposes user activity data, sentence content, and user IDs. These logs are visible in browser devtools and could be captured by error monitoring services. This violates the AGENTS.md observability guidance: "Use structured logs. Avoid free-form console logging in production code."

### P5: OAuth Redirect URL Trusted Without Client-Side Validation

The Google Classroom linking flow blindly redirects the browser to a URL returned by the API.

**Affected file:** `googleClassroomButtonLink.tsx` (line 26).

**Finding (F-RA-B26-005, MEDIUM):** `window.location.href = data.authUrl` redirects to a URL provided in the API response without any origin validation. If the API response is tampered with (compromised server, MITM on HTTP, DNS spoofing), the user can be redirected to a phishing page or malicious URL that mimics Google's OAuth consent screen. The client should at minimum verify the URL is on a known Google domain before redirecting.

### P6: Business Logic in UI Components — No Backend Module Orchestration

All 10 interactive components in this batch (`create-goal-dialog`, `goal-card`, `goal-recommendations`, `goals-page-content`, `googleClassroomButtonLink`, `handle-article`, `lesson-button`, `lesson-cloze-test`, `WizardZombieGame`, rune-match `StartScreen`) implement business logic directly inside React components via inline `fetch()` calls. There is no evidence of imported backend modules from `@reading-advantage/domain` or `@reading-advantage/backend`.

**Finding (F-RA-B26-006, HIGH):** Per AGENTS.md: "Business logic must not live in React components." Goals CRUD, activity logging, game ranking fetches, and Google Classroom OAuth orchestration are all implemented as ad-hoc `fetch()` calls in client components. This means:
- No shared input validation (Zod schemas)
- No centralized authorization checks
- No reusable error handling
- No typed contracts between frontend and backend
- Migration to `@reading-advantage/domain` requires rewriting every component rather than swapping a function call.

### P7: Large Block of Commented-Out Code in Production Component

**Affected file:** `handle-article.tsx` contains ~40 lines of commented-out code (functions `fecthData` v1, `loadMoreData`, old IntersectionObserver effect, old search form, Reset button).

**Finding (F-RA-B26-007, LOW):** Commented-out code is dead weight in production bundles and creates confusion about which code path is active. The old `fecthData` implementation at lines 81-91 differs from the active one at lines 117-133 (different URL construction), creating maintenance risk if someone uncomments the wrong version.

---

## File-by-File Review

### 1. `components/games/vocabulary/rune-match/StartScreen.tsx` (385 lines)

**Security posture:** Low risk. Game start screen with ranking display.

- **Line 60–61:** `fetch(`/api/v1/games/rune-match/ranking?difficulty=${selectedMonster}`)` — `selectedMonster` is typed `MonsterType` from a config module; query parameter is safe.
- **Lines 280–312:** Ranking entries rendered from API response. `entry.image` (line 299–305) is rendered as `<img src={entry.image}>`. If the backend returns a malicious URL (javascript:, data:), this could be an XSS vector. However, React does not execute javascript: URLs in `<img>` tags. Low risk.
- **Lines 306–307:** `{entry.name}` — React auto-escapes text content, preventing XSS via text injection. No explicit sanitization needed for React text nodes.

**Verdict:** No security issues specific to this file beyond P1/P2 patterns.

---

### 2. `components/games/vocabulary/wizard-vs-zombie/StartScreen.tsx` (416 lines)

**Security posture:** Low risk. Same pattern as rune-match StartScreen.

- **Line 93–94:** `fetch(`/api/v1/games/wizard-vs-zombie/ranking?difficulty=${difficulty}`)` — `difficulty` is typed `Difficulty`, safe.
- **Lines 329–333:** Same `entry.image` rendering concern as file #1.
- **Lines 59–87:** `DIFFICULTY_CONFIG` built from i18n translations — safe.

**Verdict:** No unique security issues. Shares P1 pattern (inline fetch for state).

---

### 3. `components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.test.tsx` (126 lines)

**Security posture:** Not applicable. Test file with mocked Konva, useSound, and ResizeObserver. No production code.

**Verdict:** No security concerns.

---

### 4. `components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx` (817 lines)

**Security posture:** Low risk. Client-side canvas game.

- **Lines 123–156:** Asset loading via `new Image()` with `withBasePath()`. Base path helper prevents path traversal. Safe.
- **Line 149:** `console.error("Failed to load assets", e)` — error object logged. Low concern since this is asset loading, not user data.
- **Lines 203, 218, 233:** `Math.random().toString()` for floating text IDs. Not cryptographically random but acceptable for UI-only keys. No security impact.
- **Lines 559–574:** `onComplete(results)` — game results include `xp`, `accuracy`, `correctAnswers`, `totalAttempts`. These are game metrics, not PII. The parent component is responsible for persisting them.

**Verdict:** No security issues. Game logic is client-side only.

---

### 5. `components/goals/create-goal-dialog.tsx` (235 lines)

**Security posture:** MEDIUM risk. Creates learning goals via unauthenticated-appearing POST.

- **Line 35:** `userId` prop accepted but never sent to the API. This is correct if the backend determines the user from the session, but it creates a false dependency — the prop could be removed to avoid confusion. If the API is *not* session-authenticated and relies on a different mechanism, the `userId` being absent from the POST body is a gap.
- **Lines 54–61:** POST to `/api/v1/goals` with JSON body. **No CSRF token.** F-RA-B26-001.
- **Lines 48–61:** `handleSubmit` — `formData.targetValue` is `parseFloat()`'d (line 59) and `formData.targetDate` is converted to `new Date()` (line 60). Both conversions are client-side; the server must validate independently.
- **Line 77:** `console.error("Error creating goal:", error)` — silent failure. F-RA-B26-003.
- **Lines 167–175:** The `targetValue` input is `type="number"` but value is stored as string in `formData.targetValue`. Only converted on submit. Fine for this pattern.

**Verdict:** F-RA-B26-001 (CSRF), F-RA-B26-003 (silent error), F-RA-B26-006 (business logic in component).

---

### 6. `components/goals/goal-card.tsx` (217 lines)

**Security posture:** MEDIUM risk. Modifies and deletes goals.

- **Lines 62–65:** PATCH to `/api/v1/goals/${goal.id}` with `{ status: newStatus }`. **No CSRF token.** F-RA-B26-001.
- **Lines 83–85:** DELETE to `/api/v1/goals/${goal.id}`. **No CSRF token.** F-RA-B26-001.
- **Line 79:** `confirm("Are you sure...")` — client-only confirmation, easily bypassed. The server must enforce authorization.
- **Lines 66–68:** `if (res.ok) { onUpdate(); }` — no error feedback if response is not ok. F-RA-B26-003.
- **Line 62:** `goal.id` interpolated into URL. If `goal.id` from the API contains path traversal characters, this could hit unintended endpoints. Since it comes from the app's own API, this is low risk but worth noting.
- **Lines 97–108:** Priority/status color functions use hardcoded class strings — no injection risk.

**Verdict:** F-RA-B26-001 (CSRF ×2), F-RA-B26-003, F-RA-B26-006.

---

### 7. `components/goals/goal-recommendations.tsx` (125 lines)

**Security posture:** LOW–MEDIUM risk. Creates goals from AI recommendations.

- **Line 35:** `fetch("/api/v1/goals/recommendations")` — `userId` prop is not used; relies on session-based auth. Consistent with pattern.
- **Lines 55–66:** POST to `/api/v1/goals` with JSON body constructed from recommendation object. **No CSRF token.** F-RA-B26-001.
- **Lines 109:** `💡 {rec.reason}` — recommendation text rendered directly in JSX. If the recommendations API returns unsanitized AI output containing HTML/script tags, React's text escaping prevents XSS. Low risk.
- **Lines 77–78:** Component returns `null` when loading or no recommendations — hides itself from DOM entirely. Appropriate.

**Verdict:** F-RA-B26-001, F-RA-B26-006.

---

### 8. `components/goals/goals-page-content.tsx` (206 lines)

**Security posture:** LOW risk. Orchestration component for goals page.

- **Lines 46–47:** `Promise.all([fetch("/api/v1/goals?includeProgress=true"), fetch("/api/v1/goals/summary")])` — reads-only, no mutation. No CSRF concern.
- **Line 35:** Accepts `userId` prop, passes to child `GoalRecommendations` and `CreateGoalDialog`, but neither child sends it in API calls. The prop is effectively unused for API purposes — it only serves as a React key or prop-passing placeholder. This creates a misleading interface.
- **Line 52:** `setGoals(goalsData.goals || [])` — trusts API response structure. If the API returns unexpected shape, this could throw.

**Verdict:** No unique security issues. F-RA-B26-006 (no backend module orchestration).

---

### 9. `components/googleClassroomButtonLink.tsx` (70 lines)

**Security posture:** HIGH risk. OAuth integration with redirect.

- **Line 15:** `fetch("/api/v1/classroom/oauth2/link", { method: "GET", cache: "no-store" })` — GET with side effect (initiates OAuth flow). This is an anti-pattern: GET should be idempotent. If this endpoint creates state, it should be a POST.
- **Line 26:** `window.location.href = data.authUrl;` — **Critical:** redirects to an API-supplied URL without validation. F-RA-B26-005. The `authUrl` should be verified to be on `https://accounts.google.com/` (or the appropriate Google OAuth domain) before redirecting.
- **Lines 21–24:** Error handling logs API response data to console. F-RA-B26-004.
- **Lines 32–34:** `fetch("/api/v1/classroom/oauth2/unlink", { method: "GET" })` — GET with side effect (unlinks account). **No CSRF token.** This could be triggered by a simple `<img>` tag or `fetch()` from any origin. F-RA-B26-001.
- **Lines 28–29:** Commented-out dead code. F-RA-B26-007.

**Verdict:** F-RA-B26-001 (unlink via GET), F-RA-B26-005 (unvalidated redirect), F-RA-B26-004, F-RA-B26-007.

---

### 10. `components/handle-article.tsx` (408 lines)

**Security posture:** LOW risk. Article browser with filtering.

- **Lines 117–126:** `fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/passage?...`)` — `NEXT_PUBLIC_BASE_URL` is a public env var, safe for client-side use. `params.toString()` constructs URL search params from `nuqs` query state, which originates from the URL bar. No injection risk — URLSearchParams escapes values.
- **Lines 142–156:** `lastArticleRef` with IntersectionObserver for infinite scroll. Observer is disconnected and reconnected as dependency changes. The `[loading]` dependency means the observer re-creates on every loading toggle, which is wasteful but not a security issue.
- **Lines 389–398:** Articles rendered with `ArticleShowcaseCard`. The `article` object from the API is passed as prop. The child component's rendering determines XSS surface.
- **Line 130:** `console.error(error)` — logs raw error. F-RA-B26-004.
- **Lines 81–111, 158–185, 189–204, 382–384:** Large commented-out code blocks. F-RA-B26-007.

**Verdict:** F-RA-B26-004, F-RA-B26-007.

---

### 11. `components/header.tsx` (23 lines)

**Security posture:** Not applicable. Pure presentational component. No API calls, no user data handling, no external inputs beyond props.

**Verdict:** No security concerns.

---

### 12. `components/helpers/tailwind-indicator.tsx` (16 lines)

**Security posture:** Not applicable. Dev-only breakpoint indicator.

- **Line 2:** `process.env.NODE_ENV === "production"` — correctly gates visibility to non-production. No information leakage concern (breakpoint size is not sensitive).

**Verdict:** No security concerns.

---

### 13. `components/icons.tsx` (312 lines)

**Security posture:** Not applicable. Icon component definitions. Inline SVGs only — no external resource loads, no user data.

**Verdict:** No security concerns.

---

### 14. `components/index/benefit-box.tsx` (21 lines)

**Security posture:** Not applicable. Static marketing component.

**Verdict:** No security concerns.

---

### 15. `components/index/book.tsx` (74 lines)

**Security posture:** LOW risk. Static book display with link.

- **Line 5:** `import { title } from "process";` — **Bug:** imports Node.js `process.title` which shadows the `title` prop. The imported `title` is never used in the template (the destructured prop is), so this has no runtime effect, but it's a latent bug. Not a security issue.
- **Line 29:** `<img src={book1.src}>` — `book1` is a statically imported image, safe.
- **Line 66:** `<Link href={`/student/read/${id}`}>` — `id` comes from props, likely from an API response. If `id` contains `../` sequences, this could link to unintended pages (client-side navigation only, not server-side path traversal). Low risk.

**Verdict:** Bug at line 5 (not security). Link path uses ID from props — low risk.

---

### 16. `components/index/feature-box.tsx` (25 lines)

**Security posture:** Not applicable. Marketing component.

- **Lines 2, 4, 5:** Unused imports (`Image`, `Icons`, `Bot`). Not a security issue.

**Verdict:** No security concerns.

---

### 17. `components/lesson/lesson-button.tsx` (44 lines)

**Security posture:** MEDIUM risk. Activity logging with user ID in URL.

- **Line 22:** `fetch(`/api/v1/users/${userId}/activitylog`, ...)` — `userId` in URL path. F-RA-B26-002.
- **Lines 23–37:** POST body includes `articleId`, `activityType`, `activityStatus`, and article details (`title`, `ra_level`, `cefr_level`, `type`, `genre`, `subgenre`). These are all from the `article` prop. The server must validate this data — the client should not determine what activity type or status to record.
- **Lines 21–38:** This `onClick` handler on a `<Link>` component fires a fire-and-forget `fetch()`; the navigation proceeds regardless of whether the fetch succeeds. F-RA-B26-003.

**Verdict:** F-RA-B26-002, F-RA-B26-003, F-RA-B26-006.

---

### 18. `components/lesson/lesson-card.tsx` (92 lines)

**Security posture:** LOW risk. Server component that renders lesson UI.

- `async` server component using `getScopedI18n` — no client-side data fetching.
- Passes `userId`, `articleId`, `classroomId` as props to `LessonProgressBar` child. The child's security is determined by the child implementation.
- No direct API calls in this component.

**Verdict:** No security concerns in this file. Depends on `LessonProgressBar` for its security properties.

---

### 19. `components/lesson/lesson-cloze-test.tsx` (1283 lines)

**Security posture:** MEDIUM risk. Complex cloze test exercise with user scoring.

- **Line 309:** `fetch(`/api/v1/users/sentences/${userId}/?articleId=${articleId}`)` — `userId` in URL path. F-RA-B26-002.
- **Line 364:** `fetch(`/api/v1/users/${userId}/activitylog?articleId=${articleId}&activityType=sentence_cloze_test`)` — `userId` in URL path. F-RA-B26-002.
- **Line 532:** `fetch(`/api/v1/users/${userId}/activitylog`, { method: "POST", ... })` — POST with `userId` in URL AND JSON body containing score/xp/article details. F-RA-B26-002 and F-RA-B26-001.
- **Lines 305, 311, 314, 368, 374:** Five `console.log` calls with API response data including sentence content and activity logs. F-RA-B26-004.
- **Lines 317–338:** Client-side data transformation of API sentence data before generating blanks. No validation that `data.sentences` exists or that sentence text is safe. `sentenceData.sentence.split(" ")` would throw on null/undefined.
- **Lines 532–548:** POST body includes `xpEarned: UserXpEarned.Sentence_Cloze_Test` — a client-side constant. If the server trusts this value, users could manipulate XP earnings. The server must independently determine XP based on actual performance.
- **Lines 150–278:** `generateBlanksForSentence` — client-side blank generation with `Math.random()` for word selection. The randomness ensures different blanks each time but is not a security concern. Generated blanks include `hint` text with position data.
- **Line 555:** `toast({ imgSrc: true, ... })` — opaque flag; if this triggers an image render, confirm the source is internal.
- **Line 565:** `console.error("Error saving game results:", error)` — silent failure with console-only logging.

**Verdict:** F-RA-B26-001, F-RA-B26-002 (×3), F-RA-B26-003, F-RA-B26-004, F-RA-B26-006. Also: XP value from client constant is a data integrity concern.

---

### 20. `components/lesson/lesson-collapsible-notice.tsx` (40 lines)

**Security posture:** Not applicable. Pure UI component for expandable notice.

- Uses `useScopedI18n` for all displayed text — no raw user input or API data.
- `contentRef` and `scrollHeight` for animation — no security concern.

**Verdict:** No security concerns.

---

## Anti-Pattern Audit

### A2 — Consent-Blind Publish Gate

Not applicable to this batch. None of these 20 files handle publishing content, draft-to-published transitions, or named-subject artifacts. The files are game UIs, goal management, article browsing, lesson components, and marketing components. No consent/anonymization gap detected.

### A6 — Registry-Note Overstatement

Reviewed `measure/tracks.md` entry for `reading_advantage_full_review_20260626` (line 30) against `plan.md` Phase 7 (line 55). The plan claims `phase-acceptance-result.json` written with status `pass`. The listed artifacts (`00-inventory.md`, `workflow-map.md`, `checklist.md`, `findings.md`, `migration-tracks.md`, `test-gaps.md`, `executive-summary.md`) all exist in the review report directory. The checkpoint A1/A3/A4/A5/A6/A7/A8/A11 passed claim is consistent with the phase acceptance result. No overstatement detected.

### A3/A4/A5/A7/A8/A11

Not applicable. This batch contains no test files with "count" assertions (A3), no "markers consistent" checks (A4), no "PASS=N FAIL=0" claims in plan text for this batch (A5), no over-broad exclusion filters (A7), no `[ ]` markers (A8), and no fully-blocked review tracks (A11 — the plan has all tasks marked `[x]`).

---

## Summary of Findings

| ID | Severity | File(s) | Description |
|----|----------|---------|-------------|
| F-RA-B26-001 | **HIGH** | create-goal-dialog, goal-card, goal-recommendations, googleClassroomButtonLink, lesson-cloze-test | Missing CSRF protection on state-changing API calls; unlink via GET enables trivial CSRF |
| F-RA-B26-002 | **HIGH** | lesson-button, lesson-cloze-test | User ID exposed in API URL paths — privacy leakage and information disclosure |
| F-RA-B26-003 | **MEDIUM** | create-goal-dialog, goal-card, googleClassroomButtonLink, handle-article, lesson-button, lesson-cloze-test | Silent error handling — users receive no feedback on failed mutations |
| F-RA-B26-004 | **MEDIUM** | lesson-cloze-test, googleClassroomButtonLink, handle-article | Sensitive data logged to console (sentence content, activity logs, user IDs) |
| F-RA-B26-005 | **MEDIUM** | googleClassroomButtonLink | Unvalidated OAuth redirect — `window.location.href = data.authUrl` trusts API response blindly |
| F-RA-B26-006 | **HIGH** | create-goal-dialog, goal-card, goal-recommendations, goals-page-content, googleClassroomButtonLink, lesson-button, lesson-cloze-test | Business logic lives in React components instead of backend modules (AGENTS.md violation) |
| F-RA-B26-007 | **LOW** | handle-article, googleClassroomButtonLink | Large blocks of commented-out dead code in production components |

**Counts:** HIGH: 3 | MEDIUM: 3 | LOW: 1 | **Total: 7**

---

## Key Themes

1. **Missing defense-in-depth:** CSRF tokens, input validation, and error feedback are all absent from the client-server boundary. The security model appears to rely entirely on server-side enforcement without client-side cooperation.
2. **Privacy leak via URL paths:** User IDs in fetch URLs expose identity in logs, history, and network traces — relevant for FERPA compliance in an educational platform.
3. **AGENTS.md architecture non-compliance:** Every interactive component in this batch bypasses the backend-module pattern, implementing domain operations directly in React with inline `fetch()`.
4. **OAuth security gap:** The Google Classroom linking flow is vulnerable to redirect manipulation due to missing client-side URL validation.
