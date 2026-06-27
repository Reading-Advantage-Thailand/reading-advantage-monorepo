# Primary Advantage Test Gaps

Status: synthesized from line-review evidence (2026-06-27).

## Current Test Coverage

Primary Advantage has 7 test files:

| File | Lines | Type |
|---|---|---|
| `lib/__tests__/utils.test.ts` | 198 | Unit tests |
| `server/models/__tests__/helpers/testDb.smoke.test.ts` | 40 | DB smoke test |
| `server/models/__tests__/helpers/testDb.ts` | 202 | Test DB helper |
| `server/models/__tests__/siblingModels.behavior.test.ts` | 122 | Model behavior test |
| `server/models/__tests__/studentModel.pagination.test.ts` | 138 | Pagination test |
| `server/utils/genaretors/__tests__/new-generator.caller.test.ts` | 80 | Generator test |
| `server/utils/genaretors/__tests__/new-generator.test.ts` | 215 | Generator test |

**Total test lines**: ~995 (0.84% of 118,709 total lines).

## Identified Test Gaps

### G1: Auth/Authorization Tests (Critical)

**Finding evidence**: 72 findings for missing auth across routes and actions.
**Gap**: No tests verify that API routes reject unauthenticated requests or enforce role-based access.
**Recommendation**: Add middleware-level auth tests for all 64 API routes. Test: unauthenticated, wrong role, cross-tenant access.

### G2: Tenant Isolation Tests (High)

**Finding evidence**: 48 findings for missing schoolId scoping.
**Gap**: No tests verify that queries are tenant-scoped. No cross-tenant isolation tests.
**Recommendation**: Add integration tests that create data for school A, authenticate as school B, and verify school A data is inaccessible.

### G3: Game Component Completion Tests (Critical)

**Finding evidence**: ~30 findings for undefined `update`/`session` causing runtime crashes.
**Gap**: No tests exercise game completion flows. All affected components crash on the final step.
**Recommendation**: Add unit/component tests for each game component's completion handler. Verify `update()` is called with correct XP values.

### G4: Admin CRUD Tests (Critical)

**Finding evidence**: LR-008-001/002/003 — optimistic-only operations.
**Gap**: No tests verify admin add/update/delete operations actually persist to the database.
**Recommendation**: Add integration tests for admin student/teacher CRUD that verify database state.

### G5: Lesson/Quiz Progression Tests (High)

**Finding evidence**: LR-003-002 (MC XP bug), LR-003-003 (completion tracking bug), LR-080-001 (level calculation bug).
**Gap**: No tests for XP calculation, completion tracking, or CEFR level progression.
**Recommendation**: Add unit tests for `actions/question.ts` XP branches, `actions/user.ts` completion tracking, `lib/calculateLevel.ts`.

### G6: Flashcard/FSRS Tests (Critical)

**Finding evidence**: 9+ Critical/High findings — flashcard routes use non-existent schema columns.
**Gap**: Flashcard routes have no tests; schema mismatch would be caught by any integration test.
**Recommendation**: Add integration tests for flashcard deck/card creation, due-card retrieval, and game data generation.

### G7: Data Validation Tests (Medium)

**Finding evidence**: 95 unsafe type casts, Zod validation bypassed in multiple routes.
**Gap**: No tests verify input validation, error handling, or type safety at API boundaries.
**Recommendation**: Add unit tests for Zod schemas in `lib/zod.ts`. Add boundary tests for API route validation.

### G8: I18n Coverage Tests (Medium)

**Finding evidence**: 77 i18n findings across 5 locales.
**Gap**: No tests verify that all message keys exist in all 5 locale files.
**Recommendation**: Add snapshot tests comparing key sets across locale files.

### G9: XSS/Security Tests (High)

**Finding evidence**: LR-026-004 (AI feedback rendered unsanitized), path traversal vulnerabilities.
**Gap**: No security-focused tests.
**Recommendation**: Add tests for HTML sanitization of AI-generated content. Add path traversal tests for file upload/cleanup routes.

### G10: E2E/User Flow Tests (High)

**Finding evidence**: Multiple admin/reporting features are stubs or non-functional.
**Gap**: No end-to-end tests for student reading flow, teacher classroom management, or admin operations.
**Recommendation**: Add critical-path E2E tests: student reads article -> answers questions -> sees XP update; teacher creates assignment -> student completes -> teacher sees report.

## Test Infrastructure Gaps

| Gap | Detail | Priority |
|---|---|---|
| Vitest config exists | `vitest.config.ts` present (15 lines) | — |
| No test coverage thresholds | No coverage config in vitest.config.ts | Medium |
| No CI test commands | Package.json lacks `test:ci` or equivalent | Medium |
| DB test helper | `testDb.ts` exists but only used in 2 test files | Low |
| No mock adapter patterns | No shared mock for auth/session/storage | Medium |
| No security scanning | No SAST, secret scanning, or dependency audit | High |

## Recommended Test Order

1. **Immediate**: G3 (game component tests) — catch all runtime crashes.
2. **Immediate**: G6 (flashcard tests) — catch schema mismatch.
3. **Immediate**: G1 (auth tests) — verify auth boundaries exist.
4. **Short-term**: G4, G5 (admin CRUD, XP/level calculations).
5. **Short-term**: G2 (tenant isolation).
6. **Short-term**: G7, G9 (validation, security).
7. **Medium-term**: G8, G10 (i18n, E2E flows).
