# CodeCamp Advantage — Workflow Map

- Track: `codecamp_advantage_review_20260626`
- Synthesis of GitHub PR-review and AI tutor/chat workflows from the 11 line-review batches.
- Read-only. No remediation performed or claimed. Acceptance/closeout **PENDING**.

This map traces each workflow end-to-end and annotates the steps where line-review findings indicate a break or risk. Finding IDs map to `line-review/cc-batch-NN.md`.

---

## 1. GitHub PR-Review Workflow (intern PR → LLM review → lesson completion)

### End-to-end path

```
Intern forks exercise repo / opens PR
        │  (curriculum: "opens a PR for LLM review" — every unit, F-CC-B05-013)
        ▼
GitHub App "ra-codecamp-reviewer" (install per docs; setup F-CC-B02-001/003)
        │  webhook delivery: POST {app}/webhooks/github/pr
        ▼
apps/codecamp-advantage/app/webhooks/github/pr/route.ts   [cc-batch-01]
        │  - runtime=nodejs, force-dynamic (F-CC-B01-014, correct)
        │  - rewrites url.pathname="/pr" to Hono sub-app (F-CC-B01-012 brittle)
        │  - re-buffers body via arrayBuffer() for HMAC (F-CC-B01-013)
        ▼
packages/webhooks/src/github.ts  (Hono handler)           [cc-batch-10]
        │  1. verify HMAC-SHA256 signature (github-client.ts:128-153, sound — F-CC-B10-011)
        │  2. timestamp/replay check — INERT for real GitHub deliveries (F-CC-B10-003 / B09-060 tests)
        │  3. parse pull_request payload (githubWebhookPayloadSchema — F-CC-B09-055)
        │  4. tenantDb = createTenantDB(db, {schoolId:null})  → per-call console.warn (F-CC-B10-004)
        │  5. await runReview()  ← SYNCHRONOUS in request path (F-CC-B10-002 / B04-006)
        ▼
runReview():
        │  a. getInstallationTokenForRepo() → may be undefined if GITHUB_INSTALLATION_ID unset
        │  b. fetchPrDiff(prInfo, token)
        │       └─ NO TOKEN → fabricates "Mock diff" (F-CC-B10-007 / B09-058) ──┐
        │  c. reviewExercise(...) via @reading-advantage/ai adapter             │ fake diff
        │       └─ aiClientToGenerateReview(getAIClient(), reviewResultSchema)  │ → LLM
        │       └─ prompt-injection mitigation is prompt-only (F-CC-B09-028)    │
        │  d. updatePrReview(...)                                               │
        │  e. if approved → completeApprovedPrReviewLesson(...)  ◄──────────────┘ auto-pass!
        │       └─ fabricates synthetic UserContext, bypasses auth (F-CC-B09-014)
        │  f. postPrComment(...) — LLM output interpolated unescaped (F-CC-B10-005)
        ▼
DOMAIN LAYER: pr-reviews.ts / exercises.ts                [cc-batch-08/09]
        │  getPrReviewByPrUrl / getExerciseRepoByUrl / createPrReview /
        │  updatePrReview / completeApprovedPrReviewLesson / logWebhookEvent
        │  ── ALL select/insert REFERENTIAL codecamp tables directly on TenantDB ──
        │  ── → THROW TenantScopeError at runtime (F-CC-B10-001 / B09-001/013 / B08-001) ──
        ▼
DB: codecamp_pr_reviews / codecamp_webhook_events         [cc-batch-07]
        - pr_url UNIQUE added only in 0010 (F-CC-B07-034); dedup race (F-CC-B07-038)
        - delivery_id has NO UNIQUE constraint → no idempotency (F-CC-B07-039)
```

### Break/risk annotations (in delivery order)

| Step | Finding(s) | Severity | Effect |
|------|-----------|----------|--------|
| Signature verify | F-CC-B10-011, F-CC-B09-060 | Info (positive) | HMAC + timingSafeEqual sound; strong test coverage |
| Replay/timestamp | F-CC-B10-003, F-CC-B10-016 | Medium | GitHub sends no timestamp header/field → freshness check never runs; tests pin inert behavior |
| Tenant context | F-CC-B10-004 | Low | `console.warn` flood on every delivery; global-data model bolted onto tenant primitive |
| Synchronous review | F-CC-B10-002, F-CC-B04-006 | High | >10s LLM call → GitHub timeout → redelivery → duplicate reviews/comments/completions |
| Missing token diff | F-CC-B10-007, F-CC-B09-058 | High | Fabricated mock diff → LLM "review" → possible auto lesson completion @ score 100 |
| Auth bypass on complete | F-CC-B09-014 | High | `completeApprovedPrReviewLesson` forges a UserContext; impersonation primitive |
| Domain DB access | **F-CC-B10-001, F-CC-B09-001/013, F-CC-B08-001** | **Critical** | Every domain call throws `TenantScopeError`; pipeline non-functional vs real DB; handler returns HTTP 500 |
| Idempotency | F-CC-B07-039 | High | No UNIQUE(delivery_id) + no ON CONFLICT → duplicate processing on GitHub retry |
| Uniqueness drift | F-CC-B07-034, F-CC-B07-038 | High | pr_url/repo_url uniqueness backfilled in 0010; deploy can halt on duplicates |
| PR-URL global uniqueness | F-CC-B09-015 | Medium | One review row per PR URL across all users → enumeration / denial of another user's submit |
| Comment injection | F-CC-B10-005 | Low | Unescaped LLM Markdown/@mentions posted to PR |

### Test coverage of this workflow

- `packages/webhooks` suite is **green (78 tests)** but mocks the entire domain layer (F-CC-B10-015/018/023), so the Critical scoping defect is invisible.
- Negative-path coverage (bad sig, bad JSON, non-PR event) is strong (F-CC-B10-017).
- prod-smoke phase-5/phase-9 keystone E2E is credential-gated and can create **real prod rows** when run (F-CC-B03-046, F-CC-B04-006).

---

## 2. AI Tutor / Chat Workflow (lesson chat → streamed response → persistence)

### End-to-end path

```
Lesson/Chat page (app/[locale]/lesson/[id], /chat)        [cc-batch-00]
        │  lessonId/moduleId grounding (top-level chat has none, F-CC-B00-022)
        ▼
lib/use-chat-stream.ts  (client hook)                     [cc-batch-00/04]
        │  fetch("/api/chat") with credentials:same-origin
        │  branches on contentType:
        │    - "text/event-stream" → parse lines prefixed "0:" (F-CC-B00-001)
        │    - else → res.json()  (non-streaming fallback)
        │  NO cross-chunk SSE buffering (F-CC-B04-019) → dropped tokens on fragmentation
        │  silent catch{} blocks swallow errors (F-CC-B04-020)
        ▼
app/api/chat/route.ts                                     [cc-batch-00]
        │  requireAuth (string-match error→401, F-CC-B00-005)
        │  checkChatRateLimit(user.id) — in-memory Map, per-instance (F-CC-B00-002 / B04-023)
        │  tenant from session.user.schoolId (server-side, correct — F-CC-B00-007)
        │  getChatContext(tenantDb, ...) ── REFERENTIAL select → TenantScopeError risk (F-CC-B08-001)
        │  buildSystemPrompt(locale) — locale "en"|else→"th" (F-CC-B02-035)
        │  createOpenAI({apiKey, baseURL}) at module load (F-CC-B00-003)
        │  streamText(...).toDataStreamResponse()
        │      └─ adapter aliases to toTextStreamResponse() → raw text/plain (F-CC-B00-001)
        ▼
@reading-advantage/ai adapter (OpenRouter provider)
        │  maxTokens→maxOutputTokens remap (F-CC-B00-006)
        ▼
OpenRouter (model gateway)
        ▼  (response streams back)
saveChatMessage (user turn persisted via db.unscoped — correct, F-CC-B08-001)
assistant turn: handleComplete is a no-op stub → assistant NOT persisted (F-CC-B00-030)
```

### Break/risk annotations

| Step | Finding(s) | Severity | Effect |
|------|-----------|----------|--------|
| Stream protocol | **F-CC-B00-001** | High | Route returns `text/plain`; client expects `text/event-stream` / `0:`-prefixed → falls to `res.json()` on a stream → throws → generic error UI. Streaming path appears non-functional; only no-key fallback works. **Verify at runtime.** |
| SSE buffering | F-CC-B04-019 | Medium | No buffer across `reader.read()` chunks; split `0:"…"` lines silently dropped |
| Rate limit | F-CC-B00-002, F-CC-B04-023, F-CC-B06-008 | Medium | In-memory Map → effective limit = 30 × replicas on Cloud Run; resets on cold start |
| Adapter bypass | F-CC-B00-003/004 | Medium | App configures provider/baseURL directly vs `ai.streamText()` adapter call |
| Chat context read | F-CC-B08-001 | Critical (shared) | `getChatContext`/`getChatHistory` select REFERENTIAL tables on TenantDB → throw |
| Assistant persistence | F-CC-B00-030 | Low | `handleComplete` empty stub; assistant turns never saved → one-sided history on reload |
| Locale prompt test | F-CC-B02-034 | High (test) | `buildSystemPrompt` tested via a divergent local copy, not the real function |
| Error observability | F-CC-B04-020 | Low | Silent catch blocks; no telemetry on persistence/parse failures |

### Server-side AI seam (positive)

- `reviewExercise` and chat both route through the `@reading-advantage/ai` adapter (`getAIClient()` + `aiClientToGenerateReview`), not a provider SDK — confirmed and well tested (F-CC-B07-017, F-CC-B09-027, F-CC-B10-cross-cutting).
- `prDiff` bounded to 50000 chars at the router (F-CC-B07-025); `reviewResult` schema validated.

---

## 3. Curriculum→Production "mirroring" workflow (teaching → intern contribution)

The curriculum explicitly tells interns they will "contribute to the real codecamp-advantage app" and claims "architecture mirroring." The line review found the teaching diverges from the shipped stack at security-critical points — see `findings.md` (curriculum class) and `migration-tracks.md`. Key divergences: bcrypt vs Argon2id (F-CC-B06-001), AI SDK v4 vs v5 (F-CC-B06-002 / B05-003), session-trust + wildcard CORS (F-CC-B05-002/008), dropped `schoolId` writes (F-CC-B06-007), pnpm 8.15.8 vs 11.8.0 (F-CC-B05-004).
