# Line Review: ra-batch-05

> **Track:** `reading_advantage_full_review_20260626`
> **Reviewer:** Measure Review C (UX and API end-to-end contract)
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6
> **Batch:** ra-batch-05 (20 files: system layout/license/reports, teacher layout/dashboard/assignments/roster)

---

## Coverage

| Category | Files | Lines Reviewed |
|----------|-------|----------------|
| System layout | 1 | 24 |
| System license | 4 | 686 |
| System reports | 2 | 51 |
| System schooldashboard | 2 | 131 |
| Teacher layout | 1 | 34 |
| Teacher dashboard | 1 | 101 |
| Teacher assignments | 2 | 20 |
| Teacher class-roster | 4 | 255 |
| Teacher enroll-classes | 1 | 10 |
| Teacher my-classes | 1 | 10 |
| Teacher my-students | 1 | 10 |
| **Total** | **20** | **1,332** |

---

## Findings

### F-RA-B05-001: Inconsistent Auth Guard Patterns Across Teacher Pages

**Severity:** High
**Category:** Auth / User-Facing Flow Consistency
**Files:** All teacher page files

**Evidence:**

| Page | Auth Check | Role Check |
|------|-----------|------------|
| `teacher/layout.tsx` | ✅ `redirect("/auth/signin")` | ✅ SYSTEM/TEACHER/ADMIN |
| `teacher/dashboard/page.tsx` | ✅ `redirect("/auth/signin")` | ✅ TEACHER/ADMIN/SYSTEM |
| `teacher/assignments/[classroomId]/[articleId]/page.tsx` | ❌ None | ❌ None |
| `teacher/assignments/page.tsx` | ❌ None | ❌ None |
| `teacher/class-roster/[classroomId]/page.tsx` | ❌ None | ❌ None |
| `teacher/class-roster/page.tsx` | ❌ None | ❌ None |
| `teacher/class-roster/[classroomId]/create-new-student/page.tsx` | ✅ `redirect("/auth/signin")` | ❌ None |
| `teacher/class-roster/[classroomId]/history/[studentId]/page.tsx` | ✅ `redirect("/auth/signin")` | ❌ None |
| `teacher/enroll-classes/[studentId]/page.tsx` | ❌ None | ❌ None |
| `teacher/my-classes/page.tsx` | ❌ None | ❌ None |
| `teacher/my-students/page.tsx` | ❌ None | ❌ None |

**Impact:**
- 7 of 11 teacher pages have no auth guard at the page level
- While the teacher layout has auth checks, child pages that could be rendered outside the layout (or if the layout is bypassed) have no protection
- create-new-student and history pages check for user but not role — a STUDENT could potentially access these if the layout guard fails

**Recommendation:**
Add consistent auth + role checks to all teacher pages, or document that the layout provides the guard and child pages rely on it.

---

### F-RA-B05-002: License Components Bypass Domain Layer — Direct Firestore Access

**Severity:** High
**Category:** API Contract / Integration Wiring
**Files:**
- `apps/reading-advantage/app/[locale]/(system)/system/license/columns.tsx`
- `apps/reading-advantage/app/[locale]/(system)/system/license/create-license-form.tsx`
- `apps/reading-advantage/app/[locale]/(system)/system/license/license-data-table.tsx`
- `apps/reading-advantage/app/[locale]/(system)/system/license/page.tsx`

**Evidence:**

```typescript
// columns.tsx:19-21
const apiDeleteLicense = async (id: string) => {
  await licenseService.licenses.deleteDoc(id);
};

// create-license-form.tsx:74-80
const response = await licenseService.licenses.createDoc({
  total_licenses: data.total,
  subscription_level: data.subscription_level,
  school_name: data.school_name,
  admin_id: data.admin_id,
  expiration_date: data.expiration_date,
});

// page.tsx:25-38
const response = await licenseService.licenses.fetchAllDocs(
  {
    select: ["id", "schoolName", "maxUsers", "usedLicenses", "expiresAt", "licenseType", "key"],
  },
  requestHeaders
);
```

The `licenseService` is a Firestore client service (`client/services/firestore-client-services.ts`) that directly calls Firestore. This bypasses:
- `@reading-advantage/domain` functions
- `assertCan` permission checks
- `TenantDB` multi-tenant scoping
- Audit logging
- Server-side validation

**Impact:**
- No tenant/school isolation on license operations
- No permission checks (any SYSTEM user can delete any license)
- No audit trail for license creation/deletion
- Client-side Firestore calls bypass server-side security rules

**Recommendation:**
Route license operations through `@reading-advantage/domain` functions with proper authorization and audit logging.

---

### F-RA-B05-003: License Delete Has No Confirmation Dialog

**Severity:** Medium
**Category:** UX / Destructive Action
**File:** `apps/reading-advantage/app/[locale]/(system)/system/license/columns.tsx:122-128`

**Evidence:**

```typescript
<DropdownMenuItem
  onClick={() => {
    apiDeleteLicense(license.id);
    // router.refresh();
  }}
>
  Delete
</DropdownMenuItem>
```

The delete action fires immediately on click with no confirmation dialog. The `router.refresh()` is commented out, so the UI won't even update after deletion.

**Impact:**
- Accidental clicks delete licenses permanently
- No undo capability
- UI doesn't reflect the deletion (stale data)

**Recommendation:**
Add a confirmation dialog (e.g., `AlertDialog`) before destructive delete operations. Uncomment `router.refresh()` or use SWR/React Query for optimistic updates.

---

### F-RA-B05-004: License Form Has No Server-Side Validation

**Severity:** Medium
**Category:** API Contract / Validation
**File:** `apps/reading-advantage/app/[locale]/(system)/system/license/create-license-form.tsx`

**Evidence:**

The form uses client-side Zod validation (`FormSchema`), but the `onSubmit` handler sends data directly to Firestore via `licenseService.licenses.createDoc()` with no server-side validation:

```typescript
async function onSubmit(data: z.infer<typeof FormSchema>) {
  try {
    setIsLoading(true);
    const response = await licenseService.licenses.createDoc({
      total_licenses: data.total,
      subscription_level: data.subscription_level,
      school_name: data.school_name,
      admin_id: data.admin_id,
      expiration_date: data.expiration_date,
    });
```

**Impact:**
- Client-side validation can be bypassed
- No server-side schema validation on the create payload
- Invalid data can be persisted to Firestore

**Recommendation:**
Add server-side Zod validation in a domain function or API route handler.

---

### F-RA-B05-005: School Dashboard Uses Internal fetch() Calls Instead of Direct Domain Functions

**Severity:** Medium
**Category:** Integration Wiring / Performance
**File:** `apps/reading-advantage/app/[locale]/(system)/system/schooldashboard/page.tsx:21-65`

**Evidence:**

```typescript
const schoolListfetch = async () => {
  const requestHeaders = await headers();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/licenses`,
    { method: "GET", headers: requestHeaders }
  );
  if (!res.ok) throw new Error("Failed to fetch school list");
  const fetchdata = await res.json();
  return fetchdata;
};
```

Three separate `fetch()` calls to internal API routes:
1. `/api/v1/licenses` — school list
2. `/api/v1/users` — user role list
3. `/api/v1/activity/all` — CEFR level data

**Impact:**
- Unnecessary HTTP overhead for server-to-server calls
- Uses `process.env.NEXT_PUBLIC_BASE_URL` which may not resolve correctly in all environments
- No type safety on the responses
- If any endpoint changes, the page breaks silently

**Recommendation:**
Call domain functions directly from the server component instead of making HTTP requests to internal API routes.

---

### F-RA-B05-006: System Pages Have Inconsistent Error Handling for Auth Redirects

**Severity:** Low
**Category:** UX / Flow Consistency
**Files:**
- `apps/reading-advantage/app/[locale]/(system)/system/license/page.tsx`
- `apps/reading-advantage/app/[locale]/(system)/system/schooldashboard/page.tsx`
- `apps/reading-advantage/app/[locale]/(system)/system/reports/[licenseId]/page.tsx`
- `apps/reading-advantage/app/[locale]/(system)/system/reports/page.tsx`

**Evidence:**

| Page | No User | Wrong Role |
|------|---------|------------|
| `license/page.tsx` | `redirect("/auth/signin")` | `<UnauthorizedPage />` |
| `schooldashboard/page.tsx` | `redirect("/auth/signin")` | `<UnauthorizedPage />` |
| `reports/[licenseId]/page.tsx` | `redirect("/auth/signin")` | `redirect("/")` |
| `reports/page.tsx` | `redirect("/auth/signin")` | `redirect("/")` |

**Impact:**
- Inconsistent user experience: some pages show an "Unauthorized" page, others redirect to home
- Users may not understand why they were redirected

**Recommendation:**
Standardize on one pattern: either always show `<UnauthorizedPage />` or always redirect to a consistent location.

---

### F-RA-B05-007: Teacher Layout Checks expired_date but Child Pages Don't

**Severity:** Low
**Category:** Auth / Flow Consistency
**Files:**
- `apps/reading-advantage/app/[locale]/(teacher)/teacher/layout.tsx:15-17`
- All teacher child pages

**Evidence:**

```typescript
// layout.tsx:15-17
if (new Date(user?.expired_date) < new Date() && user?.role !== Role.SYSTEM) {
  return redirect("/contact");
}
```

The teacher layout checks if the user's license has expired and redirects to `/contact`. However, child pages that bypass the layout (or if the layout is rendered differently) won't have this check.

**Impact:**
- Expired users could potentially access teacher features if the layout check is bypassed
- Inconsistent with the system layout which doesn't check expiration

**Recommendation:**
Consider adding expiration checks to individual pages or documenting that the layout provides this guard.

---

### F-RA-B05-008: create-new-student Page Fetches All Students Unnecessarily

**Severity:** Low
**Category:** Performance / API Contract
**File:** `apps/reading-advantage/app/[locale]/(teacher)/teacher/class-roster/[classroomId]/create-new-student/page.tsx:56-66`

**Evidence:**

```typescript
const allStudentEmailData = async () => {
  const requestHeaders = await headers();
  const resStudent = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom/all-students`,
    { method: "GET", headers: requestHeaders }
  );
  if (!resStudent.ok) throw new Error("Failed to fetch ClassesData list");
  const allStudentEmail = await resStudent.json();
  return allStudentEmail;
};
```

The page fetches all students from the system, even though it only needs students for a specific classroom. The `ClassesData()` function already fetches classroom-specific students.

**Impact:**
- Unnecessary data transfer
- Potential performance issue with large student populations
- The error message says "Failed to fetch ClassesData list" but it's fetching students

**Recommendation:**
Only fetch the data needed for the specific classroom. Fix the error message.

---

## Route Parity Check

| Route Pattern | Auth Guard | Role Check | Domain Layer | Audit Log |
|---------------|-----------|------------|--------------|-----------|
| `/system/system/` (layout) | ✅ | ✅ SYSTEM | ❌ N/A | ❌ N/A |
| `/system/system/license/` | ✅ | ✅ SYSTEM | ❌ Firestore direct | ❌ |
| `/system/system/reports/` | ✅ | ✅ SYSTEM | ⚠️ Via component | ❌ |
| `/system/system/reports/[licenseId]/` | ✅ | ✅ SYSTEM | ⚠️ Via component | ❌ |
| `/system/system/schooldashboard/` | ✅ | ✅ SYSTEM | ❌ fetch() to API | ❌ |
| `/teacher/teacher/` (layout) | ✅ | ✅ TEACHER/ADMIN/SYSTEM | ❌ N/A | ❌ N/A |
| `/teacher/teacher/dashboard/` | ✅ | ✅ TEACHER/ADMIN/SYSTEM | ⚠️ Via component | ❌ |
| `/teacher/teacher/assignments/` | ❌ | ❌ | ⚠️ Via component | ❌ |
| `/teacher/teacher/assignments/[classroomId]/[articleId]/` | ❌ | ❌ | ⚠️ Via component | ❌ |
| `/teacher/teacher/class-roster/` | ❌ | ❌ | ⚠️ Via component | ❌ |
| `/teacher/teacher/class-roster/[classroomId]/` | ❌ | ❌ | ⚠️ Via component | ❌ |
| `/teacher/teacher/class-roster/[classroomId]/create-new-student/` | ✅ | ❌ | ❌ fetch() to API | ❌ |
| `/teacher/teacher/class-roster/[classroomId]/history/[studentId]/` | ✅ | ❌ | ❌ fetch() to API | ❌ |
| `/teacher/teacher/enroll-classes/[studentId]/` | ❌ | ❌ | ⚠️ Via component | ❌ |
| `/teacher/teacher/my-classes/` | ❌ | ❌ | ⚠️ Via component | ❌ |
| `/teacher/teacher/my-students/` | ❌ | ❌ | ⚠️ Via component | ❌ |

**Summary:**
- 8 of 16 routes have complete auth + role guards
- 7 routes have no auth guard at the page level (relying on layout)
- 0 routes use domain layer functions directly
- 0 routes have audit logging
- 2 routes use inefficient `fetch()` to internal APIs

---

## Integration Wiring Check

| Component | Data Source | Domain Layer | Validation |
|-----------|------------|--------------|------------|
| License columns | Firestore direct | ❌ | ❌ |
| License create form | Firestore direct | ❌ | ⚠️ Client-only Zod |
| License data table | Firestore direct | ❌ | ❌ |
| License page | Firestore direct | ❌ | ❌ |
| School dashboard | fetch() to API | ❌ | ❌ |
| Teacher dashboard | Via component | ⚠️ | ⚠️ |
| Teacher assignments | Via component | ⚠️ | ⚠️ |
| Teacher class-roster | Via component | ⚠️ | ⚠️ |
| Teacher create-new-student | fetch() to API | ❌ | ❌ |
| Teacher history | fetch() to API | ❌ | ❌ |

**Summary:**
- 0 components use domain layer functions directly
- 4 components use Firestore direct access
- 3 components use inefficient fetch() to internal APIs
- 3 components delegate to child components (unknown data source)

---

## MEASURE_AGENT_RESULT

```json
{
  "review_role": "C",
  "review_role_name": "UX and API end-to-end contract",
  "batch_id": "ra-batch-05",
  "track_id": "reading_advantage_full_review_20260626",
  "date": "2026-06-27",
  "baseline_sha": "6921fda0ee45012232bdd71c444d4e9523a10ab6",
  "files_reviewed": 20,
  "lines_reviewed": 1332,
  "findings": {
    "high": 2,
    "medium": 3,
    "low": 3,
    "total": 8
  },
  "findings_list": [
    {
      "id": "F-RA-B05-001",
      "severity": "High",
      "category": "Auth / User-Facing Flow Consistency",
      "title": "Inconsistent Auth Guard Patterns Across Teacher Pages",
      "files": ["teacher/*/page.tsx (7 files)"]
    },
    {
      "id": "F-RA-B05-002",
      "severity": "High",
      "category": "API Contract / Integration Wiring",
      "title": "License Components Bypass Domain Layer — Direct Firestore Access",
      "files": ["license/columns.tsx", "license/create-license-form.tsx", "license/license-data-table.tsx", "license/page.tsx"]
    },
    {
      "id": "F-RA-B05-003",
      "severity": "Medium",
      "category": "UX / Destructive Action",
      "title": "License Delete Has No Confirmation Dialog",
      "files": ["license/columns.tsx"]
    },
    {
      "id": "F-RA-B05-004",
      "severity": "Medium",
      "category": "API Contract / Validation",
      "title": "License Form Has No Server-Side Validation",
      "files": ["license/create-license-form.tsx"]
    },
    {
      "id": "F-RA-B05-005",
      "severity": "Medium",
      "category": "Integration Wiring / Performance",
      "title": "School Dashboard Uses Internal fetch() Calls Instead of Direct Domain Functions",
      "files": ["schooldashboard/page.tsx"]
    },
    {
      "id": "F-RA-B05-006",
      "severity": "Low",
      "category": "UX / Flow Consistency",
      "title": "System Pages Have Inconsistent Error Handling for Auth Redirects",
      "files": ["license/page.tsx", "schooldashboard/page.tsx", "reports/[licenseId]/page.tsx", "reports/page.tsx"]
    },
    {
      "id": "F-RA-B05-007",
      "severity": "Low",
      "category": "Auth / Flow Consistency",
      "title": "Teacher Layout Checks expired_date but Child Pages Don't",
      "files": ["teacher/layout.tsx", "teacher/*/page.tsx"]
    },
    {
      "id": "F-RA-B05-008",
      "severity": "Low",
      "category": "Performance / API Contract",
      "title": "create-new-student Page Fetches All Students Unnecessarily",
      "files": ["class-roster/[classroomId]/create-new-student/page.tsx"]
    }
  ],
  "route_parity_violations": [
    "7 teacher pages have no auth guard at page level",
    "2 routes use inefficient fetch() to internal APIs",
    "0 routes use domain layer functions",
    "0 routes have audit logging"
  ],
  "integration_wiring_violations": [
    "4 license components use Firestore direct access (bypass domain layer)",
    "3 components use fetch() to internal API routes",
    "0 components use domain layer functions directly"
  ],
  "ux_flow_violations": [
    "Inconsistent auth redirect patterns (redirect vs UnauthorizedPage)",
    "License delete has no confirmation dialog",
    "Teacher layout expiration check not enforced in child pages"
  ],
  "error_response_violations": [],
  "retry_recommendation": "none",
  "confidence": "high"
}
```
