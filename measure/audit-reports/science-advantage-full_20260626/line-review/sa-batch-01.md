# Line-by-Line Review: sa-batch-01

> **Track:** science_advantage_review_20260626  
> **Review role:** B — Security / Tenancy / Auth  
> **Batch ID:** sa-batch-01  
> **Baseline SHA:** 7ad89ac39b6b871da0907c6b873329c75d6dc3b9  
> **Date:** 2026-06-27  
> **Files reviewed:** 20  

---

## Coverage Summary

| # | File | Lines | Auth Check | Role Check | Tenant Scope | DB Access | Issues |
|---|------|-------|-----------|------------|-------------|-----------|--------|
| 1 | `TEST_SUMMARY.md` | 351 | N/A (doc) | N/A | N/A | N/A | **1 Medium** |
| 2 | `TODO.md` | 127 | N/A (doc) | N/A | N/A | N/A | **1 Low** |
| 3 | `app/(admin)/admin/page.tsx` | 61 | YES | YES (`ADMIN`, line 5) | NO (no data) | NO | 0 |
| 4 | `app/(admin)/layout.tsx` | 41 | YES | YES (`ADMIN`, line 12) | NO | NO | 0 |
| 5 | `app/(admin)/students/page.tsx` | 33 | YES | YES (`ADMIN`, line 6) | NO (no data) | NO | 0 |
| 6 | `app/(admin)/teachers/page.tsx` | 33 | YES | YES (`ADMIN`, line 6) | NO (no data) | NO | 0 |
| 7 | `app/(auth)/layout.tsx` | 11 | N/A (public) | N/A | N/A | N/A | 0 |
| 8 | `app/(auth)/signin/page.tsx` | 38 | N/A (public) | N/A | N/A | N/A | 0 |
| 9 | `app/(dashboard)/teacher/classes/[classId]/students/[studentId]/lessons/[lessonId]/page.tsx` | 23 | **NO** | **NO** | **NO** | NO | **1 Critical** |
| 10 | `app/(student)/assignments/page.tsx` | 27 | YES | YES (`STUDENT`, line 5) | NO (no data) | NO | 0 |
| 11 | `app/(student)/layout.tsx` | 41 | YES | YES (`STUDENT`, line 12) | NO | NO | 0 |
| 12 | `app/(student)/settings/page.tsx` | 86 | YES | **partial** (`requireAuth` line 7, should use `requireRole`) | NO | NO | **1 Low** |
| 13 | `app/(student)/student/classes/[classId]/lessons/[lessonSlug]/page.tsx` | 141 | N/A (client) | N/A (client, relies on API) | N/A (client) | NO (API) | 0 |
| 14 | `app/(student)/student/classes/[classId]/page.tsx` | 41 | YES | YES (`STUDENT`, line 15) | NO (no data) | NO | 0 |
| 15 | `app/(student)/student/page.tsx` | 80 | YES | YES (`STUDENT`, line 15) | NO | NO | 0 |
| 16 | `app/(student)/student/profile/page.tsx` | 30 | YES | YES (`STUDENT`, line 14) | NO | NO | 0 |
| 17 | `app/(system)/layout.tsx` | 41 | YES | YES (`SYSTEM`, line 12) | NO | NO | 0 |
| 18 | `app/(system)/schools/page.tsx` | 33 | YES | YES (`SYSTEM`, line 6) | NO (no data) | NO | 0 |
| 19 | `app/(system)/system/page.tsx` | 61 | YES | YES (`SYSTEM`, line 5) | NO (no data) | NO | 0 |
| 20 | `app/(teacher)/layout.tsx` | 41 | YES | YES (`TEACHER`, line 12) | NO | NO | 0 |

**Summary:** 1 Critical, 1 Medium, 1 Low across 20 files.

---

## Critical Findings

### F-SA-B01-001 — Missing Server-Side Authentication on Teacher Analytics Deep Page (Critical)

**File:** `apps/science-advantage/app/(dashboard)/teacher/classes/[classId]/students/[studentId]/lessons/[lessonId]/page.tsx`  
**Lines:** 1–23  

**Finding:** This page has **no server-side authentication or authorization check**. It does not call `requireRole()`, `requireAuth()`, or any other guard function. The `(dashboard)` route group contains no layout file that could provide inherited auth protection (confirmed by `glob` — the only file in the `(dashboard)` group is this page).

**Evidence (file in full):**
```typescript
import { StudentLessonDetailAnalytics } from '@/components/features/teacher/analytics/student-lesson-detail-analytics';

interface PageProps {
  params: Promise<{
    classId: string;
    studentId: string;
    lessonId: string;
  }>;
}

export default async function StudentLessonDetailPage({ params }: PageProps) {
  const { classId, studentId, lessonId } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <StudentLessonDetailAnalytics
        classId={classId}
        studentId={studentId}
        lessonId={lessonId}
      />
    </div>
  );
}
```

- **Line 11:** No call to `requireRole('TEACHER')`, `requireAuth()`, or any guard.
- **Lines 12:** `params` destructured without Zod validation — raw URL parameters passed directly to the client component.
- **Lines 16–20:** All three URL-derived parameters (`classId`, `studentId`, `lessonId`) forwarded unvalidated to `StudentLessonDetailAnalytics`.

The `StudentLessonDetailAnalytics` component is a `'use client'` component (confirmed: line 1), so it cannot perform server-side auth checks. Its auth depends entirely on the API endpoints it calls, which is correct for data-level protection but does not prevent a student or unauthenticated user from loading the page shell, JavaScript bundles, and analytics component.

**Comparison with sibling pages:** All other role-gated pages in this batch (`admin/page.tsx`, `admin/layout.tsx`, `students/page.tsx`, `teachers/page.tsx`, `student/layout.tsx`, `student/page.tsx`, `class/[classId]/page.tsx`, `assignments/page.tsx`, `system/layout.tsx`, `system/page.tsx`, `schools/page.tsx`, `teacher/layout.tsx`) correctly call `requireRole()` at the top of the server component or in their layout.

**Impact:**
- Any authenticated user (student, teacher of another school, admin) can access `/teacher/classes/{id}/students/{id}/lessons/{id}` and load the analytics page shell.
- While the downstream API routes should protect data, the page itself exposes the component bundle and renders the component tree — which makes API-level authorization the sole security layer.
- No defense-in-depth: if an API endpoint's authorization had a regression, this page would expose analytics data without mitigation.

**Recommendation:** Add `await requireRole('TEACHER')` at the top of `StudentLessonDetailPage`. Add Zod validation for `classId`, `studentId`, and `lessonId` (UUID format checks). Add a `notFound()` or redirect if params are invalid.

---

## Medium Findings

### F-SA-B01-002 — Stale Prisma Documentation in TEST_SUMMARY.md (Medium)

**File:** `apps/science-advantage/TEST_SUMMARY.md`  
**Lines:** 340–345  

**Finding:** The test summary document describes a testing infrastructure that no longer exists. Multiple sections reference "Prisma" as the active test database tool, but the Prisma→Drizzle migration program was completed across all tracks (archived 2026-06-23). Integration tests now use Drizzle migrations via `drizzle-kit`, not Prisma.

**Evidence (lines 340–345):**
```
## Maintenance Notes

- Tests use Prisma directly (not mocking) for integration tests
- Database should be cleaned between tests (handled in beforeEach/afterEach)
- Mock `next/headers` for cookie operations in API route tests
```

Additionally, line 219 shows:
```
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/science_advantage";
```
- Port `5433` does not match the project's test database port (5432, as documented in `AGENTS.md` §Local Test Database).

Line 198 references a `vitest.config.ts` with `setupFiles: ['./vitest.setup.ts']` — the project now has split `vitest.unit.config.ts` / `vitest.integration.config.ts` (as correctly described in `AGENTS.md`).

**Impact:**
- Developers reading this file to understand the test setup are misled about both the ORM (Prisma vs Drizzle) and the database port.
- New contributors may attempt to use Prisma APIs that are no longer available, leading to confusing build failures.
- The document claims a "last updated" date of 2025-10-08 (line 349), which predates the Prisma→Drizzle migration by 7+ months.

**Recommendation:** Either update TEST_SUMMARY.md to reflect the current Drizzle-based test infrastructure, or archive it and point to the canonical test documentation in `AGENTS.md`. At minimum: replace "Prisma" references with "Drizzle", correct the port to 5432, and update the "last updated" date. The vitest config descriptions should match the project's actual config files (`vitest.unit.config.ts` / `vitest.integration.config.ts`).

---

## Low Findings

### F-SA-B01-003 — `requireAuth()` Instead of `requireRole('STUDENT')` in Settings Page (Low)

**File:** `apps/science-advantage/app/(student)/settings/page.tsx`  
**Line:** 7  

**Finding:** The settings page uses `requireAuth()` (which only checks for any authenticated session) instead of `requireRole('STUDENT')` (which would enforce the STUDENT role). While the parent layout at `app/(student)/layout.tsx:12` calls `requireRole('STUDENT')` and provides protection, the page-level check is inconsistent with every other page in this route group.

**Evidence (line 7):**
```typescript
const session = await requireAuth();
```

Compare with sibling pages:
- `app/(student)/assignments/page.tsx:5` — `await requireRole('STUDENT')`
- `app/(student)/student/page.tsx:15` — `await requireRole('STUDENT')`
- `app/(student)/student/classes/[classId]/page.tsx:15` — `await requireRole('STUDENT')`

**Impact:**
- No active security risk today (the layout guard is effective).
- Defense-in-depth concern: if this page were refactored into a different route group without its own role guard, it would lose STUDENT-only protection.
- Source of confusion for developers reading the file in isolation.

**Recommendation:** Replace `requireAuth()` with `requireRole('STUDENT')` to match the established pattern.

---

### F-SA-B01-004 — Unvalidated URL Parameters on Teacher Analytics Page (Low)

**File:** `apps/science-advantage/app/(dashboard)/teacher/classes/[classId]/students/[studentId]/lessons/[lessonId]/page.tsx`  
**Lines:** 12  

**Finding:** The three URL parameters (`classId`, `studentId`, `lessonId`) are destructured from `params` without any Zod validation or format check. They are passed directly to the client component.

**Evidence (line 12):**
```typescript
const { classId, studentId, lessonId } = await params;
```

No UUID format validation, no length checks, no type narrowing. The `params` type is `Promise<{ classId: string; studentId: string; lessonId: string }>` from the Next.js interface, but the runtime values could be anything.

**Impact:**
- Malformed/attacker-supplied values propagate to the analytics component and downstream API fetches.
- While the API routes should validate their own inputs, the page is the first trust boundary where invalid input could be rejected.
- No error boundary or `notFound()` call for clearly invalid IDs.

**Recommendation:** Add Zod schemas for each parameter (e.g., `z.string().uuid()`) and call `notFound()` or `redirect()` when validation fails. This finding compounds with F-SA-B01-001 (missing auth) since the same file has both issues.

---

## Anti-Pattern Checks

### A2 — Consent-Blind Publish Gate

**Result:** NOT triggered in this batch.  
**Detail:** None of the 20 reviewed files contain a status transition from draft to published. The batch consists of documentation, layout pages, and UI page shells.

### A6 — Registry Overstatement

**Result:** NOT triggered.  
**Detail:** The `measure/tracks.md` entry for `science_advantage_review_20260626` accurately describes the track as a review track ("Reviews the new architecture-baseline app and verifies prior audit remediation held"). No overstatement or production-green claims detected.

---

## Architecture Baseline Observations

The following patterns in this batch should be carried forward as golden-path examples for Reading and Primary apps:

1. **Thin server pages with delegated auth.** Files #3, #4, #5, #6, #10, #11, #14, #15, #16, #17, #18, #19, and #20 all follow the correct pattern: `requireRole()` at page/layout top, `session` used only for display, no direct DB access, and data fetching delegated to client components via API routes.

2. **No remaining Prisma or direct DB imports.** None of the 20 files import from `@reading-advantage/db` or any Prisma client. The domain migration is holding across this batch.

3. **No adapter bypass.** No file in this batch directly calls AI SDK, storage SDK, or auth library APIs — all go through the `@reading-advantage/auth` / `@reading-advantage/auth-client` adapters.

4. **`(auth)/signin/page.tsx`** demonstrates the correct role-based redirect pattern with `ROLE_ROUTES` mapping (lines 7–12) and `SigninContainer` encapsulation.

The single critical finding (F-SA-B01-001) represents the only page in this 20-file batch that deviates from the golden path. It is anomalous compared to its peers.

---

## Summary Statistics

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 1 | F-SA-B01-001 |
| High | 0 | — |
| Medium | 1 | F-SA-B01-002 |
| Low | 2 | F-SA-B01-003, F-SA-B01-004 |
| **Total** | **4** | |

| Category | Count |
|----------|-------|
| Missing auth check | 1 (F-SA-B01-001) |
| Stale documentation | 1 (F-SA-B01-002) |
| Inconsistent auth pattern | 1 (F-SA-B01-003) |
| Missing input validation | 1 (F-SA-B01-004) |

**Files with 0 findings:** 15 (files 3–8, 10–11, 13–20)  
**Files with Critical findings:** 1 (file 9)  
**Files with Medium findings:** 1 (file 1)  
**Files with Low findings:** 2 (files 12, 9)

**Architecture baseline:** 19 of 20 files follow the golden path (thin server page with `requireRole()`, no DB access, delegated rendering). File 9 is the sole outlier.

---

## Cross-Reference to Prior Audit Findings

| Prior Finding | Confirmed in this batch? | Details |
|---------------|--------------------------|---------|
| F-305 (Root — domain bypass in route handlers) | **Not triggered** | 0 files in this batch import DB or domain directly |
| F-203 (Missing role checks) | **New variant** | F-SA-B01-001: entirely missing auth (different from the prior role-check gaps) |
| F-401 (App-local auth without shared package) | **Resolved** | All auth calls go through `@reading-advantage/auth` via `lib/auth/server.ts` |
| F-601 (Missing Zod validation) | **Partial** | F-SA-B01-004: unvalidated URL params on the analytics page |
| F-1102 (Stale AGENTS.md/TEST_SUMMARY.md) | **Yes — new** | F-SA-B01-002: TEST_SUMMARY.md still documents Prisma test infra |

---

## Limitations

1. **API-level authorization not tested.** The `StudentLessonDetailAnalytics` client component fetches data from API endpoints. If those endpoints properly enforce TEACHER role and class-level scoping, the page would show errors rather than data. However, defense-in-depth requires the page itself to verify authorization.

2. **No runtime testing.** This review is static analysis only. Dynamic testing (e.g., attempting to access the unprotected page as a student) is deferred to the Phase 4 gates.

3. **Batch scope covers documentation and UI shells.** Most files are placeholder pages or layouts. Findings are proportionally fewer than in batches with business logic and data-access code.

4. **Tenancy not assessable at this depth.** None of these 20 files access the database or call domain functions that pass `schoolId`. The tenant-scoping correctness of downstream API routes is covered in other batches (sa-batch-03, sa-batch-04).

---

*End of line-review report for sa-batch-01.*

MEASURE_AGENT_RESULT
{
  "review_role": "B",
  "batch_id": "sa-batch-01",
  "files_reviewed": 20,
  "findings_count": 4,
  "critical_count": 1,
  "high_count": 0,
  "medium_count": 1,
  "low_count": 2,
  "anti_pattern_checks": {
    "A2_consent_blind_publish": {
      "triggered": false,
      "detail": "No publish gate (draft→published) found in this batch"
    },
    "A6_registry_overstatement": {
      "triggered": false,
      "detail": "Registry accurately describes review track; no production-green overstatement"
    }
  },
  "critical_findings": [
    {
      "id": "F-SA-B01-001",
      "file": "app/(dashboard)/teacher/classes/[classId]/students/[studentId]/lessons/[lessonId]/page.tsx",
      "title": "Missing server-side auth check — no requireRole() or requireAuth() call on Teacher analytics deep page",
      "lines": "11"
    }
  ],
  "status": "COMPLETE"
}
MEASURE_AGENT_RESULT
