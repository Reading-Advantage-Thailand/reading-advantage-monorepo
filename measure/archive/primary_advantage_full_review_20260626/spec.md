# Specification: Primary Advantage Full Feature Review

## Overview

Review `apps/primary-advantage`, a roughly 1.5-year-old app based on the Reading Advantage codebase and adapted for primary students. This review must combine independent feature review with fork-divergence analysis against Reading Advantage concepts.

## Scope

Primary scope: `apps/primary-advantage`.

Known baseline:

- 394 TypeScript graph files.
- 1,834 graph nodes.
- 718 functions.
- Historical audit-stub concern: active Prisma surface was reported despite prior migration claims; this review must re-verify current Prisma/Drizzle state against the filesystem, package manifests, and registry before treating the concern as open.

Feature families to inventory:

- Primary student dashboard and age-appropriate learning flows.
- Teacher/admin/classroom/reporting workflows.
- AI content generation and workbook/content workflows.
- Reading levels, lessons, quizzes, vocabulary, media.
- Prisma/Drizzle database access and migration state.
- Auth/session/role/tenant boundaries.
- Tests, build, deployment, observability.

## Fork-Divergence Categories

Every material finding must be classified as one of:

- Same root cause as Reading Advantage.
- Fork-specific regression.
- Intentional product divergence that needs documentation.
- Primary-student adaptation risk.
- Shared package migration blocker.

## Required Artifacts

Create `measure/audit-reports/primary-advantage-full_20260626/` containing:

- `00-inventory.md`
- `workflow-map.md`
- `fork-divergence.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

Create `measure/tracks/primary_advantage_full_review_20260626/line-review/` containing:

- `file-inventory.tsv`
- `batch-manifest.json`
- `batch-manifest.md`
- `line-review-protocol.md`
- `line-review-coverage.tsv`
- `evidence/<batch_id>.md` for every batch
- `line-review-findings.md`
- `line-review-summary.md`
- `line-review-acceptance-result.json`

## Review Method Requirement

This track requires a line-by-line review. A broad boundary scan, graph inventory,
package-gate run, or summary review does not satisfy acceptance.

The orchestrator must not delegate giant swaths such as "review Primary Advantage" or
"review auth/tenant boundaries" to one agent. Delegation must be atomic:

- Generate an exact file inventory for `apps/primary-advantage` before review begins.
- Exclude only generated/dependency artifacts (`node_modules`, `.next`, `dist`, `.turbo`,
  `.vite`, `coverage`, build caches, and package-local graph/cache files).
- Split the inventory into bounded batches, targeting no more than 1,200 lines or 10 files
  per batch unless a single file exceeds that line count.
- Assign each batch to a subagent with exactly one batch ID, exact evidence path, and a
  requirement to update only its coverage rows.
- Require every evidence file to list each reviewed file, reviewed line range, status,
  and finding count.
- Require every finding to include file/line evidence and a fork-divergence category.
- Require `reviewed_ranges=1-N` for every file, where `N` equals the inventory line count.
- Mechanically verify coverage before final synthesis: every inventory row must be
  `status=reviewed`, have a valid evidence file, have `reviewed_ranges=1-N`, and have a
  numeric finding count.

The previous shared-foundation run on 2026-06-26 is the anti-example: broad prompts
produced triage artifacts and a false closeout. This Primary review must follow the
corrected 2026-06-27 shared-foundation line-review pattern instead.

## Non-Goals

- Do not perform Prisma removal in this track.
- Do not assume Reading Advantage behavior is correct by default.
- Do not collapse fork-specific issues into shared legacy issues without evidence.

## Acceptance Criteria

- Prisma/Drizzle state is verified against the filesystem and package manifests.
- Major primary-student feature workflows are inventoried and scored.
- Findings are classified by fork-divergence category.
- Migration-track proposals separate shared legacy work from Primary-specific remediation.
- Line-review coverage mechanically verifies 100% of in-scope files from
  `file-inventory.tsv` before Measure phase acceptance.
- Final acceptance cites the coverage totals: file count, line count, batch count, evidence
  file count, and LR finding count.
- Closeout is forbidden if any coverage row remains pending, blocked without explicit human
  approval, has a partial range, or lacks evidence.
