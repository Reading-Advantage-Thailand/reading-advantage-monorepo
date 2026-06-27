# Line-by-Line Review Report: ra-batch-02

> **Track:** `reading_advantage_full_review_20260626`
> **Batch:** `ra-batch-02`
> **Reviewed:** 2026-06-27
> **Baseline SHA:** `6921fda0ee45012232bdd71c444d4e9523a10ab6`
> **Files inspected:** 20

---

## Coverage

| # | File | Lines | Status |
|---|------|-------|--------|
| 1 | `(index)/authors/page.tsx` | 12 | Reviewed |
| 2 | `(index)/contact/page.tsx` | 15 | Reviewed |
| 3 | `(index)/layout.tsx` | 88 | Reviewed |
| 4 | `(index)/page.tsx` | 83 | Reviewed |
| 5 | `(index)/privacy-policy/page.tsx` | 162 | Reviewed |
| 6 | `(index)/terms/page.tsx` | 113 | Reviewed |
| 7 | `(student)/level/layout.tsx` | 15 | Reviewed |
| 8 | `(student)/level/page.tsx` | 39 | Reviewed |
| 9 | `(student)/settings/layout.tsx` | 14 | Reviewed |
| 10 | `(student)/settings/user-profile/page.tsx` | 128 | Reviewed |
| 11 | `(student)/student/assignments/page.tsx` | 17 | Reviewed |
| 12 | `(student)/student/dashboard/page.tsx` | 54 | Reviewed |
| 13 | `(student)/student/games/page.tsx` | 483 | Reviewed |
| 14 | `(student)/student/games/sentence/castle-defense/page.tsx` | 274 | Reviewed |
| 15 | `(student)/student/games/sentence/potion-rush/page.tsx` | 379 | Reviewed |
| 16 | `(student)/student/games/vocabulary/dragon-flight/page.test.tsx` | 79 | Reviewed |
| 17 | `(student)/student/games/vocabulary/dragon-flight/page.tsx` | 162 | Reviewed |
| 18 | `(student)/student/games/vocabulary/dragon-rider/page.test.tsx` | 95 | Reviewed |
| 19 | `(student)/student/games/vocabulary/dragon-rider/page.tsx` | 119 | Reviewed |
| 20 | `(student)/student/games/vocabulary/enchanted-library/page.test.tsx` | 96 | Reviewed |

**Total lines reviewed:** ~2,493

---

## Architecture Context

- **Route groups:** `(index)` for public landing pages; `(student)` for authenticated student routes.
- **Middleware:** `apps/reading-advantage/middleware.ts` is the primary auth gate. It lists explicit public pages (`/`, `/about`, `/contact`, `/authors`, `/privacy-policy`, `/terms`, `/auth/*`). All non-public routes require a valid `session_token` cookie. Authenticated users are role-gated (STUDENT → `/student/*`, TEACHER → `/teacher/*`, ADMIN → `/admin/*`).
- **Layout pattern:** `(student)` sub-layouts use `AppLayout` from `@/components/shared/app-layout` which wraps content with nav/sidebar.
- **Session:** `getCurrentUser()` from `@/lib/session` is used in server components to access the authenticated user object. Returns `null` if no session.
- **API pattern:** Game pages use client-side `fetch()` to `/api/v1/games/*` endpoints for vocabulary/sentences, completion submission, and rankings. No client-side Zod validation on responses.

---

## Findings

### F-UX-021 (High) — assignments/page.tsx: No redirect for unauthenticated users

**File:** `(student)/student/assignments/page.tsx`, lines 8-10
**Observation:** When `!user?.id`, the page renders a plain-text div `"Please log in to view assignments."` instead of redirecting to `/auth/signin`. This is inconsistent with every other `(student)` page:
- `level/page.tsx` line 14: `return redirect("/auth/signin")`
- `dashboard/page.tsx` line 14: `return redirect("/auth/signin")`
- `settings/user-profile/page.tsx` line 22: `return redirect("/auth/signin")`

**Risk:** Low (middleware should block unauthenticated users from reaching this route), but if middleware fails or is bypassed, the user sees a raw text message rather than a redirect. This is a UX inconsistency.

**Recommendation:** Replace the inline text with `redirect("/auth/signin")` to match the pattern of sibling pages.

---

### F-UX-022 (Medium) — (index)/layout.tsx: Dead ProgressBar import and commented-out usage

**File:** `(index)/layout.tsx`, lines 8, 76
**Observation:** `ProgressBar` is imported at line 8 but only used in a commented-out line at 76: `{/* <ProgressBar progress={user.xp} level={user.level!} /> */}`. The import is unused dead code.

**Risk:** Low (no runtime impact, but lint warning and confusing for future maintainers).

**Recommendation:** Remove the import and the comment, or restore the ProgressBar if it was intentionally disabled.

---

### F-UX-023 (Medium) — Hardcoded strings across pages break i18n consistency

**Files and lines:**
- `contact/page.tsx` line 10: `"Daniel Bo: admin@reading-advantage.com."` — hardcoded
- `privacy-policy/page.tsx`: All 162 lines — English-only, no i18n
- `terms/page.tsx`: All 113 lines — English-only, no i18n
- `level/page.tsx` line 8: `title: "Level grading"` — static English metadata
- `castle-defense/page.tsx` lines 114, 134, 151-152, 159-164, 168-174, 197-201, 215-222, 235-236, 243, 259: Hardcoded Thai strings (`"กำลังโหลด"`, `"กลับไปหน้าเกม"`, etc.)
- `enchanted-library/page.tsx` line 147: `"กำลังโหลดคำศัพท์"` — hardcoded Thai
- `dragon-rider/page.tsx` line 78: `"Loading Dragon Rider..."` — hardcoded English
- `enchanted-library/page.test.tsx` line 77: `"Back to Games"` — hardcoded in link assertion

**Observation:** The app uses `getScopedI18n` / `useScopedI18n` for many UI strings but these pages mix hardcoded strings with i18n. The `castle-defense/page.tsx` is the worst offender with ~15 hardcoded Thai strings. The `potion-rush/page.tsx` partially uses i18n for warning messages but hardcodes other strings.

**Risk:** Medium (any locale change leaves these strings untranslated; Thai-only strings are broken for non-Thai users).

**Recommendation:** Migrate all user-facing strings to the i18n system. Priority: castle-defense and enchanted-library warning screens.

---

### F-UX-024 (Medium) — enchanted-library/page.tsx: Division by zero risk in completion handler

**File:** `(student)/student/games/vocabulary/enchanted-library/page.tsx`, lines 110-112
**Observation:**
```typescript
correctAnswers: Math.floor(results.xp / results.accuracy),
totalAttempts: Math.floor(results.xp / results.accuracy / results.accuracy),
```
If `results.accuracy` is `0`, this produces `Infinity` or `NaN`, which will be sent to the API as-is. The API may reject or misinterpret these values.

**Risk:** Medium (game edge case where user gets 0% accuracy sends garbage data to the server).

**Recommendation:** Add a guard: if `accuracy === 0`, set `correctAnswers: 0` and `totalAttempts` to a sensible default (e.g., the number of questions attempted).

---

### F-UX-025 (Medium) — dragon-rider/page.tsx: Untyped `results` parameter

**File:** `(student)/student/games/vocabulary/dragon-rider/page.tsx`, line 58
**Observation:** `async (results: any)` — the `any` type defeats TypeScript's type safety. The `handleComplete` callback sends `results` directly to the API without any type validation.

**Risk:** Low (runtime works, but any property rename or shape change in the game component silently breaks the API contract).

**Recommendation:** Define a `DragonRiderResults` interface and type the parameter.

---

### F-UX-026 (Low) — (index)/page.tsx: "Start Your Free Trial" CTA mismatches product model

**File:** `(index)/page.tsx`, lines 71-75
**Observation:** The hero CTA says "Start Your Free Trial" but:
- The `terms/page.tsx` describes a subscription model with non-refundable fees
- There is no trial logic visible in the auth or subscription flows
- For logged-in users, the button links to `/student/read` (not a trial flow)
- For guests, it links to `/auth/signin` (not a trial signup)

**Risk:** Low (marketing language, but potentially misleading if no free trial exists).

**Recommendation:** Verify whether a free trial exists. If not, change the CTA to "Get Started" or "Sign Up".

---

### F-UX-027 (Low) — games/page.tsx: Massive code duplication between vocabulary and sentence sections

**File:** `(student)/student/games/page.tsx`, lines 161-295 vs 298-477
**Observation:** The game card rendering logic for vocabulary games (lines 178-293) and sentence games (lines 311-426) is nearly identical (~100+ lines duplicated). Both sections render the same Card structure with the same badge logic, cover image, icon overlay, difficulty badge, and play button.

**Risk:** Low (maintainability; any change to card rendering must be duplicated in two places).

**Recommendation:** Extract a `GameCard` component and reuse it for both sections.

---

### F-UX-028 (Low) — No client-side API response validation across game pages

**Files:** All game pages (castle-defense, potion-rush, dragon-flight, dragon-rider, enchanted-library)
**Observation:** All game pages fetch from `/api/v1/games/*` endpoints and trust the response structure without any runtime validation. Examples:
- `castle-defense/page.tsx` line 52: `const data = await res.json();` — no schema check
- `dragon-flight/page.tsx` line 35: `const data = await response.json();` — checks `data.vocabulary` existence but not shape
- `enchanted-library/page.tsx` line 57: `const data = await response.json();` — no schema check

**Risk:** Low (if the API contract changes, the client silently breaks or throws runtime errors).

**Recommendation:** Add lightweight Zod schemas for API responses and validate on the client, or at minimum add runtime property checks with descriptive error messages.

---

### F-UX-029 (Low) — dragon-flight/page.test.tsx: Test doesn't cover API failure or insufficient vocabulary

**File:** `(student)/student/games/vocabulary/dragon-flight/page.test.tsx`
**Observation:** The test only covers the happy path:
- Renders heading ✓
- Loads vocabulary from mock store ✓
- Records XP on completion ✓

Missing coverage:
- API fetch failure (network error)
- API returns insufficient vocabulary (< 10 words)
- API returns non-ok response

**Risk:** Low (test gap; the error state UI exists but is untested).

**Recommendation:** Add test cases for error and insufficient vocabulary states.

---

### F-UX-030 (Low) — dragon-rider/page.test.tsx: Mock path may be stale

**File:** `(student)/student/games/vocabulary/dragon-rider/page.test.tsx`, line 5
**Observation:** The test mocks `@/lib/games/vocabLoader` but the actual `page.tsx` fetches vocabulary from `/api/v1/games/dragon-rider/vocabulary` via `fetch()`. The mock intercepts the wrong layer — the test verifies the store state but doesn't exercise the actual API fetch logic.

**Risk:** Low (test passes but doesn't validate the real data loading path).

**Recommendation:** Mock `global.fetch` instead of `@/lib/games/vocabLoader` to test the actual data flow.

---

### F-UX-031 (Low) — enchanted-library/page.test.tsx: No error state testing

**File:** `(student)/student/games/vocabulary/enchanted-library/page.test.tsx`
**Observation:** All four tests cover happy paths. No test for:
- API returning `warning: "NO_VOCABULARY"` or `"INSUFFICIENT_VOCABULARY"`
- Network fetch failure
- Loading state rendering

**Risk:** Low (test gap).

**Recommendation:** Add test cases for error and loading states.

---

### F-UX-032 (Low) — settings/user-profile/page.tsx: ChangeRole only visible in development

**File:** `(student)/student/settings/user-profile/page.tsx`, line 66
**Observation:** `process.env.NODE_ENV === "development"` gates the `ChangeRole` component. This is intentional for safety but means role changes cannot be performed in production from the UI. If role changes are needed in production, an admin panel or API endpoint is required.

**Risk:** Low (by design, but worth noting for completeness).

**Recommendation:** No action needed if this is intentional. If production role changes are needed, create an admin endpoint.

---

### F-UX-033 (Medium) — (index)/layout.tsx: Authenticated user layout condition is overly complex

**File:** `(index)/layout.tsx`, lines 52-87
**Observation:** The layout has three rendering paths:
1. `!user` → unauthenticated layout (lines 26-49)
2. `user && user.cefr_level === "" && user.level === 0 && user.xp === 0` → new-user layout (lines 53-68)
3. `else` → fully-authenticated layout (lines 70-86)

The condition at line 52 (`user.cefr_level === "" && user.level === 0 && user.xp === 0`) is a "new user" check. However, the `else` at line 69 covers ALL other cases, including users with partial progress. The middleware already forces new users to `/level`, so this branch should rarely be hit for new users.

**Risk:** Low (dead code path; the middleware redirect should prevent new users from reaching the index page).

**Recommendation:** Simplify to two paths: authenticated vs unauthenticated. The "new user" path on the index layout is unreachable if middleware is working correctly.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| High | 1 | F-UX-021 |
| Medium | 5 | F-UX-022, F-UX-023, F-UX-024, F-UX-025, F-UX-033 |
| Low | 7 | F-UX-026, F-UX-027, F-UX-028, F-UX-029, F-UX-030, F-UX-031, F-UX-032 |

**Key themes:**
1. **Auth inconsistency:** `assignments/page.tsx` renders inline text instead of redirecting (F-UX-021). All other `(student)` pages redirect.
2. **i18n gaps:** Multiple pages have hardcoded strings mixing Thai, English, and no translation (F-UX-023).
3. **Runtime safety:** Division by zero in enchanted-library (F-UX-024) and untyped results in dragon-rider (F-UX-025).
4. **Test coverage:** Game page tests only cover happy paths; error/loading states untested (F-UX-029, F-UX-030, F-UX-031).
5. **Code quality:** Dead imports (F-UX-022), massive duplication (F-UX-027), unreachable branches (F-UX-033).

No security-blocking findings were identified in this batch. The middleware correctly gates all `(student)` routes. The findings are UX consistency, i18n, runtime safety, and test coverage issues.

---

MEASURE_AGENT_RESULT
```json
{
  "track_id": "reading_advantage_full_review_20260626",
  "role": "review-c-ux-api",
  "batch_id": "ra-batch-02",
  "files_reviewed": 20,
  "lines_reviewed": 2493,
  "findings": {
    "total": 13,
    "high": 1,
    "medium": 5,
    "low": 7
  },
  "blocking_issues": [],
  "result_path": "measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-02.md",
  "status": "complete"
}
```
