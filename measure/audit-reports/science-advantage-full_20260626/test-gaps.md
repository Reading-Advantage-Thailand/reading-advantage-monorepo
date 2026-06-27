# Test Gaps: Science Advantage

> **Track:** `science_advantage_review_20260626`
> **Source:** 37 batch reports under `line-review/`
> **Status:** Gap inventory only. No tests were added. No remediation performed. Acceptance/closeout PENDING.

## 1. Vacuous / False-Confidence Tests

| Gap | Evidence | Note |
|---|---|---|
| Tenant-isolation tests are a no-op: fixtures omit `schoolId` so `createTenantDB` filter matches everything/nothing | sa-batch-04 (F-SA-B04-001, -004), sa-batch-25 (F-SA-B25-001), sa-batch-32 (F-SA-B32-004), sa-batch-35 (F-SA-B35-006) | Tests pass but prove nothing about cross-school isolation |
| Conditional `if (await widget.isVisible())` assertion guards → false pass when feature toggled off | sa-batch-02 (F-SA-B02-031) | E2E teacher dashboard |
| `test.skip()` inside test body — appears "passed" when skipped | sa-batch-17 (F-SA-B17-017) | E2E smoke |
| E2E `beforeEach` navigates to `/signin` but performs no login | sa-batch-02 (F-SA-B02-030) | non-deterministic across envs |
| `no-console-grep` test silently passes if `rg` binary missing | sa-batch-23 (F-SA-B23-005) | false negative |
| Test logic duplicates business logic instead of importing `calculateXpForQuiz` | sa-batch-22 (F-SA-B22-016, -067) | can never catch a regression in the real function |
| `student-classes.test.ts` 403 case contradicts route + permission table | sa-batch-36 (F-SA-B36-002) | test encodes wrong contract |

## 2. Missing Test Files (production code untested)

| Untested module | Evidence |
|---|---|
| `lib/forms/from-zod.ts` (250-line business logic) | sa-batch-21 (F-SA-B21-035, High) |
| `lib/validations/quiz.ts` | sa-batch-26 (F-SA-B26-005) |
| `lib/validations/roster.ts` | sa-batch-26 (F-SA-B26-006) |
| `lib/zip/minimal-zip.ts` | sa-batch-26 (F-SA-B26-010) |
| No CI check runs seed Zod validators over `grade-4/**` (allowed F-SA-B33-001/002 to persist) | sa-batch-33 |

## 3. Missing Coverage Paths (partial tests)

| Gap | Evidence |
|---|---|
| AI-recommendation **enabled** path untested (only disabled path) | sa-batch-07 (F-SA-B07-012), sa-batch-07 quiz verdict |
| No test verifies `schoolId` propagation through session pipeline | sa-batch-20 |
| No multi-tenant isolation test for badges (school A vs B) | sa-batch-21 (F-SA-B21-044) |
| No test for negative/zero/very-large XP amounts | sa-batch-22 (F-SA-B22-014) |
| No tenant-scoping test for `awardXp` | sa-batch-22 (F-SA-B22-015) |
| No concurrency/race test for select-then-update in `streak.ts`/`xp.ts` | sa-batch-22 |
| No integration test exercises `lib/services/**` with a user session / authorization context | sa-batch-24 (F-SA-B24-060) |
| `content-parsers`: leading-whitespace procedures, h4+ sections, case-insensitive headers untested | sa-batch-21 (F-SA-B21-020/021/022) |
| `parseMaterials`: negative/decimal/multi-word quantities untested | sa-batch-21 (F-SA-B21-019) |

## 4. Weak Assertions

| Gap | Evidence |
|---|---|
| Generic `.toThrow()` instead of message-scoped assertions | sa-batch-26 (F-SA-B26-001) |
| `getAllByText().length > 0` instead of `toBeInTheDocument()` | sa-batch-07 (F-SA-B07-003) |
| Fixed-timeout waits (`waitForTimeout`) in E2E | sa-batch-02 (F-SA-B02-032/033), sa-batch-02 (F-SA-B02-035) |
| Fragile error-message string matching for 404/403 | sa-batch-03 (F-SA-B03-006), sa-batch-05 |

## 5. Test-Infra Observations

| Item | Evidence |
|---|---|
| Default `vitest.config.ts` runs a stale/failing test under `pnpm test` | sa-batch-36 (F-SA-B36-008) |
| `tsconfig.json` excludes many test files from type-checking | sa-batch-36 (F-SA-B36-003) |
| Fragile dynamic `vi.mock(import('zod'))` workaround | sa-batch-02 (F-SA-B02-065) |
| Fragile `vi.doMock`+`resetModules` 413 test (cleanup-ordering risk) | sa-batch-02 (F-SA-B02-050) |
| Passthrough mock couples to domain function internals | sa-batch-02 (F-SA-B02-067) |
| Integration setup correctly isolates `_test` DB + Drizzle migrate (positive) | sa-batch-36 |

## 6. Not Assessed (PENDING)

- Overall coverage percentages were **not** measured (no run). sa-batch-26 explicitly notes only existing-test quality and missing-file presence were assessed.
- Red-phase TDD tests cannot be distinguished from genuine failures without the Phase 4 gate run (PENDING) — sa-batch-18 (F-SA-B18-005), sa-batch-20.

*Test-gap inventory complete. No tests added. No remediation performed. Acceptance/closeout PENDING.*
