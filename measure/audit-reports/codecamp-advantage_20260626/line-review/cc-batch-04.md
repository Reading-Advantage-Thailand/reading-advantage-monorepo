# Line-by-line Review — cc-batch-04

- **Track:** `codecamp_advantage_review_20260626`
- **Batch:** `cc-batch-04`
- **File list source:** `/tmp/opencode/cc-batch-04` (20 entries)
- **Reviewer model:** ark-code-latest (Doubao-Seed-Code)
- **Scope:** curriculum/progression correctness, GitHub/webhook/AI integration risks, auth/role boundaries, production readiness, AGENTS compliance, test quality.
- **Constraint honored:** no source code was edited. Read-only review.
- **Finding ID scheme:** `F-CC-B04-###`. Severity = {Critical, High, Medium, Low, Info}.

> NOTE: This is a line-review report only. It makes **no acceptance or closeout claim** for the track or any phase. Findings are observations for the track owner to triage.

---

## Files reviewed (20/20)

| # | File | LOC | Type |
|---|------|-----|------|
| 1 | `lib/__tests__/prod-smoke/phase-8-5-deployment-gate.test.ts` | 949 | test |
| 2 | `lib/__tests__/prod-smoke/phase-8-logging-monitoring-and-error-reporting.test.ts` | 871 | test |
| 3 | `lib/__tests__/prod-smoke/phase-9-github-webhook-specifics.test.ts` | 1027 | test |
| 4 | `lib/__tests__/prod-smoke/report-summary.json` | 195 | data/artifact |
| 5 | `lib/__tests__/proxy-role.test.ts` | 132 | test |
| 6 | `lib/__tests__/proxy.test.ts` | 181 | test |
| 7 | `lib/__tests__/rate-limit.test.ts` | 63 | test |
| 8 | `lib/__tests__/setup.ts` | 23 | test infra |
| 9 | `lib/__tests__/smoke-local-image-script.test.ts` | 38 | test |
| 10 | `lib/__tests__/strip-nomodule-polyfill.test.ts` | 76 | test |
| 11 | `lib/__tests__/thai-text-width.test.ts` | 60 | test |
| 12 | `lib/__tests__/use-chat-stream-locale.test.ts` | 89 | test |
| 13 | `lib/i18n-font.ts` | 19 | source |
| 14 | `lib/i18n-format.ts` | 40 | source |
| 15 | `lib/i18n-messages.ts` | 57 | source |
| 16 | `lib/module-utils.ts` | 61 | source |
| 17 | `lib/pr-url.ts` | 16 | source |
| 18 | `lib/rate-limit.ts` | 48 | source |
| 19 | `lib/trpc.ts` | 4 | source |
| 20 | `lib/use-chat-stream.ts` | 153 | source |

Cross-referenced (not in batch, read for verification only): `proxy.ts`, `packages/api/src/trpc.ts`, `packages/webhooks/src/github-client.ts`, `packages/webhooks/src/github.ts`, `i18n/routing.ts`, `measure/tech-debt.md`, `measure/tracks/`, `measure/archive/`.

---

## Findings

### Severity summary
- Critical: 0
- High: 3
- Medium: 7
- Low: 7
- Info: 4

---

### Production-readiness / artifact consistency

**F-CC-B04-001 — High — `report-summary.json` integration status contradicts code reality and the Phase 9 test's own narrative.**
`report-summary.json:185-188` reports `github-webhook` integration `status: "pass"` and cites "replay-attack prevention (MAX_TIMESTAMP_SKEW_SECONDS=300)". The replay protection is in fact implemented in source (`packages/webhooks/src/github-client.ts:101,108-112,146`; `packages/webhooks/src/github.ts:87-109`). However, `phase-9-github-webhook-specifics.test.ts` is still authored as if replay prevention is **absent** at HEAD: the header docblock (lines 37-43, 56-59), the describe title `Replay-attack prevention (timestamp check) — RED on HEAD` (line 564), and comments at lines 568-586, 894-898 all assert "RED on HEAD" / "no timestamp check at all." These are mutually inconsistent: the summary says it's done, the test prose says it's not. At least one is stale. This is a correctness/trust hazard for anyone reading the QA evidence. Track owner must reconcile (the source-contract detector tests at lines 899-951 will actually PASS now, contradicting the prose).

**F-CC-B04-002 — High — Phase 8.5 follow-up-track gate (`phase-8-5...test.ts:572-581`) will FAIL because one of the three required tracks is archived, not under `measure/tracks/`.**
`listTrackDirs()` (lines 213-223) reads only `measure/tracks/`. The required prefix `codecamp_asset_render_blocking` (line 84) no longer resolves there — the directory was moved to `measure/archive/codecamp_asset_render_blocking_20260608` (verified). The other two (`codecamp_perf_warm_dashboard_20260608`, `codecamp_infra_cold_start_20260608`) remain under `measure/tracks/`. The unconditional Suite 2 assertion therefore fails for the archived track even though the work was filed and completed. Either the test must also scan `measure/archive/`, or the gate is now a false-negative. Production-readiness gate fragility.

**F-CC-B04-003 — Medium — Phase 8 alerts probe and Phase 8.5 alert-policy probe disagree on the committed artifact, and an artifact now exists.**
`phase-8...test.ts:554-596` checks `infra/alerts`, `terraform/alerts`, `infra/monitoring`, `measure/alerts.md` as a soft/informational probe. `phase-8-5...test.ts:158-163,906-926` checks the same four paths as a hard `it()` that "fails at HEAD on purpose." But `measure/alerts.md` now exists (verified), so Suite 6's hard assertion will PASS, while the docblock (lines 891-905) still describes it as intentionally-red. Stale prose vs. reality. Also `tech-debt.md:39` already records `measure/alerts.md` as the committed informational artifact. Reconcile the test narrative.

**F-CC-B04-004 — Medium — Phase 8/8.5 "deploy not yet landed" framing is baked into the test prose and may be stale.**
Both `phase-8-5...test.ts` (lines 13-17, 396-399, 718-727) and `report-summary.json:6` (`overall: "no-go"`) encode a specific point-in-time deployment state ("the accumulated fixes have NOT been deployed"). `tech-debt.md:39` separately states "All P0/P1 launch gates green on deployed revision (commit `e3ed0c01`)." These three artifacts describe different deployment realities. A reader cannot tell the current live state from the batch alone. Track owner should timestamp/version the source-of-truth for prod gate status.

**F-CC-B04-005 — Low — `report-summary.json` is a hand-authored static snapshot with hard-coded counts (`counts.p0/p1/p2`, lines 8-28) and signoffs (lines 97-110).**
There is no generator wired to these numbers (the consuming test `phase-13-production-readiness-report.test.ts` validates shape, not freshness). The `generatedAt: "2026-06-11T18:00:00Z"` and signoff timestamps are identical placeholders, so the document cannot be trusted as a live gate — it is documentation. Acceptable as an artifact, but should be labeled as manually maintained to avoid being mistaken for machine-generated evidence.

---

### GitHub / webhook integration risk

**F-CC-B04-006 — High — Synchronous LLM review inside the webhook request path is a real GitHub-timeout risk that the test acknowledges but cannot fix.**
`packages/webhooks/src/github.ts:341` (`await runReview();`) blocks the 200 response on the full LLM pipeline (`fetchPrDiff` → `reviewExercise` → `updatePrReview` → `postPrComment`, lines 273-339). GitHub's webhook timeout is 10s (`phase-9...test.ts:121`). The keystone probe at lines 418-460 correctly encodes this as a budget assertion, but it is keystone-gated (skips without `PHASE9_TEST_*` creds), so the risk is unmonitored in normal CI. This is the genuine production hazard the suite flags (lines 53-59, 421-428): under a slow model call, GitHub times out and re-delivers, producing duplicate audit rows. Recommend an "ack-early, review-async" restructure tracked as a follow-up. (Source-layer issue, surfaced via the test under review.)

**F-CC-B04-007 — Medium — Replay probe (`phase-9...test.ts:564-646`) is a soft, network-gated, behavior probe that cannot fail CI.**
All assertions use `expect.soft` and the whole block is `skipIf(SKIP)` network-gated; the body uses a synthesized `timestamp` field that the route only honors if no header is present and the JSON parses (`github.ts:93-99`). The actual guarantee is carried by the unconditional source-contract detectors (lines 899-951), which is good. But the prose at lines 626-642 still expects a 200 (RED), so a passing prod (now 401) would be reported as a soft failure with a misleading message. Update expected outcome.

**F-CC-B04-008 — Medium — `loginAndGetCookie` (`phase-9...test.ts:192-210`) parses `set-cookie` with a brittle regex and assumes single-cookie semantics.**
`response.headers.get("set-cookie")` returns a comma-joined string when multiple cookies are set; `match(/session_token=([^;]+)/)` will capture across cookie boundaries if `session_token` is not the value being matched cleanly. Low likelihood given current server behavior, but fragile for an auth-bearing helper used by admin-gated probes (lines 467, 758). Prefer a cookie parser or `getSetCookie()`.

**F-CC-B04-009 — Low — Concurrency probe (`phase-9...test.ts:691-744`) computes `Date.now()` once per array build but per-request inside the map (line 716), so deliveryIds are unique; however the payload `timestamp` (line 702) is shared across all 5 and pinned to "now".**
Fine for the ping path, but if these payloads ever route through the replay window check with clock skew on the runner, all 5 share fate. Minor; document the assumption.

**F-CC-B04-010 — Low — Phase 9 P1 launch gate (`phase-9...test.ts:815-889`) only asserts unauth/health behavior; it explicitly excludes delivery-time, replay, and audit-trail correctness from the hard gate.**
That is a reasonable scoping decision (those require fixtures), but the "P1 launch gate" name overstates coverage — the keystone risk in F-CC-B04-006 is not gated. Recommend renaming or documenting the residual ungated risk in the gate's failure message.

**F-CC-B04-011 — Info — `parseTrpcErrorEnvelope` leak-signature list (`phase-8...test.ts:497-503`) is a good defense-in-depth check** for DB/stack/credential leakage in tRPC error bodies. No issue; called out as positive coverage.

---

### Auth / role boundaries (proxy)

**F-CC-B04-012 — Medium — Proxy admin-path detection (`proxy.ts:26-32`) only recognizes locale prefixes `th` and `en`, hard-coded in the regex `^\/(th|en)\/admin(\/|$)`.**
`routing.locales` is `["th","en"]` today, so it matches. But the locale list lives in `i18n/routing.ts` and the admin regex duplicates it literally. If a third locale is ever added to routing, `/<newlocale>/admin` would bypass the auth guard silently (the generic `intlMiddleware` would serve it without `requireRole`). The proxy tests (`proxy.test.ts:64-78,144-150`) only exercise th/en, so this drift would not be caught. High-impact security coupling; should derive the admin matcher from `routing.locales`. (Source file `proxy.ts` is cross-referenced; the in-batch artifact is the test that under-covers it.)

**F-CC-B04-013 — Low — `proxy.test.ts` mocks `next-intl/middleware` (lines 19-32) to a hand-rolled redirect, so the assertions at lines 96-113 test the mock's behavior, not the real `next-intl` middleware.**
This is conventional for proxy unit tests, but the root-locale redirect path (`proxy.ts:91-98`) — which is the *app's own* code, not next-intl — is what the `x-forwarded-host` test (lines 104-113) actually exercises; the `/` → `/th` case (lines 96-102) is asserting the mock. Worth a comment clarifying which boundary each test covers.

**F-CC-B04-014 — Low — `proxy-role.test.ts:107-115` ("fails closed on DB unreachable") is good fail-closed coverage**, but the generic `Error("Connection refused")` path in `proxy.ts:77-88` logs the full `err.stack` via `console.error(JSON.stringify(...))`. Stack in server logs is intended (observability), but confirm Cloud Logging ingestion does not echo it to any client surface. No client leak observed. Positive: fail-closed is correctly tested.

**F-CC-B04-015 — Info — Case-insensitivity guard (`proxy.test.ts:152-166`) for `/Admin` and `/EN/Admin` is solid coverage** of a real bypass class. The proxy uses `lowerPath` (`proxy.ts:36`) consistently. No issue.

---

### Curriculum / progression correctness

**F-CC-B04-016 — Medium — `module-utils.ts:isModuleLocked` (lines 6-20) gates unlock on only the single highest-order prior module, not all priors.**
The JSDoc (lines 1-5) explicitly intends this ("highest-order published module before it"), and it "handles gaps in module ordering." But the consequence is: if module order 3 is incomplete while order 4 is somehow 100% (e.g., data anomaly, manual completion, or reordering), order 5 unlocks based on order 4 alone, skipping the incomplete order 3. Whether this is desired depends on the curriculum model (strictly linear vs. furthest-progress). No test for this file is present in the batch (see F-CC-B04-021). Confirm the progression policy and add tests.

**F-CC-B04-017 — Low — `getModulePrStatus` priority ordering (`module-utils.ts:48-60`) returns `pending` before `needs_changes`.**
Priority is `pending > needs_changes > reviewed > approved`. This means a module with one PR pending and another needing changes reports `pending`, potentially masking a `needs_changes` that requires student action. Verify this matches the intended UX signal; document the rationale.

**F-CC-B04-018 — Info — `module-utils.ts` functions are pure and type-narrow (good for testability), but have no co-located tests in this batch.** See F-CC-B04-021.

---

### AI integration (chat stream)

**F-CC-B04-019 — Medium — `use-chat-stream.ts` SSE parser (lines 90-107) splits on `\n` per network chunk with no buffering across chunk boundaries.**
A streamed `0:"..."` line that is split across two `reader.read()` chunks will produce two partial lines, neither starting with `0:` cleanly (the tail) or with a truncated JSON payload (the head), and `JSON.parse(line.slice(2))` will silently drop it via the `catch {}` at lines 104-106. Under real network fragmentation this drops tokens from the assistant message. Should accumulate a buffer and only process complete lines (split on `\n`, retain the trailing partial). The locale test (`use-chat-stream-locale.test.ts`) only mocks a JSON response, never the `text/event-stream` branch, so this defect is untested.

**F-CC-B04-020 — Low — Silent `catch {}` blocks throughout `use-chat-stream.ts` (lines 58-60, 104-106, 117-119, 132-134) swallow errors with no logging.**
Persistence failures (`onSend`/`onComplete`) and parse errors vanish. For an AI tutor feature, losing the assistant transcript persistence silently undermines progress tracking. At minimum emit a structured log/telemetry (AGENTS.md "Observability"). The top-level network catch (lines 137-144) does surface a localized user message — good — but also logs nothing.

---

### Test quality

**F-CC-B04-021 — Medium — Coverage gaps for in-batch source files.**
- `module-utils.ts` (curriculum progression logic) — **no unit test in the batch**; only `thai-text-width.test.ts` touches dashboard rendering classes, not the lock/PR-status logic. AGENTS.md ("Write tests for all new backend/domain code") expectation unmet for the locking/aggregation rules (F-CC-B04-016/017).
- `pr-url.ts` `getPrDisplayName` — no test; the `parts[2] === "pull"` guard (line 9) and the catch fallback (lines 12-14) are untested.
- `i18n-format.ts` (`formatRelativeTime`/`formatNumber`/`formatDate`) — no test; locale branching and `isNaN`/null guards untested.
- `i18n-messages.ts` (`deepMerge`, `loadMessages`, `resolveLocale`) — no test; `deepMerge` recursion and array-handling (lines 19-39) untested.
- `i18n-font.ts` — trivial, low priority.

**F-CC-B04-022 — Low — `rate-limit.test.ts:54-62` ("evicts oldest entries") asserts only that a new user is still allowed after flooding 10002 entries; it does not assert that the map size was actually bounded or that the *correct* (oldest) entries were evicted.**
The eviction sort by `windowStart` (`rate-limit.ts:24-31`) and the stale-cleanup branch (lines 16-21) are not directly observed. A regression that evicts newest instead of oldest, or that fails to bound size, could still pass. Consider exposing size for assertion or testing eviction ordering.

**F-CC-B04-023 — Low — `rate-limit.ts` is process-local in-memory (`Map`, line 10).**
On Cloud Run with multiple instances / scale-out, the 30/min chat limit is per-instance, so effective limit is `30 × instanceCount`. The test cannot catch this (single process). For an AI cost-control limiter this is a real production gap — note as a known limitation; a shared store (or sticky routing) is needed for a true global limit. AGENTS.md adapter/portability spirit favors a replaceable limiter backend.

**F-CC-B04-024 — Low — `setup.ts` `useTranslations` mock (lines 7-14) returns the key for both the `params` and no-`params` branches identically (lines 9-12 are a no-op conditional).**
The `if (params) return key; return key;` is dead-branch code — both paths return `key`. Harmless but misleading; either interpolate params or drop the conditional. Components that rely on parameterized translations are not meaningfully exercised.

**F-CC-B04-025 — Info — `strip-nomodule-polyfill.test.ts` and `smoke-local-image-script.test.ts` are well-scoped contract tests** (idempotency, absolute/relative path handling, gating env var, timeout bound). Good production-readiness hygiene. No issues.

**F-CC-B04-026 — Info — `thai-text-width.test.ts` asserts presence of Tailwind class substrings in `page.tsx`/`admin/page.tsx`/`header.tsx`.**
These are brittle by nature (a className refactor or a coincidental substring elsewhere passes/fails them), and `admin/page.tsx`'s `<th` vs `whitespace-nowrap` count equality (lines 39-43) assumes 1:1 mapping with no `whitespace-nowrap` used elsewhere in the file. Acceptable as regression pins for a known i18n layout bug, but flag as fragile. Low value beyond the original regression.

**F-CC-B04-027 — Low — Network-dependent prod-smoke suites (phase-8, 8.5, 9) default to live `https://codecamp.reading-advantage.com` and only skip via `PHASE*_SKIP=1`.**
If these run in CI without the skip env set and without network reach, they fail on connectivity (the docblocks acknowledge this as a "valid Red-phase mode"). Mixing live black-box probes with unconditional static checks in one file means a connectivity failure looks like a gate failure. The design intent is documented, but it makes pass/fail noisy. Confirm CI sets the skip flags appropriately so the unconditional static/unit assertions remain the signal.

---

### AGENTS.md compliance notes

**F-CC-B04-028 — Info — Positive: `proxy.ts` error path emits structured JSON logs with `level/event/message/stack` (lines 77-83)**, aligning with AGENTS.md "Observability / structured logging." The phase-8 test's structured-logger detector (lines 144-151) rewards exactly this pattern.

**F-CC-B04-029 — Low — `lib/use-chat-stream.ts` calls `fetch("/api/chat")` directly (lines 64-74) rather than through an AI adapter.**
This is a client-side React hook calling the app's own route handler (not a provider SDK), so it does not violate the "no direct provider SDK" rule — the adapter boundary is server-side behind `/api/chat`. Noted for completeness; no action required, but confirm `/api/chat` itself routes through the internal `ai.*` adapter.

**F-CC-B04-030 — Info — `lib/trpc.ts` (4 lines) is a thin, correct tRPC React client export.** No business logic, consistent with "tRPC is transport, not domain." No issue.

---

## Limitations of this review

1. **No execution.** Tests were not run. Pass/fail predictions (e.g., F-CC-B04-002, F-CC-B04-003) are inferred from reading the assertions against the current filesystem state (`measure/tracks/`, `measure/archive/`, `measure/alerts.md` were `ls`-verified), not from a test run.
2. **Live-prod probes unverified.** The phase-8/8.5/9 network probes target a live URL; the actual production response behavior (headers, status, timing) was not observed. Findings about those probes concern test *design/prose*, not live prod state.
3. **Cross-package source read-only.** `packages/webhooks/src/github*.ts`, `packages/api/src/trpc.ts`, and `proxy.ts` were read for cross-reference but are outside this batch; findings F-CC-B04-006 and F-CC-B04-012 point at source-layer risk surfaced through in-batch tests and should be re-confirmed by the owners of those packages.
4. **Curriculum policy intent unknown.** F-CC-B04-016/017 flag behavior whose correctness depends on the intended progression model, which is not documented in the batch files. These are "confirm intent," not confirmed defects.
5. **No coverage tooling.** F-CC-B04-021 gaps are derived by inspection (no co-located test files in the batch), not from a coverage report; tests for these may exist elsewhere in the repo outside this batch's file list.
6. **report-summary.json provenance.** Could not determine whether the JSON is generated or hand-authored; treated as hand-authored based on placeholder timestamps. If a generator exists, F-CC-B04-005 may be moot.

---

## Disposition

This report is informational input to `codecamp_advantage_review_20260626`. It asserts **no** acceptance, sign-off, phase completion, or closeout for any track. Highest-priority items for owner triage: F-CC-B04-001, F-CC-B04-002, F-CC-B04-006, F-CC-B04-012.
