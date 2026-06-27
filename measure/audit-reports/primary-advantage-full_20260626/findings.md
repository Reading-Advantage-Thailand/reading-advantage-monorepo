# Primary Advantage Review Findings

Status: complete (893 findings extracted from line-review evidence, 2026-06-27).

## Summary

| Metric | Value |
|---|---|
| Total LR findings | 893 |
| Batches with findings | 102/103 |
| Batches with zero findings | 1 (batch 088 — public SVG/image assets) |
| Unique finding IDs | 893 (no duplicates) |

## Severity Distribution

| Severity | Count | Percent |
|---|---|---|
| Critical | 66 | 7.4% |
| High | 177 | 19.8% |
| Medium | 302 | 33.8% |
| Low | 348 | 39.0% |

## Fork-Divergence Distribution

| Category | Count | Percent |
|---|---|---|
| Fork-specific regression | 414 | 46.4% |
| Same root cause as Reading Advantage | 213 | 23.9% |
| Primary-student adaptation risk | 115 | 12.9% |
| Intentional product divergence that needs documentation | 80 | 9.0% |
| Shared package migration blocker | 71 | 8.0% |

## Critical Findings (66 total)

Key critical findings include:

| ID | Title | Category |
|---|---|---|
| LR-003-001 | Test/admin server actions lack any authorization | Fork-specific regression |
| LR-003-002 | Operator-precedence bug zeroes MC XP multiplier | Fork-specific regression |
| LR-003-003 | Always-empty `isCompleted` defeats completion tracking | Fork-specific regression |
| LR-006-003 | Entire student-management UI is commented out | Fork-specific regression |
| LR-006-009 | Teachers page is empty placeholder | Fork-specific regression |
| LR-008-001/002/003 | Admin CRUD is optimistic-only (no server requests) | Fork-specific regression |
| LR-012-004 | Student-progress page lacks authorization | Adaptation risk |
| LR-012-009 | Bulk AI generation route has no authentication | Fork-specific regression |
| LR-013-007 | Lesson chatbot route has no auth/rate limit | Fork-specific regression |
| LR-015-001 | /api/debug/init-roles POST mutates data with no auth | Fork-specific regression |
| LR-015-002 | /api/debug/init-roles GET exposes user emails | Adaptation risk |
| LR-015-004 | /api/debug/school exposes all schools' licenses | Adaptation risk |
| LR-015-007/008/012/014/015/019/024-027/031/033 | Flashcard routes use non-existent Drizzle columns | Migration blocker |
| LR-017-006 | School ranking leaks cross-school leaderboards | Adaptation risk |
| LR-018-004 | Path traversal in CSV cleanup route | Fork-specific regression |
| LR-023-002 | Classroom edit silently discards saves | Fork-specific regression |
| LR-028-001 | Forgot-password form never sends email | Fork-specific regression |
| LR-028-012 | Dashboard charts use fabricated data | Fork-specific regression |
| LR-032-001 through LR-050-001 | ~15 game components crash with undefined `update`/`session` | Fork-specific regression |
| LR-080-001 | `calculateLevel` matches delta instead of cumulative XP | Fork-specific regression |
| LR-092-001 | Pagination-before-filter corruption in assignments | Fork-specific regression |
| LR-092-002 | `createAssignment` lacks schoolId scoping | Same root cause |

For the complete finding catalog with file:line evidence, see `line-review/line-review-findings.md` and individual `line-review/evidence/<batch_id>.md` files.

## Top Files by Finding Count

| File | Findings |
|---|---|
| `app/[locale]/admin/students/page.tsx` | 18 |
| `components/admin/classrooms-table.tsx` | 16 |
| `server/models/classroomModel.ts` | 15 |
| `server/utils/genaretors/image-generator.ts` | 13 |
| `components/lesson/lesson-progress-bar.tsx` | 12 |
| `server/models/assignmentModel.ts` | 11 |
| `app/api/upload/csv/route.ts` | 10 |
| `components/lesson/games/lesson-sentence-flashcard.tsx` | 10 |
| `components/lesson/standalone-lesson-progress-bar.tsx` | 10 |
| `components/pratice/order-words-game.tsx` | 10 |

## Top Recurring Issue Patterns

1. **Undefined `update`/`session` variables** — ~30 game/lesson components crash at completion.
2. **Missing auth/authorization** — 72 API routes and server actions lack authentication.
3. **Missing tenant/schoolId scoping** — 48 database queries omit schoolId filtering.
4. **Hardcoded secrets/credentials** — 103 instances of API keys, passwords, and credentials in source.
5. **Unsafe type casts (`as any`)** — 95 instances of type-safety bypass.
6. **I18n issues** — 77 missing/inconsistent translation keys across 5 locales.
7. **Stub/placeholder/commented-out functionality** — Multiple admin and reporting features are non-functional.
8. **Drizzle schema mismatch** — Flashcard routes access columns not in shared schema.
