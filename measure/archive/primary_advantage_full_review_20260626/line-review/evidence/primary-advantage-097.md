# Line Review Evidence: primary-advantage-097

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-097
Files assigned: 5
Lines assigned: 1107

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/models/userModel.ts` | 1-596 | reviewed | 5 |
| `apps/primary-advantage/server/utils/assistant.ts` | 1-147 | reviewed | 2 |
| `apps/primary-advantage/server/utils/auth.ts` | 1-250 | reviewed | 2 |
| `apps/primary-advantage/server/utils/constants.ts` | 1-34 | reviewed | 0 |
| `apps/primary-advantage/server/utils/genaretors/__tests__/new-generator.caller.test.ts` | 1-80 | reviewed | 0 |

## Findings

### LR-primary-advantage-097-001 — `bcrypt.hashSync` blocks the event loop

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/userModel.ts:35`
- Evidence: Line 35 uses `bcrypt.hashSync(data.password, 10)` for password hashing. Synchronous bcrypt blocks the Node.js event loop for ~100ms per call (cost factor 10). The async `bcrypt.hash()` is available and has the same API.
- Impact: Under concurrent sign-up requests, the event loop stalls, increasing latency for all in-flight requests. The Reading Advantage `auth/register` route likely has the same pattern.
- Recommendation: Replace `bcrypt.hashSync(data.password, 10)` with `await bcrypt.hash(data.password, 10)`. The `createUser` function is already `async`, so this is a one-line change.

### LR-primary-advantage-097-002 — Silent error swallowing in multiple model functions

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/userModel.ts:70-75,105-107,179-181,191-192,211-213`
- Evidence: `createUser` (line 71) logs errors with `console.error` but returns `{ error: "Error creating user" }`, losing the original error. `updateUserActivity` (line 106), `getUserByEmail` (line 180), `getUserById` (line 191), and `getUserActivity` (line 212) log errors with `console.log` and return `undefined` implicitly — callers receive `undefined` with no error signal. `getUserArticleRecords` (line 389) and `getUserReminderReread` (line 593) correctly re-throw, creating an inconsistency within the same file.
- Impact: API routes that call `getUserByEmail` or `getUserById` receive `undefined` on database errors and may treat the user as non-existent rather than handling a transient failure. The inconsistency means some functions surface errors and some silently swallow them.
- Recommendation: Standardize on either throwing structured errors or returning `{ error: string }` result objects across all functions in this file. Replace `console.log` with `console.error` for error paths.

### LR-primary-advantage-097-003 — Extensive `any` type usage bypasses type safety

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/userModel.ts:226,275,302-339,444-459,495,519-537`
- Evidence: Line 226: `const activityConditions: any[]`. Line 275: `let articleRows: any[]`. Lines 302-339: multiple `(a: any)` callbacks in `.some()` and `.filter()` calls. Lines 444-459: same pattern in `getUserReminderReread`. Line 495: `let articleRows: any[]`. Lines 519-537: repeated `(a: any)` type assertions.
- Impact: TypeScript cannot catch type mismatches at compile time. A change to the `userActivity` or `articles` schema could silently break these queries without a type error. The `any` usage also prevents IDE autocomplete and refactoring support.
- Recommendation: Replace `any[]` conditions with `Array<SQL<unknown>>` for Drizzle where clauses. Type activity callbacks using `InferSelectModel<typeof userActivity>` or at minimum `{ activityType: string; completed: boolean; details: Record<string, unknown> }`.

### LR-primary-advantage-097-004 — In-memory pagination fetches all records then slices

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/userModel.ts:246-377`
- Evidence: `getUserArticleRecords` fetches all article activities for the user (line 246), groups them in memory (lines 252-271), fetches all matching articles (line 282), processes all records (lines 292-373), and only then applies pagination via `.slice(offset, offset + limit)` on line 376. The function accepts `page` and `limit` parameters but ignores them during the database query.
- Impact: For users with hundreds of article interactions, the function loads all data into memory and processes it before paginating. This wastes memory and CPU. The same pattern exists in `getUserReminderReread` (line 394) which returns all reminder records without any pagination.
- Recommendation: Push pagination into the SQL query using `.limit(limit).offset(offset)` on the initial activity fetch, or at minimum use a COUNT query for the total before fetching only the page's worth of article details.

### LR-primary-advantage-097-005 — Duplicated status/scoring logic between `getUserArticleRecords` and `getUserReminderReread`

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/userModel.ts:299-358,517-572`
- Evidence: Lines 299-329 (status determination) and 517-547 are near-identical. Lines 332-358 (score calculation) and 550-572 are near-identical. The same activity-type checks, `hasRead`/`hasMCQ`/`hasSAQ`/`hasLAQ`/`hasRating` booleans, and status string assignments are duplicated across both functions.
- Impact: Any change to status logic or score calculation must be applied in two places, creating a risk of divergence. The reminder function already diverges slightly (line 563-572 checks SA/LA completion differently).
- Recommendation: Extract a shared `determineStatus(activities)` and `calculateScore(activities)` helper. Both functions can call the helper instead of duplicating the logic.

### LR-primary-advantage-097-006 — Direct AI provider coupling bypasses adapter pattern

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/assistant.ts:13-14,69-74,131-136`
- Evidence: Line 13 imports `google, googleModel, googleModelLite` directly from `@/utils/google`. Line 14 imports `generateObject` from `@reading-advantage/ai`. Lines 69-74 and 131-136 pass `google(googleModel)` as the model to `generateObject`. The AGENTS.md states "AI access must go through an internal adapter" and "Application code must not depend directly on provider SDKs." While `@reading-advantage/ai` is the adapter package, the direct import of `google` and `googleModel` from a local utility couples this module to the specific AI provider.
- Impact: Switching from Google to another AI provider requires editing this file and all other files that import from `@/utils/google`. The `googleModel` and `googleModelLite` constants are hardcoded to specific model names.
- Recommendation: Move the provider selection into the `@reading-advantage/ai` adapter (e.g., `generateObject({ provider: "google", ... })`) so application code only imports from the adapter.

### LR-primary-advantage-097-007 — Synchronous filesystem reads for AI prompt templates

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/assistant.ts:45-48,109-112`
- Evidence: Both `getSaqFeedback` (line 45) and `getLaqFeedback` (line 109) use `fs.readFileSync(path.join(process.cwd(), "data", "prompts-feedback-user-SA.json"))` to load prompt templates. These are synchronous I/O operations that block the event loop. Additionally, the templates are re-read from disk on every function call rather than being cached.
- Impact: Each AI feedback request blocks the event loop while reading from disk. Under concurrent load, this adds latency. The file paths are also relative to `process.cwd()`, which can break if the working directory changes.
- Recommendation: Read the templates once at module level (or use a cached loader) and store them in a module-scoped variable. Switch to `fs.promises.readFile` if lazy loading is preferred.

### LR-primary-advantage-097-008 — `SchoolAdmins` field uses PascalCase violating TypeScript conventions

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/utils/auth.ts:23`
- Evidence: The `UserWithRoles` interface defines `SchoolAdmins: Array<{ id: string; schoolId: string }>` on line 23 using PascalCase. All other fields in the interface (`id`, `email`, `schoolId`, `level`, `roles`) use camelCase. TypeScript convention is camelCase for object properties.
- Impact: Inconsistent naming creates confusion and requires callers to remember the casing exception. The PascalCase suggests this was copied from a Prisma relation name (Prisma uses PascalCase for relation fields) without renaming after the Drizzle migration.
- Recommendation: Rename to `schoolAdmins` (camelCase) and update all references (lines 72, 80, 113, 138, 166, 202).

### LR-primary-advantage-097-009 — System admin `getUserSchoolIds` returns all school IDs without filtering

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/utils/auth.ts:183-191`
- Evidence: Lines 183-191: when `isSystemAdmin` is true, the function fetches ALL schools from the database and returns all their IDs. This grants system admins unrestricted cross-tenant access through `canAccessSchool`. The function does not log or audit this broad access.
- Impact: In a multi-school Primary Advantage deployment, a system admin role bypasses all tenant boundaries. If a compromised account has the system role, it can access every school's data. The lack of audit logging means cross-tenant access is invisible.
- Recommendation: Add structured audit logging when system admin accesses all schools. Consider whether system admin should have an explicit `*` wildcard instead of fetching all school IDs, to make the intent clear in calling code.

## No-Finding Notes

- `apps/primary-advantage/server/utils/constants.ts`: reviewed lines 1-34; no findings. The file contains only constant definitions (TTS URL, audio/image paths, voice lists). No logic, no security concerns. The hardcoded Google TTS URL is a configuration concern, not a material finding.
- `apps/primary-advantage/server/utils/genaretors/__tests__/new-generator.caller.test.ts`: reviewed lines 1-80; no findings. The test correctly mocks `@reading-advantage/db` with `vi.fn()` (line 36-42), uses `vi.hoisted` for mock setup (line 32), and validates that `generateArticleNew` properly awaits `db.transaction` (the FR-3 regression guard). The 15-second timeout is appropriate for the retry-loop behavior being tested. The directory name typo `genaretors` is noted as a pre-existing issue (not specific to this test file).
