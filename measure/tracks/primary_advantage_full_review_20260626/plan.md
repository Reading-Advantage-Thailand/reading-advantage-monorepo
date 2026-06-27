# Implementation Plan: Primary Advantage Full Feature Review

> **Track ID:** `primary_advantage_full_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Depends on:** `shared_foundation_review_20260626`; should run after Reading Advantage inventory for divergence context.

> **Review Standard:** This is a line-by-line review track. Do not repeat the failed
> 2026-06-26 shared-foundation pattern of assigning broad domains to agents and accepting
> synthesized triage as review completion. Use atomic file batches, per-file evidence,
> and mechanical coverage verification before acceptance.

---

## Phase 0: Setup and Inventory

- [x] Task: Confirm fresh `graph.db` and record `primary-advantage` file/node/function counts. Evidence: `build-graph stats ./graph.db` recorded graph totals (22185 nodes, 46017 edges, 2715 files) and package count (`primary-advantage: 394` graph files); graph mtime `2026-06-26 20:38:27 +0800` (<24h from setup run).
- [x] Task: Create `measure/audit-reports/primary-advantage-full_20260626/`. Evidence: initialized `00-inventory.md`, `workflow-map.md`, `fork-divergence.md`, `checklist.md`, `findings.md`, `migration-tracks.md`, `test-gaps.md`, and `executive-summary.md`.
- [x] Task: Inventory routes, API routes, model/data-access files, Prisma files, Drizzle usage, tests, and feature pages. Evidence: `line-review/file-inventory.tsv` contains 446 in-scope files / 118709 lines from `apps/primary-advantage`, including manifests, configs, tests, app routes, components, data, public assets, and scripts while excluding only generated/dependency/cache artifacts.
- [x] Task: Initialize `workflow-map.md` setup sections for student, teacher, admin, content, AI/media, and boundary workflows. Evidence: `measure/audit-reports/primary-advantage-full_20260626/workflow-map.md`; detailed workflow claims remain deferred to line-review evidence.

## Phase 0A: Line-Review Protocol and Batch Setup

- [x] Task: Create `line-review/file-inventory.tsv` from `apps/primary-advantage`, excluding only generated/dependency artifacts. Evidence: `line-review/file-inventory.tsv` has 446 file rows / 118709 total lines.
- [x] Task: Create `line-review/line-review-protocol.md` with reviewer contract, evidence schema, coverage TSV schema, and fork-divergence finding requirements. Evidence: `line-review/line-review-protocol.md`.
- [x] Task: Create `line-review/line-review-coverage.tsv` with one row per file and columns: `package_app`, `file`, `line_count`, `reviewer`, `status`, `evidence_file`, `reviewed_ranges`, `finding_count`. Evidence: `line-review/line-review-coverage.tsv` has 446 rows, all `status=pending`.
- [x] Task: Create `line-review/batch-manifest.json` and `.md`, with batches capped around 1,200 lines or 10 files unless a single file is larger. Evidence: `line-review/batch-manifest.json` and `.md` define 103 batches; verifier found 0 cap violations and 13 valid oversized single-file batches.
- [x] Task: Record an explicit anti-laziness checkpoint: broad prompts are prohibited; each subagent assignment must name exactly one batch ID and evidence file. Evidence: `line-review/line-review-protocol.md` and `line-review/batch-manifest.json` require exact batch IDs/evidence paths; 103 placeholder evidence files exist under `line-review/evidence/`.

## Phase 0B: Atomic Line-by-Line Review

- [b] Task: Delegate every batch in `batch-manifest.json` to subagents with exact file lists and one evidence file per batch. — deferred:line-review-agents
- [b] Task: Require each subagent to read every assigned line and update only its assigned coverage rows. — deferred:line-review-agents
- [b] Task: Require every finding to include file:line evidence plus fork-divergence category. — deferred:line-review-agents
- [b] Task: Preserve no-finding evidence for reviewed files so absence of findings is auditable. — deferred:line-review-agents

## Phase 1: Migration Truth

- [b] Task: Verify Prisma imports, Prisma schema/migration files, `lib/prisma.ts`, package dependencies, and runtime usage. — deferred:review-execution
- [b] Task: Verify Drizzle usage and shared `@reading-advantage/db` usage. — deferred:review-execution
- [b] Task: Record false registry claims or migration drift in findings. — deferred:review-execution
- [b] Task: Propose a Prisma/Drizzle remediation track if still needed. — deferred:review-execution

## Phase 2: Fork-Divergence Review

- [b] Task: Identify Reading-derived feature families and Primary-specific adaptations. — deferred:review-execution
- [b] Task: Classify differences as intentional, accidental, risky, or undocumented. — deferred:review-execution
- [b] Task: Create `fork-divergence.md` with evidence-backed categories. — deferred:review-execution

## Phase 3: Product Feature Review

- [b] Task: Review primary student workflows, teacher/classroom workflows, reports, quizzes, vocabulary, media, and workbook/content generation. — deferred:review-execution
- [b] Task: Check UX appropriateness for primary students and age-specific data/consent risks. — deferred:review-execution
- [b] Task: Record findings and test gaps. — deferred:review-execution

## Phase 4: Auth, Tenant, API Boundaries

- [b] Task: Review auth/session, role checks, tenant/school scoping, route validation, and destructive actions. — deferred:review-execution
- [b] Task: Identify direct DB/Prisma/domain bypass patterns. — deferred:review-execution
- [b] Task: Record migration recommendations. — deferred:review-execution

## Phase 5: Reporting and Acceptance

- [b] Task: Run targeted lint/type/test/build gates appropriate for Primary Advantage and record results. — deferred:review-execution
- [b] Task: Complete all required artifacts. — deferred:review-execution
- [b] Task: Mechanically verify `line-review-coverage.tsv`: every row reviewed, every range `1-N`, every evidence file exists, every finding count numeric, and inventory files match coverage files. — deferred:coverage-verifier
- [b] Task: Synthesize `line-review-findings.md` and `line-review-summary.md` from evidence files without dropping LR finding IDs. — deferred:coverage-verifier
- [b] Task: Run Measure phase acceptance and feed accepted findings into the final roadmap only after line-review coverage verification passes. — deferred:review-execution
- [b] Task: Block closeout if any review claim is based only on graph scans, package gates, route inventories, or broad synthesized summaries without per-file line evidence. — deferred:review-execution
