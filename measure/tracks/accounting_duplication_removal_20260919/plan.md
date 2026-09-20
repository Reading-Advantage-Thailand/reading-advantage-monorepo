# Plan

## Phase 1: Duplication Removal

- [x] (8bbdd35) Task: Extract `app/lib/route-helpers.ts` and delete the five actor copies, four response copies, and duplicated error predicates. Source: `docs/accounting-ux-refactor-plan.md` §6; Issues: `app/page.tsx:18-22`, `app/api/submissions/route.ts:42-61`, `app/api/submissions/[id]/approve/route.ts:23-97`, `app/api/submissions/[id]/reject/route.ts:24-98`
- [x] (b470ef5) Task: Move the three loose library tests into `app/lib/__tests__/`. Source: `docs/accounting-ux-refactor-plan.md` §6; Issues: `app/lib/derived-rate.test.ts:1`, `app/lib/auth.test.ts:1`, `app/lib/submissions.test.ts:1`
