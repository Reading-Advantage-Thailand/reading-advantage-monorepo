# Primary Advantage Line-Review Protocol

This track requires line-by-line review evidence for `apps/primary-advantage`. Broad scans, route inventories, graph summaries, package gates, or synthesized triage do not satisfy acceptance.

## Scope and source of truth

Use `file-inventory.tsv` as the source of truth for in-scope files and line counts.

Excluded artifacts follow the spec only:

- `node_modules`
- `.next`
- `dist`
- `.turbo`
- `.vite`
- `coverage`
- build/cache directories and artifacts
- package-local graph/cache files

The inventory intentionally includes package manifests, app configs, tests, app routes, components, scripts, data files, public assets, and Prisma/Drizzle-related files if present. Do not narrow to source files only.

## Reviewer contract

Each subagent assignment must name exactly one batch ID from `batch-manifest.json`, exactly one evidence file, and the exact file list for that batch.

For every assigned file, the reviewer must:

- Read every line, not just matching search hits.
- Record full-file coverage as `reviewed_ranges=1-N`, where `N` exactly equals the `line_count` in `file-inventory.tsv`.
- Record either `no-findings` evidence or one or more findings.
- Include `file:line` or `file:line-line` evidence for every finding.
- Assign every material finding exactly one fork-divergence category from the spec:
  - Same root cause as Reading Advantage.
  - Fork-specific regression.
  - Intentional product divergence that needs documentation.
  - Primary-student adaptation risk.
  - Shared package migration blocker.
- Update only its assigned evidence file and, if instructed, only its assigned rows in `line-review-coverage.tsv`.
- Avoid source edits. This review track must not remediate product/code findings.

## Evidence path

Every batch writes evidence to:

`measure/tracks/primary_advantage_full_review_20260626/line-review/evidence/<batch_id>.md`

The evidence file must use this structure:

```md
# Line Review Evidence: <batch_id>

Reviewer: <subagent/session>
Files assigned: <count>
Lines assigned: <count>

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/example.ts | 1-123 | reviewed | 0 |

## Findings

### LR-<batch_id>-001 — <title>

- Severity: Critical|High|Medium|Low
- Fork-divergence category: Same root cause as Reading Advantage|Fork-specific regression|Intentional product divergence that needs documentation|Primary-student adaptation risk|Shared package migration blocker
- File: `apps/primary-advantage/path/file.ts:line`
- Evidence: <what the reviewer saw>
- Impact: <why it matters>
- Recommendation: <minimal remediation track or change>

## No-Finding Notes

- `apps/primary-advantage/path/file.ts`: reviewed line-by-line; no findings.
```

## Coverage TSV schema

`line-review-coverage.tsv` columns are exactly:

- `package_app`
- `file`
- `line_count`
- `reviewer`
- `status`
- `evidence_file`
- `reviewed_ranges`
- `finding_count`

Initial setup uses `status=pending` for every row. Reviewers must change only assigned rows to `reviewed` or, with explicit reason, `blocked`.

Acceptance requires every row to have:

- `status=reviewed`
- a non-empty evidence file that exists
- `reviewed_ranges=1-N` matching `line_count`
- numeric `finding_count`

Blocked rows require explicit human approval before closeout. Pending rows, partial ranges, missing evidence, or nonnumeric finding counts block closeout.

## Architecture guardrails for findings

Reviewers should pay special attention to these changed-contract risks:

- Prisma/Drizzle migration truth: package manifests, database access helpers, generated artifacts, and runtime imports must agree.
- Auth/session/role/tenant boundaries: Primary Advantage must not trust frontend tenant IDs, bypass shared auth contracts, or hide role checks inside UI-only code.
- Backend/provider neutrality: storage, AI, auth, DB, and transport calls should stay behind shared/internal adapters where required by AGENTS.md.
- Primary-student adaptations: age-appropriate UX, consent/data handling, reading-level assumptions, and copied Reading Advantage flows must be evidence-checked instead of assumed safe.
- Fork divergence: copied behavior from Reading Advantage must be classified, not treated as correct by inheritance.

## Anti-pattern defenses

- A1/A8/A11: Use structured batch IDs, coverage statuses, and exact `[x]/[~]/[b]` plan markers. Do not treat prose such as “deferred” or broad review claims as completion.
- A3: Parse labeled integers from manifest totals and TSV counts; do not accept digit-only regex matches as proof.
- A4/A5/A6: Setup artifacts and summaries must not claim review completion or product correctness while coverage rows are pending.
- A7: Verification filters may exclude only configured generated/dependency paths, never broad English words or source-like paths.
- A9: Evidence paths must point to this active track, not archived track paths.
- A10: If later reviewers make structural source changes despite scope restrictions, graph/generated facts must be refreshed in a separate authorized track; this setup performs no source changes.

Every test or verification claim in this review must have a falsification condition: a mismatched file set, missing evidence path, over-cap batch without single-file exception, partial reviewed range, nonnumeric finding count, missing fork-divergence category, or a plan/status claim not backed by evidence must fail the gate.
