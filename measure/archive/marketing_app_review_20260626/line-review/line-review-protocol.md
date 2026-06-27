# Marketing App Line-Review Protocol

This track requires line-by-line review evidence for `apps/marketing` (plus the directly-referenced shared marketing schema surface). Broad scans, route inventories, graph summaries, package gates, or synthesized triage do not satisfy acceptance.

## Scope and source of truth

Use `file-inventory.tsv` as the source of truth for in-scope files and line counts.

Scope is `apps/marketing` plus marketing schema/domain surfaces in shared packages that are **directly referenced** by the app. As of setup, the only directly-referenced shared surface is `packages/db/src/schema/marketing.ts` (imported via `@reading-advantage/db/schema` in `apps/marketing/app/lib/db.ts`). No additional shared marketing domain module was found.

Excluded artifacts follow the spec only:

- `node_modules`
- `.next`
- `dist`
- `.turbo`
- `.vite`
- `.vinext`
- `coverage`
- build/cache directories and artifacts
- package-local graph/cache files (`graph.db*`)
- `*.tsbuildinfo`

The inventory intentionally includes package manifests, app configs, tests, app routes, API handlers, app-local libraries, pages/components, and the shared schema surface. Do not narrow to source files only.

## Binary / static assets

If any binary or static asset is in scope, the inventory marks its `line_count` as `BINARY`. As of setup there are **0 binary/static files** under `apps/marketing`. Should a binary asset appear in a future inventory refresh, it is reviewable as binary: the reviewer records what the asset is, where it is referenced, and any provenance/licensing/size concern, using `reviewed_ranges=binary` instead of `1-N`.

## Reviewer contract

Each subagent assignment must name exactly one batch ID from `batch-manifest.json`, exactly one evidence file, and the exact file list for that batch.

For every assigned file, the reviewer must:

- Read every line, not just matching search hits.
- Record full-file coverage as `reviewed_ranges=1-N`, where `N` exactly equals the `line_count` in `file-inventory.tsv` (or `reviewed_ranges=binary` for a `BINARY` file).
- Record either `no-findings` evidence or one or more findings.
- Include `file:line` or `file:line-line` evidence for every finding.
- Assign every material finding exactly one marketing-specific review category (see below).
- Update only its assigned evidence file and, if instructed, only its assigned rows in `line-review-coverage.tsv`.
- Avoid source edits. This review track must not remediate product/code findings.

## Marketing-specific review categories

Every material finding must be tagged with exactly one of:

- `workflow` — topic research, dedup, script generation, scene editing, project/campaign persistence, state transitions, export.
- `ai-boundary` — AI provider usage, provider selection, prompt safety, structured-output (Zod/schema) validation, malformed-output handling, adapter neutrality of AI calls.
- `persistence` — DB schema usage, data-integrity, multi-tenant/`schoolId` scoping, storage of projects/scripts, migration truth.
- `auth-api` — auth/session handling, role/permission enforcement, API route input validation, project access control.
- `tests-build` — test coverage/quality, vitest/eslint/tsconfig/build config, missing tests vs. the video pipeline plan.
- `ux-i18n` — UX correctness, language/locale behavior (Thai script handling), accessibility, error surfaces.
- `adapter-neutrality` — provider-neutrality per AGENTS.md: storage, AI, auth, DB, transport calls staying behind shared/internal adapters; no direct provider SDK coupling.

## Evidence path

Every batch writes evidence to:

`measure/tracks/marketing_app_review_20260626/line-review/evidence/<batch_id>.md`

The evidence file must use this structure:

```md
# Line Review Evidence: <batch_id>

Reviewer: <subagent/session>
Files assigned: <count>
Lines assigned: <count>

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/marketing/app/example.ts | 1-123 | reviewed | 0 |

## Findings

### LR-<batch_id>-001 — <title>

- Severity: Critical|High|Medium|Low
- Category: workflow|ai-boundary|persistence|auth-api|tests-build|ux-i18n|adapter-neutrality
- File: `apps/marketing/path/file.ts:line`
- Evidence: <what the reviewer saw>
- Impact: <why it matters>
- Recommendation: <minimal remediation track or change>

## No-Finding Notes

- `apps/marketing/path/file.ts`: reviewed line-by-line; no findings.
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
- `reviewed_ranges=1-N` matching `line_count` (or `reviewed_ranges=binary` for `BINARY` rows)
- numeric `finding_count`

Blocked rows require explicit human approval before closeout. Pending rows, partial ranges, missing evidence, or nonnumeric finding counts block closeout.

## Architecture guardrails for findings

Reviewers should pay special attention to these risks:

- LLM output validation: script/topic generation must validate structured AI output (Zod/schema) and handle malformed output safely.
- Auth/session/role boundaries: marketing routes/API handlers must not trust frontend-supplied identifiers and must enforce documented access rules.
- Backend/provider neutrality: storage, AI, auth, DB, and transport calls should stay behind shared/internal adapters where required by AGENTS.md; app-local AI code is a remediation candidate, not in-scope to consolidate during review.
- Persistence correctness: project/campaign/script persistence and multi-tenant scoping must be evidence-checked, not assumed.
- i18n / Thai script handling: language behavior must be verified against actual code paths.

## Anti-pattern defenses

- A1/A8/A11: Use structured batch IDs, coverage statuses, and exact `[x]/[~]/[b]` plan markers. Do not treat prose such as "deferred" or broad review claims as completion.
- A3: Parse labeled integers from manifest totals and TSV counts; do not accept digit-only regex matches as proof.
- A4/A5/A6: Setup artifacts and summaries must not claim review completion or product correctness while coverage rows are pending.
- A7: Verification filters may exclude only configured generated/dependency paths, never broad English words or source-like paths.
- A9: Evidence paths must point to this active track, not archived track paths.
- A10: If later reviewers make structural source changes despite scope restrictions, graph/generated facts must be refreshed in a separate authorized track; this setup performs no source changes.

Every test or verification claim in this review must have a falsification condition: a mismatched file set, missing evidence path, over-cap batch without single-file exception, partial reviewed range, nonnumeric finding count, missing review category, or a plan/status claim not backed by evidence must fail the gate.
