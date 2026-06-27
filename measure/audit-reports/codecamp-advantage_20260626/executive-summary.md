# CodeCamp Advantage — Executive Summary

- Track: `codecamp_advantage_review_20260626`
- Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- Date: 2026-06-27
- Basis: line-by-line review of **209 files** across **11 batches** producing **11 reports / 2,401 report lines**. Read-only; **no source code was edited and no remediation was performed or is claimed**.
- **Phase acceptance and closeout are explicitly PENDING.** This summary records findings only and makes no go/no-go determination.

## Bottom line

The CodeCamp Advantage app is **not production-ready as reviewed**. One **Critical** defect and a cluster of **High** integration/security defects sit in the core GitHub-PR-review and AI-tutor workflows, and the test suite is structurally unable to detect the most serious one. Strong foundations exist (adapter discipline, security headers, curriculum-integrity invariants, signature verification), but the live runtime path has gating defects that must be confirmed against the deployed artifact and resolved before acceptance.

## The single most important finding

**Codecamp domain functions access `REFERENTIAL` tables through `TenantDB` without `unscoped()`, which throws `TenantScopeError` at runtime** (consolidated CR-1; source `F-CC-B10-001`, `F-CC-B09-001`, `F-CC-B08-001`). This breaks the webhook PR-review pipeline (HTTP 500 per real event) and multiple reads/writes. It was independently surfaced in three batches and empirically reproduced against the compiled build and the domain unit suite (63 of 90 tests throw `TenantScopeError`). **The test suite cannot catch it** because codecamp tables resolve to `EXEMPT` under Vitest but `REFERENTIAL` in the compiled build (CR-2). Sibling functions use `unscoped()` correctly, so these are inconsistent omissions, not design. **Caveat:** confirmed against compiled `dist/` + unit suite, not a live Postgres/app — the owning track must confirm against the deployed artifact.

## High-severity themes

1. **Webhook integration & idempotency.** Synchronous LLM review blocks the ACK vs GitHub's ~10s timeout → redelivery/duplicates (`F-CC-B10-002`); no `UNIQUE(delivery_id)` (`F-CC-B07-039`); replay protection inert for real deliveries (`F-CC-B10-003`); missing-token path fabricates a mock diff that can auto-complete a lesson at score 100 (`F-CC-B10-007`); `completeApprovedPrReviewLesson` forges a user context and bypasses auth (`F-CC-B09-014`); uniqueness backfilled in 0010 can halt a deploy on duplicates (`F-CC-B07-034/038`).
2. **AI chat streaming likely broken end-to-end.** Response type/protocol mismatch between the chat route and the client hook; no cross-chunk SSE buffering (`F-CC-B00-001`, `F-CC-B04-019`). Verify at runtime.
3. **GitHub App client duplication + token-cache leak.** Two divergent implementations; the REST driver caches one token regardless of installation ID → cross-installation exposure (`F-CC-B09-040/049`).
4. **Authorization is client-side at the UI layer.** Server enforcement exists in tRPC `adminProcedure`/`assertCan`, but it is the only real boundary and some procedures lack output schemas (`F-CC-B00-013`, `F-CC-B07-026`, `F-CC-B09-051`).
5. **Curriculum teaches non-conformant patterns.** bcrypt vs Argon2id (`F-CC-B06-001`), AI SDK v4 vs shipped v5 (`F-CC-B06-002`), unverified session-trust + wildcard CORS (`F-CC-B05-002/008`), dropped `schoolId` in tenant writes (`F-CC-B06-007`). Interns are told they will contribute to the real app.
6. **Test-pyramid inversion / false-green.** Prod-smoke suites hit live production by default (`F-CC-B03-001`); phase-4 mutation probes send no body (`F-CC-B03-041`); phase-7 launch gate has a dead 404 check (`F-CC-B03-053`); phase-13 gate passes while the documented decision is `no-go` (`F-CC-B03-030`).

## What is solid (positives)

- AI access flows through `@reading-advantage/ai` at the server seam; GitHub via the integrations adapter — adapter discipline respected and tested (`F-CC-B07-017`, `F-CC-B09-027`, `F-CC-B08-028`).
- Webhook HMAC signature verification and `parsePrUrl` SSRF guard are sound, with strong boundary tests (`F-CC-B10-011`, `F-CC-B09-060`).
- `next.config.ts` security headers are a strong baseline (HSTS preload, XFO DENY, frame-ancestors none, no-store /api) (`F-CC-B06-022`).
- Curriculum-integrity invariants (18 modules / 85 lessons / unique slugs / answer-in-options / public schema strips answer key) are well pinned (`F-CC-B07-045`, `F-CC-B08-044`, `F-CC-B09-053`).
- Monotonic progress upsert; tenant+user-keyed dashboard cache; safe seed defaults; i18n key parity 188/188.

## Documented launch posture (from artifacts)

`report-summary.json` records `overall: "no-go"` with two open P0 blockers: `B-AI-001` (live AI tutor unverified) and `B-GH-001` (PR-review E2E unverified). The production runbook has never been executed ("Last verified: pending first run").

## Recommended next steps

Open the P0 remediation tracks in `migration-tracks.md` (MT-1..MT-4), starting with `codecamp_tenantdb_unscoped` and `codecamp_tenant_scope_tests`, after confirming the tenant-scoping throw against the deployed artifact. Resolve webhook async/idempotency and the streaming path before any acceptance. Curriculum and test-harness tracks (MT-C*, MT-10, MT-X1) can proceed in parallel.

## Artifact set

`line-review-synthesis.md` · `00-inventory.md` · `workflow-map.md` · `integration-map.md` · `checklist.md` · `findings.md` · `migration-tracks.md` · `test-gaps.md` · this `executive-summary.md`.

## Status statement

All required artifacts exist. Findings point to source batch IDs. **No remediation was performed or claimed. Phase acceptance and closeout remain PENDING.**
