# Line Review Evidence: primary-advantage-092

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-092
Files assigned: 1
Lines assigned: 479

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/models/assignmentModel.ts` | 1-479 | reviewed | 11 |

## Findings

### LR-primary-advantage-092-001 — Pagination-before-filter corruption in `getStudentAssignments`

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/assignmentModel.ts:142-240`
- Evidence: The DB query (lines 148-177) applies `.limit(limit).offset((page - 1) * limit)` to the unfiltered row set. In-memory filters for `searchTerm` (lines 210-219) and `dueDateFilter` (lines 222-240) execute after pagination. When filters are active, `totalCount` (line 145) counts unfiltered rows, `totalPages` (line 243) is wrong, and each page may return fewer than `limit` items (or zero items when the page slice contains no matching rows). The search filter is documented as preserving "Prisma's nested-where semantics" (line 135), confirming this is a Prisma-to-Drizzle migration regression.
- Impact: Primary students using the assignment list with search or due-date filters see incorrect pagination counts and potentially empty pages. A student on page 2 with a search filter may see zero results even though matching assignments exist on other pages. The `totalCount` reported to the UI is the unfiltered total, misleading the pagination controls.
- Recommendation: Push `search` and `dueDateFilter` into the SQL WHERE clause using Drizzle `ilike` / date comparisons before `.limit()` and `.offset()`. Remove the in-memory filter fallback. Alternatively, if the Prisma-compatibility stitch must remain, apply filters before pagination by fetching the full result set or using a subquery.

### LR-primary-advantage-092-002 — `createAssignment` and `updateUserLessonProgress` lack `schoolId` multi-tenancy scoping

- Severity: Critical
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/assignmentModel.ts:27-101,337-418`
- Evidence: `createAssignment` (line 38-51) queries `classrooms` and `articles` by `id` only, with no join to `users.schoolId` or filter on `classroom.schoolId`. The `studentAssignments` insert (line 91) writes rows for arbitrary `studentId` values without verifying the students belong to the same school. `updateUserLessonProgress` (line 345-352) queries `lessonProgress` by `userId`, `articleId`, `assignmentId` without any school context. Root `AGENTS.md` multi-tenancy rule: "Every query must be scoped by `schoolId`. Check `user.schoolId` or `tenant.schoolId`. Never trust tenant IDs from the frontend without verifying the user has access."
- Impact: A teacher in school A could create an assignment referencing a classroom/article from school B. A student whose `userId` is reused across schools could see lesson progress from another school. This is the same root-cause anti-pattern documented across Reading Advantage.
- Recommendation: Add `schoolId` scoping: join `classrooms` to verify `classroom.schoolId = user.schoolId` in `createAssignment`, and scope `lessonProgress` queries through a `users.schoolId` join in `updateUserLessonProgress`.

### LR-primary-advantage-092-003 — `updateUserLessonProgress` never sets `completedAt` when marking COMPLETED

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/assignmentModel.ts:374-381`
- Evidence: Line 374-381: `await tx.update(studentAssignments).set({ status: "COMPLETED" }).where(...)` only sets `status` — the `completedAt` column is not populated. Compare with the `IN_PROGRESS` branch (line 394-396) which also omits `startedAt`. The Prisma-era version of this model likely relied on `@updatedAt` defaults or explicit timestamps. The `studentAssignments` table schema includes `completedAt` and `startedAt` columns (visible from the select in lines 155-156).
- Impact: `studentAssignments.completedAt` remains `NULL` for all completed assignments. Dashboards, reports, and the student assignment table (which reads `completedAt` at line 155) will show no completion timestamp. Time-based analytics (e.g., "average time to complete") are broken.
- Recommendation: Add `completedAt: new Date()` to the `.set({ status: "COMPLETED", completedAt: new Date() })` call on line 375. Similarly, add `startedAt: new Date()` to the `IN_PROGRESS` transition on line 395.

### LR-primary-advantage-092-004 — `getAssignmentById` lacks tenant scoping on assignment and child queries

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/assignmentModel.ts:267-327`
- Evidence: `getAssignmentById` filters by `assignments.id` (line 275) and `studentAssignments.studentId` (line 289), but does not verify that the assignment's `classroomId` belongs to a school the current user has access to. The child queries (lines 299-303) for `sentencsAndWordsForFlashcards`, `multipleChoiceQuestions`, `shortAnswerQuestions`, `longAnswerQuestions` are filtered only by `articleId`, not by any school scope.
- Impact: A user who guesses or enumerates assignment UUIDs can read assignment data, article content, and question sets from any school. Combined with the `currentUser()` auth check (line 269), the attack surface is limited to authenticated users, but cross-tenant reads are still possible.
- Recommendation: After fetching the assignment, verify `assignment.classroomId` resolves to a classroom in the user's school before returning child data. Or scope the initial assignment query with a classroom-schoolId join.

### LR-primary-advantage-092-005 — Dead code: redundant `existingAssignment` guard (Prisma migration artifact)

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/assignmentModel.ts:68-74`
- Evidence: Lines 68-71: `if (existingAssignment) { throw new Error("Assignment already exists"); }`. Line 74: `if (!existingAssignment) { ... }`. Since line 70 throws when `existingAssignment` is truthy, execution only reaches line 74 when `existingAssignment` is falsy, making the `if (!existingAssignment)` condition always true — dead code. This is a Prisma-to-Drizzle migration artifact: the original Prisma code likely used an upsert or conditional create pattern.
- Impact: No runtime bug, but the dead branch obscures intent and creates a false impression that an alternative code path exists when `existingAssignment` is truthy. This can mislead future maintainers.
- Recommendation: Remove the `if (!existingAssignment)` wrapper on line 74; the code inside it is the only reachable path.

### LR-primary-advantage-092-006 — `currentUser()` auth boundary leak into model layer

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/assignmentModel.ts:16,29,269`
- Evidence: `currentUser()` is imported from `@/lib/session` (line 16) and called inside `createAssignment` (line 29) and `getAssignmentById` (line 269). Per `AGENTS.md`, business logic must not depend on transport-layer concerns. Models should receive the authenticated user as a parameter, not call session/auth functions directly. This pattern is shared with Reading Advantage's Prisma-era models.
- Impact: The model cannot be called from workers, cron jobs, CLI tools, or tests without mocking the session layer. It also hides the auth dependency from callers, making it unclear whether the function requires authentication.
- Recommendation: Accept `user` (or `userId`) as a parameter in `createAssignment` and `getAssignmentById`. Move the `currentUser()` call to the route handler or server action layer.

### LR-primary-advantage-092-007 — `getStudentAssignments` and `getAssignmentById` use `any` types

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/assignmentModel.ts:120,296`
- Evidence: Line 120: `const whereConditions: any[] = [...]`. Line 296: `let articleWithChildren: any = article[0] ?? null`. Both bypass TypeScript's type safety. The `any[]` on `whereConditions` allows non-Drizzle condition objects to be pushed without compile-time errors. The `any` on `articleWithChildren` loses the article schema type, allowing arbitrary property access downstream.
- Impact: Type errors in filter conditions or article child composition will only surface at runtime. Downstream code that reads `articleWithChildren.sentencsAndWordsForFlashcard` (line 307) gets no compile-time guarantee the property exists.
- Recommendation: Use `SQL[]` or `DrizzleFilterType[]` for `whereConditions`. Infer the article-with-children type from the Drizzle select or define an explicit interface.

### LR-primary-advantage-092-008 — Inconsistent error handling: `getUserLessonProgress` and `getAssignmentActivityById` silently swallow errors

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/assignmentModel.ts:420-445,447-475`
- Evidence: `getUserLessonProgress` (lines 439-444) and `getAssignmentActivityById` (lines 469-474) catch errors, log them, but do not re-throw. They return `undefined` implicitly on error. Every other function in the file (`createAssignment`, `getStudentAssignments`, `getAssignmentById`, `updateUserLessonProgress`) re-throws the error. This inconsistency means callers of `getUserLessonProgress` and `getAssignmentActivityById` receive `undefined` on error instead of an exception.
- Impact: Callers cannot distinguish "no data found" from "database error". If a route handler expects an exception on failure (matching the other functions), it will proceed with `undefined`, potentially causing a downstream crash with a less informative error message.
- Recommendation: Add `throw error;` (or wrap with a structured error) inside the catch blocks of both functions, matching the pattern used by all other functions in this file.

### LR-primary-advantage-092-009 — Mid-file import block violates top-of-file import convention

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/assignmentModel.ts:329-335`
- Evidence: Lines 329-335 import `sentencsAndWordsForFlashcards`, `multipleChoiceQuestions`, `shortAnswerQuestions`, `longAnswerQuestions` from `@reading-advantage/db` with local aliases. These imports appear mid-file, between `getAssignmentById` and `updateUserLessonProgress`. All other module imports are at lines 1-16. The comment on line 329 says "Local table aliases for the join tables used by getAssignmentById" — they are scoped to that function but placed at file scope.
- Impact: Minor maintainability issue. Tooling (ESLint `import/first` rule, bundlers) may flag this. The imports work correctly due to JavaScript hoisting, but the pattern is inconsistent with the rest of the file.
- Recommendation: Move the import block to lines 1-16 alongside the other `@reading-advantage/db` imports, removing the mid-file comment.

### LR-primary-advantage-092-010 — Bottom-of-file import of `endOfDay` from `date-fns`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/assignmentModel.ts:477-479`
- Evidence: Line 479: `import { endOfDay } from "date-fns";`. This is the last line of the file. The comment on lines 477-478 explains: "`endOfDay` is preserved via date-fns for parity with the Prisma version." The import is used only in `createAssignment` (line 83). All other imports are at the top of the file.
- Impact: No runtime issue (ES module imports are hoisted), but violates the convention of top-of-file imports. The comment suggests this was a deliberate Prisma-migration preservation, but it should have been consolidated.
- Recommendation: Move the `import { endOfDay } from "date-fns"` to the top of the file with the other imports. Remove the explanatory comment.

### LR-primary-advantage-092-011 — `getAssignmentActivityById` does not scope by `assignmentId`

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/models/assignmentModel.ts:447-475`
- Evidence: `getAssignmentActivityById` accepts `(id, userId)` where `id` is used as `articleActivityLogs.articleId` (line 458). The function name suggests it fetches activity for an *assignment*, but it actually queries by `articleId`. If the same article is assigned multiple times (different assignments), the function returns activity from the first matching row regardless of which assignment the student is working on. The `assignmentId` is never passed to the query.
- Impact: For primary students who may have the same article assigned in multiple classrooms or as reassigned work, the activity log returned may correspond to a different assignment's progress. The UI (lesson progress bar, activity indicators) could show incorrect completion state.
- Recommendation: Either rename the function to `getArticleActivityById` to match its actual behavior, or add `eq(articleActivityLogs.assignmentId, assignmentId)` to the WHERE clause if the table supports it. Verify the `articleActivityLogs` schema has an `assignmentId` column.

## No-Finding Notes

- `apps/primary-advantage/server/models/assignmentModel.ts`: reviewed line-by-line (lines 1-479); 11 findings documented above. The Drizzle migration from Prisma is structurally complete (no residual Prisma imports or calls), but several migration artifacts and tenant-scoping gaps remain.
