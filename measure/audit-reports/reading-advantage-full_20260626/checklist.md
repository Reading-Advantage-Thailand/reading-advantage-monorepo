# Review Checklist: Reading Advantage Security / UX / Correctness

> **Audit:** reading-advantage-full_20260626
> **Review roles:** B — Security / Tenancy / Auth; C — UX / API / Contracts; A — Correctness / Product Behavior
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6

---

## UX Flow Completeness

| # | Check | Status | Notes |
|---|-------|--------|-------|
| U-1 | Student reading flow (browse → read → quiz → feedback) | ✅ Complete | Full flow exists with MCQ/SAQ/LAQ |
| U-2 | Student story flow (browse → read → chapter quiz → completion) | ✅ Complete | Chapter-based progression works |
| U-3 | Student flashcard flow (deck → cloze/ordering → FSRS update) | ✅ Complete | FSRS integration functional |
| U-4 | Student dashboard (progress, assignments, XP, streak) | ✅ Complete | Rich dashboard with multiple data sources |
| U-5 | Teacher classroom management (create, roster, enroll/unenroll) | ⚠️ Partial | Missing ownership checks (C-007) |
| U-6 | Teacher assignment flow (create, assign, monitor) | ✅ Complete | Full CRUD with role restrictions |
| U-7 | Teacher reports (class accuracy, export) | ✅ Complete | Multiple report types |
| U-8 | Admin dashboard (overview, segments, alerts) | ✅ Complete | Role-scoped data |
| U-9 | Admin teacher management (effectiveness, assignments) | ✅ Complete | — |
| U-10 | Level test flow | ⚠️ Unknown | Not reviewed in detail |
| U-11 | Settings/profile management | ⚠️ Partial | Settings page exists, contract unknown |
| U-12 | Workbook generator (teacher) | ⚠️ Unknown | Not reviewed in detail |

## API Contract Consistency

| # | Check | Status | Finding |
|---|-------|--------|---------|
| A-1 | Consistent error response shape across all routes | ❌ Fail | C-001: 6+ different error shapes |
| A-2 | HTTP status codes used correctly (not in body) | ❌ Fail | C-002: Status codes in response body |
| A-3 | Input validation on all endpoints | ❌ Fail | C-004: No Zod validation on most routes |
| A-4 | Response type definitions for all endpoints | ❌ Fail | C-015: No shared response types |
| A-5 | Empty state responses are consistent | ❌ Fail | C-010: Multiple empty-state patterns |
| A-6 | Pagination contract defined | ❌ Fail | No pagination metadata |
| A-7 | Rate limiting on auth endpoints | ⚠️ Unknown | Relies on shared package |
| A-8 | No duplicate endpoints doing same thing | ❌ Fail | C-005: signup vs register |

## Security / Authorization

| # | Check | Status | Finding |
|---|-------|--------|---------|
| S-1 | All mutating endpoints require authentication | ❌ Fail | C-003: 14+ unauthenticated sensitive endpoints |
| S-2 | Role-based access control on admin routes | ✅ Pass | restrictTo() used on admin routes |
| S-3 | Ownership verification on destructive actions | ❌ Fail | C-007: Classroom operations lack ownership checks |
| S-4 | Tenant/school isolation enforced | ❌ Fail | No TenantDB, no schoolId verification |
| S-5 | Audit logging on destructive operations | ❌ Fail | C-008: Zero audit logging |
| S-6 | PII not sent to AI providers without consent | ❌ Fail | Student content sent to OpenAI |
| S-7 | Password hashing uses argon2id | ⚠️ Partial | Shared package uses argon2id, signup route uses bcryptjs |

## Data Access Patterns

| # | Check | Status | Finding |
|---|-------|--------|---------|
| D-1 | Routes use domain layer, not direct DB | ❌ Fail | 49/54 controllers import db directly |
| D-2 | TenantDB wrapper used for multi-tenant queries | ❌ Fail | 0 TenantDB usage |
| D-3 | assertCan used for permission checks | ❌ Fail | 0 assertCan usage |
| D-4 | Input validated at boundary | ❌ Fail | C-004: No validation |
| D-5 | Database access through repository pattern | ❌ Fail | Direct Drizzle queries in controllers |

## Error Handling

| # | Check | Status | Finding |
|---|-------|--------|---------|
| E-1 | All errors return proper HTTP status | ❌ Fail | C-002: Status in body |
| E-2 | Error messages don't leak internals | ⚠️ Partial | Some expose error.message |
| E-3 | Catch blocks handle all error types | ⚠️ Partial | Generic catch with console.error |
| E-4 | No unhandled promise rejections | ⚠️ Unknown | Not verified |
| E-5 | Graceful degradation for AI failures | ⚠️ Partial | Some endpoints have try/catch |

## Observability

| # | Check | Status | Finding |
|---|-------|--------|---------|
| O-1 | Structured logging | ❌ Fail | C-009: console.log/error only |
| O-2 | Request ID correlation | ❌ Fail | No request IDs |
| O-3 | Performance metrics logged | ⚠️ Partial | Duration logged in some controllers |
| O-4 | Error reporting integrated | ❌ Fail | No Sentry/error reporting |
| O-5 | Audit trail for security events | ❌ Fail | C-008: No audit logging |

## Product Correctness

| # | Check | Status | Finding |
|---|-------|--------|---------|
| P-1 | XP awarded exactly once per activity (idempotent) | ❌ Fail | PB-001: read-check-insert-update race |
| P-2 | Level-test assessment validated before persistence | ❌ Fail | PB-002: parsed JSON has no schema |
| P-3 | AI-generated content matches requested CEFR level | ❌ Fail | PB-003: no post-generation level gate |
| P-4 | Assignment status semantics are consistent | ❌ Fail | PB-004: ad-hoc `statusToInt` mapping |
| P-5 | Class accuracy reports are mathematically sound | ❌ Fail | PB-005: MCQ + open-ended combined incorrectly |
| P-6 | Open-ended scoring aligns with grading rubric | ❌ Fail | PB-006: arbitrary `>= 3` threshold |
| P-7 | Activity logs target the correct artifact | ⚠️ Partial | PB-007: fragile targetId fallback chain |
| P-8 | License/feature gating uses conservative defaults | ❌ Fail | PB-008: missing license data → Enterprise |
| P-9 | Report controllers use typed session/params | ❌ Fail | PB-009: `(req as any)` casts |
| P-10 | Core learning loops have product-level tests | ❌ Fail | PB-010: no learning-outcome tests |

## Testing

| # | Check | Status | Finding |
|---|-------|--------|---------|
| T-1 | Controller unit tests exist | ❌ Fail | 0/54 controllers tested |
| T-2 | Route handler tests exist | ❌ Fail | 0/209 routes tested |
| T-3 | API contract tests exist | ❌ Fail | No contract tests |
| T-4 | Auth flow integration tests | ❌ Fail | Minimal (schema only) |
| T-5 | Validation behavior tests | ❌ Fail | No validation tests |
| T-6 | Error response tests | ❌ Fail | No error handling tests |
| T-7 | Product-behavior / learning-outcome tests | ❌ Fail | PB-010: none |

## Mobile / Accessibility

| # | Check | Status | Finding |
|---|-------|--------|---------|
| M-1 | Responsive design patterns | ⚠️ Unknown | Not reviewed in detail |
| M-2 | Touch-friendly interactions | ⚠️ Unknown | Not reviewed |
| M-3 | ARIA labels on interactive elements | ⚠️ Unknown | Not reviewed |
| M-4 | Keyboard navigation | ⚠️ Unknown | Not reviewed |
| M-5 | API responses support mobile clients | ⚠️ Partial | JSON responses are mobile-friendly |

---

## Summary

| Category | Pass | Fail | Partial | Unknown |
|----------|------|------|---------|---------|
| UX Flow Completeness | 6 | 0 | 4 | 2 |
| API Contract Consistency | 0 | 7 | 0 | 1 |
| Security / Authorization | 1 | 5 | 1 | 0 |
| Data Access Patterns | 0 | 5 | 0 | 0 |
| Error Handling | 0 | 2 | 3 | 0 |
| Observability | 0 | 4 | 1 | 0 |
| Product Correctness | 0 | 9 | 1 | 0 |
| Testing | 0 | 7 | 0 | 0 |
| Mobile / Accessibility | 0 | 0 | 3 | 2 |
| **Total** | **7** | **39** | **13** | **5** |

**Overall Assessment:** The app has functional user-facing workflows but significant gaps in API contract consistency, security enforcement, product correctness, testing, and observability. The critical findings are: (1) classroom operations lack authorization checks (C-007), allowing cross-tenant modification; and (2) XP/level progression is vulnerable to concurrent double-awards (PB-001), which can be exploited to manipulate student standing.
