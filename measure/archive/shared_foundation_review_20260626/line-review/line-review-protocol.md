# Shared Foundation Line-Review Protocol

This reopened review requires line-by-line coverage evidence. The prior 2026-06-26
artifacts are triage evidence only and do not satisfy acceptance.

## Scope

Use `file-inventory.tsv` as the source of truth. Generated/dependency artifacts are
excluded: `node_modules`, `dist`, `.turbo`, `.vite`, `.next`, `coverage`, package-local
`graph.db`, and `tsconfig.tsbuildinfo`.

## Reviewer Contract

Each reviewer receives a bounded file list. For every assigned file, the reviewer must:

- Read every line in the assigned file.
- Record exact reviewed ranges. Full-file reviews use `1-N` where `N` is the file's line count.
- Record either `no-findings` or one or more findings.
- Include file/line evidence for every finding.
- Update only the assigned evidence file and, if instructed, only the assigned rows in `line-review-coverage.tsv`.
- Avoid remediation unless a file cannot be reviewed without a small artifact fix.

## Evidence File Format

Each batch writes `line-review/evidence/<batch_id>.md` with this structure:

```md
# Line Review Evidence: <batch_id>

Reviewer: <subagent/session>
Files assigned: <count>
Lines assigned: <count>

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/example/src/file.ts | 1-123 | reviewed | 0 |

## Findings

### LR-<batch_id>-001 — <title>

- Severity: Critical|High|Medium|Low
- File: `path/to/file.ts:line` or `path/to/file.ts:line-line`
- Evidence: <what the reviewer saw>
- Impact: <why it matters>
- Recommendation: <minimal remediation track or change>

## No-Finding Notes

- `path/to/file.ts`: reviewed line-by-line; no findings.
```

## Coverage TSV Rules

`line-review-coverage.tsv` columns:

- `package`
- `file`
- `line_count`
- `reviewer`
- `status`: `pending`, `reviewed`, `blocked`
- `evidence_file`
- `reviewed_ranges`
- `finding_count`

Acceptance requires every row to have `status=reviewed`, a non-empty evidence file,
`reviewed_ranges=1-N` matching `line_count`, and a numeric finding count. Blocked rows
must be explicitly approved by the user before final acceptance.

## Synthesis Rules

The final synthesis may deduplicate findings into root causes, but must not delete or
hide per-file evidence. The final artifacts must cite line-review finding IDs where
applicable.
