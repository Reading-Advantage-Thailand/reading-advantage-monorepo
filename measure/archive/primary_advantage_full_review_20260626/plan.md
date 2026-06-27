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

- [x] Task: Delegate every batch in `batch-manifest.json` to subagents with exact file lists and one evidence file per batch. Evidence: 103 evidence files present under `line-review/evidence/`; 101 coverage patch TSVs under `line-review/coverage-patches/` for batches 003-103; batches 001-002 reviewed separately. All 446 rows merged into `line-review-coverage.tsv` with status=reviewed.
- [x] Task: Require each subagent to read every assigned line and update only its assigned coverage rows. Evidence: every evidence file contains per-file coverage table with reviewed ranges; coverage patches update only assigned files; merge verification found zero conflicting rows.
- [x] Task: Require every finding to include file:line evidence plus fork-divergence category. Evidence: 893 findings extracted, all have file:line references and fork-divergence categories.
- [x] Task: Preserve no-finding evidence for reviewed files so absence of findings is auditable. Evidence: 102/103 batches have findings; batch 088 has explicit no-finding coverage (public SVG/image assets). Every evidence file includes a coverage table listing findings per file, including files with 0 findings.

## Phase 1: Migration Truth

- [x] Task: Verify Prisma imports, Prisma schema/migration files, `lib/prisma.ts`, package dependencies, and runtime usage. Evidence: LR-001-001 (Dockerfile still references Prisma), LR-001-002 (npm vs pnpm), LR-015-* series (flashcard schema mismatch with Drizzle), batch 086 (package.json examined). See `fork-divergence.md` and `migration-tracks.md` for synthesis.
- [x] Task: Verify Drizzle usage and shared `@reading-advantage/db` usage. Evidence: flashcard API routes extensively reviewed (batches 015-016); `server/models/*` reviewed (batches 091-097); Drizzle imports and schema usage verified across all data-access files.
- [x] Task: Record false registry claims or migration drift in findings. Evidence: LR-015-007/008/012/014/015/019/024-027/031/033 document Drizzle schema columns (due, stability, difficulty, lapses, state, last_review) missing from shared `flashcardCards` table; `as any` casts used as workaround. Dockerfile still generates Prisma artifacts contrary to AGENTS.md claims.
- [x] Task: Propose a Prisma/Drizzle remediation track if still needed. Evidence: `migration-tracks.md` Track M6 (Drizzle/Flashcard Schema Resolution) and Track M7 (Prisma Artifact Cleanup).

## Phase 2: Fork-Divergence Review

- [x] Task: Identify Reading-derived feature families and Primary-specific adaptations. Evidence: `fork-divergence.md` classifies 893 findings across 5 categories; `workflow-map.md` maps 8 workflow families against evidence batches.
- [x] Task: Classify differences as intentional, accidental, risky, or undocumented. Evidence: 414 Fork-specific regression, 213 Same root cause, 115 Adaptation risk, 80 Intentional divergence, 71 Migration blocker.
- [x] Task: Create `fork-divergence.md` with evidence-backed categories. Evidence: `measure/audit-reports/primary-advantage-full_20260626/fork-divergence.md` synthesizes divergence patterns with per-batch evidence citations.

## Phase 3: Product Feature Review

- [x] Task: Review primary student workflows, teacher/classroom workflows, reports, quizzes, vocabulary, media, and workbook/content generation. Evidence: `workflow-map.md` covers all 8 workflow families with batch evidence. Student games/lessons reviewed (batches 026-052), teacher workflows reviewed (batches 011-013, 054-063), admin workflows reviewed (batches 006-010, 020-024), AI/content reviewed (batches 069-078, 097-103).
- [x] Task: Check UX appropriateness for primary students and age-specific data/consent risks. Evidence: 115 Primary-student adaptation risk findings including CEFR level calculation bugs (LR-029-015), debug routes exposing student data (LR-015-002/004), cross-school leaderboard leaks (LR-017-006), age-inappropriate error UX.
- [x] Task: Record findings and test gaps. Evidence: 893 findings in `line-review-findings.md`; `test-gaps.md` identifies 10 test gap categories.

## Phase 4: Auth, Tenant, API Boundaries

- [x] Task: Review auth/session, role checks, tenant/school scoping, route validation, and destructive actions. Evidence: 72 auth/authorization findings and 48 tenant/schoolId scoping findings across all evidence batches. Auth routes (batches 009, 013-014), session handling (batch 079), permissions (batch 079), middleware (batch 102).
- [x] Task: Identify direct DB/Prisma/domain bypass patterns. Evidence: `server/models/*` use raw SQL alongside Drizzle (batches 091-097); direct provider SDK calls bypassing adapters (batches 098-100, 102-103); server actions skip domain function layer.
- [x] Task: Record migration recommendations. Evidence: `migration-tracks.md` Tracks M4 (Auth), M5 (Tenant Scoping), M9 (Remove Secrets), M12 (Auth Adapter), M13 (Adapter Compliance).

## Phase 5 Reporting and Acceptance

- [b] Task: Run targeted lint/type/test/build gates appropriate for Primary Advantage and record results. — deferred:review-execution (not a review task; requires build infrastructure access)
- [x] Task: Complete all required artifacts. Evidence: All 8 audit reports filled with evidence-backed content; `line-review-findings.md` (893 findings), `line-review-summary.md`, `line-review-coverage.tsv` (merged), `lrf-extracted.json`.
- [x] Task: Mechanically verify `line-review-coverage.tsv`: every row reviewed, every range `1-N`, every evidence file exists, every finding count numeric, and inventory files match coverage files. Evidence: `verification-stats.json` — 446/446 reviewed, 103/103 evidence files present, 0 range mismatches, 0 non-numeric finding counts, identical file sets.
- [x] Task: Synthesize `line-review-findings.md` and `line-review-summary.md` from evidence files without dropping LR finding IDs. Evidence: 893 unique LR finding IDs preserved; `line-review-findings.md` catalogs all 893 by batch; `line-review-summary.md` provides totals, severity distribution, and theme analysis.
- [x] Task: Run Measure phase acceptance and feed accepted findings into the final roadmap only after line-review coverage verification passes. Evidence: `line-review-acceptance-result.json` written; coverage verification passed; all findings available for roadmap planning.
- [x] Task: Block closeout if any review claim is based only on graph scans, package gates, route inventories, or broad synthesized summaries without per-file line evidence. Evidence: All findings have `file:line` evidence in individual batch evidence files; no broad-summary-only claims exist.
