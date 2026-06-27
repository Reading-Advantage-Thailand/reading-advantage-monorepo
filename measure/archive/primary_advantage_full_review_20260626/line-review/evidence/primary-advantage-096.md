# Line Review Evidence: primary-advantage-096

Reviewer: coder-deepseek-v4-flash/primary-advantage-096
Files assigned: 1
Lines assigned: 912

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/models/teacherModel.ts` | 1-912 | reviewed | 5 |

## Findings

### LR-primary-advantage-096-001 — Dead import: `void drizzleOr` at line 196

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/teacherModel.ts:196`
- Evidence: Line 192 imports `or as drizzleOr` from `@reading-advantage/db`. Line 196 immediately evaluates `void drizzleOr;` with the comment "kept for parity — actual call uses sql template above". The `drizzleOr` symbol is never used in any actual logic; the `sqlOr` helper at line 193 uses raw `sqlTag` ILIKE templates instead. This is dead code.
- Impact: Dead code increases cognitive load during maintenance and suggests incomplete cleanup after a refactor.
- Recommendation: Remove the `drizzleOr` import alias and the `void` statement. If `or` from `drizzle-orm` is needed for future use, import it lazily at point of use.

### LR-primary-advantage-096-002 — Static imports placed after first use (line 192)

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/teacherModel.ts:192`
- Evidence: The static ESM import `import { sql as sqlTag, count as sqlCountStar, or as drizzleOr } from '@reading-advantage/db';` is placed at line 192, approximately 40% into the file. The symbols `sqlCountStar` and `sqlTag` are first used earlier: `sqlCountStar()` at line 109 and `sqlTag` at line 74 (inside `sqlOr`, invoked at line 74). While ESM static imports are hoisted and work correctly at runtime, placing them after their first use is highly unconventional and violates the standard practice of colocating all imports at the top of the module.
- Impact: Harms readability and sets a confusing precedent for developers working on the file. Future readers may not notice the late import and could reintroduce ordering bugs with dynamic imports.
- Recommendation: Move all static imports to the top of the file (before line 24), consistent with standard TypeScript/ESM conventions.

### LR-primary-advantage-096-003 — Destructive role deletion in `updateTeacher` wipes all user roles

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/teacherModel.ts:758-764`
- Evidence: When `updateData.role` is provided in the `updateTeacher` function (line 751), the transaction deletes **all** `userRoles` for the user at line 760: `tx.delete(userRoles).where(eq(userRoles.userId, id))`. This contrasts with the sibling function `updateExistingTeacherToSchool` (lines 628-634), which correctly scopes the deletion to only `["teacher", "admin"]` roles via `inArray(roles.name, ["teacher", "admin"])`. If a user has non-teacher/non-admin role assignments (e.g., "student", "parent", custom roles), `updateTeacher` silently destroys those assignments.
- Impact: Can silently delete non-teacher role assignments for users who have multiple roles. This is a data integrity bug that could cause users to lose access to functionality governed by their non-teacher roles.
- Recommendation: Match the pattern from `updateExistingTeacherToSchool`: scope the role deletion to `inArray(roles.name, ["teacher", "admin"])` instead of deleting all roles.

### LR-primary-advantage-096-004 — Direct bcryptjs usage bypassing auth adapter

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/server/models/teacherModel.ts:17, 405-406, 605, 739`
- Evidence: Line 17 imports `bcryptjs` directly (`import bcrypt from "bcryptjs"`). Password hashing is performed inline at lines 405-406 (`bcrypt.hashSync(password, 10)`), line 605 (`bcrypt.hashSync(password, 10)`), and line 739 (`bcrypt.hashSync(updateData.password, 10)`). Per the monorepo AGENTS.md, auth operations (including password handling) should use the shared auth adapter (`auth.changePassword()`, etc.) and must not depend on library-specific APIs directly.
- Impact: Direct dependency on `bcryptjs` couples the app to a specific hashing library and bypasses the shared auth adapter pattern. This is a blocker for migrating to the standardized auth adapter strategy described in AGENTS.md.
- Recommendation: Move password hashing behind an auth adapter function (e.g., `auth.hashPassword()` or `auth.changePassword()`) exported from `@reading-advantage/auth`. Remove the direct `bcryptjs` import from this model file.

### LR-primary-advantage-096-005 — Extensive use of `any` types in query building

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/teacherModel.ts:48, 58, 141, 193, 250, 410, 599, 734, 869`
- Evidence: Multiple critical data structures are typed as `any`, bypassing TypeScript's compile-time checks:
  - Line 48: `let schoolFilter: any = {};`
  - Line 58: `const whereConditions: any[] = [...]`
  - Line 141: `Map<string, Map<string, { ... students: any[] }>>`
  - Line 193: `function sqlOr(colA: any, colB: any, pattern: string)`
  - Line 250: `Map<string, { ... students: any[] }>`
  - Line 410: `const classroomConditions: any[] = [...]`
  - Line 599: `const updateData: any = {}`
  - Line 734: `const updatePayload: any = {}`
  - Line 869: `Map<string, { classroomIds: Set<string>; ... }>` (properly typed as exception)
- Impact: `any` types disable TypeScript's structural type checking on these variables, making refactoring error-prone and hiding potential bugs where the shape of query results or update payloads changes.
- Recommendation: Replace `any` with proper types: use `InferSelectModel` for DB row types, create union types for query filters, and use typed records for maps instead of `any[]` student arrays.

## No-Finding Notes

- All 912 lines of `apps/primary-advantage/server/models/teacherModel.ts` were read line-by-line. The file implements an MVC-style model for teacher CRUD, statistics, and classroom assignment operations using Drizzle ORM queries via `@reading-advantage/db`. The code is functionally complete and handles the main teacher management workflows (list, get, create, update, delete, statistics). Five findings were identified as detailed above; no other material issues were found.
