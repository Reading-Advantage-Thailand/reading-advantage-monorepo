# Line Review Evidence: primary-advantage-056

Reviewer: coder-deepseek-v4-flash/primary-advantage-056
Files assigned: 1
Lines assigned: 842

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/teacher/assignment-dashboard.tsx` | 1-842 | reviewed | 4 |

## Findings

### LR-primary-advantage-056-001 — Dead code: commented-out fetchArticle function

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:225-240`
- Evidence: Lines 225–240 contain a fully commented-out `fetchArticle` async function that was intended to fetch article data from `/api/v1/articles/${articleId}`. The function body, try/catch, and all calls are commented out. It remains as dead code in the component.
- Impact: Increases code surface unnecessarily; could confuse future maintainers about whether article fetching should happen in this component. If re-enabled, the endpoint path (`/api/v1/articles`) differs from the pattern used elsewhere in this component (`/api/assignments` at line 216).
- Recommendation: Remove the dead code block in a maintenance pass.

### LR-primary-advantage-056-002 — Missing user-facing error feedback on failure paths

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:300-302`, `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:305-306`
- Evidence: Lines 300-302 and 305-306 catch errors in the `handleDeleteStudents` and `fetchAssignment` functions using `console.error` only. The comments on lines 302 and 306 explicitly state "You might want to show a user-friendly error message here" but no toast, alert, or UI error state is implemented. Users receive no visual feedback when data fetching or deletion fails.
- Impact: Silent failures degrade teacher trust in the assignment management workflow. Teachers may believe an operation succeeded when it did not, leading to data inconsistency confusion.
- Recommendation: Add toast notifications (e.g., via sonner) or inline error state for API failure paths.

### LR-primary-advantage-056-003 — API endpoint path inconsistency

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:216`, `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:282`
- Evidence: Line 216 fetches assignment data from `/api/assignments?id=${assignmentId}` (no `/v1/` prefix), while line 282 issues DELETE requests to `/api/v1/assignments` (with `/v1/` prefix). These point to different route handler trees. Either the `v1` prefix is intentional for a separate versioned API or this is a copy-paste error from Reading Advantage code.
- Impact: If the `/api/v1/` routes are unregistered or behave differently, the delete operation may fail silently (the error path already lacks user feedback per finding 002). Inconsistent API versioning makes maintenance harder.
- Recommendation: Unify API paths to a consistent versioning scheme, or remove the `v1` prefix if no versioned API exists.

### LR-primary-advantage-056-004 — Potential student identifier exposure in UI

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/teacher/assignment-dashboard.tsx:802`
- Evidence: Line 802 displays `{student.studentId.slice(-8)}{"..."}`, showing the last 8 characters of the student ID. For primary students, even partial identifiers may constitute personal data exposure, especially under regulations like COPPA or GDPR-K.
- Impact: Partial student ID exposure in the teacher dashboard may violate data-minimization principles for primary-age educational software. The `studentId` format and sensitivity are not documented.
- Recommendation: Review whether `studentId` contains PII or school-internal identifiers. Consider replacing with a display-friendly pseudonym or removing the ID display entirely for the teacher UI.

## No-Finding Notes

- (No files in this batch have zero findings.)

