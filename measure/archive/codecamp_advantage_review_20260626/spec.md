# Specification: CodeCamp Advantage Review

## Overview

Review `apps/codecamp-advantage`, the intern-training application. CodeCamp combines curriculum delivery, quizzes, GitHub exercise workflows, AI PR review, admin reporting, and production deployment concerns. This review must focus on correctness of progression, reliability of external integrations, security of webhooks/authz, and operational readiness.

## Scope

Primary scope: `apps/codecamp-advantage` plus CodeCamp modules in `packages/domain`, `packages/api`, `packages/webhooks`, `packages/db`, and `packages/integrations/github`.

Known baseline:

- 47 app TypeScript graph files.
- 137 app graph nodes.
- 65 app functions.
- Significant shared-domain and webhook surface outside the app package.

Feature families:

- Intern onboarding and account flows.
- Curriculum modules, lessons, quizzes, and progress.
- GitHub repo/fork/issue/PR workflow.
- AI PR review and tutor/chat flows.
- Admin dashboards and reporting.
- Production deployment, environment, webhooks, observability, QA.

## Required Artifacts

Create `measure/audit-reports/codecamp-advantage_20260626/` containing:

- `00-inventory.md`
- `workflow-map.md`
- `integration-map.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not create GitHub repos or mutate production integrations during review unless explicitly approved.
- Do not rerun real production QA without a separate human-approved test plan.
- Do not rewrite curriculum content in this review track.

## Acceptance Criteria

- GitHub and AI review workflows are mapped end-to-end.
- Webhook security and idempotency are explicitly assessed.
- Curriculum progression and completion rules are reviewed with tests/gaps identified.
- Production readiness findings distinguish local, staging, and production risks.
