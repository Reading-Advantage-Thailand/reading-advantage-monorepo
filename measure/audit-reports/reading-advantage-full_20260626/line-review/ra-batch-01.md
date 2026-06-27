# Line-by-Line Review: ra-batch-01

> **Track:** reading_advantage_full_review_20260626  
> **Review role:** B — Security / Tenancy / Auth  
> **Batch ID:** ra-batch-01  
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6  
> **Date:** 2026-06-27  
> **Files reviewed:** 20  

---

## Coverage Summary

| # | File | Lines | Auth Check | Role Check | Tenant Scope | DB Access | Issues |
|---|------|-------|-----------|------------|-------------|-----------|--------|
| 1 | `__test__/security/rbac.test.ts` | 461 | N/A (test) | N/A | N/A | N/A | 0 Critical |
| 2 | `__test__/session-schema.test.ts` | 226 | N/A (test) | N/A | N/A | N/A | 0 Critical |
| 3 | `__test__/srs-health-core-logic.test.ts` | 428 | N/A (test) | N/A | N/A | N/A | 0 Critical |
| 4 | `__test__/velocity-metrics.test.ts` | 605 | N/A (test) | N/A | N/A | N/A | 0 Critical |
| 5 | `actions/flashcard.ts` | 323 | YES (partial) | NO | NO | YES (direct) | **1 High** |
| 6 | `actions/pratice.ts` | 131 | YES | NO | NO | YES (direct) | **1 Critical** |
| 7 | `actions/rating.ts` | 90 | **NO** | **NO** | **NO** | YES (direct) | **1 Critical** |
| 8 | `app/.../admin/article-creation/page.tsx` | 23 | YES (partial) | **NO** | NO | NO (client) | **1 Critical** |
| 9 | `app/.../admin/dashboard/loading.tsx` | 22 | N/A (skeleton) | N/A | N/A | N/A | 0 |
| 10 | `app/.../admin/dashboard/page.tsx` | 114 | YES | YES | NO (relies on API) | NO (server fetch) | 0 Critical |
| 11 | `app/.../admin/layout.tsx` | 28 | YES | YES | NO | NO | 0 Critical |
| 12 | `app/.../admin/management/page.tsx` | 113 | YES (partial) | **NO** | NO | NO (server fetch) | **1 Critical** |
| 13 | `app/.../admin/reports/[classroomId]/page.tsx` | 82 | YES | YES | **NO** | NO (server fetch) | **1 High** |
| 14 | `app/.../admin/reports/page.tsx` | 78 | YES | YES | NO (relies on API) | NO (server fetch) | 0 Critical |
| 15 | `app/.../admin/teacher-assignments/page.tsx` | 23 | YES | YES | NO | NO | 0 Critical |
| 16 | `app/.../auth/forgot-password/page.tsx` | 31 | N/A (public) | N/A | N/A | N/A | 0 Critical |
| 17 | `app/.../auth/layout.tsx` | 54 | N/A (public) | N/A | N/A | N/A | Info leak |
| 18 | `app/.../auth/signin/page.tsx` | 44 | N/A (public) | N/A | N/A | N/A | 0 Critical |
| 19 | `app/.../auth/signup/page.tsx` | 37 | N/A (public) | N/A | N/A | N/A | 0 Critical |
| 20 | `app/.../about/page.tsx` | 15 | N/A (public) | N/A | N/A | N/A | 0 |

**Summary:** 4 Critical, 2 High, 4 Medium, 2 Low findings across 20 files.

---

## Critical Findings

### F-RA-B01-001 — Unauthenticated Server Action: `submitRating` (Critical)

**File:** `apps/reading-advantage/actions/rating.ts`  
**Lines:** 8–89  

**Finding:** The `submitRating` Server Action accepts `userId` as a caller-supplied parameter
and **never calls `getCurrentUser()`**. There is zero authentication. Any unauthenticated
caller can submit ratings, create activities, and award XP for **any user** by passing an
arbitrary `userId`.

**Evidence (lines 8–9):**
```typescript
export async function submitRating(userId: string, articleId: string, rating: number, article: any) {
  // Check if user has already rated
```
No `getCurrentUser()` call. The `userId` parameter is taken directly from the caller. The
function proceeds to insert rows into `userActivity` and `xpLogs` using this untrusted
`userId`.

**Impact:**
- Any unauthenticated caller can write to the database for any user.
- XP farming: 10 XP per call, no rate limit, no dedup beyond a simple existence check.
- Activity spoofing: can create `ARTICLE_RATING` and `ARTICLE_READ` activities for any user.
- No tenant/school validation — cross-tenant data injection possible.

**Line-by-line risk trace:**
| Line | Risk |
|------|------|
| 8 | `userId` is untrusted caller input, never verified |
| 8 | `article: any` — completely untyped, no Zod validation |
| 8 | `rating: number` — no range validation (could be any number) |
| 10–20 | DB query uses untrusted `userId` directly |
| 26–37 | `db.insert(userActivity)` with caller-supplied data |
| 40–45 | `db.insert(xpLogs)` awards XP with no auth |
| 48–61 | Creates `ARTICLE_READ` activity with caller-supplied metadata |
| 64 | `revalidatePath` with untrusted `articleId` |
| 72–86 | `db.update(userActivity)` with untrusted `userId` |

**Recommendation:** Add `getCurrentUser()` at the top and verify that `userId` matches
`user.id` (or that the authenticated user has ADMIN/TEACHER authority over the target user).
Add Zod validation for all inputs.

---

### F-RA-B01-002 — Session Token Fabrication in Server Action (Critical)

**File:** `apps/reading-advantage/actions/pratice.ts`  
**Lines:** 60–67  

**Finding:** The `getSentencesForOrderingGame` function constructs a **fake session cookie**
using the plain user ID as the token value:

```typescript
headers: {
  Cookie: `session_token=${user.id}`,
},
```

This fabricates a cookie from a non-secret value (user.id). If the receiving API endpoint
trusts this cookie header for session validation, an attacker who knows any user ID can
impersonate that user.

**Evidence (lines 59–67):**
```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/flashcard/decks/${user.id}/sentences-for-ordering`,
  {
    headers: {
      Cookie: `session_token=${user.id}`,
    },
  },
);
```

**Impact:**
- The `user.id` value is not a secret — it appears in URLs and API responses.
- If the receiving API (`/api/v1/flashcard/decks/[id]/...`) validates sessions using
  the `session_token` cookie, this is a complete authentication bypass.
- Even if the API does its own auth (via `validateSession` from `@reading-advantage/auth`),
  sending a fake cookie is a dangerous anti-pattern that could break if the API's auth
  strategy changes.

**Recommendation:** Forward the real session cookie from the incoming request instead of
synthesizing one. Use `cookies()` from `next/headers` to read the real `session_token`
and forward it to the internal fetch. Alternatively, call the domain logic directly
instead of going through an HTTP fetch.

---

### F-RA-B01-003 — Missing Role Check on Admin Article Creation Page (Critical)

**File:** `apps/reading-advantage/app/[locale]/(admin)/admin/article-creation/page.tsx`  
**Lines:** 7–23  

**Finding:** The page checks `user.license_id` but **does not check `user.role`**. Any
authenticated user with any license — including students and teachers — can access the
admin article creation page.

**Evidence (lines 7–22):**
```typescript
export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  if (!user.license_id) {
    return <UnauthorizedPage />;
  }

  return (
    <>
      <AdminArticleCreation />
    </>
  );
}
```

**Impact:**
- Any student, teacher, or other role with a license can access admin article creation.
- The layout (`admin/layout.tsx`) at line 16–18 checks for ADMIN/SYSTEM role, but the
  page-level check is missing. If a user bypasses the layout (e.g., direct navigation
  with a different layout), the page is unprotected.
- Even with the layout guard, defense-in-depth dictates that every sensitive page should
  perform its own authorization check.

**Counter-example (correct pattern):**  
`admin/dashboard/page.tsx` lines 44–46 correctly check:
```typescript
if (user.role !== Role.ADMIN && user.role !== Role.SYSTEM) {
  return <UnauthorizedPage />;
}
```

**Recommendation:** Add the same role check as used in the layout or dashboard page.

---

### F-RA-B01-004 — Missing Role Check on Admin Management Page (Critical)

**File:** `apps/reading-advantage/app/[locale]/(admin)/admin/management/page.tsx`  
**Lines:** 18–27  

**Finding:** Identical to F-RA-B01-003. The management page checks `user.license_id` but
**does not check `user.role`**. Any user with a license can access the license management
and user role management UI.

**Evidence (lines 18–27):**
```typescript
export default async function AdminManagementPage() {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  if (!user.license_id) {
    return <UnauthorizedPage />;
  }
```

**Impact:** Same as F-RA-B01-003 plus exposure of license counts, school names, and user
role data for the user's school.

**Additional issues on this page:**
- **Line 29:** Typo `getManegementData` (should be `getManagementData`).
- **Lines 68–70:** `dataDashboard.license[0]` accessed without null check — crashes if
  the array is empty.
- **Lines 41–66:** 26 lines of commented-out dead code retained in production.
- **Lines 29–37:** No error handling on the internal fetch — throws to the error boundary.

**Recommendation:** Add role check. Remove dead code. Add null-safe access to
`dataDashboard.license`.

---

## High Findings

### F-RA-B01-005 — Server-to-Server Fetch Without Auth Credential Forwarding (High)

**File:** `apps/reading-advantage/actions/flashcard.ts`  
**Lines:** 262–299  

**Finding:** The `reviewCard` Server Action makes an internal fetch to
`/api/v1/flashcard/progress/${user.id}` with **no authentication headers**:

```typescript
const response = await fetch(`${baseUrl}/api/v1/flashcard/progress/${user.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ cardId, rating, type }),
});
```

The user ID is embedded in the URL path but no session token, cookie, or authorization
header is forwarded. The receiving API endpoint must validate authentication independently,
but the Server Action provides no credentials.

**Impact:**
- If the API endpoint does its own cookie-based auth (via `cookies()`), the Server Action's
  `fetch` call won't carry the session cookie.
- The `user.id` in the URL path is not a trust anchor — the endpoint must not rely on it.
- However, since `reviewCard` itself calls `getCurrentUser()` (line 264) and only proceeds
  if authenticated, the worst case is the internal fetch fails or is rejected by the API.

**Recommendation:** Either forward the session cookie from `cookies()` or call the
domain/DB logic directly instead of routing through an HTTP fetch. Using `fetch` inside a
Server Action to call the same app's API is an anti-pattern — it adds latency and auth
complexity for no benefit.

---

### F-RA-B01-006 — Cross-School Classroom Report Access (High)

**File:** `apps/reading-advantage/app/[locale]/(admin)/admin/reports/[classroomId]/page.tsx`  
**Lines:** 8–81  

**Finding:** The page has a role check (ADMIN or SYSTEM) but **does not verify that the
classroom belongs to the admin's school**. Any ADMIN user can view any classroom report by
changing the `classroomId` URL parameter:

```typescript
if (user?.role !== Role.SYSTEM && user?.role !== Role.ADMIN) {
  return redirect("/");
}
// No school-level check on classroomId
```

**Evidence (lines 24–54):**
```typescript
const getClassroomData = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const requestHeaders = await headers();
  const res = await fetch(
    `${baseUrl}/api/v1/classroom/${classroomId}`,  // ← no schoolId filter
    { method: "GET", headers: requestHeaders, cache: "no-store" }
  );
```

**Impact:**
- ADMIN of School A can view classroom reports for School B by URL manipulation.
- The API endpoint (`/api/v1/classroom/[classroomId]`) must enforce school scoping. If it
  does not (see finding C-007 in the broader audit), this is a critical cross-tenant data
  leak. If it does, the UI still makes the request and may receive a 403, but defense-in-depth
  recommends the UI also verify school membership.
- No validation that `classroomId` is a valid UUID.

**Recommendation:** Add a `verifyClassroomSchool(user, classroomId)` call (the utility
exists in `server/utils/authorization.ts` line 219) before fetching classroom data.

---

## Medium Findings

### F-RA-B01-007 — No Input Validation in Server Actions (Medium)

**Affected files:**
- `actions/flashcard.ts` (lines 207, 262): `getDeckCards(deckId: string)`, `reviewCard(cardId, rating, type)` — no Zod validation on any parameter.
- `actions/pratice.ts` (lines 29, 91): All functions have untyped parameters or weak typing.
- `actions/rating.ts` (line 8): `userId`, `articleId`, `rating`, `article` — zero validation.

**Impact:**
- `rating` can be any number (not constrained to 1–4).
- `article: any` can inject arbitrary JSON into the `details` column.
- `cardId` not validated as UUID.
- No validation of `type` enum values.

**Recommendation:** Add Zod schemas for all Server Action inputs.

---

### F-RA-B01-008 — Inconsistent Authorization Pattern Across Admin Pages (Medium)

**Files:**
- `admin/dashboard/page.tsx` — has `user.role !== Role.ADMIN && user.role !== Role.SYSTEM` check ✅
- `admin/layout.tsx` — has role check ✅  
- `admin/reports/page.tsx` — has role check ✅
- `admin/teacher-assignments/page.tsx` — has role check ✅
- `admin/reports/[classroomId]/page.tsx` — has role check ✅
- `admin/article-creation/page.tsx` — **missing** role check ❌
- `admin/management/page.tsx` — **missing** role check ❌

**Impact:** Two of seven admin pages lack the role check, inconsistent with sibling pages.

**Recommendation:** Extract the admin access check into a shared guard function
(e.g., `assertAdminAccess(user)`) and apply uniformly.

---

### F-RA-B01-009 — Duplicate `calculateETA` Function Definition (Medium)

**File:** `apps/reading-advantage/__test__/velocity-metrics.test.ts`  
**Lines:** 53–116 (first definition) and 548–605 (second definition)  

**Finding:** The `calculateETA` function is defined twice in the same file. The first
definition is inside the `describe('ETA Calculation')` block. The second is a top-level
standalone copy with identical logic. This indicates a copy-paste error or merge artifact.

**Impact:** Only the outer definition (lines 548–605) is used by the integration tests
at line 490. The inner definition (lines 53–116) is used within the `ETA Calculation`
describe block. Having two copies means one could drift while the other is tested.

**Additional:** `beforeAll` and `afterAll` are imported (line 10) but never used.

**Recommendation:** Remove the duplicate definition. Extract `calculateETA` to a single
top-level or imported function.

---

### F-RA-B01-010 — `validateQuickActionParameters` Uses `any` Type (Medium)

**File:** `apps/reading-advantage/__test__/srs-health-core-logic.test.ts`  
**Line:** 116  

**Finding:**
```typescript
function validateQuickActionParameters(actionType: string, parameters: any) {
```

The `parameters` parameter is typed as `any`, bypassing TypeScript's type checking.
While this is test code, the function logic itself appears to be a production logic
extract. If this pattern propagates to production, it creates a validation gap.

**Recommendation:** Type `parameters` as `Record<string, unknown>` or a more specific type.

---

## Low Findings

### F-RA-B01-011 — Hardcoded Firebase Storage URL (Low)

**File:** `apps/reading-advantage/app/[locale]/(auth)/auth/layout.tsx`  
**Line:** 25  

**Finding:**
```typescript
backgroundImage: `url('https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/article-images/3OdR9eoaNqmHfxV3KnHW.png')`,
```

This leaks the Firebase Storage bucket name (`artifacts.reading-advantage.appspot.com`)
in client-rendered HTML. It also references a legacy Firebase/GCS bucket that may not
exist or may be deprecated after the storage migration to the shared `@reading-advantage/storage` package.

**Recommendation:** Use a config-driven image URL or import from a constants file.

---

### F-RA-B01-012 — Filename Typo: `pratice.ts` (Low)

**File:** `apps/reading-advantage/actions/pratice.ts`  

**Finding:** The filename contains a typo: "pratice" instead of "practice". While not a
security issue, it suggests the file was created hastily and may not have been reviewed.

---

## Anti-Pattern Checks

### A2 — Consent-Blind Publish Gate

**Result:** NOT triggered in this batch.  
**Detail:** None of the 20 reviewed files contain a status transition from draft to
published. The known A2 finding (F-RA-005, `approveUserArticle`) resides in a different
file not included in this batch.

### A6 — Registry Overstatement

**Result:** NOT triggered.  
**Detail:** The existing `review-b-security-result.json` correctly reports 2 Critical,
5 High findings and an overall posture of `NOT_PRODUCTION_GREEN`. The `measure/tracks.md`
entry for this track accurately describes it as a review track. No overstatement detected.

---

## Cross-Reference to Prior Audit Findings

| Prior Finding | Confirmed in this batch? | Details |
|---------------|------------------------|---------|
| F-RA-001 (Missing Tenant Scoping) | Partially | `reports/[classroomId]/page.tsx` lacks school verification |
| F-RA-002 (Unauthenticated Endpoints) | **Yes (new)** | `actions/rating.ts` is a completely unauthenticated Server Action |
| F-RA-008 (Inconsistent Zod Validation) | **Yes** | All 3 Server Action files lack Zod validation |
| F-RA-009 (Direct DB Access) | **Yes** | All 3 Server Action files use direct `db.select()`/`db.insert()` |
| F-RA-010 (Role Checks Without Ownership) | **Yes** | 2 admin pages skip role checks entirely |
| C-007 (Classroom Missing Auth Checks) | Related | `reports/[classroomId]/page.tsx` relies on unverified API |

---

## Summary Statistics

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 4 | F-RA-B01-001, F-RA-B01-002, F-RA-B01-003, F-RA-B01-004 |
| High | 2 | F-RA-B01-005, F-RA-B01-006 |
| Medium | 4 | F-RA-B01-007, F-RA-B01-008, F-RA-B01-009, F-RA-B01-010 |
| Low | 2 | F-RA-B01-011, F-RA-B01-012 |
| **Total** | **12** | |

| Category | Count |
|----------|-------|
| Auth bypass (missing checks) | 4 (F-RA-B01-001, 003, 004, 006) |
| Credential handling | 1 (F-RA-B01-002) |
| Input validation | 2 (F-RA-B01-007, 010) |
| Server-to-server auth | 1 (F-RA-B01-005) |
| Code quality / drift | 3 (F-RA-B01-008, 009, 012) |
| Info leak | 1 (F-RA-B01-011) |

**Files with 0 findings:** 9 (files 1–4, 9, 15–18, 20)  
**Files with Critical findings:** 4 (files 6, 7, 8, 12)  
**Files with High findings:** 2 (files 5, 13)  

---

*End of line-review report for ra-batch-01.*

MEASURE_AGENT_RESULT
{
  "review_role": "B",
  "batch_id": "ra-batch-01",
  "files_reviewed": 20,
  "findings_count": 12,
  "critical_count": 4,
  "high_count": 2,
  "medium_count": 4,
  "low_count": 2,
  "anti_pattern_checks": {
    "A2_consent_blind_publish": {
      "triggered": false,
      "detail": "No publish gate (draft→published) found in this batch"
    },
    "A6_registry_overstatement": {
      "triggered": false,
      "detail": "Registry accurately reports NOT_PRODUCTION_GREEN with 2 Critical"
    }
  },
  "critical_findings": [
    {
      "id": "F-RA-B01-001",
      "file": "actions/rating.ts",
      "title": "Unauthenticated Server Action: submitRating accepts arbitrary userId with zero auth",
      "lines": "8-89"
    },
    {
      "id": "F-RA-B01-002",
      "file": "actions/pratice.ts",
      "title": "Session token fabricated from plain user.id in internal fetch Cookie header",
      "lines": "60-67"
    },
    {
      "id": "F-RA-B01-003",
      "file": "app/[locale]/(admin)/admin/article-creation/page.tsx",
      "title": "Missing role check — any user with license can access admin article creation",
      "lines": "7-22"
    },
    {
      "id": "F-RA-B01-004",
      "file": "app/[locale]/(admin)/admin/management/page.tsx",
      "title": "Missing role check — any user with license can access admin management page",
      "lines": "18-27"
    }
  ],
  "status": "COMPLETE"
}
MEASURE_AGENT_RESULT
