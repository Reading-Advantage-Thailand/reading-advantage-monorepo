# Line Review Evidence: primary-advantage-001

Reviewer: Measure Review A (assigned batch ID "PA-LR-001" was not present in `batch-manifest.json`; mapped to the first manifest batch "primary-advantage-001")
Files assigned: 7
Lines assigned: 532

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|---:|
| `apps/primary-advantage/.env.example` | 1-22 | reviewed | 0 |
| `apps/primary-advantage/.gitignore` | 1-52 | reviewed | 0 |
| `apps/primary-advantage/AGENTS.md` | 1-147 | reviewed | 0 |
| `apps/primary-advantage/Dockerfile` | 1-51 | reviewed | 2 |
| `apps/primary-advantage/README.md` | 1-79 | reviewed | 1 |
| `apps/primary-advantage/actions/article.ts` | 1-135 | reviewed | 3 |
| `apps/primary-advantage/actions/classroom.ts` | 1-46 | reviewed | 2 |

## Findings

### LR-primary-advantage-001-001 — Dockerfile still references Prisma despite claimed removal

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/Dockerfile:12-18,40-42`
- Evidence: The Dockerfile runs `npm run prisma:generate` (line 18), copies `/app/prisma` (line 41), and copies `/app/node_modules/.prisma` (line 42). This directly contradicts `apps/primary-advantage/AGENTS.md:27-30` and `AGENTS.md:95-106`, which state Prisma has been fully removed and is forbidden.
- Impact: Deployment builds stale Prisma artifacts or fail if `prisma/` directory/scripts are gone; creates source-of-truth conflict about migration state.
- Recommendation: Remove Prisma generation and copy steps from the Dockerfile, or document why Prisma artifacts remain and update AGENTS.md.

### LR-primary-advantage-001-002 — Dockerfile uses npm instead of monorepo pnpm

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/Dockerfile:7-9`
- Evidence: `COPY package.json package-lock.json* ./` and `RUN npm ci` assume an npm workflow. The monorepo uses pnpm (root `AGENTS.md` build commands, `pnpm-lock.yaml`, `pnpm turbo run ...`).
- Impact: Docker build may use wrong lockfile/dependency graph, drift from workspace resolution, and fail in CI.
- Recommendation: Convert Dockerfile to pnpm workspace install using root `pnpm-lock.yaml` and `pnpm deploy` or equivalent.

### LR-primary-advantage-001-003 — Server actions expose article generation/deletion without authorization

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/actions/article.ts:25-37`
- Evidence: `generateArticle`, `generateArticleNew`, and `getDeleteArticleById` are exported `"use server"` actions with no `currentUser()`, role, or permission check. Any client that can import these actions can trigger article generation or deletion.
- Impact: Privilege escalation; potential unauthorized content creation/deletion.
- Recommendation: Add `currentUser()` and role check (e.g., admin/system) before calling controllers.

### LR-primary-advantage-001-004 — getLessonSummaryData lacks tenant/schoolId scoping

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/actions/article.ts:64-83,108-117`
- Evidence: Queries `userActivity` and `xpLogs` filtered only by `userId` and `targetId`/`activityId`. No `schoolId` join or filter is applied, contrary to root `AGENTS.md` multi-tenancy rule that every query must be scoped by `schoolId`.
- Impact: Cross-tenant data leakage if userId is reused or compromised across schools.
- Recommendation: Join through `users.schoolId` or add `schoolId` filters to these queries.

### LR-primary-advantage-001-005 — Server actions use unstructured console.error logging

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/actions/article.ts:49,132`
- Evidence: `console.error("Error tracking article access:", error)` and similar in `getLessonSummaryData`. Root `AGENTS.md` observability section requires structured logs.
- Impact: Unstructured, unsearchable production logs; missing request/user/operation metadata.
- Recommendation: Replace with internal structured logger.

### LR-primary-advantage-001-006 — Classroom code creation lacks authorization

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/actions/classroom.ts:31-46`
- Evidence: `createClassroomCode(classroomId)` generates and persists an enrollment code for any `classroomId` without checking if the caller is a teacher/admin or owns the classroom.
- Impact: Any logged-in user (including a student) could create enrollment codes for arbitrary classrooms, allowing unauthorized access to primary-student rosters.
- Recommendation: Add `currentUser()` and classroom ownership/role authorization before `createClassCode`.

### LR-primary-advantage-001-007 — Fetch students by class code lacks authorization

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/actions/classroom.ts:9-29`
- Evidence: `fetchStudentsByClassCode(code)` returns the student roster for a class code after only a string type check. No user authentication or role check is performed.
- Impact: Student roster enumeration and PII exposure for primary students.
- Recommendation: Gate behind authenticated teacher/admin role or classroom ownership.

### LR-primary-advantage-001-008 — README and AGENTS.md disagree on authentication stack

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/README.md:73`
- Evidence: README states "Authentication: Simplified Firebase integration with classroom tools". `AGENTS.md:15-20` and `.env.example:15-18` describe a pending tRPC/backend auth migration with Google OAuth placeholders. Actual implementation cannot be both.
- Impact: Developer/operator confusion about which auth adapter is authoritative.
- Recommendation: Update README and AGENTS.md to reflect the actual deployed auth adapter.

## No-Finding Notes

- `apps/primary-advantage/.env.example`: reviewed line-by-line; standard env template, no findings.
- `apps/primary-advantage/.gitignore`: reviewed line-by-line; standard ignore rules, no findings.
- `apps/primary-advantage/AGENTS.md`: reviewed line-by-line; no direct findings in this file (noted as contradicted by Dockerfile finding LR-primary-advantage-001-001 above).
