# 00 — Inventory: Science Advantage Full Review

> **Track:** `science_advantage_review_20260626`
> **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Source:** `line-review-coverage.md` + 37 batch reports under `line-review/`
> **Status:** Inventory only. No remediation performed. Acceptance/closeout PENDING.

## 1. Coverage Metrics

| Metric | Value |
|---|---:|
| In-scope tracked files | 738 |
| Batches | 37 (`sa-batch-00` … `sa-batch-36`) |
| Reports produced | 37 |
| Total report lines | 14,240 |
| Unique finding IDs | 922 |
| Batch size | 20 (final batch 18) |

Spec baseline (from `spec.md`): 417 TypeScript graph files, 1,865 graph nodes, 738 functions. The 738 figure for the spec is *functions*; the 738 figure here is *in-scope tracked files* (coincidental match) — both are recorded for traceability.

Exclusions: `.next/**`, `node_modules/**`, `public/**`, `coverage/**`, `.turbo/**`.

## 2. Batch → Surface Map

| Batch | File count | Primary surface |
|---|---:|---|
| sa-batch-00 | 20 | repo meta, config, issue templates, top-level docs (`GEMINI.md`, `README.md`, `DESIGN.md`) |
| sa-batch-01 | 20 | App Router pages: admin, auth, student, system, teacher layouts/pages |
| sa-batch-02 | 20 | teacher class/analytics pages; DSAR export route+tests; AI recommendations route+tests |
| sa-batch-03 | 20 | AI update-mastery, auth routes, class analytics/assignments/curriculum/roster routes + tests |
| sa-batch-04 | 20 | classes/join/lessons/student/students API routes + integration tests |
| sa-batch-05 | 20 | students gamification/mastery/lessons routes; teachers dashboard; app shell; admin nav |
| sa-batch-06 | 20 | auth components; class components; gamification + lesson block tests |
| sa-batch-07 | 20 | lesson blocks, lesson-player, vocabulary, student ai-recommendation + quiz tests |
| sa-batch-08 | 20 | student components: gamification, mastery-profile, quiz-player, quiz-question types |
| sa-batch-09 | 20 | student/system/teacher analytics + class-detail components |
| sa-batch-10 | 20 | teacher components + shadcn/ui primitives |
| sa-batch-11 | 20 | shadcn/ui; contexts; grade-4 standards JSON; archive docs start |
| sa-batch-12 | 20 | archived architecture docs (`docs/archive/architecture/**`) |
| sa-batch-13 | 20 | archived competitor-analysis + curriculum scope/sequence docs |
| sa-batch-14 | 20 | deprecated front-end-spec docs; change proposals; content-template README |
| sa-batch-15 | 20 | content templates; PRD epics; project-brief conclusion |
| sa-batch-16 | 20 | project-brief docs; active specs (ai-recommendations, assessment, assignment, curriculum, progress) |
| sa-batch-17 | 20 | active specs (student-profile, teacher-intervention); sprint docs; eslint config; i18n |
| sa-batch-18 | 20 | `instrumentation.ts`; audit-phase + housekeeping-phase test suites |
| sa-batch-19 | 20 | proxy tests; `lib/ai/**` (image-generator, mastery-calculator, recommendation service); analytics; api-helpers |
| sa-batch-20 | 20 | `lib/auth/**`; bilingual; `lib/ci-gates/**` test suites |
| sa-batch-21 | 20 | ci-gates; `lib/config/**`; content-parsers; env; `lib/forms/from-zod.ts`; gamification badges/streak |
| sa-batch-22 | 20 | gamification `streak.ts`/`xp.ts` + tests; grade4-normalization; instrumentation; interventions; observability tests |
| sa-batch-23 | 20 | observability fixtures/tests; context/logger/metrics; `lib/platform/**` (cache, rate-limit, redis) |
| sa-batch-24 | 20 | session-cleanup; quiz scoring; `lib/schemas/**`; security-headers; `lib/services/classes`, services/mastery |
| sa-batch-25 | 20 | services/mastery; `lib/test/**`; utils (class-format, clipboard, date, generateJoinCode); validations |
| sa-batch-26 | 20 | `lib/validations/**`; `lib/zip/minimal-zip.ts`; archived measure tracks (content_pipeline, critical_security, platform_alignment) |
| sa-batch-27 | 20 | archived measure tracks (quiz_system, replan, auth_centralization, data_safety, student_engagement) |
| sa-batch-28 | 20 | archived tracks (teacher_dashboard, visual_refresh); measure framework files, styleguides |
| sa-batch-29 | 20 | tech-stack; tracks.md; active tracks (bilingual, content_release, curriculum_foundation, lesson_type, mastery_assistance) |
| sa-batch-30 | 20 | active tracks (mastery_assistance, onboarding, redis, student_engagement, student_learning, tablet, teacher_dashboard) |
| sa-batch-31 | 20 | active tracks (teacher_dashboard, teacher_delivery, thai_localization); workflow.md; root config; scripts |
| sa-batch-32 | 20 | scripts: convert-md, create-test-users, dev-interventions, migrate-lesson, optimize-images, seed-activity; curriculum-units JSON |
| sa-batch-33 | 20 | grade-4 lesson + question seed JSON; standards-mapping; thai-g3 unit JSON |
| sa-batch-34 | 20 | thai-g3 + thai-g4 unit JSON; grade-3 question banks |
| sa-batch-35 | 20 | grade-4 question banks; standards JSON; seed scripts (`seed/**`); sentry config |
| sa-batch-36 | 18 | tests/api + tests/lib; `tsconfig.json`; `vercel.json`; `vitest.*.config.ts` + setups |

## 3. Feature Families (from spec.md, mapped to batches)

| Feature family | Primary batches | Inventory note |
|---|---|---|
| Student science learning flows | 01, 07, 08 | assignments, lesson viewer, quiz player, mastery profile |
| Teacher dashboards / classes / assignments / interventions / analytics | 02, 03, 09, 10 | class detail, roster, analytics, intervention alerts widget |
| Curriculum / lesson / quiz / mastery | 03, 04, 05, 07, 08, 24, 25 | lesson content schema, quiz scoring, mastery worker/calculator |
| AI recommendations & generated support | 02, 19 | recommendation service, prompts, rules-engine, image-generator |
| TenantDB / school isolation / permissions / validation / observability | 02, 04, 18, 20, 21, 22, 23, 24 | `createTenantDB` adoption (partial), auth lib, observability adapter |
| Tests / build / deployment / pilot follow-ups | 18, 20, 36 | audit-phase tests, ci-gates, vitest harness, vercel.json |

## 4. Route Inventory (API handlers in-scope)

Admin: `/api/admin/dsar/export`. Auth: `/api/auth/{impersonate,login,logout,reset-password,session}`. AI: `/api/ai/{recommendations,update-mastery}`. Classes: `/api/classes`, `/api/classes/[classId]`, `.../analytics/overview`, `.../assignments`, `.../curriculum`, `.../lessons/[lessonId]/analytics`, `.../roster`, `/api/classes/join`. Lessons: `/api/lessons/[lessonSlug]`, `.../quiz`. Students: `/api/students/[studentId]/{achievements,assignments,gamification-profile,mastery-profile}`, `.../classes/[classId]/analytics`, `.../lessons/[lessonId]/{analytics,progress}`, `/api/students/me/gamification`, `/api/student/classes`. Teachers: `/api/teachers/dashboard`, `/api/teachers/classes/[classId]/intervention-alerts`.

## 5. Prior Artifacts Referenced

- Prior audit: `measure/audit-reports/science-advantage_20260603/` (AGENTS.md compliance pilot).
- Archived remediation tracks (reviewed in batches 26–28): `content_pipeline_mastery`, `critical_security`, `platform_alignment`, `quiz_system`, `replan`, `auth_centralization`, `data_safety`, `student_engagement_loop`, `teacher_dashboard_actionability`, `visual_refresh`.
- Active tracks (reviewed in batches 29–31): `bilingual_architecture`, `content_release_workflow`, `curriculum_foundation`, `lesson_type_differentiation`, `mastery_assistance`, `onboarding_flow`, `redis_actual_integration`, `student_engagement_loop`, `student_learning_loop`, `tablet_responsiveness`, `teacher_dashboard_surfaces`, `teacher_delivery`, `thai_localization_expand`.

*Inventory complete. No remediation performed.*
