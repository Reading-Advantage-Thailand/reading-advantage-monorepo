# CodeCamp Advantage — Integration & Security Map

- Track: `codecamp_advantage_review_20260626`
- Focus: webhook security/idempotency, AI adapter integration, GitHub App client, tenant scoping, production readiness.
- Read-only synthesis. No remediation performed or claimed. Acceptance/closeout **PENDING**.
- Finding IDs map to `line-review/cc-batch-NN.md`.

---

## A. GitHub Webhook — Security & Idempotency Assessment

### Signature verification — ADEQUATE
- HMAC-SHA256 over the raw text body using `timingSafeEqual`, wrapped in try/catch for length mismatch, fail-closed on empty secret (`github-client.ts:128-153`). **F-CC-B10-011 (Info, positive).**
- Strong boundary test coverage: valid/invalid sig, missing secret, length mismatch, NaN/Infinity rejection. **F-CC-B09-060 (positive).**
- App route re-buffers body via `arrayBuffer()` before forwarding to Hono; bytes preserved, HMAC still validates, but flagged for explicit verification as a high-cost failure mode. **F-CC-B01-013 (Medium).**

### Replay / timestamp protection — INERT FOR REAL DELIVERIES
- Freshness check reads `x-github-delivery-timestamp` / `x-hub-timestamp` headers or a body `timestamp` field. **GitHub sends none of these**, so `timestampClaim` is `undefined` and the freshness window never runs for genuine deliveries. **F-CC-B10-003 (Medium).**
- Tests pin the synthetic-header behavior as if it were active protection → false confidence. **F-CC-B10-016, F-CC-B03 webhook rows.**
- Replay-prevention status is also **internally contradictory across artifacts**: `report-summary.json` says implemented (`MAX_TIMESTAMP_SKEW_SECONDS=300`); `phase-9` test prose says "RED on HEAD / no timestamp check." **F-CC-B04-001 (High).**

### Idempotency / deduplication — GAP
- `codecamp_webhook_events.delivery_id` is nullable `text` with **no UNIQUE constraint**; `recordWebhookEvent`/`logWebhookEvent` write `deliveryId ?? null` with no `ON CONFLICT`. GitHub retries on non-2xx → duplicate processing/rows. **F-CC-B07-039 (High).** AGENTS.md explicitly calls out idempotency for webhook processing.
- `pr_url` / `repo_url` UNIQUE constraints were omitted from table-creation (0007) and backfilled in 0010; `CREATE UNIQUE INDEX IF NOT EXISTS` **errors on pre-existing duplicates**, so a deploy can halt mid-migration. **F-CC-B07-034, F-CC-B07-038 (High).**
- App-level "already exists" checks are select-then-insert without a transaction → race-prone. **F-CC-B08-025, F-CC-B08-029, F-CC-B09-015.**

### Synchronous processing vs GitHub timeout — HIGH RISK
- `await runReview()` blocks the 200 ACK on token fetch + diff fetch + full LLM round-trip + DB writes + comment POST. GitHub's ~10s timeout → marks delivery failed → **redelivers** → duplicate reviews/comments and (combined with the dedup gap) duplicate completions. **F-CC-B10-002 (High), F-CC-B04-006 (High).** AGENTS.md "Jobs and Workers": long-running work must not run in the request path.

### Credential-missing failure mode — FAILS OPEN
- `fetchPrDiff` returns a fabricated `"Mock diff"` when no installation token is present. The fake diff flows to the LLM and, if `passed:true`, to `completeApprovedPrReviewLesson` → intern lesson marked **completed @ score 100** on a fake diff. **F-CC-B10-007 (High), F-CC-B09-058 (Low, test pins it).** Should fail closed behind an explicit dev flag.

### Auth on system-initiated completion — BYPASS
- `completeApprovedPrReviewLesson` synthesizes a `UserContext` for the PR author (`role:"INTERN", schoolId:null, username=userId`) and runs `assertCan` against the **fabricated** principal, not the real admin caller. Impersonation primitive embedded in domain code. **F-CC-B09-014 (High).**

### Webhook outcome model — LIMITED
- `webhookEventSchema.outcome` enum is `["ignored","failed"]` only — no `"processed"/"succeeded"`. Successful webhooks cannot be represented in the audit log. **F-CC-B09-054 (Low).** Admin UI styles only `failed` vs everything-else amber (F-CC-B00-015).
- `payload_json` stores raw GitHub payloads with no retention/PII policy. **F-CC-B07-040, F-CC-B08-005 (Low/Medium).**

---

## B. GitHub App Client — Duplication & Token Cache

### Two independent implementations — STRUCTURAL HAZARD
- `packages/integrations/github` (REST driver) and `packages/webhooks/src/github-client.ts` each independently implement JWT signing, installation-token exchange, and REST calls — with **different auth header schemes** (`token` vs `Bearer`), different JWT helpers, different caching. Security patches must be applied twice. **F-CC-B09-049 (Medium), F-CC-B09-042 (Low), F-CC-B09-043 (Low).** AGENTS provider-neutrality favors a single adapter.

### Per-installation token cache leak — HIGH (in integrations/github)
- `drivers/rest.ts` caches a **single** `cachedToken` field regardless of `installationId`. After caching installation A's token, a call for installation B within the validity window returns A's token (scoped to A's repos) → cross-installation authorization/data exposure in a multi-org install. **F-CC-B09-040 (High).** README claims correct keying — doc/code disagree (F-CC-B09-032).
- Empty-string installation ID produces a malformed request instead of a clear error. **F-CC-B09-041 (Medium).**
- The webhooks client mints a fresh App JWT + token per webhook with **no caching** (latency, compounds the synchronous-path risk). **F-CC-B10-010 (Low).**

### Driver test coverage — WEAK
- `integrations/github` client tests assert almost nothing about behavior (object-literal shape checks); the REST driver's parse/filter/error/token-cache logic is **untested**. **F-CC-B09-037 (Medium).**
- `webhooks` tests mock `crypto.sign` module-wide → JWT generation never exercised against real signing. **F-CC-B09-057 (Medium).**

### Positives
- PR-vs-issue filtering correct; `encodeURIComponent` on owner/repo; `parsePrUrl` validates owner/repo against a safe charset (SSRF guard). **F-CC-B09-045, F-CC-B10-011.**
- GitHub access correctly routed through the `@reading-advantage/integrations-github` adapter from the domain layer (no direct fetch/Octokit). **F-CC-B08-028.**

---

## C. AI Adapter Integration

### Server seam — COMPLIANT & TESTED
- `reviewExercise` and the chat route flow through `@reading-advantage/ai` (`getAIClient()` + `aiClientToGenerateReview(client, reviewResultSchema)`); domain package carries no provider SDK imports. **F-CC-B07-017, F-CC-B09-027, F-CC-B10 cross-cutting (positive).**
- `prDiff` bounded to 50000 chars at the router. **F-CC-B07-025.**

### App-layer gaps
- Chat route imports `streamText`/`createOpenAI` from the adapter package but configures the OpenRouter baseURL/model **in the app layer**, and constructs the client at module load with a possibly-undefined key. **F-CC-B00-003/004 (Medium).**
- Dual provider SDKs (`@ai-sdk/openai`, `@ai-sdk/google`) are direct app deps — standing temptation; confirm no direct import outside the adapter. **F-CC-B07-001 (Info).**

### Streaming protocol mismatch — HIGH
- `toDataStreamResponse()` is aliased to `toTextStreamResponse()` in the OpenRouter adapter → raw `text/plain`; the client hook expects `text/event-stream` with `0:`-prefixed lines. Streaming path appears non-functional end-to-end. **F-CC-B00-001 (High).** Plus no cross-chunk SSE buffering (F-CC-B04-019).

### Prompt-injection / cost
- Mitigation is prompt-only; `prDiff` interpolated raw; `reviewResult` length unbounded; a coerced `passed:true` has progression consequences (ties to auto-completion). **F-CC-B09-028 (Medium), F-CC-B10-005 (Low).**
- Result double-cast `as ReviewResult` without `schema.parse` re-validation at the seam. **F-CC-B09-031 (Low).**

---

## D. Tenant Scoping — Architectural Risk (Critical)

- All codecamp tables are `REFERENTIAL` (no `school_id`): `tenant-registry.ts:184-193`. Multi-tenant isolation depends on owner-FK joins in domain query code, not the DB layer. **F-CC-B07-030 (Medium, architectural).**
- **Multiple domain functions select/insert REFERENTIAL tables directly through `createTenantDB(...)` without `unscoped(...)`**, which throws `TenantScopeError`. Independently surfaced in three batches:
  - cc-batch-08: chat/exercises/intern-accounts reads + `createInternAccount` FLAT insert with `schoolId:null`. **F-CC-B08-001/003 (Critical/High).**
  - cc-batch-09: lessons/modules/pr-reviews/quizzes/progress reads + writes. **F-CC-B09-001/003/006/013/020/025 (Critical/High).**
  - cc-batch-10: every webhook domain call. **F-CC-B10-001 (Critical).**
- Correct usage exists in sibling functions (`review-exercise.ts`, `chat.ts:saveChatMessage`, `progress.ts:updateUserProgress`, `modules.ts:checkModulePrerequisite`), confirming the omissions are inconsistent, not intentional.
- **Test environment masks it**: codecamp tables resolve to `EXEMPT` under Vitest (registry mock / module-identity divergence) but `REFERENTIAL` in the compiled build, so the suites are false-green for tenant scoping. **F-CC-B08-002/033, F-CC-B09-002 (High).** Empirical reproduction in cc-batch-09 (`63 failed / 27 passed` with real registry) and cc-batch-10 (`63 of 90` fail).
- **Live-impact caveat (carried from batches):** confirmation was against the compiled `dist/` + domain unit suite, **not** a running app/Postgres. Whether this manifests as a live 500 depends on the exact runtime path that reaches the codecamp router. The owning track must confirm against the deployed artifact before treating as a release blocker. The finding is rated Critical because the code-as-written throws under the documented TenantDB contract and tests cannot catch it.

---

## E. Production-Readiness Posture (deploy artifacts)

- Public Cloud Run service (`--allow-unauthenticated` **plus** redundant `allUsers` IAM binding); confirm webhook/tRPC enforce auth at app layer. **F-CC-B01-017 (High).**
- `NEXT_PUBLIC_API_URL` set as a Cloud Run runtime env, but `NEXT_PUBLIC_*` is inlined at **build** time → may be wrong in client bundles. **F-CC-B01-021 (Low, potentially High).**
- Dockerfile copies full `apps/`+`packages/` before install → busts dependency-layer caching; confirm `.dockerignore`; pnpm pin (8.15.8) must match root `packageManager`. **F-CC-B00-044/045/046 (Medium/Low).**
- `next.config.ts` security posture strong (HSTS preload, XFO DENY, frame-ancestors none, nosniff, no-store on /api, scoped connect-src to openrouter.ai) but CSP allows `unsafe-inline`/`unsafe-eval`; single hard-coded CORS origin with no `Vary`. **F-CC-B06-019/020/022 (Low/Info).**
- `phase` column is free-text default `'A'`, not constrained to A–D enum the API validates. **F-CC-B07-036 (Medium).**
- `ALTER TYPE role ADD VALUE 'INTERN'` cannot run in a txn on older PG / same-txn use; non-reversible. **F-CC-B07-042 (Medium).**
- Production-readiness report records `overall: "no-go"` with 2 open P0 blockers (`B-AI-001` live AI tutor unverified, `B-GH-001` PR-review E2E unverified). **F-CC-B03-004/030, F-CC-B04-004.**
