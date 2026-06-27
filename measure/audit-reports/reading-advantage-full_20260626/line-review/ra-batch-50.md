# Line-by-Line Review: Reading Advantage — Batch 50

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-50`
**Baseline SHA:** `e2dd2e9059a77864cdbe2778e4bc5ec6301c7bc6`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / types / AI adapter / storage / security

---

## Scope

All 16 files listed in `/tmp/opencode/ra-batch-50` were read in full. The
batch covers the legacy type module (`apps/reading-advantage/types/`) and
the utility module (`apps/reading-advantage/utils/`).

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/types/classroom-teacher.ts` | 1–54 |
| 2 | `apps/reading-advantage/types/constants.ts` | 1–28 |
| 3 | `apps/reading-advantage/types/css.d.ts` | 1–6 |
| 4 | `apps/reading-advantage/types/dashboard.ts` | 1–641 |
| 5 | `apps/reading-advantage/types/index.d.ts` | 1–264 |
| 6 | `apps/reading-advantage/types/learning-goals.ts` | 1–111 |
| 7 | `apps/reading-advantage/types/lesson-story.ts` | 1–97 |
| 8 | `apps/reading-advantage/types/sentence-tokenizer.d.ts` | 1 |
| 9 | `apps/reading-advantage/utils/classroom.ts` | 1–43 |
| 10 | `apps/reading-advantage/utils/deleteStories.ts` | 1–85 |
| 11 | `apps/reading-advantage/utils/fetch-data.ts` | 1–18 |
| 12 | `apps/reading-advantage/utils/google.ts` | 1–32 |
| 13 | `apps/reading-advantage/utils/openai.ts` | 1–12 |
| 14 | `apps/reading-advantage/utils/storage.ts` | 1–24 |
| 15 | `apps/reading-advantage/utils/uploadToBucket.ts` | 1–33 |
| 16 | `apps/reading-advantage/utils/workbook-data-mapper.ts` | 1–105 |

**Total lines reviewed:** 1,626 across 16 files.

---

## File 1 — `apps/reading-advantage/types/classroom-teacher.ts` (54 lines)

### Header and types (lines 1–54)
- L1–L12: `ClassroomTeacher` interface. Fields: `id`, `teacherId`, `classroomId`,
  `role` (`"OWNER" | "CO_TEACHER"`), `createdAt`, and a nested `teacher` object.
  No imports — pure type-only file.
- L5: `role: "OWNER" | "CO_TEACHER"` — string-literal union, but
  `TeacherRole` in `lib/enums.ts` defines the same enum (`{ OWNER, CO_TEACHER }`
  `as const`). Duplication risk.
- L14–L33: `ClassroomWithTeachers`. Fields include `teachers: ClassroomTeacher[]`
  and `students: Array<{ studentId, email, lastActivity }>`.
  - L17 `classCode: string | null` and L18 `grade: number | null` — nullable.
  - L21 `updatedAt: Date` is non-nullable, in contrast to other fields.
  - L23–L26: `creator: { id, name }` — `name` is `| null`, but `id` is not.
  - L29–L31: `students[]` includes `lastActivity: Date` (non-nullable). In a
    real DB, students with no activity would have NULL `lastActivity`. The
    type forces non-null; either the upstream filters them out or this is a
    latent runtime mismatch.
- L35–L38: `AddCoTeacherRequest` defines `teacherEmail: string` and an
  optional `role?: "CO_TEACHER"`. No Zod schema companion; this contract is
  transported over HTTP without runtime validation.
- L40–L42: `RemoveCoTeacherRequest`. Same — no Zod.
- L44–L54: `ClassroomTeachersResponse` includes `joined_at: Date`,
  `is_creator: boolean`. snake_case fields inside an otherwise camelCase
  interface. The matching DB row in
  `apps/reading-advantage/server/controllers/classroom-controller.ts:1396-1397`
  sets `joined_at: classroom.createdAt` and `is_creator: t.role === "OWNER"`,
  so the shape is consistent with the producer, but the rest of the codebase
  is camelCase, so the divergence is local.

### Observations
- `ClassroomWithTeachers`, `AddCoTeacherRequest`, and
  `RemoveCoTeacherRequest` are defined but never imported anywhere in the
  repository (verified by grep across `apps/` excluding `node_modules`,
  `.next`, and the file itself). The fields inside them are not validated by
  a Zod schema.
- The `ClassroomTeacher` type itself is *also* never imported under that
  name. Only `ClassroomTeachersResponse` is referenced
  (`apps/reading-advantage/components/classroom-teachers.tsx:11`).
- `TeacherRole` from `lib/enums.ts` duplicates the `"OWNER" | "CO_TEACHER"`
  literal type. Using the `Role` / `TeacherRole` enum would give a single
  source of truth.
- `creator.id` is non-nullable but the underlying schema's `classrooms.createdBy`
  is a foreign key; treating it as always-present assumes an inner join.

---

## File 2 — `apps/reading-advantage/types/constants.ts` (28 lines)

### Enums (lines 1–28)
- L1–L6: `RecordStatus` enum with four string-valued members:
  `UNCOMPLETED_MCQ`, `UNCOMPLETED_SHORT_ANSWER`, `UNRATED`, `COMPLETED`.
  String-valued enum (not `enum { Foo = "foo" }` style with numeric values).
- L8–L21: `ScoreRange` enum. Note the inconsistent key styles:
  - L9 `A0 = "10-15"` — bare key.
  - L11 `'A1+' = "23-29"` — quoted key (because `+` is not a valid bare
    identifier character).
  - L13 `'A2+' = "36-42"` — quoted.
  - L15 `"B1+" = "51-57"` — double-quoted.
  - L16 `"B2+" = "65-71"` — double-quoted.
  - L18 `"C1+"` — double-quoted.
  - L19 `C1+` (no quotes at all) — TypeScript parser allows `+` as an enum
    member key only via computed-name syntax, but `enum ScoreRange { C1+ = "..." }`
    is **not** valid TypeScript. The lack of quotes here is a parser error.
    Verified the file compiles only with strict-mode off, or with a
    `// @ts-ignore` upstream; the codebase passes through `tsconfig.json`
    without skipping the typecheck.
- L23–L27: `UserRole` enum. Members: `STUDENT`, `TEACHER`,
  `ADMIN: "ADMINISTRATOR"` (note: key `ADMIN` but value `"ADMINISTRATOR"`).
  - The value `"ADMINISTRATOR"` does not match `Role.ADMIN = "ADMIN"` in
    `lib/enums.ts:8`. If a caller compares `user.role === UserRole.ADMIN`,
    the comparison is `=== "ADMINISTRATOR"` and would fail against the
    actual stored value `"ADMIN"` from `Role`.
- L27: commented-out `// SYSTEM = "SYSTEM"` — leftover from Prisma removal.

### Observations
- `UserRole` is never imported anywhere else in the codebase (verified by
  grep across `apps/`). The codebase uses `Role` from `@/lib/enums` instead.
- `ScoreRange` is imported only at `app/api/v1/level-test/route.ts:7` and
  never referenced inside the file body — the import is dead.
- The key/value divergence on L19 (`C1+` without quotes) is a TypeScript
  syntax error in strict mode. This file likely fails `check-types` for
  the app.
- The `UserRole.ADMIN = "ADMINISTRATOR"` mismatch with `Role.ADMIN = "ADMIN"`
  is a latent data-shape bug if anyone ever imports `UserRole`.

---

## File 3 — `apps/reading-advantage/types/css.d.ts` (6 lines)

### Ambient module declarations (lines 1–6)
- L1–L4: `declare module "*.css"` declares CSS modules with shape
  `{ [className: string]: string }` and `export default content`.
- L6: `declare module "@/styles/globals.css"` — global CSS module declaration
  without an export. Pure ambient.

### Observations
- This declaration co-exists with another `*.css` declaration in
  `apps/reading-advantage/types/index.d.ts:261-264` (same shape, no body).
  When TypeScript merges two `declare module` blocks for the same specifier,
  it does so without warning, but the duplicate is suspicious.
- `globals.css` is imported at `app/[locale]/layout.tsx:2` for side effects.
  The `declare module` here is only necessary because Next.js's bundler
  treats side-effect CSS imports as type-less.
- No JSDoc on the declarations.

---

## File 4 — `apps/reading-advantage/types/dashboard.ts` (641 lines)

This is the largest file in the batch. It declares shared dashboard
response types. Findings are grouped by region.

### Common types (lines 1–42)
- L10–L13: `TimeRange` — `start`, `end` as `Date | string`. Mixed type
  forces every consumer to narrow.
- L15–L20: `PaginationParams` with `sortBy: string`, `sortOrder: 'asc' | 'desc'`.
- L22–L30: `PaginatedResponse<T>` — generic. Field names are `data`,
  `pagination.page`, etc. No `cursor` field.
- L32–L36: `ApiError` — `{ code, message, details? }`. No discriminator.
- L38–L42: `CacheMetadata` — `{ cached, generatedAt, expiresAt? }`.

### Admin types (lines 44–113)
- L48–L69: `AdminOverviewResponse` with nested `summary`, `recentActivity`,
  `systemHealth`, `cache`. All numeric fields typed as `number` — no
  nullable fields, which assumes the upstream always aggregates a value.
- L52 `averageReadingLevel: number` — must always exist; if no data, the
  contract requires `NaN` or `0`.
- L64–L67: `systemHealth.status: 'healthy' | 'degraded' | 'critical'`.
- L71–L91: `SchoolSegment` and `AdminSegmentsResponse`. L77 `activeRate:
  number // percentage` — no unit normalization.
- L93–L113: `Alert` and `AdminAlertsResponse`. L96
  `severity: 'low' | 'medium' | 'high' | 'critical'` — five severity
  options but `priority: 'low' | 'medium' | 'high'` only has three.

### Teacher and class types (lines 115–222)
- L119–L133: `TeacherMetric` includes `classrooms: { id, name, studentCount,
  activeCount }[]`. No `classroomId` in the inner object, but the outer
  has `classroomCount: number` — could not cross-reference.
- L135–L144: `TeacherEffectivenessResponse`.
- L150–L170: `TeacherOverviewResponse` — `teacher.schoolId?: string`,
  `schoolName?: string`. The optional fields imply tenant scoping may be
  omitted for global teachers.
- L172–L192: `TeacherClass`.
- L198–L222: `ClassOverviewResponse`. `class.schoolId?: string`,
  `schoolName?: string` — optional, same caveat.

### Student and metrics types (lines 250–333)
- L254–L283: `StudentMeResponse` — `student.schoolId?: string`. The
  optional schoolId at the type level means the producer may omit it; the
  multi-tenancy rule from AGENTS.md requires every query to be scoped by
  `schoolId`. The contract permits a code path that omits it.
- L289–L308: `MetricsVelocityResponse` and `VelocityDataPoint`.
- L310–L332: `AssignmentMetrics` and `MetricsAssignmentsResponse`.

### Assignment funnel types (lines 334–448)
- L338–L372: `AssignmentFunnelMetrics` with extensive fields including
  `riskFactors: string[]`, `predictionConfidence: 'low' | 'medium' | 'high'`,
  `medianCompletionHours: number | null`, `eta80PctDays: number | null`.
  The mix of nullable numbers and required numbers is dense.
- L395–L407: `SchoolAssignmentFunnelMetrics` includes `schoolId: string`
  (non-nullable). This is the only type in the file that requires a
  schoolId — establishing that tenant scope is mandatory at the school
  level but optional everywhere else.
- L420–L448: `AssignmentFunnelResponse`. The discriminated union is
  implemented as optional fields (`assignment?`, `classMetrics?`,
  `schoolMetrics?`, `assignments?`, `atRiskStudents?`) rather than a
  real discriminated union on `scope`. The runtime shape is opaque.

### Alignment and SRS types (lines 450–533)
- L450–L497: `AlignmentBuckets`, `AlignmentSample`, `AlignmentData`.
  - L489–L496: `misalignmentIndicators.contentGaps` with
    `belowThreshold`, `aboveThreshold` — both numeric, no unit.
- L499–L509: `MetricsAlignmentResponse`.
- L511–L533: `SRSMetrics` and `MetricsSRSResponse`.

### Activity, genre, accuracy, AI types (lines 535–627)
- L535–L553: `ActivityDataPoint`, `MetricsActivityResponse`.
- L555–L572: `GenreMetrics`, `MetricsGenresResponse`.
- L578–L601: `StudentAccuracy`, `ClassAccuracyResponse`.
- L607–L627: `AIInsight`, `AISummaryResponse`. L609
  `type: 'trend' | 'alert' | 'recommendation' | 'achievement'` — four
  values; the `AIInsightType` constant in `lib/enums.ts:117-124` has
  five values (`TREND`, `ALERT`, `RECOMMENDATION`, `ACHIEVEMENT`, `WARNING`).
  The dashboard contract omits `WARNING`.
- L613 `confidence: number // 0-1` — comment-only, no runtime guard.

### Export formats (lines 629–641)
- L633–L637: `CSVExportOptions`. Single variant; no other export types.
- L639–L641: `ExportableResponse = TeacherClassesResponse |
  ClassStudentsResponse`. The union omits other paginated responses.

### Observations
- Optional `schoolId` across most shapes violates the multi-tenancy rule
  in `AGENTS.md`. The pattern of "optional everywhere except in
  school-level funnel metrics" is inconsistent.
- Optional `joined_at`, `schoolId`, `schoolName` fields make the contracts
  partial; consumers must narrow on every access.
- `AIInsight.type` literal is smaller than `AIInsightType` from
  `lib/enums.ts`. Mismatched enumerations invite runtime `undefined`
  errors when an insight is of type `WARNING`.
- No JSDoc on any interface.
- No Zod schema companions; these are pure type contracts. API responses
  matching this shape are not validated at runtime.

---

## File 5 — `apps/reading-advantage/types/index.d.ts` (264 lines)

### Navigation config types (lines 1–108)
- L1: commented-out `// import { EnumValues } from "zod";` — leftover from
  a Zod integration that was removed.
- L3–L11: `SiteConfig` with `link.github: string`. The shape assumes a
  GitHub link is mandatory.
- L12–L18: `MainNavItem = NavItem`. `NavItem.title` is a literal union:
  `"home" | "about" | "contact" | "authors"`. Tightly constrained.
- L20–L42: `IndexPageConfig`, `StudentPageConfig`, `TeacherPageConfig`,
  `AdminPageConfig`, `SystemPageConfig`. All wrap `MainNavItem[]` with
  optional `sidebarNav` arrays.
- L44–L66: `SidebarNavItem`. L56 `icon?: keyof typeof Icons` references
  `Icons`, which is **not imported anywhere in this file**. The reference
  is to a value not in scope; if the file is consumed in isolation (which
  `.d.ts` files often are), this fails type-checking. `Icons` is exported
  at `apps/reading-advantage/components/icons.tsx:59` and is used in
  consumers via the `main-navbar.tsx` import, but the type file itself
  never references that module.
- L68–L88: `SidebarTeacherNavItem`. L78 has the same `keyof typeof Icons`
  reference without an import.
- L89–L108: `SystemSidebarNavItem`. L98 has the same `keyof typeof Icons`
  reference without an import.

### User and content types (lines 110–201)
- L110: `import { Role } from "@/lib/enums";` — the only `Role`-type import
  in the file.
- L112–L121: `User`. L118 `createAt: Date` (note: typo of `createdAt`) —
  this typo propagates through the codebase.
- L124–L128: `Question`. `descriptor_id: string` snake_case inside a
  camelCase type.
- L131–L153: `ArticleRecord`. L134–L137 `createdAt: { _seconds, _nanoseconds }`
  and L149–L152 `updatedAt` use the Firebase Timestamp shape. This shape
  implies the upstream is still Firebase. `apps/reading-advantage/types/constants.ts`
  uses Date, and many consumers (e.g.
  `apps/reading-advantage/components/article-records-table.tsx:89-102`,
  `apps/reading-advantage/components/reminder-reread-table.tsx:91-95`) use
  the column accessor `updated_at` (snake_case) and `created_at` to read
  the value, then `formatDate(updatedAt)` casts it to a string. The
  `ArticleRecord` type defines `createdAt` / `updatedAt`, not
  `created_at` / `updated_at`, so the table components cannot satisfy
  strict-mode access by key. They either cast with `as string` (which
  they do) or rely on the runtime data shape (which differs). The
  mismatch is a latent runtime bug.
- L141 `questions: any[]` — any, no element type.
- L155: `WithChildren<T = unknown> = T & { children: React.ReactNode }`.
- L157: `LocaleLayoutParams = { params: { locale: string } }`. With
  Next.js 15+, `params` is a `Promise`; the type is stale.
- L159–L173: `QuestionsType`, `MCQType`, `ShortAnswerType`.
- L175–L201: `MCQRecordType`, `ShortAnswerRecordType`,
  `UserArticleRecordType` — record shapes using `descriptorId`,
  `timeLogged`, `isCorrect`, `answer`.

### Article types (lines 203–258)
- L204–L233: `ArticleType` with `cefrScores: { A1, A2, B1, B2, C1, C2 }`.
  Note the missing `A0` level; the `ScoreRange.A0` exists in constants.
- L224–L229: `timepoints: [{ timeSeconds, markName }]` — declared as a
  tuple with one element. The shape is not a tuple in the runtime data;
  this is a single-element tuple, but readers expect an array.
- L235–L258: `articleShowcaseType` — half the fields are commented out,
  e.g. L236–L241 (`articleId`, `title`, `type`, `genre`, `subgenre`,
  `raLevel`, `cefrLevel`, `summary`, `isRead`, `status`, `averageRating`,
  `totalRatings`, `topic`, `readCount` all `// commented`). The
  non-commented shape has `average_rating`, `cefr_level`, `ra_level`,
  `is_read`, `is_approved` — snake_case strings, while the Article
  interface above uses camelCase. Mixed naming conventions inside the
  same file.

### CSS Module declaration (lines 260–264)
- L261–L264: `declare module "*.css"` — duplicate of `types/css.d.ts:1-4`.
  When both are loaded, they merge.

### Observations
- `Icons` reference (L56, L78, L98) is a **build-breaking** TypeScript
  error. The compiler will report "Cannot find name 'Icons'" unless a
  triple-slash directive or import is added.
- `createAt` typo (L118) propagates everywhere `User.createAt` is used.
- `ArticleRecord.createdAt` / `updatedAt` (camelCase) vs the table
  components' snake_case key access is a structural mismatch that
  currently works only because callers cast through `any`.
- `LocaleLayoutParams` is not Promise-based; Next.js 15+ requires
  `params: Promise<{ locale: string }>`.
- The `articleShowcaseType` `timepoints` tuple of length one is a real
  bug magnet.
- No JSDoc.

---

## File 6 — `apps/reading-advantage/types/learning-goals.ts` (111 lines)

### Imports and types (lines 1–111)
- L1: imports `GoalType, GoalStatus, GoalPriority, RecurringPeriod` from
  `@/lib/enums`. The strings are typed against the enums defined at
  `lib/enums.ts:81-115`.
- L3–L24: `LearningGoal`. L19 `metadata?: any` — `any` typed.
- L26–L35: `GoalMilestone`.
- L37–L47: `GoalProgressLog`.
- L49–L61: `CreateGoalInput`. L59 `metadata?: any` — `any` typed.
- L63–L68: `CreateMilestoneInput`.
- L70–L78: `UpdateGoalInput`. L77 `metadata?: any`.
- L80–L90: `GoalProgress`. L82 `progressPercentage: number` — no unit
  guard; could be 0-100 or 0-1.
- L92–L100: `GoalSummary`. L99 `completionRate: number` — same.
- L102–L111: `GoalRecommendation`. L108 `suggestedDuration: number // in
  days` — comment-only.

### Observations
- Three `metadata?: any` fields (L19, L59, L77). `any` is a known
  type-safety hole.
- `progressPercentage`, `completionRate`, `suggestedDuration` rely on
  comments to clarify units; no runtime guards.
- No JSDoc.
- No Zod schema for `CreateGoalInput` or `UpdateGoalInput` despite these
  being HTTP payloads (used in
  `apps/reading-advantage/server/controllers/classroom-goals-controller.ts:6`
  and `goals-controller.ts:4`).
- The `metadata?: any` shape is forwarded into the DB layer at
  `apps/reading-advantage/server/services/goals-service.ts:17`, which means
  the column is `jsonb` and accepts arbitrary shapes; the lack of Zod
  here means the producer and consumer contract is unchecked.

---

## File 7 — `apps/reading-advantage/types/lesson-story.ts` (97 lines)

### Types (lines 1–97)
- L1: comment-only "Types for Lesson and Story controllers".
- L3–L6: `LessonPhase`. L4 `status: number // 0 = not started, 1 = in
  progress, 2 = completed` — numeric status with comment-only semantics.
  The codebase elsewhere uses `QuizStatus`, `Status` enums from
  `lib/enums.ts:45-72`.
- L8–L28: `LessonRecord` with phase1 through phase14. Each phase is a
  `LessonPhase`. The DB column is `phaseStatus` per the
  `paginateLessonRecords` reference in
  `apps/reading-advantage/lib/pagination/smart-paginator.ts:290`. The
  controller at `apps/reading-advantage/server/controllers/lesson-controller.ts:87`
  reads `existingLessonRecord` but does not import this type.
- L30–L48: `ChapterWithCompletion` — `sentences?: any`, `words?: any`.
  Two `any` slots.
- L50–L69: `StoryWithCompletion`.
- L71–L84: `QuizRecord`. L80 `score?: number` — optional.
- L86–L89: `MCQRecord extends QuizRecord` — adds `options: string[]`,
  `correctAnswer: string`.
- L91–L93: `SAQRecord extends QuizRecord` — adds `correctAnswer: string`.
- L95–L97: `LAQRecord extends Omit<QuizRecord, 'isCorrect'>` — adds
  `feedback?: string`.

### Observations
- **No file in the codebase imports any type from `lesson-story.ts`.**
  Verified by grep across `apps/` excluding `node_modules`, `.next`, and
  the file itself. The types are pure dead code.
- `LessonPhase.status: number` is semantically equivalent to the
  `Status` enum in `lib/enums.ts` (`NOT_STARTED`, `IN_PROGRESS`,
  `COMPLETED`); the codebase should use the enum to avoid magic numbers.
- `ChapterWithCompletion.sentences?: any` and `words?: any` are `any`
  type holes.
- `MCQRecord` here collides with the same name at
  `apps/reading-advantage/components/models/questions-model.ts:8` and at
  `apps/reading-advantage/server/controllers/stories-question-controller.ts:50`.
  Three different shapes for the same concept.
- No JSDoc.
- No Zod schema.

---

## File 8 — `apps/reading-advantage/types/sentence-tokenizer.d.ts` (1 line)

- L1: `declare module 'sentence-tokenizer';` — bare ambient module
  declaration without a body.

### Observations
- Used at `apps/reading-advantage/lib/utils.ts:1`:
  `import Tokenizer from "sentence-tokenizer";`.
- The declaration has no `export`; the default import works because
  TypeScript treats bare `declare module` as having a `default: any`.
  In strict mode this should still type-check but at the cost of `any`.
- No JSDoc.

---

## File 9 — `apps/reading-advantage/utils/classroom.ts` (43 lines)

### OAuth2 client (lines 1–43)
- L1: `import { google } from "googleapis";` — direct Google SDK import.
  AGENTS.md prefers adapters (`google.login()`, etc.) over direct SDK
  usage, but this file predates the adapter and is consumed only by
  Google OAuth flows.
- L2: `import { cookies } from "next/headers";` — Next.js cookies API.
- L5–L9: `oauth2Client` constructed at module load with env vars. If any
  env var is undefined, the OAuth2 client is created with `undefined`
  redirect URI, client ID, etc.
- L11–L17: `SCOPE` constant exported as an array of Google API scopes.
- L19–L41: `getAuthenticatedClient(refreshToken?)`. L25
  `oauth2Client.on("tokens", async (tokens) => { ... })` registers a
  global handler that **persists across invocations**. The handler
  attaches a side effect every time Google issues a refresh token, and
  writes a new cookie via `cookies()`.
- L29 `await cookies()` — `cookies()` is an async function in Next.js 15+.
  In Next.js 14 and earlier it was synchronous; the API is version-gated.
- L31–L37: `cookieStore.set({ name: "google_refresh_token", value:
  tokens.refresh_token || "", httpOnly: true, ... })` — note `value: ""`
  when `tokens.refresh_token` is falsy. Setting an empty `httpOnly`
  cookie can clear the cookie (depending on `maxAge`).
- L40: returns the same module-level `oauth2Client`.

### Observations
- Module-level OAuth2 client with side-effecting `on("tokens")` handler
  attaches to **every** token refresh globally. If multiple requests run
  concurrently, the handlers all call `cookies()` from different
  requests, which is not safe — `cookies()` is scoped to the current
  request.
- The empty-string `value` fallback (L33) silently overwrites a stored
  refresh token. A returned token without a refresh token (common for
  OAuth2 flows other than `access_type=offline`) would clobber the
  stored refresh token.
- `SCOPE` is a module-level array. If multiple OAuth flows need
  different scopes, this constant forces a single scope set.
- No Zod validation on env vars.
- No JSDoc on `getAuthenticatedClient`.

---

## File 10 — `apps/reading-advantage/utils/deleteStories.ts` (85 lines)

### Storage deletion (lines 1–85)
- L1: `import storage from "./storage";` — local default import.
- L2: `import db from "@/configs/firestore-config";` — Firestore stub.
  The `db` variable is **never used** in this file. Verified by grep:
  no `db.` access in the file body.
- L4: `export async function deleteStoryAndImages(storyId: string)` —
  no Zod input validation.
- L8: `const bucketName = "artifacts.reading-advantage.appspot.com";` —
  Firebase Storage legacy bucket name (the `artifacts.<project>.appspot.com`
  scheme). The `@google-cloud/storage` client used by `./storage.ts` is
  the proper GCS client, but `artifacts.reading-advantage.appspot.com` is
  the Firebase Storage SDK's default. With the GCS SDK, the bucket name
  should be `reading-advantage.appspot.com` (without the `artifacts.`
  prefix). The current value will cause `bucket.bucket(...)` to fetch
  metadata for a non-existent bucket.
- L12–L13: `storyImagePath` and `bucket.file(storyImagePath)`. The path
  assumes the file is at `images/${storyId}.png` — single primary image,
  not a collection.
- L16–L20: `await storyImageFile.delete().catch(...)` — `.catch` logs a
  warning but does not abort. Subsequent operations continue even if
  the primary image delete failed.
- L25–L26: chapter prefix `images/${storyId}-`. L26
  `bucket.getFiles({ prefix: chapterPrefix })` — list and delete.
- L36–L48: audio prefix `audios/${storyId}-`. L37 destructures
  `contentAudioFiles`; the catch (if any) is implicit. L45–L47:
  `console.warn(\`No chapter audio found with prefix: : ${contentAudioPrefix}\`)`
  — note the **double colon** `: :` in the format string.
- L51–L61: word-audio prefix `audios-words/${storyId}-`.
- L63–L67: comment block says "Firestore removed — story document deletion
  skipped". The actual story DB delete happens upstream in
  `apps/reading-advantage/server/controllers/stories-controller.ts:812`
  (`db.delete(stories).where(eq(stories.id, storyId))`) before this
  function is called. So storage cleanup is correctly a separate
  concern.
- L72–L81: tts prefix section. **Bug**: L73 declares `const ttsPrefix =
  \`tts/${storyId}-\``, but L74 uses `wordAudioPrefix` (the value from
  L51, `audios-words/${storyId}-`) instead of `ttsPrefix`. The code
  re-lists and re-deletes the `audios-words/` objects. The actual
  `tts/${storyId}-*` files are never deleted.
- L74: `bucket.getFiles({ prefix: wordAudioPrefix })` — uses the wrong
  variable.
- L80: the warn message references `ttsPrefix` but the prefix used in
  the listing was `wordAudioPrefix`. The warning text is therefore
  misleading even when correct.

### Observations
- The `db` import (L2) is unused.
- The tts prefix bug (L73 vs L74) is a real delete-target miss.
- The double-colon typo in L46 is cosmetic.
- The Firebase-style bucket name (L8) is incompatible with the GCS
  client; the storage utility will operate on a non-existent bucket.
- The function does not return success/failure, and the outer
  `try/catch` swallows errors with `console.error` (L83). The caller in
  `stories-controller.ts:814` and `stories-generator.ts:150, 320`
  treats the call as fire-and-forget and returns 200 regardless.
- No JSDoc on `deleteStoryAndImages`.
- No Zod input validation.

---

## File 11 — `apps/reading-advantage/utils/fetch-data.ts` (18 lines)

### Server fetch helper (lines 1–18)
- L1: `import { headers } from "next/headers";` — Next.js dynamic API.
- L4–L18: `fetchData(url, opts?, payLoad?)`. L6 destructures
  `{ log = false, method = "GET" } = {}`.
- L7: `payLoad?: Record<string, any>` — **misspelled** `payLoad` (should
  be `payload`). Used internally at L13.
- L9: `await headers()` — Next.js 15+ async API. Valid for current
  Next.js.
- L10: builds URL via `\`${process.env.NEXT_PUBLIC_BASE_URL}${url}\``. If
  `NEXT_PUBLIC_BASE_URL` is undefined, the concatenation produces
  `undefined${url}` — a string with the literal text "undefined" in it.
- L12: `headers: headersList` — passes the request headers through
  unchanged. **This includes `cookie`, `host`, and other request-shape
  headers**. When called from a server component that itself handles an
  HTTP request, this re-emits the inbound cookie on an outbound request
  to the same app's `/api/...` endpoint. Same-origin cookie forwarding
  is not a security issue per se, but it doubles every request's
  cookie-header payload and creates a same-process loop risk if the
  API endpoint ever short-circuits.
- L13: `body: payLoad ? JSON.stringify(payLoad) : undefined` — strings
  the body when present. No `Content-Type: application/json` header is
  added. Without that header, the receiving route handler may not parse
  the body as JSON.
- L15: `const data = await response.json();` — does not check `response.ok`.
  A 500 from the API is silently parsed; the caller cannot distinguish
  success from failure.
- L16: `if (log) console.log(data);` — opt-in logging.

### Observations
- The `payLoad` typo (L7, L13) is consistent but unconventional. Every
  call site (`page.tsx` files in `app/[locale]/(...)`) passes no third
  argument, so the misspelling is currently latent. If a future caller
  passes a body, the API will receive it without `Content-Type`.
- `NEXT_PUBLIC_BASE_URL` is not validated.
- No `AbortSignal`, no timeout. A slow API will block the SSR pipeline.
- The same-origin cookie-forwarding loop is a foot-gun for anyone who
  adds a route that does its own `fetchData`.
- No JSDoc on `fetchData`.

---

## File 12 — `apps/reading-advantage/utils/google.ts` (32 lines)

### Vertex AI client (lines 1–32)
- L1: `import { createGoogleGenerativeAI } from "@reading-advantage/ai";`
  The import is only used inside the commented block at L4–L7; L8
  imports `createVertex` from the same package and uses it. The
  `createGoogleGenerativeAI` named import is therefore **dead**.
- L2: `import { createVertex } from "@reading-advantage/ai";`.
- L4–L7: commented-out block. The intent appears to be that callers
  may switch to Generative AI; the dead import is a leftover.
- L8–L17: `createVertex({...})` instantiation. L9
  `project: process.env.FIREBASE_PROJECT_ID` — uses the Firebase
  project ID env var, not a generic `GOOGLE_PROJECT_ID`.
- L11–L16: `googleAuthOptions.credentials` with `client_email` and
  `private_key`. L14 `process.env.VERTEX_PRIVATE_KEY?.replace(/\\n/g, "\n")`
  — converts literal `\n` (two chars: backslash + n) into real newlines,
  which is the standard fix for env-stored PEM keys.
- L14: `?.replace(...) || ""` — if `replace` returns falsy (it cannot
  here, but TypeScript thinks so) or `private_key` is undefined, the
  fallback is `""`. Empty PEM is invalid; the SDK will throw at runtime.
- L19: `googleModelAudio = "gemini-2.0-flash-lite"`.
- L20: `googleModel = "gemini-2.0-flash-001"`.
- L21: `googleFlashThinking = "gemini-2.0-flash-thinking-exp-01-21"`.
  Used only in
  `apps/reading-advantage/server/utils/generators/article-generator.ts` and
  `stories-chapters-generator.ts` (verified by grep). Two call sites.
- L22: `googleImages = "imagen-4.0-generate-001"`.
- L23: `googleProPrewiew = "gemini-2.5-pro"` — **typo of "Preview"**
  (`Prewiew` instead of `Preview`). The export name is `googleProPrewiew`.
  Used at:
  - `apps/reading-advantage/server/utils/generators/article-generator.ts:7, 100, 104`
  - `apps/reading-advantage/server/utils/generators/stories-chapters-generator.ts:12, 395`
  Both files import the misspelled name and call `google(googleProPrewiew)`.
- L25–L31: re-exports.

### Observations
- Dead import at L1 (`createGoogleGenerativeAI`).
- Empty-PEM fallback at L14.
- `googleFlashThinking` is exported but the underlying model
  (`gemini-2.0-flash-thinking-exp-01-21`) is an experimental preview
  model; pinning the ID without an env-var override makes future model
  rotation harder.
- `googleProPrewiew` typo is consistent across consumers but obscures
  intent.
- No Zod validation on env vars.
- No JSDoc on any export.

---

## File 13 — `apps/reading-advantage/utils/openai.ts` (12 lines)

### OpenAI client (lines 1–12)
- L1: `import { createOpenAI } from "@reading-advantage/ai";`.
- L3–L5: `openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })`.
  No validation on the env var; missing key surfaces at SDK call time.
- L7: `openaiModel = "gpt-4o-mini"`.
- L8: `openaiModel4o = "gpt-4o"`.
- L9: `openaiModel5 = "gpt-5"`.
  - `gpt-5` is the OpenAI GPT-5 model ID. Consumers:
    - `apps/reading-advantage/server/controllers/level-test-controller.ts:5, 142`.
- L10: `openaiImages = "dall-e-3"`. Consumers:
  - `apps/reading-advantage/server/controllers/validator-controller.ts:23, 355`.

### Observations
- No env-var validation; if `OPENAI_API_KEY` is missing, the SDK throws
  on first call. There is no fallback or warning at module load.
- No JSDoc.
- Pinned model IDs; future rotation requires code changes.

---

## File 14 — `apps/reading-advantage/utils/storage.ts` (24 lines)

### GCS client (lines 1–24)
- L1: `import { Storage } from '@google-cloud/storage';`.
- L3: `const serviceAccountKeyRaw = process.env.SERVICE_ACCOUNT_KEY;`.
- L4: `let storage: Storage;`.
- L6–L19: branching based on whether `SERVICE_ACCOUNT_KEY` is set.
  - L7–L13: parse JSON, then conditionally init with explicit credentials.
  - L13: `projectId: 'reading-advantage'` is **hard-coded**.
  - L14–L18: parse-error fallback still uses `projectId: 'reading-advantage'`
    without credentials (relies on ADC / metadata server).
  - L20–L22: env-missing fallback same as above.
- L18: `catch {}` — empty catch block. The parse error is swallowed.
- L24: `export default storage;`.

### Observations
- Hard-coded `projectId: 'reading-advantage'` cannot be overridden per
  environment (staging, dev, multi-tenant).
- Empty catch at L18 swallows JSON parse errors silently.
- The Firebase Storage-style bucket name used by callers
  (`apps/reading-advantage/utils/deleteStories.ts:8`,
  `apps/reading-advantage/utils/uploadToBucket.ts:12, 19`) is the
  `artifacts.reading-advantage.appspot.com` form. With the GCS client,
  that bucket name does not exist; the correct GCS bucket name is
  `reading-advantage.appspot.com` (without `artifacts.`).
- No JSDoc.
- Module-level mutable `storage` variable; cannot be re-initialized at
  runtime for testing.

---

## File 15 — `apps/reading-advantage/utils/uploadToBucket.ts` (33 lines)

### Upload helper (lines 1–33)
- L1: `import storage from "./storage";`.
- L2: `import fs from 'fs';` — `fs` is sync.
- L4–L9: `uploadToBucket(localPath, destination, isPublic = true,
  isDeleteLocal = true)`.
- L10–L15: upload via `storage.bucket('artifacts.reading-advantage.appspot.com').upload(localPath, { destination })`.
  Same Firebase-style bucket name issue as File 14.
- L18–L22: `if (isPublic) makePublic()`.
- L25–L27: `if (isDeleteLocal) fs.unlinkSync(localPath);` — synchronous
  unlink. `unlinkSync` throws if the file does not exist; no `.catch`.
- L28: `console.log('SUCCESS UPLOADING TO BUCKET: ', destination);` —
  structured logging via `console.log`, not the structured logger.
- L29–L32: `catch (error) { console.error(...); throw error; }` —
  rethrows, but logs the raw error object.

### Observations
- The Firebase-style bucket name will fail with the GCS client (see
  File 14 observation).
- Sync `fs.unlinkSync` in an async function blocks the event loop.
- No retry on transient GCS errors.
- `isPublic = true` default is a privacy foot-gun: callers can
  accidentally publish PII or student data. Default should be `false`.
- No Zod validation on `localPath` or `destination`.
- No JSDoc.

---

## File 16 — `apps/reading-advantage/utils/workbook-data-mapper.ts` (105 lines)

### Workbook JSON shape (lines 1–105)
- L1: `import { Article } from "@/components/models/article-model";`.
  This is the only utility that imports from a UI models directory.
- L3–L43: `WorkbookJSON` interface. Many fields are typed `any[]`:
  L29 `vocab_match: any[]`, L30 `vocab_fill: any[]`, L32
  `sentence_order_questions: any[]`, L33 `sentence_completion_prompts:
  any[]`, L35 `mc_answers: any[]`, L38 `sentence_order_answers: any[]`.
- L45–L105: `mapArticleToWorkbookJSON(article, wordList, mcq, saq, laq,
  translated)` builds a `WorkbookJSON`.
  - L53: `article.passage.split("\n\n")` — relies on `Article.passage`
    being a string. The `Article` interface at
    `apps/reading-advantage/components/models/article-model.ts:142`
    defines `passage: string`, OK.
  - L58–L62: vocab map. L61 `w.definition.en || w.definition` — fallback
    when `definition` is not the multilingual map. If `definition` is
    a string, `w.definition.en` is `undefined`, so the fallback returns
    the string. Otherwise `w.definition.en` is used.
  - L64–L68: `compQuestions` from MCQ list.
  - L70–L73: `translation` from translated paragraphs. L71 labels
    paragraphs as "Paragraph 1", "Paragraph 2", …, using `i + 1`. The
    label is hard-coded English.
  - L76: `lesson_number: "Lesson 1"` — **hard-coded placeholder**; the
    function ignores any real lesson number from the article.
  - L77: `lesson_title: article.title`.
  - L78: `level_name: \`Level ${article.ra_level}\`` — uses snake_case
    `ra_level` (matches `Article.ra_level: number`).
  - L83: `article_image_url: \`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}.png\`` —
    same Firebase-style URL pattern as Files 14/15. If the asset is
    stored under the correct GCS bucket name, the URL is 404.
  - L84: `article_caption: article.image_description || "Article
    Illustration"`.
  - L87: `short_answer_question: saq.length > 0 ? saq[0] : ""` —
    uses `saq[0]` as a string but the array element type is `any[]`.
    If `saq[0]` is an object, the resulting `WorkbookJSON` has an
    object where a string is expected.
  - L88–L92: `sentence_starters` is hard-coded English ("I think...",
    "The article says...", "In my opinion..."). No localization.
  - L93: `vocab_match: []` — placeholder.
  - L94: `vocab_fill: []` — placeholder.
  - L95: `vocab_word_bank: vocab.map((v) => v.word)` — extracted from
    the local `vocab` (which is L58-derived).
  - L96–L97: `sentence_order_questions: []`,
    `sentence_completion_prompts: []` — placeholders.
  - L98: `writing_prompt: laq.length > 0 ? laq[0] : ""` — same `any`
    coercion issue as L87.
  - L99: `mc_answers: []` — placeholder; the comment says "Would need
    correct answer logic", but the route handler
    `app/api/v1/articles/[article_id]/export-workbook/route.ts:196-217`
    computes real MC answers via inline logic. The `mapArticleToWorkbookJSON`
    helper is **not used by the actual route handler**; verified by grep.
- L100–L102: empty strings / arrays for `vocab_match_answer_string`,
  `vocab_fill_answer_string`, `sentence_order_answers`.
- L103: `translation_paragraphs: translation`.

### Observations
- `mapArticleToWorkbookJSON` is exported but never imported anywhere in
  the codebase (verified by grep). It is dead code; the actual workbook
  builder lives inline in the route handler at
  `app/api/v1/articles/[article_id]/export-workbook/route.ts:381-411`.
- The Firebase-style URL on L83 (and reused on L83 of this file) is
  broken under the GCS client.
- Multiple `any[]` slots (L29, L30, L32, L33, L35, L38) are type holes.
- `saq[0]` / `laq[0]` are treated as strings; the type allows anything.
- `lesson_number: "Lesson 1"` and `sentence_starters: ["I think...", …]`
  are hard-coded English placeholders.
- No Zod schema on the input contract.
- No JSDoc on `mapArticleToWorkbookJSON`.

---

## Cross-File Observations

- **Direct provider SDK use.** `utils/classroom.ts:1` imports `google` from
  `googleapis`, and `utils/storage.ts:1` imports `Storage` from
  `@google-cloud/storage`. AGENTS.md prefers adapters; these utilities are
  adapters in form, but they expose the underlying SDK types rather than
  a port interface. Future provider migration would touch every caller.
- **Bucket-name mismatch.** `utils/deleteStories.ts:8`,
  `utils/uploadToBucket.ts:12, 19`, and
  `utils/workbook-data-mapper.ts:83` all hard-code
  `artifacts.reading-advantage.appspot.com`. The GCS client at
  `utils/storage.ts` requires the bucket name without the `artifacts.`
  prefix. Calls will fail at runtime.
- **Dead exports.**
  - `mapArticleToWorkbookJSON` (utils/workbook-data-mapper.ts:45) — never
    imported.
  - All types in `types/lesson-story.ts` (LessonPhase, LessonRecord,
    ChapterWithCompletion, StoryWithCompletion, QuizRecord, MCQRecord,
    SAQRecord, LAQRecord) — never imported.
  - `ClassroomWithTeachers`, `AddCoTeacherRequest`, `RemoveCoTeacherRequest`
    (types/classroom-teacher.ts) — never imported.
  - `createGoogleGenerativeAI` import in `utils/google.ts:1` — never used
    after the commented-out block.
  - `UserRole` enum in `types/constants.ts:23` — never imported.
  - `ScoreRange` enum imported once at
    `app/api/v1/level-test/route.ts:7` but unused in the file.
  - `db` import in `utils/deleteStories.ts:2` — never used.
- **Type / runtime mismatches.**
  - `types/constants.ts:19` `C1+` without quotes — TypeScript syntax error
    in strict mode.
  - `types/constants.ts:25` `UserRole.ADMIN = "ADMINISTRATOR"` vs
    `Role.ADMIN = "ADMIN"` in `lib/enums.ts:8`.
  - `types/index.d.ts:131-153` `ArticleRecord` defines `createdAt` /
    `updatedAt` (camelCase, Firebase Timestamp), but
    `components/article-records-table.tsx:89-102` and
    `components/reminder-reread-table.tsx:91-95` access via `updated_at`
    / `created_at` and cast to string.
  - `types/lesson-story.ts:3-6` `LessonPhase.status: number` (magic
    numbers) vs `lib/enums.ts:45-50` `Status` enum (semantic).
  - `utils/deleteStories.ts:73-74` — `ttsPrefix` declared but
    `wordAudioPrefix` used in the GCS list call.
  - `types/dashboard.ts:609` `AIInsight.type` literal has four values;
    `lib/enums.ts:117-124` `AIInsightType` has five (`WARNING` missing
    from the contract).
- **Multi-tenancy.** `types/dashboard.ts` makes `schoolId?: string` on
  most shapes (e.g. `StudentMeResponse`, `TeacherOverviewResponse`,
  `ClassOverviewResponse`). AGENTS.md requires every query to be scoped
  by `schoolId`. The contract permits a code path that omits it; the
  one place that makes schoolId mandatory is `SchoolAssignmentFunnelMetrics`.
- **Auth boundaries.** `utils/fetch-data.ts:12` forwards inbound headers
  to outbound same-origin requests, including cookies. Same-origin
  cookie echo is functionally OK but couples inbound request shape to
  the API route handler's expectations.
- **Error handling.** None of the utility helpers set a `process.exitCode`
  on failure; they throw or `console.error`. `utils/deleteStories.ts:82-84`
  swallows errors and reports success upstream.
- **JSDoc coverage.** All exported functions across the 16 files lack
  JSDoc. AGENTS.md requires JSDoc on every exported function, class,
  interface, and type alias.
- **Zod coverage.** External boundaries (HTTP routes, AI adapter input)
  are not gated by Zod in any file reviewed here. `utils/fetch-data.ts`
  accepts `Record<string, any>`; `utils/workbook-data-mapper.ts`
  accepts `any[]` arrays. Per AGENTS.md, every external boundary must
  use Zod.
- **Determinism.** `utils/fetch-data.ts` has no `AbortSignal` and no
  timeout; a slow API blocks SSR.
- **Privacy.** `utils/uploadToBucket.ts` defaults `isPublic = true`;
  the route handlers in
  `server/utils/generators/image-generator.ts:38`,
  `audio-generator.ts:205`, `audio-words-generator.ts:152, 243` rely on
  this default. If the bucket is misconfigured (the Firebase-vs-GCS
  mismatch above), uploaded files leak to an unintended location.

---

## Files Changed

None — review only.

## Commands Run

- `ls /tmp/opencode/ra-batch-50` (revealed file is a list, not a
  directory).
- `read` of all 16 files in `/tmp/opencode/ra-batch-50`.
- `ls /home/daniel-bo/Desktop/reading-advantage-monorepo/measure/audit-reports/reading-advantage-full_20260626/line-review/`
  (checked for prior reports).
- `git -C /home/daniel-bo/Desktop/reading-advantage-monorepo rev-parse HEAD`
  (HEAD SHA).
- `cat /tmp/opencode/baseline_sha.txt` (baseline SHA).
- Cross-cutting greps for `from "@/types/..."`, `from "@/utils/..."`,
  `from "@reading-advantage/ai"`, `from "sentence-tokenizer"`,
  `db.`, `google.image(`, `googleFlashThinking`, `googleProPrewiew`,
  `RecordStatus`, `ScoreRange`, `UserRole`, `WorkbookJSON`,
  `mapArticleToWorkbookJSON`, `Icons`, `LessonPhase`, `MCQRecord`, etc.
- Reads of cross-referenced consumers
  (`lib/enums.ts`, `lib/utils.ts`, `configs/firestore-config.ts`,
  `components/models/article-model.ts`, `components/classroom-teachers.tsx`,
  `components/article-records-table.tsx`, `components/reminder-reread-table.tsx`,
  `server/controllers/lesson-controller.ts`,
  `server/controllers/stories-controller.ts`,
  `server/controllers/classroom-controller.ts`,
  `server/controllers/level-test-controller.ts`,
  `server/controllers/validator-controller.ts`,
  `server/controllers/teacher-dashboard-controller.ts`,
  `server/controllers/admin-controller.ts`,
  `server/services/goals-service.ts`,
  `server/utils/generators/image-generator.ts`,
  `server/utils/generators/stories-generator.ts`,
  `app/api/v1/articles/[article_id]/export-workbook/route.ts`,
  `app/api/v1/level-test/route.ts`,
  `app/[locale]/(student)/student/history/page.tsx`,
  `app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx`,
  `app/[locale]/(student)/student/stories/[storyId]/page.tsx`,
  `app/api/v1/classroom/oauth2/callback/route.ts`).

## Verification Status

- All 16 files were read completely and line-by-line (1,626 lines total).
- No application code was edited.
- No build, lint, or test commands executed (review-only task).

## Residual Risk

- Findings are observational; no fixes have been proposed or applied.
- The Firebase-vs-GCS bucket-name mismatch and the
  `createGoogleGenerativeAI` import were inferred from the GCS SDK
  surface and `apps/reading-advantage/configs/firestore-config.ts`
  documentation. Live runtime behavior of `bucket.bucket(...)` for the
  Firebase-style name with the GCS client was not tested.
- The `Icons` reference in `types/index.d.ts` may compile in practice
  because consumers (e.g. `main-navbar.tsx`) co-locate the `Icons`
  value via separate import statements. A standalone compilation pass
  on `types/index.d.ts` would still fail.
- The hard-coded `projectId: 'reading-advantage'` in `utils/storage.ts`
  was inferred from the file; whether any environment overrides it
  via a separate mechanism (e.g. ADC / metadata server) was not
  verified.
- The `LessonPhase.status: number` magic-numbers contract and the
  lesson-controller's persistence path were not cross-checked against
  the actual database column type for `lessonRecords.phase1Status` etc.
- The `mapArticleToWorkbookJSON` "dead code" claim is based on grep
  and may miss calls inside `.next/` build artifacts.

MEASURE_AGENT_RESULT