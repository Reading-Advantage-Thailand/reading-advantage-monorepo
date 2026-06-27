# CodeCamp Advantage — Line-Review Synthesis

- Track: `codecamp_advantage_review_20260626`
- Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- Synthesis date: 2026-06-27
- Inputs: `line-review-coverage.md` + all 11 reports under `line-review/cc-batch-*.md` (209 files, 11 batches, 11 reports, 2,401 report lines)
- Constraint: read-only review. **No source code was edited.** This synthesis makes **no claim that any remediation was performed**, and **no acceptance or closeout determination**. Phase acceptance and closeout are explicitly **PENDING**.

This document is the index to the synthesis artifact set:

| Artifact | Purpose |
|----------|---------|
| `00-inventory.md` | Coverage metrics, batch→file-class map, finding volume |
| `workflow-map.md` | GitHub PR-review and AI tutor/chat workflows mapped end-to-end |
| `integration-map.md` | Webhook security/idempotency + AI adapter integration assessment |
| `checklist.md` | Production-readiness checklist with PASS/AT-RISK/FAIL/UNVERIFIED status |
| `findings.md` | Deduplicated, severity-ranked findings (live vs curriculum/docs/test) |
| `migration-tracks.md` | Proposed follow-up remediation tracks (no work performed) |
| `test-gaps.md` | False-green and coverage-gap catalogue |
| `executive-summary.md` | One-page summary for stakeholders |

## How findings are sourced

Every consolidated finding in `findings.md` cites its **source batch finding ID(s)** (e.g. `F-CC-B09-001`), which map to anchors in the corresponding `line-review/cc-batch-NN.md` report. Where two or more batches surfaced the same underlying defect from different files, the finding is **deduplicated** into a single consolidated entry that lists all contributing batch IDs.

## Live-runtime vs curriculum/docs/test separation

The review covered three materially different kinds of files. They are kept separate throughout the synthesis because their risk semantics differ:

1. **Live runtime / shipped code** — app routes, pages, components, the tRPC router, domain functions, DB schema/migrations/seed, the GitHub integration package, and the webhooks service. Defects here are production defects.
2. **Curriculum / instructional docs** — `measure/curriculum/**` (course spec + Units 01–18), `docs/**`. Defects here are *teaching* risks: what interns are taught to ship. They are not assertions that the shipped app contains the defect.
3. **Tests / fixtures / artifacts** — unit/e2e/prod-smoke suites, the parity matrix JSON, `report-summary.json`. Defects here are false-assurance and coverage risks.

## Highest-priority themes (detail in `findings.md`)

1. **TenantDB / REFERENTIAL scoping breakage (Critical).** Multiple codecamp domain read/write paths call `REFERENTIAL` tables directly through `createTenantDB(...)` without `unscoped(...)`, which throws `TenantScopeError`. Surfaced independently in cc-batch-08, cc-batch-09, and cc-batch-10. The webhook PR-review pipeline and several reads are implicated. Tests do not catch it because codecamp tables resolve to `EXEMPT` under Vitest but `REFERENTIAL` in the compiled build.
2. **Webhook integration risk (High).** Synchronous LLM review inside the webhook request path vs GitHub's ~10s timeout (duplicate redelivery), no UNIQUE on `delivery_id` (idempotency gap), replay protection inert for real GitHub deliveries, and a fabricated mock diff that can auto-complete lessons when credentials are missing.
3. **AI chat streaming likely broken end-to-end (High).** Streaming protocol mismatch between the chat route and the client hook; no cross-chunk SSE buffering.
4. **Authorization is client-side at the UI layer (High, must-verify against server).** Server-side enforcement exists in tRPC `adminProcedure`/domain `assertCan`, but several findings flag the boundary.
5. **GitHub App client duplication + per-installation token cache leak (High).** Two independent GitHub client implementations; `integrations/github` REST driver caches a single token regardless of installation ID (cross-installation token leak).
6. **Curriculum teaches non-conformant patterns (High).** bcrypt vs AGENTS Argon2id mandate; AI SDK v4 APIs vs shipped v5; unverified session-trust + wildcard CORS examples; dropped `schoolId` in tenant writes.
7. **Test-pyramid inversion / false-green (High).** Prod-smoke suites hit live production by default; phase-4/7 harness bugs; process/bookkeeping tests pinned in package suites; domain-mocking masks the Critical scoping defect.

## Status

- Required artifacts: all present in this directory.
- Findings: every consolidated finding cites source batch IDs.
- Remediation: **none performed or claimed.**
- Phase acceptance / closeout: **PENDING.**
