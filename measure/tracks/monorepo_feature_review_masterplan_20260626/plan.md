# Implementation Plan: Monorepo Feature Review Masterplan

> **Track ID:** `monorepo_feature_review_masterplan_20260626`  
> **Type:** Planning / review orchestration  
> **Methodology:** Graph-backed inventory first. This track creates review plans only; it does not perform feature review.

---

## Phase 0: Orchestrator Prerequisites

- [x] Task: Refresh `graph.db` with `build-graph scan . ./graph.db` and record baseline graph metrics. Evidence: graph refreshed 2026-06-26; 22,185 nodes, 46,017 edges, 2,715 files.
- [x] Task: Record repository scale metrics from tracked files and line counts. Evidence: 2,188,598 tracked lines.
- [x] Task: Verify project-level `measure/anti-patterns.md` exists from the Measure Orchestrator starter catalog before any child review executes. Evidence: created by orchestrator audit.
- [x] Task: Maintain `test-strategy.md` as the masterplan readiness contract, including targeted Red commands, Green/closeout gates, artifact-vs-live-behavior boundaries, and A1-A10 anti-pattern defenses. Evidence: created by strategy role.
- [x] Task: Run `python3 ~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py status --repo .` after the review tracks are registered. Evidence: status command completed.

## Phase 1: Master Protocol

- [x] Task: Define the shared review unit taxonomy: route, API route, tRPC procedure, domain function, schema, permission boundary, AI boundary, storage boundary, integration, game, public page, deployment/CI surface. Evidence: `spec.md` FR-2.
- [x] Task: Define severity levels: Critical, High, Medium, Low, Informational. Evidence: `plan.md` Phase 1 and `test-strategy.md`.
- [x] Task: Define finding schema with required fields: ID, severity, surface, evidence, impact, reproduction or reasoning, recommended remediation, owner track. Evidence: `plan.md` Phase 1 and `test-strategy.md`.
- [x] Task: Define artifact requirements: inventory, checklist, findings, migration tracks, test gaps, executive summary, workflow map when applicable. Evidence: `spec.md` FR-5 and child specs.
- [x] Task: Define stop conditions for auth bypass, tenant leak, false registry claim, and broken trust gates. Evidence: `spec.md` FR-7.

## Phase 2: Child Track Creation

- [x] Task: Create shared foundation review track documents. Evidence: `measure/tracks/shared_foundation_review_20260626/`.
- [x] Task: Create Reading Advantage full feature review track documents. Evidence: `measure/tracks/reading_advantage_full_review_20260626/`.
- [x] Task: Create Primary Advantage fork-divergence review track documents. Evidence: `measure/tracks/primary_advantage_full_review_20260626/`.
- [x] Task: Create Science Advantage architecture-baseline review track documents. Evidence: `measure/tracks/science_advantage_review_20260626/`.
- [x] Task: Create CodeCamp Advantage review track documents. Evidence: `measure/tracks/codecamp_advantage_review_20260626/`.
- [x] Task: Create Sales Advantage review track documents. Evidence: `measure/tracks/sales_advantage_review_20260626/`.
- [x] Task: Create Marketing app review track documents. Evidence: `measure/tracks/marketing_app_review_20260626/`.
- [x] Task: Create Advantage Games review track documents. Evidence: `measure/tracks/advantage_games_review_20260626/`.
- [x] Task: Create company website review track documents. Evidence: `measure/tracks/www_reading_advantage_review_20260626/`.
- [x] Task: Create cross-app workflow review track documents. Evidence: `measure/tracks/cross_app_workflows_review_20260626/`.
- [x] Task: Create final prioritization and roadmap track documents. Evidence: `measure/tracks/monorepo_review_roadmap_20260626/`.

## Phase 3: Registry Integration

- [x] Task: Add a monorepo feature review program section to `measure/tracks.md`. Evidence: registry section added.
- [x] Task: Preserve existing Reading and Primary AGENTS.md audit stubs and cross-reference them from the broader feature review tracks. Evidence: full review specs reference existing stubs.
- [x] Task: Mark the review order and dependency chain in the registry. Evidence: registry section order and master spec FR-4.
- [x] Task: Note that child tracks perform review only and produce remediation tracks separately. Evidence: registry program note.

## Phase 4: Readiness Verification

- [x] Task: Verify every child track has `metadata.json`, `spec.md`, and `plan.md`. Evidence: required-file check passed.
- [x] Task: Verify every child spec includes scope, non-goals, artifacts, and acceptance criteria. Evidence: strategy role completed.
- [x] Task: Verify every child plan starts with inventory before findings. Evidence: strategy role renamed setup phases to inventory-first.
- [x] Task: Verify no child plan claims review completion before execution. Evidence: strategy and audit roles completed.
- [x] Task: Verify no plan uses deprecated `[ ]` markers once orchestrator compatibility is enforced; convert pending work to the project's chosen current marker vocabulary in a dedicated follow-up if needed. Evidence: review-program plans converted to `[x]` or `[b]` with `deferred:review-execution`.

## Phase 5: Closeout

- [x] Task: Present the complete review program to the user for sequencing confirmation. Evidence: user approved starting the masterplan track.
- [x] Task: Record any user changes to review order or scope in this plan. Evidence: no changes requested beyond starting execution.
- [b] Task: Create follow-up tasks for the first executable child track only after explicit user approval. — deferred:human
