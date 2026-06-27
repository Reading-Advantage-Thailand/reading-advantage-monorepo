# Line-by-Line Review — Batch ra-batch-06

**Track:** `reading_advantage_full_review_20260626`
**Reviewer:** Measure Review B: security and data handling
**Baseline SHA:** `6921fda0ee45012232bdd71c444d4e9523a10ab6`
**Date:** 2026-06-27
**Files reviewed:** 20
**Scope:** Auth routes, session/security, role selection, teacher pages

---

## Files Reviewed

| # | File | Lines | Category |
|---|------|-------|----------|
| 1 | `apps/reading-advantage/app/[locale]/(teacher)/teacher/passages/loading.tsx` | 32 | Teacher UI |
| 2 | `apps/reading-advantage/app/[locale]/(teacher)/teacher/passages/page.tsx` | 26 | Teacher page |
| 3 | `apps/reading-advantage/app/[locale]/(teacher)/teacher/reports/[classroomId]/page.tsx` | 59 | Teacher page |
| 4 | `apps/reading-advantage/app/[locale]/(teacher)/teacher/reports/page.tsx` | 12 | Teacher page |
| 5 | `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx` | 71 | Teacher page |
| 6 | `apps/reading-advantage/app/[locale]/(teacher)/teacher/unenroll-classes/[studentId]/page.tsx` | 10 | Teacher page |
| 7 | `apps/reading-advantage/app/[locale]/(teacher)/teacher/workbook-generator/page.tsx` | 406 | Teacher page |
| 8 | `apps/reading-advantage/app/[locale]/[...not-found]/page.tsx` | 5 | Error handling |
| 9 | `apps/reading-advantage/app/[locale]/layout.tsx` | 108 | App layout |
| 10 | `apps/reading-advantage/app/[locale]/not-found.tsx` | 5 | Error handling |
| 11 | `apps/reading-advantage/app/[locale]/role-selection/layout.tsx` | 17 | Role selection |
| 12 | `apps/reading-advantage/app/[locale]/role-selection/page.tsx` | 44 | Role selection |
| 13 | `apps/reading-advantage/app/api/auth/check-password-set/route.ts` | 31 | Auth route |
| 14 | `apps/reading-advantage/app/api/auth/impersonate/route.ts` | 2 | Auth route |
| 15 | `apps/reading-advantage/app/api/auth/login/route.ts` | 2 | Auth route |
| 16 | `apps/reading-advantage/app/api/auth/logout/route.ts` | 2 | Auth route |
| 17 | `apps/reading-advantage/app/api/auth/register/route.ts` | 2 | Auth route |
| 18 | `apps/reading-advantage/app/api/auth/reset-password/route.ts` | 42 | Auth route |
| 19 | `apps/reading-advantage/app/api/auth/session/route.ts` | 2 | Auth route |
| 20 | `apps/reading-advantage/app/api/auth/signup/route.ts` | 46 | Auth route |

---

## Finding 1 — Email Enumeration Oracle (check-password-set/route.ts)

**Severity:** Medium
**File:** `apps/reading-advantage/app/api/auth/check-password-set/route.ts`
**Lines:** 5–31 (entire handler)

### Detail

The route returns structurally different responses for known vs. unknown email addresses:
- **Unknown email** (rows.length === 0, line 23): `{ hasPassword: false }` with no further data.
- **Known email, no credential** (rows[0].password is null/falsy, line 26): `{ hasPassword: false }`.
- **Known email, has credential** (rows[0].password is truthy, line 26): `{ hasPassword: true }`.

An attacker can distinguish three states: (1) email not registered, (2) email registered but no password set, (3) email registered with password set. This constitutes an email/username enumeration oracle usable for targeted phishing or brute-force preparation.

Unlike the shared `handleLogin` (packages/api/src/routes/auth/login.ts lines 86–93) which uses a constant-time dummy hash comparison and returns uniform `"Invalid username or password"` messages, this route has no timing defense.

### Dependencies Traced
- `db` (line 2): direct DB import bypassing domain layer.
- `users`, `accounts` (line 3): direct schema import.

### Disclosure
- No rate limiting on this endpoint.
- No audit event logged.

---

## Finding 2 — Legacy Signup Route: bcryptjs, No Auth Gate, Direct DB (signup/route.ts)

**Severity:** High
**File:** `apps/reading-advantage/app/api/auth/signup/route.ts`
**Lines:** 1–46 (entire handler)

### Detail

This is a legacy signup route with multiple issues:

1. **No auth gate (lines 7–8):** Any unauthenticated caller can create a new user. The shared `handleRegister` (`packages/api/src/routes/auth/register.ts` lines 40–46) gates behind a TEACHER/ADMIN session via `requireRole(db, cookie, "TEACHER")`. This route has no such check.

2. **bcryptjs instead of argon2id (lines 5, 21):** Uses `PasswordUtils.hashPassword()` which delegates to `bcryptjs` (`lib/password-utils.ts` line 10: `bcrypt.hash(password, 12)`). The shared auth package has been migrated to argon2id, but this route remains on the weaker algorithm.

3. **Direct DB access (line 3):** Imports `db` directly from `@reading-advantage/db`, bypassing the domain layer. No `assertCan()` or permission module.

4. **No audit event:** User creation is not logged.

5. **No tenant scoping (lines 24–38):** Creates users without `schoolId` — they get default `null` school. This means self-registered users exist outside any school scope and may have ambiguous tenant visibility.

6. **Transaction without returning() (line 24):** `db.transaction(async (tx) => {...})` — the transaction callback returns nothing (`void`), and the return value of `tx.insert(...)` inside the transaction is not `returning()`'d.

### Dependencies Traced
- `PasswordUtils.hashPassword` → `bcryptjs` (`lib/password-utils.ts` line 10).
- `nanoid` (line 2): OK, used only for ID generation.

### Contrast with Fixed Route
The shared `handleRegister` at `packages/api/src/routes/auth/register.ts`:
- Lines 40–46: Gated behind TEACHER/ADMIN session.
- Lines 51–58: Tenant scoped (TEACHER can only register into own school).
- Lines 60–72: Duplicate username check + school existence validation.
- Line 87: Uses `hashPassword()` from `@reading-advantage/auth` (argon2id).
- Line 91: Proper `tx.insert(...).returning()` pattern.
- Lines 114–124: FR-16: No session creation; returns 201.
- Lines 125–136: Catches `AuthError` specifically.

---

## Finding 3 — Email API Key Leak in Console (email.ts)

**Severity:** Critical
**File:** `apps/reading-advantage/lib/email.ts`
**Lines:** 24–26

### Detail

```ts
console.log("Preparing to send reset email to:", email, "with token:", token);
console.log("RESEND_API_KEY", process.env.RESEND_API_KEY);
console.log("RESEND_FROM", process.env.RESEND_FROM);
```

Lines 25–26 log `RESEND_API_KEY` and `RESEND_FROM` to stdout/stderr on every password reset request. This leaks the email service API key into logs (potentially captured by logging platforms, CI, or error tracking) and exposes the sender identity. The token is also logged on line 24, undermining email security — anyone with log access can reset passwords.

### Disclosure
- This file is called by `apps/reading-advantage/app/api/auth/reset-password/route.ts` line 33: `sendPasswordResetEmail(email, token)`.
- The `sendPasswordResetEmail` function also constructs the reset URL using `process.env.NEXT_PUBLIC_BASE_URL` (line 3) which could be misconfigured.

---

## Finding 4 — Teacher Page Authorization Gaps

**Severity:** Medium
**Files:**
- `apps/reading-advantage/app/[locale]/(teacher)/teacher/passages/page.tsx` (lines 9–13)
- `apps/reading-advantage/app/[locale]/(teacher)/teacher/reports/page.tsx` (lines 1–12)
- `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx` (lines 21–28)

### Detail

The middleware (`middleware.ts` lines 146–153) allows TEACHER-role users to access `/teacher/*` routes and also permits TEACHER access to `/student/*` without redirection. However, the teacher pages themselves enforce only authentication, not role-level authorization:

1. **passages/page.tsx (lines 10–13):** Checks `if (!user) return redirect(...)` but does not verify `user.role === Role.TEACHER`. A STUDENT who navigates directly to `/teacher/passages` would pass this guard because the middleware does not block their access.

2. **reports/page.tsx (lines 5–8):** Same pattern — only null-check on user.

3. **student-progress/[studentId]/page.tsx (lines 27–28):** Same pattern — `if (!user) return redirect("/auth/signin")`. No check that the requesting user is a teacher with access to this specific student.

**Middleware analysis:** The middleware (`middleware.ts` lines 98–105) calls `/api/auth/session` to get role data, but for the TEACHER case (lines 146–153), the role-based redirect logic only fires when the user is NOT already on `/teacher`, `/student`, or `/settings` paths. A STUDENT navigating to `/teacher/passages` would:
- Have `userRole = "STUDENT"` → lines 171–178: redirect only if NOT on `/student` or `/settings`. Since `/teacher/passages` is neither, they would be redirected to `/student/read`. **Correction:** Middleware actually DOES redirect STUDENTS away from teacher paths. Let me re-read...

Actually, re-reading middleware.ts more carefully:
- Lines 171-178: For STUDENT role, redirect to `/student/read` if NOT already on `/student` or `/settings`. Since `/teacher/passages` is neither `/student` nor `/settings`, the middleware DOES redirect STUDENTs to `/student/read`. So middleware protection exists.

**Revised assessment:** The middleware provides coarse-grained role-based routing (STUDENT → student area, TEACHER → allowed on teacher/student/settings), but the teacher pages themselves lack fine-grained authorization:
- No check that a TEACHER accessing `/teacher/student-progress/<studentId>` actually teaches that student.
- No check that a TEACHER accessing `/teacher/reports/<classroomId>` actually belongs to that classroom's school.

### Contrast
- **reports/[classroomId]/page.tsx (lines 31–46):** Does implement a classroom-teacher membership check. This is the correct pattern, but it queries the DB directly instead of using a domain function.

---

## Finding 5 — Multi-Tenant Isolation Bypass (reports/[classroomId]/page.tsx)

**Severity:** Medium
**File:** `apps/reading-advantage/app/[locale]/(teacher)/teacher/reports/[classroomId]/page.tsx`
**Lines:** 21–46

### Detail

The classroom access check at lines 31–46 verifies the user is a teacher assigned to the classroom, but does NOT verify tenant (school) isolation:

```ts
// Line 21-25: Classroom lookup — no schoolId filter
const [classroom] = await db
  .select()
  .from(classrooms)
  .where(eq(classrooms.id, classroomId))
  .limit(1);

// Lines 32-46: Access check — verifies teacher membership but no school match
if (user.role !== Role.SYSTEM && user.role !== Role.ADMIN) {
  const [classroomTeacher] = await db
    .select()
    .from(classroomTeachers)
    .where(
      and(
        eq(classroomTeachers.classroomId, classroomId),
        eq(classroomTeachers.teacherId, user.id),
      ),
    )
    .limit(1);
```

A teacher from School A could be erroneously added to a classroom in School B via cross-tenant data corruption. This page would allow access without verifying `classroom.schoolId === user.school_id` (or equivalent). The `classroomTeachers` table is a REFERENTIAL-type table with no direct `schoolId` column (scoped via FK to classrooms which has `schoolId`), and this code does not perform the ownership-FK join to verify school membership.

### Direct DB Bypass
Lines 2–4 import `db` and schema directly from `@reading-advantage/db`, bypassing the domain layer and `TenantDB`. No `assertCan()` call.

---

## Finding 6 — Student Data Access Without Authorization (student-progress/page.tsx)

**Severity:** Medium
**File:** `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx`
**Lines:** 13–35

### Detail

The page fetches student activity data and personal data via internal API calls:

```ts
// Lines 13-14, 17-18
async function getUserActivityData(userId: string) {
  return fetchData(`/api/v1/users/${userId}/activitylog`);
}
async function getStudentData(studentId: string) {
  return fetchData(`/api/v1/users/${studentId}/student-data`);
}
```

The `fetchData` utility (`utils/fetch-data.ts` line 12) forwards all incoming request headers — including cookies. This means the API calls are authenticated by the server-sent session cookie. However:

1. **No teacher-student relationship verification:** The page does not check that the requesting teacher actually teaches the student (via classroom membership). Any authenticated teacher can view any student's activity logs and personal data by guessing/changing the `studentId` URL parameter.

2. **No tenant scoping:** If a teacher from School A changes the `studentId` to a student from School B, the downstream API endpoint is responsible for enforcing tenant isolation. The teacher page itself performs no such check.

3. **`fetchData` header forwarding (fetch-data.ts lines 9–12):** Forwards ALL incoming headers to internal API calls. This is intentional for cookie forwarding but also leaks source IP, referrer, and other metadata to internal services.

---

## Finding 7 — Client-Side Handlebars with XSS Vector; No Auth Check (workbook-generator/page.tsx)

**Severity:** Medium
**File:** `apps/reading-advantage/app/[locale]/(teacher)/teacher/workbook-generator/page.tsx`
**Lines:** 1–406

### Detail

1. **No authentication check (entire file):** This client-side page has zero server-side auth. Any visitor can access `/teacher/workbook-generator`. The `"use client"` directive (line 1) means there is no `getCurrentUser()` call or server-side guard. The page renders fully without checking if the user is authenticated or authorized as a TEACHER.

2. **`@ts-ignore` on Handlebars import (line 4):** Suppresses TypeScript errors — potential for runtime failures if `handlebars/dist/handlebars.min.js` is not resolvable.

3. **DOM-based XSS via `document.write` (line 89):** The generated HTML is written to a new window via `newWindow.document.write(resultHtml)`. While Handlebars auto-escapes `{{...}}` expressions, any template that uses triple-stash `{{{...}}}` (raw HTML) would bypass escaping. Additionally, if the JSON data source contains pre-escaped HTML intended for raw output but processed through an escaped expression, the result could be unpredictable.

4. **No input validation for uploaded JSON (line 76):** JSON is parsed but there is no schema validation on the parsed data — arbitrary JSON structures are passed directly to the Handlebars template.

---

## Finding 8 — Unenroll Page With No Auth Guard (unenroll-classes/page.tsx)

**Severity:** Low
**File:** `apps/reading-advantage/app/[locale]/(teacher)/teacher/unenroll-classes/[studentId]/page.tsx`
**Lines:** 1–10

### Detail

The page renders `MyUnEnrollClasses` component with no server-side auth check at all. No `getCurrentUser()` call. The component itself (`components/teacher/unenroll-classes.tsx`) is a `"use client"` component that may handle auth internally, but the page-level guard is absent. The `[studentId]` dynamic param is not used anywhere in this page — the component presumably reads it from the URL or context.

---

## Finding 9 — Role Selection UX: Teacher Redirected to Student Page (role-selection/page.tsx)

**Severity:** Low
**File:** `apps/reading-advantage/app/[locale]/role-selection/page.tsx`
**Lines:** 18–29

### Detail

When a user's DB role is STUDENT or TEACHER but their session cookie suggests USER (which triggered the role-selection redirect), the page sends them to `SessionSyncRedirect`:

```ts
// Lines 18-23: STUDENT path
else if (user.role === Role.STUDENT) {
  return <SessionSyncRedirect />;
}
// Lines 24-29: TEACHER path
else if (user.role === Role.TEACHER) {
  return <SessionSyncRedirect />;
}
```

`SessionSyncRedirect` (`components/session-sync-redirect.tsx` line 11) hardcodes a redirect to `/student/read` after 500ms — regardless of whether the user is a STUDENT or TEACHER. A teacher in this state is redirected to the student reading page. The comment on line 16 says "This prevents the Loop," but the redirect should be role-aware.

---

## Finding 10 — Auth Route Architecture: Mixed Delegation Patterns

**Severity:** Info
**Files:**
- `apps/reading-advantage/app/api/auth/login/route.ts` (line 1–2)
- `apps/reading-advantage/app/api/auth/logout/route.ts` (line 1–2)
- `apps/reading-advantage/app/api/auth/register/route.ts` (line 1–2)
- `apps/reading-advantage/app/api/auth/session/route.ts` (line 1–2)
- `apps/reading-advantage/app/api/auth/impersonate/route.ts` (line 1–2)
- `apps/reading-advantage/app/api/auth/check-password-set/route.ts` (lines 1–31)
- `apps/reading-advantage/app/api/auth/reset-password/route.ts` (lines 1–42)
- `apps/reading-advantage/app/api/auth/signup/route.ts` (lines 1–46)

### Detail

Of 8 auth route files in this batch:
- **5 delegate correctly** (login, logout, register, session, impersonate) to `@reading-advantage/api/routes/auth` — thin 2-line stubs following the AGENTS.md pattern.
- **2 are legacy self-contained routes** (check-password-set, signup) with direct DB access, bypassing the domain layer.
- **1 is a hybrid** (reset-password/route.ts) — a separate email-based implementation that does NOT delegate to the shared `handleResetPassword` at `packages/api/src/routes/auth/reset-password.ts`. The app-level reset-password sends an email with a token and inserts into `verification_tokens`; the shared `handleResetPassword` does a direct admin/teacher-initiated password change.

This means there are **two parallel password reset flows**:
1. **App-level** (`apps/reading-advantage/app/api/auth/reset-password/route.ts`): Email-based self-service reset. No auth gate. Inserts into `verification_tokens` table (raw SQL, line 29–32).
2. **Shared** (`packages/api/src/routes/auth/reset-password.ts`): Admin/teacher-initiated direct reset. Gated behind TEACHER/ADMIN session. Properly scoped.

### Contrast
| Aspect | App-level | Shared |
|--------|-----------|--------|
| Auth gate | None | TEACHER/ADMIN |
| Tenant scope | None | School-scoped for TEACHER |
| Audit event | None | `auth:password_reset` |
| Password hash | Not hashed (token-based) | argon2id |
| Domain layer | Bypassed (direct DB) | Uses `@reading-advantage/auth` |

---

## Finding 11 — Middleware Role Data From Unauthenticated Fetch (middleware.ts)

**Severity:** Info
**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 38–50

### Detail

```ts
if (sessionToken) {
  try {
    const res = await fetch(new URL("/api/auth/session", req.url), {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
```

The middleware forwards the raw `cookie` header to the session endpoint. If the `cookie` header contains cookies from other domains (unlikely in the same-origin Next.js context, but possible if a reverse proxy mishandles headers), the session endpoint could receive unexpected cookies. More critically, the result of this fetch is used for role-based routing decisions (lines 98–184), so a misconfiguration could route users to wrong dashboards.

---

## Finding 12 — Incomplete Tenant Scoping in `getCurrentUser` (session.ts)

**Severity:** Info
**File:** `apps/reading-advantage/lib/session.ts`
**Lines:** 68–183

### Detail

The `getCurrentUser()` function enriches the session with extensive user data including:
- License information (lines 112–141)
- Teacher classroom IDs (lines 118–121)
- Student classroom IDs (lines 123–126)
- School ID (line 96)

However, there is no enforcement of tenant isolation at this layer. The function queries REFERENTIAL tables (`classroomTeachers`, `classroomStudents`, `licenseOnUsers`) without school-scoped joins. While `getCurrentUser` is a data-fetching utility (not an authorization boundary), the classroom IDs it returns are used downstream by teacher pages without additional tenant verification.

---

## Summary of Findings

| # | Severity | File(s) | Category | Lines |
|---|----------|---------|----------|-------|
| 1 | Medium | check-password-set/route.ts | Email enumeration | 5–31 |
| 2 | High | signup/route.ts | Legacy: no auth gate, bcryptjs, direct DB, no tenant | 1–46 |
| 3 | Critical | lib/email.ts | API key leak to console | 24–26 |
| 4 | Medium | passages/page.tsx, reports/page.tsx, student-progress/page.tsx | Missing role/ownership auth on teacher pages | 9–13, 5–8, 27–28 |
| 5 | Medium | reports/[classroomId]/page.tsx | Tenant isolation bypass, direct DB | 21–46 |
| 6 | Medium | student-progress/[studentId]/page.tsx | Unscoped student data access | 13–35 |
| 7 | Medium | workbook-generator/page.tsx | No auth, XSS vector via Handlebars | 1–406 |
| 8 | Low | unenroll-classes/[studentId]/page.tsx | No auth guard at page level | 1–10 |
| 9 | Low | role-selection/page.tsx | Teacher redirected to student page | 18–29 |
| 10 | Info | auth route files | Mixed delegation — legacy + shared | N/A |
| 11 | Info | middleware.ts | Cookie header forwarding | 38–50 |
| 12 | Info | lib/session.ts | No tenant enforcement in enrichment queries | 68–183 |

---

## Incomplete Disclosures

The following areas were **not fully covered** in this review and require further investigation:

1. **IDOR on `/api/v1/users/<id>/activitylog` and `/api/v1/users/<id>/student-data`:** The student-progress page calls these endpoints via server-side fetch. We did not review the API handlers themselves to confirm they enforce tenant/classroom scoping. If they are unprotected, any teacher can access any student's data by ID.

2. **`verification_tokens` table:** The app-level reset-password route inserts tokens via raw SQL (line 29–32). We did not verify this table exists in the Drizzle schema or that the token verification endpoint exists. This table is referenced in raw SQL but not in any Drizzle schema file reviewed in this batch.

3. **`MyUnEnrollClasses` component:** The unenroll-classes page delegates entirely to this client component. We did not trace its internal auth checks, API calls, or authorization logic.

4. **HandleArticle component:** The passages page delegates to this component. We did not review its internal auth/DOM behavior.

5. **TRPCProvider and AuthProvider:** The locale layout wraps children in these providers but we did not trace their initialization to verify they correctly re-hydrate the session on the client side.

6. **Consent artifacts:** No teacher or student-facing page in this batch was found to handle consent verification before exposing named student data. The reports pages display named student data (via ClassDetailDashboard) without visible consent-check gates.

7. **A2 (consent-blind publish gate):** No publish/draft workflow was observed in this batch. Not applicable to these pages.

8. **A6 (registry overstatement):** `measure/tracks.md` line 176 notes the `reading_advantage_agents_md_audit_20260610` as a **STUB**. The domain-bypass risk of 209 route.ts files is documented (lines 170–171). Review of this batch confirms the bypass pattern persists in at least 3 of 8 auth routes (check-password-set, signup, reset-password).

---

## Files With No Findings

| File | Reason |
|------|--------|
| `passages/loading.tsx` | Pure UI skeleton, no auth or data logic |
| `[...not-found]/page.tsx` | Delegates to `notFound()` |
| `not-found.tsx` | Simple `redirect("/")` |
| `layout.tsx` | Provider wrapping only, auth handled by providers |
| `role-selection/layout.tsx` | Layout wrapper, disables sidebar |
| `impersonate/route.ts` | Delegates to shared `handleImpersonate` — reviewed at packages/api layer |
| `login/route.ts` | Delegates to shared `handleLogin` — reviewed at packages/api layer |
| `logout/route.ts` | Delegates to shared `handleLogout` — reviewed at packages/api layer |
| `register/route.ts` | Delegates to shared `handleRegister` — reviewed at packages/api layer |
| `session/route.ts` | Delegates to shared `handleSession` — reviewed at packages/api layer |

---

## Dependency Files Reviewed

The following supporting files were read to trace data flows:

| File | Lines | Purpose |
|------|-------|---------|
| `apps/reading-advantage/lib/session.ts` | 184 | `getCurrentUser()`, session enrichment |
| `apps/reading-advantage/lib/enums.ts` | 154 | Role/LicenseType/Status enums |
| `apps/reading-advantage/lib/password-utils.ts` | 31 | bcryptjs wrapper (legacy) |
| `apps/reading-advantage/lib/email.ts` | 47 | Resend email with API key leak |
| `apps/reading-advantage/components/session-sync-redirect.tsx` | 23 | Hardcoded `/student/read` redirect |
| `apps/reading-advantage/components/shared/change-role.tsx` | 201 | Role selection with PATCH call |
| `apps/reading-advantage/utils/fetch-data.ts` | 18 | Server-side fetch with header forwarding |
| `apps/reading-advantage/middleware.ts` | 205 | Route-level auth/role redirection |
| `packages/api/src/routes/auth/login.ts` | 203 | Shared login handler |
| `packages/api/src/routes/auth/logout.ts` | 29 | Shared logout handler |
| `packages/api/src/routes/auth/register.ts` | 138 | Shared register handler |
| `packages/api/src/routes/auth/session.ts` | 57 | Shared session handler |
| `packages/api/src/routes/auth/impersonate.ts` | 155 | Shared impersonate handler |
| `packages/api/src/routes/auth/reset-password.ts` | 131 | Shared reset-password handler |

---

**END OF LINE-BY-LINE REVIEW**
