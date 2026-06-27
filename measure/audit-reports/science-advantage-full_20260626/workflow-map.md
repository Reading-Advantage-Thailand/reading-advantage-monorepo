# Workflow Map: Science Advantage

> **Track:** `science_advantage_review_20260626`
> **Source:** 37 batch reports under `line-review/`
> **Status:** Descriptive map only. No remediation performed. Acceptance/closeout PENDING.

This map traces the principal user workflows through the reviewed code and links each step to the batch IDs where it was inspected and to the most relevant findings. It is evidence-routing, not a remediation log.

---

## 1. Authentication & Session

| Step | Code surface | Batch | Findings / status |
|---|---|---|---|
| Sign-in page (public) | `app/(auth)/signin/page.tsx`, `signin-container.tsx`, `signin-form.tsx` | 01, 06 | Golden: role-based redirect via `ROLE_ROUTES`. |
| Login / logout / session / reset | `app/api/auth/{login,logout,session,reset-password}/route.ts` | 03 | F-SA-B03-013 (reset-password missing JSDoc). |
| Impersonation (dev) | `app/api/auth/impersonate/route.ts`, `dev-impersonation-panel.tsx` | 03, 05 | Dev-auth bypass noted as defense-in-depth concern (F-SA-B31-030). |
| Session/auth adapter | `lib/auth/{server,session,constants,types}.ts` | 20 | Golden: all auth via `@reading-advantage/auth`; no app-local auth. |
| `schoolId` in session | session pipeline | 20 | **Gap:** no test verifies `schoolId` propagation (test-gaps). |

## 2. Student Learning Loop

| Step | Code surface | Batch | Findings / status |
|---|---|---|---|
| Student dashboard / classes / profile | `app/(student)/**` | 01 | Golden: `requireRole('STUDENT')`; F-SA-B01-003 settings uses `requireAuth()` instead. |
| Join class | `join-class-form.tsx`, `/api/classes/join` | 04, 08 | Golden: `zodResolver`; F-SA-B27-021 (tenant gap in archived spec). |
| View curriculum / lesson | `student-curriculum-view.tsx`, `lesson-viewer.tsx`, `/api/lessons/[lessonSlug]` | 04, 08, 09 | F-SA-B09 IDOR concerns: `classId` not always passed to API. |
| Lesson player + blocks | `lesson-player.tsx`, `blocks/**` | 07 | Golden: per-block `BlockErrorBoundary`; business logic in component (F-SA-B07/-08). |
| Take quiz | `quiz-player.tsx`, quiz-question types, `/api/lessons/[lessonSlug]/quiz`, `lib/quiz/scoring.ts` | 04, 07, 08, 24 | F-SA-B08-002 (689-line component, business logic embedded); F-SA-B07-012 (AI-enabled path untested). |
| Submit & score | `/api/ai/update-mastery`, `lib/services/mastery/**`, `mastery-calculator.ts` | 03, 19, 24, 25 | F-SA-B03-001 (unknown errors → 202/QUEUED); F-SA-B24-051 (no auth on `processMasteryRun`). |
| Gamification (XP/streak/badges) | `lib/gamification/**`, `/api/students/me/gamification` | 05, 21, 22 | **Critical:** F-SA-B22-003 (no authz on streak), F-SA-B22-019/020 (no authz/tenancy on XP). |
| Mastery profile | `mastery-profile/**`, `/api/students/[studentId]/mastery-profile` | 05, 08 | F-SA-B05-002 (limit clamp/contract bug); client recomputes average. |

## 3. Teacher Loop

| Step | Code surface | Batch | Findings / status |
|---|---|---|---|
| Teacher dashboard | `app/(teacher)/teacher/page.tsx`, `teacher-dashboard-classes.tsx` | 02, 10 | Golden: `createTenantDB` + `teachers.getTeacherClasses`. |
| Class list / create | `teacher/classes/page.tsx`, `create-class-form.tsx`, `/api/classes` | 02, 06 | Golden tenant-scoped path; F-SA-B02-029 (`as unknown as UserContext` cast). |
| Class detail / roster | `teacher/classes/[classId]/{page,roster}.tsx`, `get-class-detail.ts` | 02, 24 | **High:** F-SA-B02-003/020/023, F-SA-B24-036/037 (`getClassDetailWithCurriculum` raw `db`, no `schoolId`). |
| Assignments | `assign-button.tsx`, `/api/classes/[classId]/assignments`, `create-assignment.ts` | 03, 09 | F-SA-B03-007 (lesson∈class not verified). |
| Analytics (class/lesson/student) | `analytics/**` pages + components, `/api/classes/[classId]/lessons/[lessonId]/analytics` | 01, 02, 03, 09 | **Critical:** F-SA-B01-001 (no server auth on deep analytics page); F-SA-B04-002 (redirect-based 401); F-SA-B09-012 (`classId` missing in API call → cross-class risk). |
| Interventions | `intervention-alerts-widget.tsx`, `lib/interventions/**`, `/api/teachers/classes/[classId]/intervention-alerts` | 09, 22 | F-SA-B22-031 (unbounded in-memory cache). |

## 4. Admin / System

| Step | Code surface | Batch | Findings / status |
|---|---|---|---|
| Admin / system / schools pages | `app/(admin)/**`, `app/(system)/**` | 01 | Golden: `requireRole('ADMIN'|'SYSTEM')`. |
| DSAR export | `/api/admin/dsar/export/route.ts` + tests | 02 | Golden: Zod XOR, domain `exportSubjectData`, audit event, tenant-isolation test. Exemplary. |

## 5. AI Recommendations

| Step | Code surface | Batch | Findings / status |
|---|---|---|---|
| Request recommendation | `/api/ai/recommendations/route.ts` | 02 | **Critical:** F-SA-B02-084 direct `@sentry/nextjs` import (adapter bypass). |
| Service / context / prompts / rules | `lib/ai/recommendation-{service,context}.ts`, `prompts/recommendation.ts`, `rules-engine.ts` | 19 | Golden: AI via `@reading-advantage/ai` adapter; hash-secret fallback weak (F-SA-B21-034). |
| Image generation | `lib/ai/image-generator.ts` | 19 | Adapter-compliant per docs. |

## 6. Content Pipeline (seed/build)

| Step | Code surface | Batch | Findings / status |
|---|---|---|---|
| Seed scripts | `scripts/seed/**`, `seed.ts`, `create-test-users.ts`, `seed-demo-users.ts` | 32, 35 | **High:** F-SA-B32-003 (weak hardcoded pw, no prod guard), F-SA-B35-001 (no env guard), F-SA-B35-006 (no `schoolId`). |
| Seed data (grade-3/4) | `scripts/seed-data/**` JSON | 33, 34, 35 | **High:** F-SA-B33-001/002 (data violates seeder Zod contract → `--grade=4` hard-fails). |
| Content conversion/migration | `convert-md-to-structured.ts`, `migrate-lesson-content.ts` | 32 | F-SA-B32-001 (divergent schema), F-SA-B32-002 (in-place overwrite, no backup). |
| Deploy / build | `vercel.json`, `next.config.ts` | 31, 36 | **High:** F-SA-B36-001 (Vercel build invokes Prisma in Drizzle-only app). |

## 7. Tenancy Enforcement (cross-cutting)

| Surface | Batch | Status |
|---|---|---|
| Pages using `createTenantDB` correctly | 02 | Golden (files 10, 12). |
| `getClassDetailWithCurriculum` raw `db` | 02, 24 | Deviation (FLAT tables, no `schoolId`). |
| `lib/gamification/**`, `lib/services/**` raw `db` | 21, 22, 24 | Deviation (no tenant scope, no authz). |
| Test/seed fixtures omit `schoolId` | 04, 25, 32, 35 | TenantDB isolation is a **no-op under test** → false confidence. |

*Workflow map complete. No remediation performed. Acceptance/closeout PENDING.*
