# Specification: Reading Advantage Full Feature Review

## Overview

Review `apps/reading-advantage`, the oldest and largest product app in the monorepo. Reading Advantage is about three years old and is the legacy source-of-truth being refactored into the shared monorepo architecture. This review must produce both feature-quality findings and migration tracks that move business logic toward shared backend/domain packages.

## Scope

Primary scope: `apps/reading-advantage`.

Known baseline from Measure registry:

- 971 TypeScript graph files.
- 4,348 graph nodes.
- 1,597 functions.
- Documented legacy risk: 209 `app/**/route.ts` files importing `db` directly and not routing through `@reading-advantage/domain`, `assertCan`, or `TenantDB`.

Feature families to inventory:

- Authentication/session flows and Firebase legacy surfaces.
- Student dashboard and progress flows.
- Teacher/admin/school management flows.
- Article/content generation and reading levels.
- Questions, quizzes, assessments, reports.
- Flashcards, FSRS/spaced repetition, vocabulary.
- Audio/read-along and media features.
- AI generation and AI-assisted content workflows.
- Route handlers, server actions, API boundaries, and legacy functions.
- Data access, tenant/school scoping, and permission checks.
- Tests, build, lint, deployment, observability.

## Relationship to Existing Stub

The existing `reading_advantage_agents_md_audit_20260610` stub remains valid for AGENTS.md compliance. This full-review track is broader: it includes product-feature behavior, migration readiness, UX/API contracts, and test gaps in addition to AGENTS.md compliance.

## Required Artifacts

Create `measure/audit-reports/reading-advantage-full_20260626/` containing:

- `00-inventory.md`
- `workflow-map.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not migrate routes in this review track.
- Do not remove Firebase or direct DB usage here; propose remediation tracks instead.
- Do not assume Primary Advantage behavior matches Reading Advantage without evidence.

## Acceptance Criteria

- Every major user-facing feature family is inventoried.
- Every API/route-handler family is mapped to data access and permission patterns.
- Direct DB/domain bypass risks are quantified and grouped into migration tracks.
- Findings distinguish product bugs, security/tenancy risks, architectural migration risks, and test gaps.
