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

## Non-Goals

- Do not perform Prisma removal in this track.
- Do not assume Reading Advantage behavior is correct by default.
- Do not collapse fork-specific issues into shared legacy issues without evidence.

## Acceptance Criteria

- Prisma/Drizzle state is verified against the filesystem and package manifests.
- Major primary-student feature workflows are inventoried and scored.
- Findings are classified by fork-divergence category.
- Migration-track proposals separate shared legacy work from Primary-specific remediation.
