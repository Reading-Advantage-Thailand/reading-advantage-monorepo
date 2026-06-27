# Line Review Evidence: primary-advantage-027

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-027
Files assigned: 8
Lines assigned: 1129

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/articles/questions/sa-question-card.tsx` | 1-105 | reviewed | 1 |
| `apps/primary-advantage/components/articles/questions/sa-question-content.tsx` | 1-212 | reviewed | 3 |
| `apps/primary-advantage/components/articles/sentence.tsx` | 1-169 | reviewed | 1 |
| `apps/primary-advantage/components/articles/word-list.tsx` | 1-189 | reviewed | 2 |
| `apps/primary-advantage/components/audio-button.tsx` | 1-84 | reviewed | 1 |
| `apps/primary-advantage/components/auth/email-forgot-password-template.tsx` | 1-13 | reviewed | 1 |
| `apps/primary-advantage/components/auth/student-signin-form.tsx` | 1-202 | reviewed | 4 |
| `apps/primary-advantage/components/auth/teacher-signin-form.tsx` | 1-155 | reviewed | 4 |

## Findings

### LR-primary-advantage-027-001 — SA question card fetches data server-side with no authorization check

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/questions/sa-question-card.tsx:21-24`
- Evidence: The server component calls `getQuestionsByArticleId(articleId, ActivityType.SA_QUESTION)` with the `articleId` prop passed directly from the parent. No `currentUser()` check, role verification, or ownership validation is performed. Any user who navigates to the article page can fetch quiz data.
- Impact: Unauthorized access to quiz content; data leakage across tenants if `articleId` is guessable.
- Recommendation: Add `currentUser()` call and verify the user has access to the article (e.g., enrolled in a class that assigned it, or the article is public).

### LR-primary-advantage-027-002 — Undefined `session` variable in `handleFinishQuiz` will throw ReferenceError

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/questions/sa-question-content.tsx:114-118`
- Evidence: `update({ user: { ...session?.user } })` references `session` which is never declared in the component scope. Line 62 destructures only `user` from `useSession()`, not `session`. This will throw a `ReferenceError` at runtime when the user completes a short-answer quiz.
- Impact: Quiz completion flow crashes for every short-answer question; users cannot finish SA quizzes.
- Recommendation: Replace `session?.user` with the `user` variable from line 62, or destructure `session` from `useSession()`.

### LR-primary-advantage-027-003 — Typo `isPanding` instead of `isPending`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/questions/sa-question-content.tsx:58,161,165`
- Evidence: `const [isPanding, startTransition] = useTransition()` and references at lines 161 and 165 use `isPanding` instead of the conventional `isPending`. This is a variable naming typo; the code functions but is inconsistent with React conventions.
- Impact: Readability and maintainability; contributors may confuse `isPanding` with a typo for `isPending`.
- Recommendation: Rename `isPanding` to `isPending`.

### LR-primary-advantage-027-004 — Hardcoded `preferredLanguage: "en"` ignores multilingual context

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/articles/questions/sa-question-content.tsx:87`
- Evidence: The `getFeedback` call passes `preferredLanguage: "en"` as a hardcoded string. The app supports five locales (en, th, cn, tw, vi) via `next-intl`. Primary students using Thai, Chinese, or Vietnamese will receive AI feedback generated in English, which defeats the purpose of localized education.
- Impact: Non-English-speaking primary students get feedback in the wrong language, reducing learning effectiveness.
- Recommendation: Pass the current locale from `useLocale()` or the session as `preferredLanguage`.

### LR-primary-advantage-027-005 — Hardcoded Thai translation in sentence component ignores user locale

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/articles/sentence.tsx:136-137`
- Evidence: `{list.translation.th}` always renders the Thai translation regardless of the user's selected locale. The `Sentence` interface defines translations for th, cn, tw, and vi (lines 21-26), but only `.th` is used. Primary students using Chinese, Vietnamese, or English will see Thai text.
- Impact: Non-Thai-speaking primary students receive translations in the wrong language.
- Recommendation: Use `useLocale()` to select the appropriate translation key (`th`, `cn`, `tw`, `vi`, or fall back to a default).

### LR-primary-advantage-027-006 — Leftover `console.log(words)` in word-list component

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/word-list.tsx:57`
- Evidence: `console.log(words)` is a debug statement left in production client-side code. This dumps the entire word list to the browser console on every render.
- Impact: Debug noise in production; potential information disclosure of vocabulary data in client console.
- Recommendation: Remove the `console.log(words)` statement.

### LR-primary-advantage-027-007 — Unused `loading` state variable in word-list and sentence components

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/word-list.tsx:51`
- Evidence: `const [loading, setLoading] = useState<boolean>(false)` is declared and never set to `true`. The loading skeleton UI at line 108 (`{loading && words ? ...}`) will never render. Identical issue exists in `sentence.tsx:40`.
- Impact: Dead code; loading skeleton is unreachable. Misleads future developers into thinking loading state is managed.
- Recommendation: Either implement the loading state management or remove the unused variable and skeleton code path.

### LR-primary-advantage-027-008 — AudioButton polling interval at 5ms is excessively aggressive

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/audio-button.tsx:54`
- Evidence: `setInterval(() => { ... }, 5)` polls the audio element's `currentTime` every 5 milliseconds (200 checks/second). This is orders of magnitude more frequent than needed for playback position tracking.
- Impact: Unnecessary CPU usage; can cause battery drain on mobile devices (primary student tablets/phones); potential jank during audio playback.
- Recommendation: Increase interval to 250-500ms, which is sufficient for detecting playback position changes and still provides responsive stop behavior.

### LR-primary-advantage-027-009 — Email forgot-password template is a non-functional placeholder

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/auth/email-forgot-password-template.tsx:7-12`
- Evidence: The template renders only `<h1>Welcome, {firstName}!</h1>`. This is not a password reset email; it is a generic welcome template. The forgot-password flow references this template but it does not contain reset instructions, a reset link, or any actionable content.
- Impact: Users requesting a password reset receive an unhelpful "Welcome" email instead of reset instructions.
- Recommendation: Replace with an actual password reset email template containing a reset link and instructions, or remove the dead template if the reset flow uses a different mechanism.

### LR-primary-advantage-027-010 — Student sign-in form bypasses auth adapter with direct fetch to `/api/auth/login`

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/auth/student-signin-form.tsx:95-104`
- Evidence: `handleLogin()` calls `fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username: selectedStudentId, password: code }) })` directly. The teacher sign-in form (batch peer `teacher-signin-form.tsx:36,51`) uses `useAuth()` from `@reading-advantage/auth-client` with `login(email, password)`. This violates the adapter pattern: application code must call `auth.login()` not provider SDKs or direct HTTP.
- Impact: Inconsistent auth flows between student and teacher; student login bypasses any adapter-level audit logging, CSRF protection, or session management that the auth adapter provides.
- Recommendation: Migrate student sign-in to use the `useAuth()` adapter pattern, or document why the direct API call is intentional and ensure the `/api/auth/login` route applies equivalent protections.

### LR-primary-advantage-027-011 — Classroom code sent as plaintext password in student login request

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/auth/student-signin-form.tsx:100-103`
- Evidence: The login body sends `{ username: selectedStudentId, password: code }` where `code` is the classroom enrollment code (not a real password). The classroom code is a short, shareable string (typically 4-8 characters). Using it as a "password" means the credential is weak, shareable by design, and transmitted in plaintext over the wire.
- Impact: Classroom codes can be intercepted, shared, or brute-forced; students authenticate with a shared secret rather than individual credentials.
- Recommendation: Use a proper authentication mechanism for primary students (e.g., magic link, PIN, or session-based classroom enrollment) rather than reusing classroom codes as passwords.

### LR-primary-advantage-027-012 — Teacher sign-in form has hardcoded English strings bypassing i18n

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/auth/teacher-signin-form.tsx:68-71,78,97-106,125-126,129,143,147-148`
- Evidence: Multiple UI strings are hardcoded in English: "Welcome to Primary Advantage" (line 68), "Enter your email below to login to your account" (line 70), "Email" (line 78), "Password" (line 98), "Forgot your password?" (line 104), "Signing in..." / "Login" (line 125), "Or continue with" (line 129), "Login with Google" (line 143), "Don't have an account?" / "Sign up" (lines 147-148). The student sign-in form correctly uses `useTranslations("AuthPage.signin")` for all strings.
- Impact: Thai, Chinese, Vietnamese, and other non-English speaking teachers see English-only auth UI.
- Recommendation: Replace all hardcoded strings with `useTranslations()` calls matching the student form pattern.

### LR-primary-advantage-027-013 — Teacher sign-in exposes OAuth URL with API host on client side

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/auth/teacher-signin-form.tsx:139`
- Evidence: `window.location.href = \`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/google\`` exposes the API server hostname in the client bundle. The fallback `http://localhost:3001` suggests a development default that may leak into production if the env var is unset.
- Impact: Infrastructure details exposed; if `NEXT_PUBLIC_API_URL` is unset in production, users are redirected to localhost.
- Recommendation: Ensure `NEXT_PUBLIC_API_URL` is always set in production, or use a relative path / Next.js route handler to proxy the OAuth redirect.

## No-Finding Notes

- `apps/primary-advantage/components/articles/questions/sa-question-card.tsx`: reviewed line-by-line; one finding (LR-primary-advantage-027-001). Server component with clean conditional rendering logic; standard shadcn/ui card pattern.
- `apps/primary-advantage/components/articles/questions/sa-question-content.tsx`: reviewed line-by-line; three findings (LR-primary-advantage-027-002 through 004). Client component with Zod validation, react-hook-form, and transition handling; structure is sound but has undefined variable, typo, and locale issues.
- `apps/primary-advantage/components/articles/sentence.tsx`: reviewed line-by-line; one finding (LR-primary-advantage-027-005). Well-structured dialog component with audio integration; only issue is hardcoded Thai locale.
- `apps/primary-advantage/components/articles/word-list.tsx`: reviewed line-by-line; two findings (LR-primary-advantage-027-006, 007). Parallel structure to sentence.tsx; debug log and dead loading state.
- `apps/primary-advantage/components/audio-button.tsx`: reviewed line-by-line; one finding (LR-primary-advantage-027-008). Clean audio playback component with interval-based position tracking; only issue is polling frequency.
- `apps/primary-advantage/components/auth/email-forgot-password-template.tsx`: reviewed line-by-line; one finding (LR-primary-advantage-027-009). Minimal 13-line placeholder template with no functional password reset content.
- `apps/primary-advantage/components/auth/student-signin-form.tsx`: reviewed line-by-line; four findings (LR-primary-advantage-027-010, 011). Well-structured two-step form (code entry → student selection) with Zod validation, but bypasses auth adapter and uses classroom code as password.
- `apps/primary-advantage/components/auth/teacher-signin-form.tsx`: reviewed line-by-line; four findings (LR-primary-advantage-027-012, 013). Standard email/password form with Google OAuth, uses auth adapter correctly, but has hardcoded English strings and exposed API URL.
