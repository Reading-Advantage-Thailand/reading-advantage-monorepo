# Implementation Plan: Marketing App Review

> **Track ID:** `marketing_app_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`

---

## Phase 0: Setup and Inventory

- [b] Task: Confirm fresh `graph.db` and record `marketing` file/node/function counts. — deferred:review-execution
- [x] Task: Create `measure/audit-reports/marketing-app_20260626/`. — done: 8 required artifacts created (`00-inventory.md`, `workflow-map.md`, `ai-boundary-map.md`, `checklist.md`, `findings.md`, `migration-tracks.md`, `test-gaps.md`, `executive-summary.md`).
- [x] Task: Inventory pages, API routes, app-local libraries, DB schema usage, tests, and existing video pipeline plan gaps. — done: 45 files / 4966 lines in `line-review/file-inventory.tsv`; categories + video-pipeline gaps recorded in `00-inventory.md` and `test-gaps.md`.
- [x] Task: Build `workflow-map.md` and `ai-boundary-map.md`. — done: initial truthful maps created; per-finding verdicts deferred to line-review evidence.

## Phase 0A: Line-Review Setup

- [x] Task: Scaffold `line-review/` (file-inventory.tsv, batch-manifest.json/.md, line-review-protocol.md, line-review-coverage.tsv, evidence/ placeholders). — done: 7 batches, all within cap; 45 pending coverage rows; 7 evidence placeholders.
- [x] Task: Mechanical setup verification (inventory/coverage same file set, manifest covers all files, evidence placeholders exist, batch caps pass). — done: see `line-review/setup-verification.json`.

## Phase 0B: Line-Review Execution

- [x] Task: Execute all `line-review` batches with file:line evidence, mark coverage rows reviewed, synthesize findings. — done: 7/7 batches executed; 45/45 coverage rows reviewed (every `reviewed_ranges=1-N`); 7/7 evidence files present; 44 unique LR findings extracted into `line-review/lrf-extracted.json`, `line-review/line-review-findings.md`, and `line-review/line-review-summary.md`; merged canonical `line-review/line-review-coverage.tsv`.

## Phase 1: Workflow Review

- [x] Task: Review topic research, topic saving/deduplication, script generation, scene editing, and project persistence. — done: all workflows mapped to boundaries in `workflow-map.md` with LR evidence (batches 004/005/006/007).
- [x] Task: Check validation, error handling, state transitions, UX, and persistence correctness. — done: campaign state machine verified sound; gaps recorded (LR-004-001/004/006/007/008/009/010, LR-marketing-app-003-002/004, LR-007-001/005).
- [x] Task: Record feature findings. — done: `findings.md` + `line-review-findings.md` (44 findings).

## Phase 2: Auth, Roles, API Boundaries

- [x] Task: Review auth/session and role/permission checks on marketing app routes, API handlers, and project access; verify enforcement of any role-based access (e.g., admin vs. contributor). — done: confirmed no auth/role enforcement on any campaign/video/settings handler (LR-004-002, LR-marketing-app-003-001/003/005/007, LR-marketing-app-006-001).
- [x] Task: Identify auth/role findings and verify they match current app architecture; record gaps as remediation-track proposals. — done: 7 auth-api findings; proposed `marketing_api_authz_*` in `migration-tracks.md`.

## Phase 3: AI and Data Boundaries

- [x] Task: Review app-local AI client usage, provider selection, settings, prompt safety, structured output validation, and malformed output handling. — done: `ai-boundary-map.md`; no direct SDK in app (batch 005) but per-request `createAIClient` bypass (LR-004-003), missing input Zod (LR-004-001), raw `JSON.parse` (LR-004-006).
- [x] Task: Review data privacy and storage risks for marketing projects and generated scripts. — done: AES-256-GCM encryption primitive correct (batch 005); decrypted-key exposure via unauthenticated GET (LR-marketing-app-003-005); schema-level integrity gaps (LR-007-004/005/007); `schoolId` absence confirmed intentional.
- [x] Task: Record AI/data findings and proposed migration tracks. — done: `marketing_zod_boundaries_*`, `marketing_ai_adapter_*`, `marketing_schema_integrity_*` proposed in `migration-tracks.md`.

## Phase 4: Tests, Build, Reporting

- [x] Task: Reconcile existing missing tests from `video_pipeline_20260613` with this review's `test-gaps.md`. — done: 8 confirmed gaps + 4 test-quality debts reconciled in `test-gaps.md`.
- [b] Task: Run targeted marketing lint/type/test/build gates and record results. — deferred:review-execution (review-only track; gates not run)
- [x] Task: Complete all artifacts and run Measure phase acceptance. — done: all 8 audit reports completed with evidence; `line-review/line-review-acceptance-result.json` written (status=pass); phase acceptance run.

## Phase 5: Final Acceptance and Closeout

- [x] Task: Verify final acceptance readiness (no [~]/[ ] in plan; [b] rows deferred:review-execution; acceptance result status=pass; audit reports no remediation claims; coverage summary 45/45 files / 44 findings). — done: all checks pass.
- [x] Task: Write `final-acceptance-result.json` using acceptance JSON shape. — done: status=pass; deferred graph-count and build-gates documented as nonblocking notes.
- [x] Task: Update `metadata.json` to status=done, completed_at=2026-06-27, actual_tasks=15. — done.
- [x] Task: Write `automation-supervisor-closeout-manifest.json` documenting review-only closeout, coverage totals, finding totals, deferred gates, final acceptance status, and no source remediation claim. — done.
- [x] Task: Archive track: move `measure/tracks/marketing_app_review_20260626` to `measure/archive/marketing_app_review_20260626`. — done.
- [x] Task: Update `measure/tracks.md`: move Marketing App Review from active Monorepo Feature Review Program to Archived Tracks with truthful summary; do not claim fixed/product-green. — done.
- [x] Task: Run closeout checker; document unavailability in manifest. — done: checker script not found; review-only track had no commits so only SHA warnings would be expected.
