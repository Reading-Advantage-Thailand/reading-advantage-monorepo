# CodeCamp Advantage Line Review Coverage Manifest

- Track: `codecamp_advantage_review_20260626`
- Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- In-scope tracked files: 209
- Batch count: 11
- Batch size: 20 files, final batch may be smaller
- Scope: `apps/codecamp-advantage` plus CodeCamp modules in domain/api/webhooks/db/types/integrations/github
- Exclusions: `.next/**`, `node_modules/**`, `public/**`, `coverage/**`, `.turbo/**`
- App/source code edited during review: none intended

## Batch Manifests

### cc-batch-00
- File count: 20
- Report: `line-review/cc-batch-00.md`

- `apps/codecamp-advantage/.browserslistrc`
- `apps/codecamp-advantage/.env.example`
- `apps/codecamp-advantage/.gitignore`
- `apps/codecamp-advantage/Dockerfile`
- `apps/codecamp-advantage/app/[locale]/admin/[userId]/page.tsx`
- `apps/codecamp-advantage/app/[locale]/admin/new-intern/page.tsx`
- `apps/codecamp-advantage/app/[locale]/admin/page.tsx`
- `apps/codecamp-advantage/app/[locale]/chat/page.tsx`
- `apps/codecamp-advantage/app/[locale]/dashboard-content.tsx`
- `apps/codecamp-advantage/app/[locale]/error.tsx`
- `apps/codecamp-advantage/app/[locale]/layout.tsx`
- `apps/codecamp-advantage/app/[locale]/lesson/[id]/page.tsx`
- `apps/codecamp-advantage/app/[locale]/module/[slug]/page.tsx`
- `apps/codecamp-advantage/app/[locale]/not-found.tsx`
- `apps/codecamp-advantage/app/[locale]/page.tsx`
- `apps/codecamp-advantage/app/api/auth/login/route.ts`
- `apps/codecamp-advantage/app/api/auth/logout/route.ts`
- `apps/codecamp-advantage/app/api/auth/reset-password/route.ts`
- `apps/codecamp-advantage/app/api/auth/session/route.ts`
- `apps/codecamp-advantage/app/api/chat/route.ts`

### cc-batch-01
- File count: 20
- Report: `line-review/cc-batch-01.md`

- `apps/codecamp-advantage/app/api/trpc/[trpc]/route.ts`
- `apps/codecamp-advantage/app/error.tsx`
- `apps/codecamp-advantage/app/globals.css`
- `apps/codecamp-advantage/app/layout.tsx`
- `apps/codecamp-advantage/app/not-found.tsx`
- `apps/codecamp-advantage/app/webhooks/github/pr/route.ts`
- `apps/codecamp-advantage/cloudbuild.yaml`
- `apps/codecamp-advantage/components/__tests__/fork-instruction.test.tsx`
- `apps/codecamp-advantage/components/__tests__/language-switcher.test.tsx`
- `apps/codecamp-advantage/components/__tests__/lesson-content.test.tsx`
- `apps/codecamp-advantage/components/__tests__/review-history.test.tsx`
- `apps/codecamp-advantage/components/__tests__/workflow-tracker.test.tsx`
- `apps/codecamp-advantage/components/fork-instruction.tsx`
- `apps/codecamp-advantage/components/header.tsx`
- `apps/codecamp-advantage/components/language-switcher.tsx`
- `apps/codecamp-advantage/components/lesson-content.tsx`
- `apps/codecamp-advantage/components/providers.tsx`
- `apps/codecamp-advantage/components/review-history.tsx`
- `apps/codecamp-advantage/components/workflow-tracker.tsx`
- `apps/codecamp-advantage/docs/assessment-rubric.md`

### cc-batch-02
- File count: 20
- Report: `line-review/cc-batch-02.md`

- `apps/codecamp-advantage/docs/github-app-setup.md`
- `apps/codecamp-advantage/docs/pacing-guide.md`
- `apps/codecamp-advantage/docs/pr-review-e2e-runbook.md`
- `apps/codecamp-advantage/e2e/phase-10-concurrent-session.spec.ts`
- `apps/codecamp-advantage/e2e/phase-11-cross-browser-device.spec.ts`
- `apps/codecamp-advantage/eslint.config.mjs`
- `apps/codecamp-advantage/i18n/navigation.ts`
- `apps/codecamp-advantage/i18n/request.ts`
- `apps/codecamp-advantage/i18n/routing.ts`
- `apps/codecamp-advantage/jest-dom.d.ts`
- `apps/codecamp-advantage/lib/__tests__/_helpers/cloudbuild-parser.test.ts`
- `apps/codecamp-advantage/lib/__tests__/_helpers/cloudbuild-parser.ts`
- `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.test.ts`
- `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.ts`
- `apps/codecamp-advantage/lib/__tests__/chat-locale.test.ts`
- `apps/codecamp-advantage/lib/__tests__/cold-start-optimization.test.ts`
- `apps/codecamp-advantage/lib/__tests__/i18n-additional-keys.test.ts`
- `apps/codecamp-advantage/lib/__tests__/i18n-admin-keys.test.ts`
- `apps/codecamp-advantage/lib/__tests__/i18n-font.test.ts`
- `apps/codecamp-advantage/lib/__tests__/i18n-format.test.ts`

### cc-batch-03
- File count: 20
- Report: `line-review/cc-batch-03.md`

- `apps/codecamp-advantage/lib/__tests__/i18n-key-parity.test.ts`
- `apps/codecamp-advantage/lib/__tests__/i18n-locale-loading.test.ts`
- `apps/codecamp-advantage/lib/__tests__/i18n-request.test.ts`
- `apps/codecamp-advantage/lib/__tests__/i18n-routing.test.ts`
- `apps/codecamp-advantage/lib/__tests__/lesson-language-badge.test.ts`
- `apps/codecamp-advantage/lib/__tests__/module-utils.test.ts`
- `apps/codecamp-advantage/lib/__tests__/next-config-security-headers.test.ts`
- `apps/codecamp-advantage/lib/__tests__/pr-url.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/local-qa-parity-matrix.json`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-10-edge-cases-and-production-scenarios.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-11-cross-browser-and-device-testing.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-12-regression-against-local-qa.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-13-production-readiness-report.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-2-database-and-configuration.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-3-authentication-and-authorization.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-4-feature-parity.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-5-real-external-integrations.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-7-cdn-and-caching.test.ts`

### cc-batch-04
- File count: 20
- Report: `line-review/cc-batch-04.md`

- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-8-5-deployment-gate.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-8-logging-monitoring-and-error-reporting.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-9-github-webhook-specifics.test.ts`
- `apps/codecamp-advantage/lib/__tests__/prod-smoke/report-summary.json`
- `apps/codecamp-advantage/lib/__tests__/proxy-role.test.ts`
- `apps/codecamp-advantage/lib/__tests__/proxy.test.ts`
- `apps/codecamp-advantage/lib/__tests__/rate-limit.test.ts`
- `apps/codecamp-advantage/lib/__tests__/setup.ts`
- `apps/codecamp-advantage/lib/__tests__/smoke-local-image-script.test.ts`
- `apps/codecamp-advantage/lib/__tests__/strip-nomodule-polyfill.test.ts`
- `apps/codecamp-advantage/lib/__tests__/thai-text-width.test.ts`
- `apps/codecamp-advantage/lib/__tests__/use-chat-stream-locale.test.ts`
- `apps/codecamp-advantage/lib/i18n-font.ts`
- `apps/codecamp-advantage/lib/i18n-format.ts`
- `apps/codecamp-advantage/lib/i18n-messages.ts`
- `apps/codecamp-advantage/lib/module-utils.ts`
- `apps/codecamp-advantage/lib/pr-url.ts`
- `apps/codecamp-advantage/lib/rate-limit.ts`
- `apps/codecamp-advantage/lib/trpc.ts`
- `apps/codecamp-advantage/lib/use-chat-stream.ts`

### cc-batch-05
- File count: 20
- Report: `line-review/cc-batch-05.md`

- `apps/codecamp-advantage/measure/curriculum/course-spec.md`
- `apps/codecamp-advantage/measure/curriculum/unit-01-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-01-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-02-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-02-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-03-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-03-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-04-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-04-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-05-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-05-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-06-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-06-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-07-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-07-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-08-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-08-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-09-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-09-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-10-class-period-plan.md`

### cc-batch-06
- File count: 20
- Report: `line-review/cc-batch-06.md`

- `apps/codecamp-advantage/measure/curriculum/unit-10-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-11-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-11-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-12-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-12-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-13-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-13-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-14-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-14-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-15-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-15-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-16-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-16-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-17-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-17-overview.md`
- `apps/codecamp-advantage/measure/curriculum/unit-18-class-period-plan.md`
- `apps/codecamp-advantage/measure/curriculum/unit-18-overview.md`
- `apps/codecamp-advantage/messages/en.json`
- `apps/codecamp-advantage/messages/th.json`
- `apps/codecamp-advantage/next.config.ts`

### cc-batch-07
- File count: 20
- Report: `line-review/cc-batch-07.md`

- `apps/codecamp-advantage/package.json`
- `apps/codecamp-advantage/playwright.config.ts`
- `apps/codecamp-advantage/postcss.config.mjs`
- `apps/codecamp-advantage/proxy.ts`
- `apps/codecamp-advantage/scripts/smoke-local-image.sh`
- `apps/codecamp-advantage/scripts/strip-nomodule-polyfill.mjs`
- `apps/codecamp-advantage/tsconfig.json`
- `apps/codecamp-advantage/vitest.config.ts`
- `packages/api/src/__tests__/codecamp-review-router.test.ts`
- `packages/api/src/__tests__/codecamp-router.test.ts`
- `packages/api/src/routers/codecamp.ts`
- `packages/db/drizzle/0005_codecamp_schema.sql`
- `packages/db/drizzle/0006_codecamp_indexes.sql`
- `packages/db/drizzle/0007_codecamp_repos_reviews.sql`
- `packages/db/drizzle/0008_codecamp_phase.sql`
- `packages/db/drizzle/0010_codecamp_uniqueness.sql`
- `packages/db/drizzle/0011_codecamp_webhook_events.sql`
- `packages/db/drizzle/0012_codecamp_intern_role.sql`
- `packages/db/src/__tests__/codecamp-backfill-exercises.test.ts`
- `packages/db/src/__tests__/codecamp-curriculum-data-combined.test.ts`

### cc-batch-08
- File count: 20
- Report: `line-review/cc-batch-08.md`

- `packages/db/src/__tests__/codecamp-curriculum-data-phase-b.test.ts`
- `packages/db/src/__tests__/codecamp-curriculum-data-phase-c.test.ts`
- `packages/db/src/__tests__/codecamp-curriculum-data-phase-d.test.ts`
- `packages/db/src/__tests__/codecamp-curriculum-data.test.ts`
- `packages/db/src/__tests__/codecamp-curriculum-fidelity.test.ts`
- `packages/db/src/__tests__/codecamp-stale-seed.test.ts`
- `packages/db/src/schema/codecamp.ts`
- `packages/db/src/seed/codecamp-backfill-exercises.ts`
- `packages/db/src/seed/codecamp-curriculum-data.ts`
- `packages/db/src/seed/codecamp-seed.ts`
- `packages/domain/src/__tests__/codecamp-github-identity.test.ts`
- `packages/domain/src/__tests__/codecamp-github-issues.test.ts`
- `packages/domain/src/__tests__/codecamp-quiz-progression.test.ts`
- `packages/domain/src/__tests__/codecamp.test.ts`
- `packages/domain/src/codecamp/chat.ts`
- `packages/domain/src/codecamp/errors.ts`
- `packages/domain/src/codecamp/exercises.ts`
- `packages/domain/src/codecamp/github-issues.ts`
- `packages/domain/src/codecamp/index.ts`
- `packages/domain/src/codecamp/intern-accounts.ts`

### cc-batch-09
- File count: 20
- Report: `line-review/cc-batch-09.md`

- `packages/domain/src/codecamp/lessons.ts`
- `packages/domain/src/codecamp/modules.ts`
- `packages/domain/src/codecamp/permissions.ts`
- `packages/domain/src/codecamp/pr-reviews.ts`
- `packages/domain/src/codecamp/progress.ts`
- `packages/domain/src/codecamp/quizzes.ts`
- `packages/domain/src/codecamp/review-exercise.ts`
- `packages/integrations/github/README.md`
- `packages/integrations/github/eslint.config.mjs`
- `packages/integrations/github/package.json`
- `packages/integrations/github/src/__tests__/client.test.ts`
- `packages/integrations/github/src/__tests__/factory.test.ts`
- `packages/integrations/github/src/client.ts`
- `packages/integrations/github/src/drivers/rest.ts`
- `packages/integrations/github/src/factory.ts`
- `packages/integrations/github/src/index.ts`
- `packages/integrations/github/tsconfig.json`
- `packages/integrations/github/vitest.config.ts`
- `packages/types/src/codecamp.ts`
- `packages/webhooks/src/__tests__/github-client.test.ts`

### cc-batch-10
- File count: 9
- Report: `line-review/cc-batch-10.md`

- `packages/webhooks/src/__tests__/github-review.test.ts`
- `packages/webhooks/src/__tests__/github-webhook.test.ts`
- `packages/webhooks/src/__tests__/phase-5-dead-code.test.ts`
- `packages/webhooks/src/__tests__/phase-6-acceptance.test.ts`
- `packages/webhooks/src/__tests__/phase-7-closeout.test.ts`
- `packages/webhooks/src/github-client.ts`
- `packages/webhooks/src/github.ts`
- `packages/webhooks/src/health.ts`
- `packages/webhooks/src/index.ts`

