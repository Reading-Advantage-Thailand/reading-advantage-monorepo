# CodeCamp Advantage — Review Inventory (00)

- Track: `codecamp_advantage_review_20260626`
- Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- Synthesis date: 2026-06-27
- Source inputs: `line-review-coverage.md` + 11 batch reports under `line-review/cc-batch-*.md`
- This is a **synthesis artifact only**. It makes **no acceptance or closeout claim**. Phase acceptance/closeout remain **PENDING**.

## Coverage Metrics

| Metric | Value |
|--------|-------|
| In-scope tracked files | 209 |
| Batches | 11 (`cc-batch-00` … `cc-batch-10`) |
| Batch reports produced | 11 |
| Total report lines synthesized | 2,401 |
| Batch size | 20 files (final batch `cc-batch-10` = 9 files) |
| Reviewer model | `ark-code-latest` (Doubao-Seed-Code) |
| Source code edited during review | none |

Scope: `apps/codecamp-advantage` plus CodeCamp modules in `domain` / `api` / `webhooks` / `db` / `types` / `integrations/github`.
Exclusions: `.next/**`, `node_modules/**`, `public/**`, `coverage/**`, `.turbo/**`.

## Batch → File-Class Map

Each batch covers 20 files (cc-batch-10 = 9). File-class is the dominant classification used to separate **live runtime/code** from **curriculum/docs/test-fixture** findings (see `findings.md`).

| Batch | Report | Files | Dominant class | Finding IDs |
|-------|--------|-------|----------------|-------------|
| cc-batch-00 | `line-review/cc-batch-00.md` | 20 | Live runtime — app routes, pages, auth/chat API, Dockerfile, env | F-CC-B00-001…052 |
| cc-batch-01 | `line-review/cc-batch-01.md` | 20 | Live runtime — components, webhook route, cloudbuild + component tests | F-CC-B01-001…064 |
| cc-batch-02 | `line-review/cc-batch-02.md` | 20 | Docs + e2e/i18n tests + i18n source | F-CC-B02-001…048 |
| cc-batch-03 | `line-review/cc-batch-03.md` | 20 | Test fixtures — prod-smoke suites + parity matrix JSON | F-CC-B03-001…056 |
| cc-batch-04 | `line-review/cc-batch-04.md` | 20 | Mixed — prod-smoke tests + `lib/` source | F-CC-B04-001…030 |
| cc-batch-05 | `line-review/cc-batch-05.md` | 20 | Curriculum — course-spec + Units 01–10 | F-CC-B05-001…020 |
| cc-batch-06 | `line-review/cc-batch-06.md` | 20 | Curriculum (Units 10–18) + messages + `next.config.ts` | F-CC-B06-001…024 |
| cc-batch-07 | `line-review/cc-batch-07.md` | 20 | Live runtime — app config, tRPC router, DB migrations + tests | F-CC-B07-001…048 |
| cc-batch-08 | `line-review/cc-batch-08.md` | 20 | Live runtime — DB schema/seed + domain (chat/exercises/intern) + tests | F-CC-B08-001…050 |
| cc-batch-09 | `line-review/cc-batch-09.md` | 20 | Live runtime — domain (lessons/modules/pr-reviews/quizzes) + integrations/github + types | F-CC-B09-001…061 |
| cc-batch-10 | `line-review/cc-batch-10.md` | 9 | Live runtime — webhooks (`github.ts`, `github-client.ts`, health, index) + tests | F-CC-B10-001…026 |

## Finding Volume by Batch

| Batch | Findings recorded | Highest severity in batch |
|-------|-------------------|---------------------------|
| cc-batch-00 | 52 | High |
| cc-batch-01 | 64 | High |
| cc-batch-02 | 48 | High |
| cc-batch-03 | 56 | High |
| cc-batch-04 | 30 | High |
| cc-batch-05 | 20 | High |
| cc-batch-06 | 24 | High |
| cc-batch-07 | 48 | High |
| cc-batch-08 | 50 | Critical |
| cc-batch-09 | 61 | Critical |
| cc-batch-10 | 26 | Critical |

Note: per-batch counts above are the highest finding ID index recorded in each report and are an upper bound on distinct findings; several IDs are Info/positive observations. Deduplicated, severity-ranked findings are consolidated in `findings.md`.

## Severity Legend (unified across batches)

- **Critical** — security/data-integrity defect or broken core flow that would ship to production.
- **High** — likely functional break, real security/abuse risk, false-assurance test, or strong AGENTS.md violation.
- **Medium** — correctness/robustness gap, maintainability or UX risk.
- **Low** — minor/cosmetic, style, nit.
- **Info** — observation or positive confirmation; no action implied.
