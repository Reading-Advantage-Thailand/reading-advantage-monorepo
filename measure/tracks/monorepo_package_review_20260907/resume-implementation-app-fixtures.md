# App fixture repair report

## Result

The assigned Marketing, WWW, and Sales fixture repairs are complete.

Marketing PGlite now mirrors the current audit columns.
Its auth fixtures use valid UUID values.
The update tests retain the campaign constraint and prove denial through another campaign.
The two source checks keep their assertions and use explicit 30-second limits.

WWW page tests now await the async server component.
The compiler contract uses a 120-second limit and retains every diagnostic assertion.
The user approved the pricing and legal decision on 2026-09-07.
All locales now show localized contact pricing.
The comparison table omits unsupported competitor values.
Each empty competitor cell has a localized `Not verified` accessible label.
Service copy uses factual implementation, tracking, and review statements.
The September 2026 dates identify the copy review.
The tests use that approved review floor instead of the current calendar month.

The WWW locale switcher had a runtime defect.
The navigation pathname excludes the locale prefix, so pathname parsing returned English for Thai and Chinese routes.
The hook now reads the active `next-intl` locale and validates supported values.
Current Contact surfaces use the shared contact configuration and existing mail links.
The separate CRM track owns contact submission.

Marketing has no media upload, video job, artifact download, or cancellation routes.
This is a product capability gap rather than a failing current runtime path.
This assignment did not invent those systems.

Sales detail behavior now has runtime coverage at `RepDetailContent`.
The tests verify localized headings, dates, attempt tables, retry results, and best-attempt labels.
The old script no longer treats the thin route wrapper as the implementation.

## Files

- `apps/marketing/app/__tests__/helpers/testDb.ts`
- `apps/marketing/app/__tests__/phase-7-i18n-lang.red.test.tsx`
- `apps/marketing/app/__tests__/phase-w3-ai-adapter.test.ts`
- `apps/marketing/app/__tests__/project-update-live.test.ts`
- `apps/marketing/app/__tests__/project-update.test.ts`
- `apps/marketing/app/__tests__/topic-save-concurrency-live.test.ts`
- `apps/marketing/app/__tests__/workflow-correctness.test.ts`
- `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/reading-advantage/page.test.tsx`
- `apps/www-reading-advantage/src/__tests__/phase-3-i18n.red.test.ts`
- `apps/www-reading-advantage/src/__tests__/phase-5-pricing-legal.red.test.tsx`
- `apps/www-reading-advantage/src/components/features/comparison-table.tsx`
- `apps/www-reading-advantage/src/locales/components/comparison-table.ts`
- `apps/www-reading-advantage/src/locales/components/pricing-table.ts`
- `apps/www-reading-advantage/src/locales/navigation.ts`
- `apps/www-reading-advantage/src/locales/navigation.test.tsx`
- `apps/www-reading-advantage/src/locales/pages/managed-service.ts`
- `apps/www-reading-advantage/src/locales/pages/services.ts`
- `apps/sales-advantage/app/[locale]/admin/admin-localization.test.tsx`
- `apps/sales-advantage/scripts/sales-admin-ui.test.ts`
- `measure/tracks/wave5_public_surface_completion_20260628/plan.md`
- `measure/tracks/monorepo_package_review_20260907/plan.md`
- `graph.db`

## Verification

- Marketing affected tests: 166 passed.
- WWW async page and compiler tests: 11 passed.
- WWW pricing and legal tests: 13 passed.
- WWW pricing, accessibility, and locale tests: 21 passed.
- WWW claims tests after the review-label update: 20 passed.
- Sales administrator tests: 9 passed.
- Marketing, WWW, and Sales type checks: passed.
- Focused ESLint checks: passed in all three apps.
- Code graph update: completed for four changed source and test files.

## Remaining work

The root task owns final full app runs and optional Sales database tests.
Marketing media jobs and asset delivery need a separate product track.
Contact submission remains owned by `www_crm_lead_intake_20260722`.
