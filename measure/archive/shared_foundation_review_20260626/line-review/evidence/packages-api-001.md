# Line Review Evidence: packages-api-001

Reviewer: Measure Review A
Files assigned: 5
Lines assigned: 1180

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---|
| packages/api/docs/route-audit.md | 1-851 | reviewed | 2 |
| packages/api/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/api/package.json | 1-57 | reviewed | 0 |
| packages/api/src/__tests__/articles-router.test.ts | 1-112 | reviewed | 1 |
| packages/api/src/__tests__/assignments-router.test.ts | 1-157 | reviewed | 1 |

## Findings

### LR-packages-api-001-001 — route-audit.md migration-priority totals disagree with tier summary

- Severity: Medium
- File: `packages/api/docs/route-audit.md:802-840`
- Evidence: Section 1.1 states Tier 1 = 92, Tier 2 = 37, Tier 3 = 132, and Tier 4 = 33 routes. Section 4 itemizes the same tiers as: Tier 1 = Auth 13 + User CRUD 39 + Classroom 45 + Assignment 9 + License 8 = 114; Tier 2 = Article content 26 + Flashcard/SRS 21 + Reports/XP 9 = 56; Tier 3 = Games 27 + Admin/System 14 + Goals 8 + Science curriculum 16 + Demo/Debug/Upload 9 = 74; Tier 4 = AI generation 16 + AI insights 5 + Translation 5 + Level test 2 + Story generation 3 = 31. None of these sums match the section 1.1 totals.
- Impact: The audit is used for migration planning and prioritization; inconsistent route counts undermine scope estimates and tier ordering decisions.
- Recommendation: Reconcile the detailed domain counts against the summary tables and correct either the section 1.1 totals or the section 4 narrative in a docs-fix track.

### LR-packages-api-001-002 — route-audit.md records probable typo in archived route path

- Severity: Low
- File: `packages/api/docs/route-audit.md:172`
- Evidence: The route path is listed as `/v1/classroom/[classroomId]/achived` rather than the expected `archived`.
- Impact: If the path is faithfully copied from the source app, the doc silently perpetuates a user-facing route typo; if it is a doc typo, the audit misrepresents the actual API surface.
- Recommendation: Verify the actual route file and fix the documentation (and the route if the typo is real) in a dedicated chore.

### LR-packages-api-001-003 — articles-router tests only assert output field stripping

- Severity: Medium
- File: `packages/api/src/__tests__/articles-router.test.ts:59-111`
- Evidence: Every test mocks the domain function, calls the router procedure, and only asserts that one scalar field is correct and that `extraField` is absent. There are no cases covering unauthenticated callers, unauthorized roles, error propagation, or that inputs are forwarded correctly to `listArticles`, `getArticle`, `createArticle`, or `updateArticle`.
- Impact: The tests give false confidence in the router layer; regressions in auth wiring, input mapping, or error handling will not be caught.
- Recommendation: Expand the router test suite to cover authentication/authorization failures, input forwarding, and error paths.

### LR-packages-api-001-004 — assignments-router tests only assert output field stripping

- Severity: Medium
- File: `packages/api/src/__tests__/assignments-router.test.ts:61-156`
- Evidence: All tests mock the domain layer and only verify that `extraField` is stripped or that a scalar value is returned. There is no coverage for unauthenticated or unauthorized callers, error propagation, or that inputs such as `classroomId`, `score`, and `assignmentId` are forwarded to the domain functions.
- Impact: Shallow router coverage hides regressions in auth gating, input transformation, and error mapping.
- Recommendation: Add tests for auth rejection, input forwarding, and error cases for `create`, `list`, `get`, `update`, `delete`, and `submit`.

## No-Finding Notes

- `packages/api/eslint.config.mjs`: reviewed line-by-line; standard re-export of shared config, no findings.
- `packages/api/package.json`: reviewed line-by-line; exports, scripts, dependencies, and peer constraints are consistent, no findings.
