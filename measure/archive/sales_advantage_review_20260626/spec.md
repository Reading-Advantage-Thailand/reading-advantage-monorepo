# Specification: Sales Advantage Review

## Overview

Review `apps/sales-advantage`, the sales coaching app with audio roleplay and AI evaluation. This review must cover curriculum delivery, audio upload/storage, multimodal AI evaluation, fallback behavior, admin reporting, authz, and shared sales-domain contracts.

## Scope

Primary scope: `apps/sales-advantage` plus `packages/domain/src/sales`, sales schema in `packages/db`, `packages/api` sales router, and `packages/ai` multimodal support.

Known baseline:

- 40 TypeScript graph files.
- 152 graph nodes.
- 45 functions.
- 11 schema nodes.

Feature families:

- Sales curriculum modules, lessons, quizzes, and roleplay scenarios.
- Browser audio recording and upload flow.
- Storage adapter usage for submitted audio.
- AI evaluation, multimodal model behavior, fallback STT/evaluation path.
- Progress, scoring, retry/best-attempt rules.
- Admin dashboard and account management.
- Auth/session/role/tenant boundaries.

## Required Artifacts

Create `measure/audit-reports/sales-advantage_20260626/` containing:

- `00-inventory.md`
- `workflow-map.md`
- `ai-audio-boundary-map.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not submit real sensitive sales recordings to external AI providers during review.
- Do not rewrite curriculum or rubric content in this review track.
- Do not change selected AI models unless a separate remediation track is approved.

## Acceptance Criteria

- Audio roleplay flow is mapped from browser recording through storage and AI evaluation.
- AI evaluation and fallback paths are reviewed for validation, privacy, reliability, and test coverage.
- Sales-domain package contracts and app usage are checked together.
