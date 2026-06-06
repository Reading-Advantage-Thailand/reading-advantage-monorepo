You are continuing the same Measure automation session after supervisor gates failed.

Role: mid
Track: ci_typecheck_alignment_20260603
Phase: Phase 8: Remove `ignoreBuildErrors: true`

Fix only the issues listed below. Preserve valid work from the previous attempt.
After fixing, rerun the relevant checks, update Measure docs, commit required changes,
and end with the required MEASURE_AGENT_RESULT block.

Supervisor feedback:
Mid role changed non-test/non-Measure files, which violates the Red-phase boundary:
- apps/science-advantage/app/(student)/settings/page.tsx
- apps/science-advantage/app/(teacher)/teacher/classes/page.tsx
- apps/science-advantage/app/(teacher)/teacher/page.tsx
- apps/science-advantage/app/api/admin/dsar/export/route.ts
- apps/science-advantage/app/api/ai/recommendations/route.ts
- apps/science-advantage/app/api/ai/update-mastery/route.ts
- apps/science-advantage/app/api/lessons/[lessonSlug]/quiz/route.ts
- apps/science-advantage/app/api/teachers/classes/[classId]/intervention-alerts/route.ts
- apps/science-advantage/components/features/teacher/class-detail/curriculum-accordion.tsx
- apps/science-advantage/components/features/teacher/class-detail/curriculum-with-data.tsx
- apps/science-advantage/lib/ai/image-generator.ts
- apps/science-advantage/lib/ai/recommendation-service.ts
- apps/science-advantage/lib/auth/session.ts
- apps/science-advantage/lib/gamification/badges.ts
- apps/science-advantage/lib/services/classes/get-class-detail.ts
- apps/science-advantage/lib/services/index.ts
- apps/science-advantage/lib/services/mastery/mastery-worker.ts
- apps/science-advantage/lib/services/mastery/standard-mastery.ts
- apps/science-advantage/scripts/backfill-mastery.ts
- apps/science-advantage/scripts/seed/seed-activity-data.ts
- apps/science-advantage/scripts/seed/seed-curriculum-units.ts
- apps/science-advantage/scripts/seed/seed-demo-data.ts
- apps/science-advantage/scripts/seed/seed-lessons.ts
- apps/science-advantage/scripts/seed/seed-questions.ts
- apps/science-advantage/scripts/seed/seed-standards.ts
- apps/science-advantage/vitest.config.ts
- apps/science-advantage/vitest.integration.config.ts
- apps/science-advantage/vitest.scripts.config.ts
- apps/science-advantage/vitest.unit.config.ts

Relevant logs:
- Agent log: /home/daniel-bo/Desktop/reading-advantage-monorepo/measure/runs/20260606T184910Z/ci_typecheck_alignment_20260603/phase-1-Phase_8_Remove_ignoreBuildErrors_true/mid-attempt-2/output.log
- Gate log: /home/daniel-bo/Desktop/reading-advantage-monorepo/measure/runs/20260606T184910Z/ci_typecheck_alignment_20260603/phase-1-Phase_8_Remove_ignoreBuildErrors_true/mid-attempt-2/gates.log
