# Primary Advantage Workflow Map

Status: synthesized from line-review evidence (2026-06-27).

## Workflow Family Coverage

### 1. Primary Student Dashboard and Age-Appropriate Learning Flows

**Reviewed files**: `app/[locale]/(student)/**`, `app/[locale]/(index)/page.tsx`, components for lesson/quiz/vocabulary/flashcard/sentence games.

**Key findings**:
- Multiple game components (cloze-test, flashcard, matching, ordering, vocabulary) reference undefined `update`/`session` variables causing runtime ReferenceError on game completion (LR-031-001, LR-032-001, LR-033-001 through LR-038-001, LR-040-001/005, LR-044-001, LR-047-001/002, LR-048-001, LR-049-001, LR-050-001). This is a systematic copy-paste regression across ~15 components.
- `app/[locale]/(student)/student/read/[articleId]/page.tsx` student read page reviewed; article content rendering, question components, and audio buttons reviewed.
- Student settings pages (school-profile, user-profile) reviewed; school-profile has undefined `update`/`session` crash (LR-052-001).
- Student reports page is a stub with minimal content.

**Evidence**: Batches 004, 005, 026-028, 031-052.

### 2. Lesson, Quiz, Vocabulary, Flashcard, Media, and Reading-Level Flows

**Reviewed files**: `components/lesson/**`, `components/articles/**`, `components/flashcards/**`, `components/pratice/**`, `actions/question.ts`, `actions/flashcard.ts`, `lib/calculateLevel.ts`, `lib/fsrs-service.ts`.

**Key findings**:
- `actions/question.ts:116` has operator-precedence bug silently zeroing MC XP multiplier (LR-003-002, Critical).
- `actions/user.ts:43` always-empty `isCompleted` defeats articleActivityLogs completion tracking (LR-003-003, Critical).
- `lib/utils.ts:51-60` calculateLevelAndCefrLevel matches activity delta instead of cumulative XP (LR-080-001, Critical).
- AI feedback rendered without HTML sanitization (XSS risk) in la-question-content.tsx (LR-026-004, Critical).
- Lesson progress bar (standalone and regular variants) extensively reviewed with multiple UX and logic findings.
- Flashcard game and deck-view components reviewed.
- CEFR level setter, XP progress bar, and vocabulary matching/flashcard components reviewed.

**Evidence**: Batches 002, 003, 026-045, 048-050, 079-080.

### 3. Teacher Classroom, Assignment, Roster, Enrollment, and Reporting Workflows

**Reviewed files**: `components/teacher/**`, `app/[locale]/teacher/**`, `app/api/classroom/**`, `app/api/assignments/**`, `app/api/teachers/**`, `server/controllers/classroomController.ts`, `server/models/assignmentModel.ts`.

**Key findings**:
- Student-progress page has no authorization for requested student ID (LR-012-004, Critical).
- Classroom management: multiple enrollment/roster/assignment components reviewed; heavy duplication across `my-classes.tsx` and `class-roster.tsx`.
- `assignmentModel.ts` pagination-before-filter corruption (`getStudentAssignments`) and missing `schoolId` scoping (LR-092-001/002, Critical).
- Reports table hardcoded to empty data (LR-062-007, Critical).

**Evidence**: Batches 011, 012, 013, 054-063, 089, 092.

### 4. Admin/School Workflows

**Reviewed files**: `app/[locale]/admin/**`, `components/admin/**`, `app/[locale]/system/**`, `components/system/**`, `components/school/**`.

**Key findings**:
- Entire student-management UI commented out behind early-return placeholder (LR-006-003, Critical).
- Teachers page is an empty placeholder (LR-006-009, Critical).
- `handleAddStudent`, `handleUpdateStudent`, `handleDeleteStudent` are optimistic-only; never POST/PUT/DELETE to server (LR-008-001/002/003, Critical).
- `classrooms-table.tsx` destructures `classroomName` but page sends `name`; every Edit save is silently discarded (LR-023-002, Critical).
- All dashboard chart data is hardcoded/fabricated (LR-028-012, Critical).
- System test pages mix Server Actions inside Client Components erroneously (LR-010-010, Critical).

**Evidence**: Batches 006-010, 020-024, 053-054, 068.

### 5. AI Content Generation, Workbook/Content Workflows, Storage/Media

**Reviewed files**: `server/utils/genaretors/**`, `data/prompts*.json`, `data/story-schema.ts`, `app/api/articles/generate/**`, `utils/storage.ts`, `utils/openai.ts`, `utils/google.ts`, `server/utils/assistant.ts`.

**Key findings**:
- Direct provider SDK calls bypassing AI adapter: Google TTS, OpenAI, image generators (LR-098-005/006, LR-099/100 batches).
- API keys hardcoded as URL query parameters (LR-098-006, Critical).
- Bulk AI generation route has no authentication (LR-012-009, Critical).
- Lesson chatbot route has no auth/rate limit on LLM-cost-incurring endpoint (LR-013-007, Critical).
- Article generation/deletion server actions lack authorization (LR-001-003).
- Path traversal in CSV upload cleanup route (LR-018-004, Critical).
- Storage config hardcodes S3 credentials; uses direct `@aws-sdk/client-s3` instead of storage adapter.

**Evidence**: Batches 001, 003, 012-013, 018-019, 043, 069-078, 097-103.

### 6. Auth/Session/Role/Tenant Boundaries and Route/API Adapters

**Reviewed files**: All `app/api/**` routes, `actions/*.ts`, `server/utils/auth.ts`, `server/utils/middleware.ts`, `lib/session.ts`, `lib/permissions.ts`, `hooks/use-*.ts`, auth components.

**Key findings**:
- 72 findings for missing auth/authorization across API routes and server actions.
- 48 findings for missing tenant/schoolId scoping.
- `/api/debug/init-roles` POST mutates production data with no auth (LR-015-001, Critical).
- `/api/debug/init-roles` GET exposes user emails without authentication (LR-015-002, Critical).
- `/api/debug/school` exposes all schools' licenses to any authenticated user (LR-015-004, Critical).
- `GET /api/schools/ranking` accepts arbitrary `schoolId`, leaks cross-school leaderboards (LR-017-006, Critical).
- Multiple state-mutating API routes lack authentication (assignments, students, teachers, licenses, users).
- Auth middleware has `defaultString` placeholder for JWT secret.
- Session provider component is a 5-line stub.

**Evidence**: Batches 001, 003, 009-020, 078-079, 089-097.

### 7. Migration Truth (Prisma/Drizzle)

**Reviewed files**: `package.json`, `Dockerfile`, all `server/models/*.ts`, flashcard API routes, `AGENTS.md`.

**Key findings**:
- Dockerfile still runs `prisma:generate` and copies `/app/prisma` (LR-001-001).
- Flashcard API routes access non-existent Drizzle columns on shared `flashcardCards` table; use `as any` casts as workaround (LR-015-007/008/012/014/015/019/024-027/031/033, 9 Critical/High findings).
- `server/models/*` use Prisma-era patterns with raw SQL and manual connection management alongside Drizzle imports.
- Package.json still lists Prisma-related dependencies.

**Evidence**: Batches 001, 002, 015, 086, 091-097.

### 8. i18n and Localization

**Reviewed files**: `messages/{cn,en,th,tw,vi}.json`, `i18n/**`, locale-related components.

**Key findings**:
- 77 i18n-related findings across all locale files.
- Messages JSON inconsistencies: some keys present in one locale but not others.
- Hardcoded English strings in components that should use message keys.

**Evidence**: Batches 081-085, 078, 068.
