# Primary Advantage Full Review — Executive Summary

Status: complete (line-review evidence synthesized 2026-06-27).

## Review Overview

A full line-by-line review of `apps/primary-advantage` was conducted across 103 atomic batches, covering all 446 in-scope files (118,709 lines). Every file was read line-by-line with per-file evidence recorded. Findings were classified by fork-divergence category against the Reading Advantage parent codebase.

## Key Numbers

| Metric | Value |
|---|---|
| Files reviewed | 446 |
| Lines reviewed | 118,709 |
| Review batches | 103 |
| Evidence files | 103/103 |
| LR findings | 893 |
| Critical findings | 66 |
| High findings | 177 |
| Medium findings | 302 |
| Low findings | 348 |

## Coverage Verification

All mechanical verification gates pass:
- File set match: inventory (446) = coverage (446).
- Every row status=reviewed with reviewed_ranges=1-N.
- Every evidence_file exists on disk.
- Every finding_count is numeric.
- Zero conflicting patch rows.
- Zero rows pending or blocked.

## Severity Summary

**66 Critical findings** — issues that make features non-functional or expose security vulnerabilities:
- ~30 game components crash at completion due to undefined `update`/`session` variables.
- Admin student add/update/delete is optimistic-only (no server requests).
- Admin student/teacher management UI is commented out with early-return placeholders.
- Flashcard API routes access Drizzle columns that don't exist on shared `@reading-advantage/db` schema.
- Multiple debug routes expose user data without authentication.
- Path traversal vulnerabilities in file upload/cleanup routes.
- Assignment pagination-before-filter corruption.

**177 High findings** — significant bugs, missing authorization, and data integrity issues:
- 72 API routes and server actions lack authentication.
- 48 database queries lack tenant/schoolId scoping.
- All dashboard charts display fabricated/hardcoded data.
- XP/CEFR level calculations are incorrect.
- Classroom edit silently discards changes on save.
- Multiple hardcoded secrets and credentials.

## Fork-Divergence Distribution

| Category | Count | Meaning |
|---|---|---|
| Fork-specific regression | 414 (46%) | Defects introduced during Primary fork |
| Same root cause | 213 (24%) | Inherited from Reading Advantage |
| Adaptation risk | 115 (13%) | Risks specific to primary students |
| Intentional divergence | 80 (9%) | Documented differences needing docs |
| Migration blocker | 71 (8%) | Requires shared package changes |

The dominant category is fork-specific regression, indicating that the Primary fork process introduced many defects not present in Reading Advantage. The most systematic regression is the undefined `update`/`session` pattern across ~30 game components, suggesting a copy-paste error during session provider migration.

## Product Risk Assessment

**High-risk areas**:
1. **Game/lesson completion** — ~30 components crash on completion due to missing session dependencies. Students cannot complete game activities to earn XP.
2. **Admin workflows** — Student/teacher management is non-functional (commented out or optimistic-only).
3. **Flashcard system** — Entirely non-functional due to schema mismatch with shared Drizzle tables.
4. **Dashboard reporting** — All charts use hardcoded/fabricated data. Teachers and admins see fictitious metrics.
5. **Security** — 72+ unprotected endpoints, debug routes exposing data, path traversal vulnerabilities.

**Medium-risk areas**:
1. **Auth boundaries** — No standardized auth middleware; each route implements ad-hoc auth (or doesn't).
2. **Tenant isolation** — 48+ queries without schoolId scoping enable cross-school data access.
3. **Provider coupling** — Direct SDK calls bypass AGENTS.md adapters (AI, storage, email).

**Low-risk areas**:
1. **i18n** — 77 inconsistencies across 5 locales, but core functionality works.
2. **Type safety** — 95 `as any` casts but most are workarounds for schema mismatch.

## Migration Readiness

Primary Advantage is **not production-ready for primary students**. The game completion crash alone blocks the core student learning loop. Admin management and flashcard systems are non-functional. 66 critical and 177 high-severity findings must be addressed before deployment to students.

**Recommended phased approach** (see `migration-tracks.md` for details):

| Phase | Tracks | Priority |
|---|---|---|
| Phase 1: Fix crashes | M1, M6 | Critical — unblock game completion and flashcards |
| Phase 2: Restore admin | M2, M3, M8 | Critical — unblock admin workflows |
| Phase 3: Secure | M4, M5, M9 | High — add auth, tenant scoping, remove secrets |
| Phase 4: Clean up | M7, M10, M12, M13 | Medium — Prisma cleanup, i18n, adapter compliance |
| Phase 5: Test | M11 | High — add test coverage for all fixed areas |

## Closeout Statement

This review was conducted under the 2026-06-27 line-review protocol with atomic batch delegation, per-file evidence recording, and mechanical coverage verification. No broad summaries or graph scans were substituted for line-by-line review. All 893 findings are supported by `file:line` evidence in individual evidence files. Coverage verification passes for all 446 files with 100% review coverage.
