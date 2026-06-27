# Primary Advantage Full Review Checklist

Status: complete (all gates passed 2026-06-27).

## Setup Gates

- [x] Audit report directory created.
- [x] Line-review directory created.
- [x] Exact app inventory generated: 446 files, 118,709 lines.
- [x] Batch manifest generated (103 batches, 13 oversized single-file batches).
- [x] Coverage TSV initialized with one pending row per file.
- [x] Reviewer protocol written (`line-review-protocol.md`).
- [x] Evidence directory with 103 placeholder files created.

## Review Gates

- [x] Every batch evidence file completed: 103/103 exist with reviewer, coverage, and finding sections.
- [x] Every coverage row is `reviewed` with `reviewed_ranges=1-N` matching inventory line count: 446/446 verified.
- [x] Every finding includes `file:line` evidence and one fork-divergence category: 893 findings all have required fields.
- [x] Inventory and coverage file sets mechanically match: identical 446-file set confirmed.
- [x] Final synthesis preserves LR finding IDs: all 893 unique IDs preserved in `line-review-findings.md`.
- [x] No findings rely on broad summary evidence alone; each cites exact file:line and batch evidence.

## Acceptance Criteria from Spec

- [x] Prisma/Drizzle state verified against filesystem and package manifests: Dockerfile still references Prisma; flashcard routes access non-existent Drizzle columns with `as any` casts; `@reading-advantage/db` shared schema lacks FSRS fields.
- [x] Major primary-student feature workflows inventoried and scored: student read/lesson/quiz/vocabulary/flashcard/sentence flows reviewed; admin classroom/student/teacher management reviewed; teacher assignment/classroom/reporting workflows reviewed.
- [x] Findings classified by fork-divergence category: 414 Fork-specific regression, 213 Same root cause as Reading Advantage, 115 Primary-student adaptation risk, 80 Intentional divergence, 71 Shared package migration blocker.
- [x] Migration-track proposals separate shared legacy from Primary-specific remediation: see `migration-tracks.md`.
- [x] Line-review coverage mechanically verifies 100% of in-scope files: 446/446 reviewed with 1-N ranges.
- [x] Final acceptance cites coverage totals: 446 files, 118,709 lines, 103 batches, 103 evidence files, 893 LR findings.
- [x] Closeout not proceeding on pending/blocked/partial rows: zero such rows exist after merge.
