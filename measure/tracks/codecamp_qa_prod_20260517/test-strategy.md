# Test Strategy: CodeCamp Advantage — Production QA/QC

This track is a **production verification pass**, not a code-writing track. The "testing pyramid" here is inverted: the bulk of work is **manual + scripted black-box probes** against the live Cloud Run service. Existing unit/integration suites in `packages/*` already cover code-level behavior and must remain green as the baseline.

## 1. Testing Pyramid per Phase

| Layer | Where it lives | Used by phases |
|---|---|---|
| Unit (Vitest, mocked DB) | `packages/{domain,api,webhooks,db}/src/__tests__/` — already green | Phases 2, 3, 4, 5, 9 (baseline only — re-run, do not modify) |
| Integration (router + mock DB) | `packages/api/src/__tests__/codecamp-router.test.ts` | Phases 3, 4 (used as oracle for expected tRPC shapes) |
| Contract / smoke (HTTP) | `curl`, `httpie`, browser devtools against prod URL | Phases 1, 2, 3, 5, 7, 8, 9 |
| Manual E2E (browser) | Chrome/Firefox/Safari/mobile against prod | Phases 4, 6, 10, 11 |
| External-integration probe | Real OpenRouter / real GitHub PR | Phase 5, 9 |
| Observability probe | Cloud Logging / Cloud Run metrics consoles | Phase 8 |

**Rule:** No new unit tests are required for this track. If a production failure exposes a code-level gap, file a new track — do not inline-fix here.

## 2. Shared Fixtures & Mocks

- **Prod test accounts:** one ADMIN + one INTERN sourced from prereqs in `spec.md`. Store creds in `1Password`/`.env.qa.local` (never commit). Reuse across all phases.
- **Curriculum oracle:** local seed in `packages/db/src/seed/codecamp-curriculum-data.ts` (18 modules / 85 lessons) is the source of truth for Phase 2 data-integrity checks. Diff prod against `getPhaseACurriculumData / B / C / D` outputs.
- **Webhook fixture:** reuse signed payloads from `packages/webhooks/src/__tests__/github-webhook.test.ts` for Phase 9 signature-rejection checks (send via `curl` to prod webhook URL with bad sig → expect 401).
- **PR-review fixture repo:** designate one disposable GitHub repo from `MODULE_REPO_MAP` (see `codecamp-curriculum-data.ts`) for Phase 5 end-to-end PR test. Document repo + branch in the readiness report.
- **Curl header probe script:** keep ad-hoc one-liners in the daily report, not in repo source.

## 3. Cross-Phase Edge Cases & Dependencies

- **Phase 1 gates everything.** If DNS/SSL/health fail, halt — every later phase is meaningless.
- **Phase 2 (Secret Manager) gates Phase 5.** Missing `OPENROUTER_API_KEY` or `GITHUB_WEBHOOK_SECRET` masquerades as integration bugs.
- **Phase 3 (auth) gates Phases 4, 6, 10.** All UI/perf paths assume a working session cookie.
- **Cold-start interaction:** Phase 1 cold-start latency, Phase 6 page load, Phase 9 webhook-during-cold-start, and Phase 10 deployment-during-use all touch the same Cloud Run scale-to-zero behavior — capture cold-start timestamp once and reference across phases.
- **Rate limiting (Phase 5 chat 30/min):** can poison Phase 10 concurrent-user tests if same account is reused; rotate accounts.
- **Webhook idempotency:** Phase 5 (PR opened) and Phase 9 (replay) share `logWebhookEvent` — duplicate deliveryId must not double-write.
- **i18n (Phase 4):** TH locale affects font-loading in Phase 6 asset checks and CSP in Phase 1.
- **Phase 12 regression depends on `codecamp_qa_local_20260517` results** being captured first — block sign-off if local QA not complete.

## 4. Architecture Guardrails

- **Black-box only.** Do not modify `apps/codecamp-advantage`, `packages/domain`, `packages/api`, `packages/webhooks`, or any source file as part of executing this track. Findings → new tracks.
- **No prod data mutation beyond test accounts.** Quiz submissions, chat messages, PR webhooks are acceptable from designated test users only. Do not delete or modify real intern progress.
- **Respect AGENTS.md provider neutrality.** When probing OpenRouter or GitHub directly, do so as an external client — do not bypass the app's adapters to "fix" anything.
- **Secrets stay in Secret Manager.** Never echo `DATABASE_URL`, `AUTH_SECRET`, etc., into logs, daily reports, or commit messages. Phase 2 verification confirms presence, not value.
- **Read-only on Cloud SQL.** No direct psql writes; all DB verification goes through the app or `gcloud sql` describe commands.
- **Logs are evidence, not deliverables.** Cite log queries (timestamp + trace ID) in the readiness report; don't dump raw log contents.

## 5. Per-Phase Test Approach Notes

- **P1 Infra:** `curl -I`, `openssl s_client`, `nslookup`, securityheaders.com scan. Capture full header set once and re-reference.
- **P2 DB/Config:** `gcloud run services describe` for env+secret refs; app-side validation via dashboard load (read) + login (write to `lastActiveAt`).
- **P3 Auth:** session-cookie inspection in devtools; tRPC 401/403 via direct `fetch` from console with/without cookie.
- **P4 Features:** scripted manual walkthrough mirroring `codecamp_qa_local_20260517` checklist 1:1 — same accounts, same lessons.
- **P5 Integrations:** one end-to-end PR (real repo, real webhook, real LLM review) is the keystone test. Document deliveryId, PR URL, review comment URL.
- **P6 Perf:** Chrome DevTools Lighthouse + Network throttling (Slow 3G, Fast 4G); record numbers, don't tune.
- **P7 Cache:** `curl -I` for `Cache-Control`; deploy-and-reload to verify invalidation.
- **P8 Observability:** Cloud Logging queries by `resource.labels.service_name="codecamp-advantage"`; verify structured fields per AGENTS.md observability section.
- **P9 Webhook:** GitHub App "Recent Deliveries" UI + replay button; bad-sig curl test.
- **P10 Edge cases:** two-browser concurrent test; trigger redeploy mid-session.
- **P11 Cross-browser:** BrowserStack or local devices; checklist only, no automation.
- **P12 Regression:** side-by-side spreadsheet comparing local vs prod result per checklist item.
- **P13 Report:** structured markdown in `measure/tracks/codecamp_qa_prod_20260517/report.md` with P0/P1/P2 counts, blocker list, go/no-go.

## 6. Build-Graph Findings That Shaped This Strategy

`build-graph stats` shows 1835 nodes / 230 files across `api, db, domain, webhooks, auth, types, ui`. Key probes:

- `webhook` search → critical path is `route → verifyWebhookSignature` (`packages/webhooks/src/github-client.ts:102`) → `logWebhookEvent` (both `webhooks/src/github.ts` and `domain/src/codecamp/index.ts`). **Two `logWebhookEvent` symbols** in different packages — Phase 9 must confirm the route uses the domain-layer one (per AGENTS.md "business logic in `/packages/backend`"). If prod logs only the webhooks-layer one, that's a finding.
- `inspect verifyWebhookSignature` → 0 outgoing edges, 3 incoming (contains + 2 param flows). No callers recorded in graph — the webhook **route handler** in `apps/codecamp-advantage/app/webhooks/...` is a Next.js route not yet indexed as a callsite. Phase 9 must therefore verify the wiring **at the HTTP boundary** (replay invalid-sig payload → expect 401), since static analysis can't.
- `inspect submitQuizAnswers` (`packages/domain/src/codecamp/index.ts:373`) → scoring threshold ≥70 lives in domain layer; Phase 4 quiz tests must verify exactly the 70% boundary, not just "passes".
- `getUserDashboard`, `getModuleBySlug`, `getModulesWithProgress` are the three domain functions Phase 4 (dashboard, module page) and Phase 6 (tRPC perf SLA) hit directly — these are the right SLA targets, not arbitrary endpoints.
- `dashboardResponseSchema` (with `phases`, `overallProgress`, `recentConversations`) is the **contract** Phase 4 dashboard checks must validate; deviations are schema drift, not UI bugs.
- No `route` nodes exist under `apps/codecamp-advantage/` in the graph (only `science-advantage` shows up). This confirms the codecamp app's API surface is **tRPC-first**, so Phase 4/6 instrumentation should target `/api/trpc/codecamp.*` rather than REST routes.
- Existing test files (`codecamp-router.test.ts`, `github-webhook.test.ts`, `github-client.test.ts`, `codecamp-quiz-progression.test.ts`) are the regression baseline — run `pnpm turbo run test --filter=@reading-advantage/{api,webhooks,domain,db}` before Phase 12 and treat any failure as a P0 blocker.

---

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: codecamp_qa_prod_20260517
phase: track setup
commits: none
tests_run: none (strategy-only; no implementation)
files_changed: measure/tracks/codecamp_qa_prod_20260517/test-strategy.md (new)
plan_updates: none — plan.md left intact; strategy is supplementary guidance
known_failures: none
handoff: QA executor should (1) run `pnpm turbo run test --filter=@reading-advantage/{api,webhooks,domain,db}` as Phase-0 baseline before touching prod, (2) start at Phase 1 (gates everything), (3) reuse fixtures listed in §2 — esp. `MODULE_REPO_MAP` test repo for Phase 5 PR E2E, (4) treat any modification to source files as out-of-scope (file a new track instead), (5) target the three domain functions called out in §6 (`getUserDashboard`, `getModuleBySlug`, `submitQuizAnswers`) for tRPC SLA measurements in Phase 6, (6) verify the dual `logWebhookEvent` symbols flagged in §6 — confirm webhook route uses the domain-layer one. graph.db is fresh as of today (2026-06-07) — no scan needed.
END_MEASURE_AGENT_RESULT
