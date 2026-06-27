# Primary Advantage Line-Review Summary

> **Track:** `primary_advantage_full_review_20260626`
> **Generated:** 2026-06-27

## Totals

| Metric | Value |
|---|---|
| Files inventoried | 446 |
| Lines inventoried | 118,709 |
| Batches | 103 |
| Evidence files present | 103/103 |
| Coverage rows reviewed | 446/446 (100%) |
| Coverage rows pending/blocked | 0 |
| LR findings | 893 |

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
| Intentional divergence | 80 | 9.0% |
| Shared package migration blocker | 71 | 8.0% |

## Top Recurring Themes

| Theme | Count |
|---|---|
| Other/code quality | 394 |
| Hardcoded secrets/credentials/keys | 103 |
| Unsafe types/type casts | 83 |
| Error handling gaps | 66 |
| Undefined variable/session runtime errors | 48 |
| Adapter bypass/provider coupling | 40 |
| Stub/placeholder/commented-out functionality | 33 |
| Missing tenant/schoolId scoping | 29 |
| I18n/locale issues | 29 |
| Drizzle/schema migration issues | 27 |
| Missing auth/authorization | 23 |
| Test gaps | 10 |
| XSS/unsafe HTML rendering | 5 |
| Prisma references | 3 |

## Key Observations

1. **Undefined variable/reference errors (48 findings):** Multiple lesson game components (approx. 15 components) reference undefined `update` and `session` variables, causing runtime `ReferenceError` on game completion. This is a systematic copy-paste regression across the game module.
2. **Missing auth/authorization (23 findings):** Route handlers and server actions frequently lack `currentUser()`, role checks, and permission gating. The `/api/debug/*` routes are particularly dangerous as they expose sensitive data without authentication.
3. **Tenant/schoolId scoping (29 findings):** Database queries across models and API routes omit `schoolId` filtering, enabling cross-tenant data access.
4. **Hardcoded secrets/credentials (103 findings):** API keys, passwords, cloud project IDs, and personal emails are hardcoded in source files including `utils/openai.ts`, `utils/google.ts`, `lib/storage-config.ts`, and prompt data files.
5. **Drizzle/Prisma schema drift (30 findings):** The flashcard API routes rely on Drizzle schema columns that do not exist on the shared `@reading-advantage/db` tables. Workarounds use `as any` casts. Prisma references persist in Dockerfile, package.json, and schema patterns.
6. **I18n issues (29 findings):** Missing translation keys, inconsistent message structure across five locales, and hardcoded English strings in components.
7. **Stub/placeholder functionality (33 findings):** Admin student management UI, teachers dashboard, reports, and user settings contain commented-out code or hardcoded empty data, making key administrative workflows non-functional.

## Batch Coverage Summary

| Metric | Value |
|---|---|
| Batches with findings | 102/103 |
| Batches with zero findings | 1 (batch 088) |
| Most findings in a batch | Batch 015 (34 findings, flashcard API routes) |
| Files with most findings | admin/students/page.tsx (18), admin/classrooms-table.tsx (16), server/models/classroomModel.ts (15) |

## Verification Results

- [x] File set: inventory (446) matches coverage (446)
- [x] Every row status=reviewed
- [x] Every evidence_file exists (103/103)
- [x] Every reviewed_ranges=1-N matching line_count
- [x] Every finding_count is numeric
- [x] Every batch from manifest has coverage rows
- [x] Zero conflicting patch rows

---

*All findings are documented with file:line evidence in `line-review/evidence/<batch_id>.md`. See `line-review-findings.md` for the full catalog.*