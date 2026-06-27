# Sales Advantage Line Review Coverage Manifest

- Track: `sales_advantage_review_20260626`
- Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- In-scope tracked files: 110
- Batch count: 6
- Batch size: 20 files, final batch may be smaller
- Scope: `apps/sales-advantage` plus sales domain/API/db/types and packages/ai multimodal support
- Exclusions: `.next/**`, `node_modules/**`, `public/**`, `coverage/**`, `.turbo/**`
- Source code edited during review: none intended

## Batch Manifests

### sales-batch-00
- File count: 20
- Report: `line-review/sales-batch-00.md`

- `apps/sales-advantage/.env.example`
- `apps/sales-advantage/app/[locale]/admin/[repId]/page.tsx`
- `apps/sales-advantage/app/[locale]/admin/create-rep/page.tsx`
- `apps/sales-advantage/app/[locale]/admin/curriculum/page.tsx`
- `apps/sales-advantage/app/[locale]/admin/page.tsx`
- `apps/sales-advantage/app/[locale]/layout.tsx`
- `apps/sales-advantage/app/[locale]/lesson/[id]/page.tsx`
- `apps/sales-advantage/app/[locale]/module/[slug]/page.tsx`
- `apps/sales-advantage/app/[locale]/page.tsx`
- `apps/sales-advantage/app/api/auth/login/route.ts`
- `apps/sales-advantage/app/api/auth/logout/route.ts`
- `apps/sales-advantage/app/api/auth/session/route.ts`
- `apps/sales-advantage/app/api/chat/__tests__/route.test.ts`
- `apps/sales-advantage/app/api/chat/route.ts`
- `apps/sales-advantage/app/api/lesson-complete/route.ts`
- `apps/sales-advantage/app/api/roleplay-attempts/__tests__/route.test.ts`
- `apps/sales-advantage/app/api/roleplay-attempts/route.ts`
- `apps/sales-advantage/app/api/trpc/[trpc]/route.ts`
- `apps/sales-advantage/app/globals.css`
- `apps/sales-advantage/app/layout.tsx`

### sales-batch-01
- File count: 20
- Report: `line-review/sales-batch-01.md`

- `apps/sales-advantage/components/chat-tutor.tsx`
- `apps/sales-advantage/components/header.tsx`
- `apps/sales-advantage/components/language-switcher.tsx`
- `apps/sales-advantage/components/login-form.tsx`
- `apps/sales-advantage/components/providers.tsx`
- `apps/sales-advantage/components/quiz-component.tsx`
- `apps/sales-advantage/components/roleplay-recorder.tsx`
- `apps/sales-advantage/components/roleplay-result.tsx`
- `apps/sales-advantage/eslint.config.mjs`
- `apps/sales-advantage/i18n/navigation.ts`
- `apps/sales-advantage/i18n/request.ts`
- `apps/sales-advantage/i18n/routing.ts`
- `apps/sales-advantage/lib/__tests__/setup.ts`
- `apps/sales-advantage/lib/i18n-font.ts`
- `apps/sales-advantage/lib/i18n-messages.ts`
- `apps/sales-advantage/lib/rate-limit.ts`
- `apps/sales-advantage/lib/trpc.ts`
- `apps/sales-advantage/messages/en.json`
- `apps/sales-advantage/messages/th.json`
- `apps/sales-advantage/next-env.d.ts`

### sales-batch-02
- File count: 20
- Report: `line-review/sales-batch-02.md`

- `apps/sales-advantage/next.config.ts`
- `apps/sales-advantage/package.json`
- `apps/sales-advantage/postcss.config.mjs`
- `apps/sales-advantage/proxy.ts`
- `apps/sales-advantage/scripts/sales-curriculum-seed.ts`
- `apps/sales-advantage/scripts/static-seed.ts`
- `apps/sales-advantage/tsconfig.json`
- `apps/sales-advantage/vitest.config.ts`
- `packages/ai/README.md`
- `packages/ai/eslint.config.mjs`
- `packages/ai/package.json`
- `packages/ai/src/__tests__/__snapshots__/phase-2-mock-provider.test.ts.snap`
- `packages/ai/src/__tests__/contract-suite.ts`
- `packages/ai/src/__tests__/diagram.fixture.ts`
- `packages/ai/src/__tests__/phase-0-setup.test.ts`
- `packages/ai/src/__tests__/phase-1-interface.test-d.ts`
- `packages/ai/src/__tests__/phase-10-closeout.test.ts`
- `packages/ai/src/__tests__/phase-11-sdk-v2-call-shape.test.ts`
- `packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts`
- `packages/ai/src/__tests__/phase-12-closeout-artifacts.test.ts`

### sales-batch-03
- File count: 20
- Report: `line-review/sales-batch-03.md`

- `packages/ai/src/__tests__/phase-13-adversarial-arch-guard-regex.test.ts`
- `packages/ai/src/__tests__/phase-13-adversarial-gate-result-scope.test.ts`
- `packages/ai/src/__tests__/phase-13-adversarial-streamText-await.test.ts`
- `packages/ai/src/__tests__/phase-2-mock-provider.test.ts`
- `packages/ai/src/__tests__/phase-3-openai-provider.test.ts`
- `packages/ai/src/__tests__/phase-4-google-provider.test.ts`
- `packages/ai/src/__tests__/phase-5-provider-selector.test.ts`
- `packages/ai/src/__tests__/phase-9-docs.test.ts`
- `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`
- `packages/ai/src/__tests__/phase-multimodal-contract.test.ts`
- `packages/ai/src/__tests__/phase-multimodal-google.test.ts`
- `packages/ai/src/__tests__/phase-multimodal-openrouter.test.ts`
- `packages/ai/src/__tests__/phase-multimodal-unsupported.test.ts`
- `packages/ai/src/__tests__/phase-stream-text-contract.test.ts`
- `packages/ai/src/__tests__/recommendations.fixture.ts`
- `packages/ai/src/__tests__/test-utils.ts`
- `packages/ai/src/client.test.ts`
- `packages/ai/src/client.ts`
- `packages/ai/src/errors.ts`
- `packages/ai/src/index.ts`

### sales-batch-04
- File count: 20
- Report: `line-review/sales-batch-04.md`

- `packages/ai/src/providers/google.test.ts`
- `packages/ai/src/providers/google.ts`
- `packages/ai/src/providers/mock.test.ts`
- `packages/ai/src/providers/mock.ts`
- `packages/ai/src/providers/openai.test.ts`
- `packages/ai/src/providers/openai.ts`
- `packages/ai/src/providers/openrouter-preflight.test.ts`
- `packages/ai/src/providers/openrouter.test.ts`
- `packages/ai/src/providers/openrouter.ts`
- `packages/ai/src/types.ts`
- `packages/ai/tsconfig.json`
- `packages/ai/vitest.config.ts`
- `packages/api/src/__tests__/sales-router.test.ts`
- `packages/api/src/routers/sales.ts`
- `packages/db/drizzle/0021_sales_advantage.sql`
- `packages/db/src/__tests__/sales-schema-parity.test.ts`
- `packages/db/src/schema/sales.ts`
- `packages/domain/src/__tests__/sales-mutations.test.ts`
- `packages/domain/src/__tests__/sales-queries.test.ts`
- `packages/domain/src/__tests__/sales-roleplay-evaluator.test.ts`

### sales-batch-05
- File count: 10
- Report: `line-review/sales-batch-05.md`

- `packages/domain/src/sales/__tests__/excerpt-derivation.test.ts`
- `packages/domain/src/sales/__tests__/permissions-and-evaluator.test.ts`
- `packages/domain/src/sales/contracts.ts`
- `packages/domain/src/sales/errors.ts`
- `packages/domain/src/sales/index.ts`
- `packages/domain/src/sales/mutations.ts`
- `packages/domain/src/sales/permissions.ts`
- `packages/domain/src/sales/queries.ts`
- `packages/domain/src/sales/roleplay-evaluator.ts`
- `packages/domain/src/sales/schema.ts`

