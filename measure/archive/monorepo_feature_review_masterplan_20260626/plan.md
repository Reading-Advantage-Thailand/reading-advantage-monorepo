# Implementation Plan: Monorepo Feature Review Masterplan

> **Track ID:** `monorepo_feature_review_masterplan_20260626`  
> **Type:** Planning / review orchestration  
> **Methodology:** Graph-backed inventory first. This track creates review plans only; it does not perform feature review.

---

## Phase 0: Orchestrator Prerequisites

- [x] Task: Refresh `graph.db` with `build-graph scan . ./graph.db` and record baseline graph metrics. Evidence: commit f759620a.
- [x] Task: Record repository scale metrics from tracked files and line counts. Evidence: commit f759620a.
- [x] Task: Verify project-level `measure/anti-patterns.md` exists from the Measure Orchestrator starter catalog before any child review executes. Evidence: commit f759620a.
- [x] Task: Maintain `test-strategy.md` as the masterplan readiness contract, including targeted Red commands, Green/closeout gates, artifact-vs-live-behavior boundaries, and A1-A10 anti-pattern defenses. Evidence: commit f759620a.
- [x] Task: Run `python3 ~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py status --repo .` after the review tracks are registered. Evidence: commit f759620a.

## Phase 1: Master Protocol

- [x] Task: Define the shared review unit taxonomy: route, API route, tRPC procedure, domain function, schema, permission boundary, AI boundary, storage boundary, integration, game, public page, deployment/CI surface. Evidence: commit f759620a.
- [x] Task: Define severity levels: Critical, High, Medium, Low, Informational. Evidence: commit f759620a.
- [x] Task: Define finding schema with required fields: ID, severity, surface, evidence, impact, reproduction or reasoning, recommended remediation, owner track. Evidence: commit f759620a.
- [x] Task: Define artifact requirements: inventory, checklist, findings, migration tracks, test gaps, executive summary, workflow map when applicable. Evidence: commit f759620a.
- [x] Task: Define stop conditions for auth bypass, tenant leak, false registry claim, and broken trust gates. Evidence: commit f759620a.

## Phase 2: Child Track Creation

- [x] Task: Create shared foundation review track documents. Evidence: commit f759620a.
- [x] Task: Create Reading Advantage full feature review track documents. Evidence: commit f759620a.
- [x] Task: Create Primary Advantage fork-divergence review track documents. Evidence: commit f759620a.
- [x] Task: Create Science Advantage architecture-baseline review track documents. Evidence: commit f759620a.
- [x] Task: Create CodeCamp Advantage review track documents. Evidence: commit f759620a.
- [x] Task: Create Sales Advantage review track documents. Evidence: commit f759620a.
- [x] Task: Create Marketing app review track documents. Evidence: commit f759620a.
- [x] Task: Create Advantage Games review track documents. Evidence: commit f759620a.
- [x] Task: Create company website review track documents. Evidence: commit f759620a.
- [x] Task: Create cross-app workflow review track documents. Evidence: commit f759620a.
- [x] Task: Create final prioritization and roadmap track documents. Evidence: commit f759620a.

## Phase 3: Registry Integration

- [x] Task: Add a monorepo feature review program section to `measure/tracks.md`. Evidence: commit f759620a.
- [x] Task: Preserve existing Reading and Primary AGENTS.md audit stubs and cross-reference them from the broader feature review tracks. Evidence: commit f759620a.
- [x] Task: Mark the review order and dependency chain in the registry. Evidence: commit f759620a.
- [x] Task: Note that child tracks perform review only and produce remediation tracks separately. Evidence: commit f759620a.

## Phase 4: Readiness Verification

- [x] Task: Verify every child track has `metadata.json`, `spec.md`, and `plan.md`. Evidence: commit f759620a.
- [x] Task: Verify every child spec includes scope, non-goals, artifacts, and acceptance criteria. Evidence: commit f759620a.
- [x] Task: Verify every child plan starts with inventory before findings. Evidence: commit f759620a.
- [x] Task: Verify no child plan claims review completion before execution. Evidence: commit f759620a.
- [x] Task: Verify no plan uses deprecated `[ ]` markers once orchestrator compatibility is enforced; convert pending work to the project's chosen current marker vocabulary in a dedicated follow-up if needed. Evidence: commit f759620a.

## Phase 5: Closeout

- [x] Task: Present the complete review program to the user for sequencing confirmation. Evidence: commit f759620a.
- [x] Task: Record any user changes to review order or scope in this plan. Evidence: commit f759620a.
- [b] Task: Create follow-up tasks for the first executable child track only after explicit user approval. — deferred:human
