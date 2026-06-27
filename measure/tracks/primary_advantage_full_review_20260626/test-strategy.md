# Test Strategy: Primary Advantage Full Review

This is a review-only track. Tests and gates verify review scaffolding, line-review coverage, and synthesis truthfulness; they do not prove product behavior until later live-behavior phases execute.

## Phase 0 / 0A — Setup and line-review protocol

- Red command: `python3 - <<'PY' ... verify inventory/coverage/manifest invariants ... PY` must fail before scaffolding exists.
- Green gate: `file-inventory.tsv` and `line-review-coverage.tsv` have the same 446-file set and row count; coverage columns are exactly `package_app,file,line_count,reviewer,status,evidence_file,reviewed_ranges,finding_count`; all rows start `status=pending`; every manifest batch has an evidence path under `line-review/evidence/`; batch caps are <=1200 lines or <=10 files unless a single oversized file forms the batch.
- Closeout gate: `setup-result.json` records status, commands, changed files, totals, and the verifier output.
- Fixtures/mocks/live proof: artifact tests only; no app runtime or mocks. Graph proof is `build-graph stats ./graph.db` plus filesystem inventory, not a substitute for line review.
- Architecture guardrails / changed-contract risks: preserve review-only scope; do not edit `apps/primary-advantage` source; include manifests/configs/routes/components/tests/assets instead of broad source-only filtering.
- Intentionally-red aggregate handling: full app lint/type/test/build gates are not required in setup and must not be claimed green.
- Artifact vs live behavior: setup validates artifacts; it does not validate Primary Advantage workflows.
- Anti-pattern coverage: A1/A8/A11 via structured markers and exact batch IDs; A3 via labeled totals parsed from TSV/JSON; A4/A5/A6 by forbidding product-complete claims while coverage is pending; A7 by explicit path-only exclusions; A9 by active-track evidence paths; A10 by noting no source structural edits.

## Phase 0B — Atomic line-by-line review

- Red command: coverage verifier must fail while any row is pending, blocked without approval, missing evidence, has partial ranges, or nonnumeric finding counts.
- Green gate: each assigned batch evidence file lists every file, `reviewed_ranges=1-N`, status, and finding count; coverage rows updated only for assigned files.
- Closeout gate: 100% coverage rows reviewed and manifest/inventory/coverage file sets match.
- Fixtures/mocks/live proof: reviewers use source files as fixtures and cite line evidence; no mocks or runtime proof.
- Architecture guardrails: no broad prompts, no source remediation, no dropping no-finding evidence.
- Intentionally-red aggregate handling: aggregate coverage remains intentionally red until all batches complete.
- Artifact vs live behavior: evidence proves review coverage only, not runtime correctness.
- Anti-pattern coverage: A1/A8/A11 through structured coverage statuses; A3 through exact `1-N` range matching; A4/A5/A6 through failing pending/empty-review states; A7 through batch file-set matching only; A9 active evidence paths.

## Phases 1–4 — Migration truth, fork divergence, product and boundary review

- Red command: targeted reviewer checks should fail if a finding lacks `file:line` evidence or one fork-divergence category.
- Green gate: every material finding is classified as one spec category and tied to evidence; Prisma/Drizzle, auth/tenant, workflow, and primary-student adaptation claims cite reviewed lines.
- Closeout gate: `findings.md`, `fork-divergence.md`, `workflow-map.md`, `migration-tracks.md`, and `test-gaps.md` are synthesized from LR IDs without deleting evidence.
- Fixtures/mocks/live proof: source and config files are fixtures; live-behavior proof is required only when reviewers actually run app workflows and must be labeled separately.
- Architecture guardrails: do not assume Reading Advantage correctness; separate shared legacy, fork-specific, intentional divergence, primary-student risk, and shared-package blockers.
- Intentionally-red aggregate handling: unresolved product gate failures are recorded as findings/test gaps, not remediated.
- Artifact vs live behavior: documentation artifacts state review conclusions; live behavior tests require runtime command/browser evidence.
- Anti-pattern coverage: A5/A6 prevent overstated migration/product claims; A7 prevents broad filters hiding direct DB/auth hits; A3 requires labeled counts for Prisma/Drizzle/import totals; A1/A8/A11 keep plan state truthful.

## Phase 5 — Reporting and acceptance

- Red command: final coverage verifier fails on any pending row, missing evidence file, partial range, malformed finding count, inventory/coverage mismatch, or batch cap violation.
- Green gate: acceptance cites file count, line count, batch count, evidence file count, and LR finding count.
- Closeout gate: `line-review-findings.md`, `line-review-summary.md`, required audit reports, and acceptance JSON exist and agree with coverage totals.
- Fixtures/mocks/live proof: artifact verification plus any separately labeled live gate outputs; aggregate app gates may remain intentionally red only if failures are documented and not claimed resolved.
- Architecture guardrails: synthesis may deduplicate root causes but must preserve LR IDs and evidence paths.
- Intentionally-red aggregate handling: full-suite failures are acceptable only as recorded findings/test gaps with commands and exit status; they cannot be used as green proof.
- Artifact vs live behavior: closeout distinguishes artifact completeness from product runtime health.
- Anti-pattern coverage: A4/A5/A6 guard against false closeout; A3 labeled totals; A9 active track paths; A10 generated-facts/source-change drift check; A11 prevents executed review from remaining fully blocked.
