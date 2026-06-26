# Executive Summary: Reading Advantage Security / UX / Correctness Review

> **Audit:** reading-advantage-full_20260626
> **Review roles:** B — Security / Tenancy / Auth; C — UX / API / Contracts; A — Correctness / Product Behavior
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6

---

## Scope

This review covers the user-facing workflows, API contracts, route handlers, controllers, error handling, validation, loading/empty states, accessibility signals, mobile risk, server action/API boundaries, and testability of `apps/reading-advantage`.

## Key Findings

### Critical (1)

**C-007: Classroom Controller Missing Authorization Checks** — Multiple mutating classroom operations (`achivedClassroom`, `updateClassroom`, `deleteClassroom`, `updateStudentClassroom`, `getClassroomTeacher`) have no authentication or ownership verification. Any authenticated user can archive, update, or delete any classroom regardless of school affiliation. This is a cross-tenant data isolation failure.

### High (5)

| ID | Finding | Impact |
|----|---------|--------|
| C-001 | Inconsistent error response contracts | 6+ different shapes across 209 routes |
| C-002 | HTTP status codes in response body | Error responses return 200 OK |
| C-003 | Unauthenticated sensitive endpoints | 14+ routes expose generation/system without auth |
| C-004 | No input validation on query/body | No Zod validation on 180+ controllers |
| C-008 | No audit logging on destructive operations | Zero audit trail for FERPA/GDPR compliance |

### Medium (8)

| ID | Finding | Impact |
|----|---------|--------|
| C-005 | Duplicate auth routes (signup vs register) | Two code paths, inconsistent behavior |
| C-006 | Flashcard FSRS lacks validation | Arbitrary rating values allowed |
| C-009 | console.log in production code | No structured logging |
| C-010 | Inconsistent empty-state contracts | Frontend must handle multiple patterns |
| C-011 | Race condition in flashcard update | Read-then-update without locking |
| C-012 | next-connect boilerplate duplication | 180+ route files repeat same setup |
| C-013 | Direct Google Cloud Translate SDK | Provider lock-in |
| C-015 | No response type definitions | No API documentation |

### Low (1)

| ID | Finding | Impact |
|----|---------|--------|
| C-014 | Firebase Admin SDK remnant | Unused dependency in generator |

### Product-Behavior / Correctness (added by review role A)

| Severity | ID | Finding | Impact |
|----------|----|---------|--------|
| Critical | PB-001 | XP/level progression double-award race | Students can game level/leaderboard via concurrent requests |
| High | PB-002 | Level-test assessment JSON not validated | AI assessment can corrupt user level/CEFR |
| High | PB-003 | AI-generated content lacks level/quality gate | Articles/questions may mismatch student level |
| High | PB-010 | No product-level learning-outcome tests | Core learning loops unprotected from regression |
| Medium | PB-004 | Assignment status mapping ad-hoc | Frontend/backend status mismatch |
| Medium | PB-005 | Class accuracy mixes MCQ and open-ended scales | Misleading teacher reports |
| Medium | PB-006 | Open-ended scoring threshold arbitrary | Reported "correct" does not match AI rubric |
| Medium | PB-007 | Activity targetId resolution fragile | Progress can be misattributed |
| Medium | PB-008 | License fallback treats missing data as Enterprise | Incorrect feature gating/billing |
| Medium | PB-009 | Report controllers use unsafe session/params casts | Runtime type-safety holes |

## Quantified Gaps

| Metric | Value |
|--------|-------|
| Total findings | 25 (2 Critical, 8 High, 14 Medium, 1 Low) plus shared-foundation caveats |
| Controller tests | 0/54 (0%) |
| Route handler tests | 0/209 (0%) |
| API contract tests | 0 |
| Auth flow tests | 0 |
| Endpoints with Zod validation | ~1/209 (<1%) |
| Endpoints with audit logging | 0/209 (0%) |
| Endpoints using TenantDB | 0/209 (0%) |
| Endpoints using assertCan | 0/209 (0%) |
| Error response shapes | 6+ different patterns |
| Unauthenticated sensitive routes | 14+ |

## Proposed Follow-Up Tracks

### Track C-1: Critical — Classroom Authorization Hardening (1 week)
Add ownership + schoolId verification to all mutating classroom operations. Wire `recordAuditEvent` for destructive actions. Priority: Highest.

### Track C-2: High — API Contract Standardization (1 week)
Define shared `ErrorResponse`, `SuccessResponse`, `ListResponse` Zod schemas in `@reading-advantage/types`. Enforce at all API boundaries. Standardize HTTP status codes.

### Track C-3: High — Input Validation Hardening (1 week)
Add Zod validation schemas to all route handlers. Create `parseBody()`, `parseQuery()`, `parsePath()` helpers. Validate all request inputs at boundaries.

### Track C-4: High — Authentication Audit (3 days)
Add `protect` middleware to all unauthenticated generation/system endpoints. Verify rate limiting is wired through shared package.

### Track C-5: High — Audit Logging Integration (1 week)
Wire `recordAuditEvent` from `@reading-advantage/auth` into all destructive operations. Priority: user deletion, classroom deletion, article deletion, enrollment changes.

### Track C-6: Medium — API Contract Test Suite (1 week)
Create contract tests for all major API endpoints. Verify response shapes, status codes, error handling, and auth requirements.

### Track C-7: Medium — Controller Test Coverage (2 weeks)
Add unit tests for all 54 controllers. Start with classroom-controller (highest risk), then assignment, stories, article, admin.

### Track C-8: Medium — Structured Logging Migration (3 days)
Replace console.log/error with structured logger. Add request ID correlation. Integrate with error reporting.

### Track C-9: Low — Auth Route Consolidation (1 day)
Remove duplicate `signup` route or consolidate into shared handler. Remove bcryptjs dependency from reading-advantage.

### Track C-10: Low — Provider Abstraction (3 days)
Route Google Cloud Translate through AI adapter. Replace Firebase Admin SDK with `@reading-advantage/storage`.

### Track PB-1: Critical — XP/Level Progression Idempotency (3 days)
Wrap activity-log XP awarding in a transaction with a unique constraint on `xpLogs(userId, activityId)`. Add adversarial concurrency tests. Targets PB-001.

### Track PB-2: High — Level-Test Assessment Contract (2 days)
Add a Zod schema for the AI assessment JSON and reject/validate before persisting user level. Add contract tests. Targets PB-002.

### Track PB-3: High — AI Content Quality Gate (1 week)
Add post-generation validation (readability score, Zod schema, CEFR alignment) for articles, stories, and questions. Lower/replace `temperature: 1` and throw proper `Error` objects. Targets PB-003.

### Track PB-4: Medium — Assignment Status Enum & Lifecycle Tests (3 days)
Centralize assignment status in `@reading-advantage/types`, align frontend/backend, add lifecycle tests. Targets PB-004.

### Track PB-5: Medium — Reporting Metrics Correctness (3 days)
Fix class-accuracy aggregation to report MCQ and open-ended separately, document scoring rubric, and add report correctness tests. Targets PB-005, PB-006.

### Track PB-6: Medium — Activity Target Validation & License Fallback (2 days)
Require validated `targetId` in activity logs and treat missing license data as Basic. Add tests. Targets PB-007, PB-008.

## Relationship to Existing Stubs

This review supersedes the `reading_advantage_agents_md_audit_20260610` stub. The security/tenancy findings (C-007, C-008) align with the AGENTS.md audit's domain-bypass risk assessment. The UX/API findings provide additional granularity on contract consistency, validation, and testability that the compliance audit did not cover.

## Non-Goals Achieved

- ✅ Mapped all 209 route handlers to their controller and auth patterns
- ✅ Identified all unauthenticated endpoints
- ✅ Catalogued all error response shapes
- ✅ Quantified test coverage gaps
- ✅ Identified validation gaps
- ✅ Mapped user-facing workflow completeness

## Not Claimed

- Final acceptance or closeout
- Remediation of findings (deferred to follow-up tracks)
- Mobile/accessibility deep review (deferred to dedicated track)
- Full UI component review (deferred to UX browser auditor)
