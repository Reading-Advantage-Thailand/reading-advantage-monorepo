# Plan

## Phase 1: Money Correctness

- [x] (02273c228) Task: Add the currency exponent to `derivedRate` through `Intl.NumberFormat`. Source: `docs/accounting-ux-refactor-plan.md` §2.1; Issues: `app/lib/derived-rate.ts:19-25`, `packages/backend/src/modules/finance-operations/contracts.ts:6`
- [x] (02273c228) Task: Pass the currency at both `derivedRate` call sites. Source: `docs/accounting-ux-refactor-plan.md` §2.1; Issues: `app/api/submissions/export/route.ts:92,106`, `app/_components/pending-submissions-list.tsx:215-219`
- [x] (8aa186aed) Task: Format review list amounts as currency, not as minor units. Source: `docs/accounting-ux-refactor-plan.md` §2.4; Issues: `app/_components/pending-submissions-list.tsx:238,244`
- [x] (022bd294d) Task: Convert `submittedAt` to the business time zone in the export filter. Source: `docs/accounting-ux-refactor-plan.md` §2.3; Issues: `app/api/submissions/export/route.ts:78,107`, `packages/backend/src/modules/accounting/postgres-submission-repository.ts:57-58`
- [x] (022bd294d) Task: Replace the offset test fixture with a UTC fixture at the day boundary. Source: `docs/accounting-ux-refactor-plan.md` §2.3; Issues: `app/api/submissions/export/route.test.ts:100,232`
- [x] (b986e0595) Task: Add a major-unit preview under the submission form amount field. Source: `docs/accounting-ux-refactor-plan.md` §2.4; Issues: `app/_components/new-submission-form.tsx:356,378`
