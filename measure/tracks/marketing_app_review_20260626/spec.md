# Specification: Marketing App Review

## Overview

Review `apps/marketing`, the app for creating marketing materials. The current known focus is the marketing video production pipeline: topic research, deduplication, Thai script generation, scene editing, project persistence, and future media/export workflows.

## Scope

Primary scope: `apps/marketing` plus marketing schema/domain surfaces in shared packages.

Known baseline:

- 39 TypeScript graph files.
- 105 graph nodes.
- 52 functions.

Feature families:

- Topic research and deduplication.
- Script generation and LLM settings.
- Scene editor and project persistence.
- Campaign/project pages.
- Media handling, export, and future video-generation boundaries.
- AI provider usage and validation.
- Tests, build, UX, i18n/language behavior.

## Required Artifacts

Create `measure/audit-reports/marketing-app_20260626/` containing:

- `00-inventory.md`
- `workflow-map.md`
- `ai-boundary-map.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not generate real marketing assets with paid/external providers during review unless explicitly approved.
- Do not consolidate app-local AI code during review; propose it as remediation if needed.
- Do not change campaign content or brand positioning in this technical review.

## Acceptance Criteria

- Every current marketing workflow is inventoried and mapped to persistence/API/AI boundaries.
- LLM output validation and schema reliability are explicitly assessed.
- Missing tests from the existing video pipeline plan are reconciled into test-gap findings.
