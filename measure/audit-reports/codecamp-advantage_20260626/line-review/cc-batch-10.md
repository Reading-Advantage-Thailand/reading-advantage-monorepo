# Line Review — cc-batch-10 (FINAL BATCH)

- Track: `codecamp_advantage_review_20260626`
- Batch: `cc-batch-10` (9 files) — final batch of the codecamp-advantage line review.
- Reviewer scope: curriculum/progression correctness, GitHub/webhook/AI integration risk, auth/role boundaries, production readiness, AGENTS.md compliance, test quality.
- Source code edited: none (read-only review).
- Finding ID prefix: `F-CC-B10-###`. Severity scale: Critical / High / Medium / Low / Info.

> This is a line-review report only. It makes **no** acceptance or closeout claim for the track or any phase. Verification commands run during review are diagnostic only.

---

## Files reviewed (9/9)

1. `packages/webhooks/src/__tests__/github-review.test.ts`
2. `packages/webhooks/src/__tests__/github-webhook.test.ts`
3. `packages/webhooks/src/__tests__/phase-5-dead-code.test.ts`
4. `packages/webhooks/src/__tests__/phase-6-acceptance.test.ts`
5. `packages/webhooks/src/__tests__/phase-7-closeout.test.ts`
6. `packages/webhooks/src/github-client.ts`
7. `packages/webhooks/src/github.ts`
8. `packages/webhooks/src/health.ts`
9. `packages/webhooks/src/index.ts`

Supporting (read for cross-reference, not in batch, not findings-scored): `packages/domain/src/codecamp/pr-reviews.ts`, `packages/domain/src/codecamp/review-exercise.ts`, `packages/domain/src/db-contract.ts`, `packages/domain/src/tenant-registry.ts`, `packages/ai/src/client.ts`.

---

## Headline finding

The GitHub PR-review webhook (`github.ts`) is, on the current `HEAD`, **non-functional against the real database layer**. Every domain call it makes targets a table classified `REFERENTIAL` in `tenant-registry.ts`, and it makes those calls through `createTenantDB(...)`, which throws `TenantScopeError` on `REFERENTIAL` access. The webhook's own unit tests pass only because they mock the entire domain layer, so the regression is invisible in this package's green test run. See **F-CC-B10-001**.

---

## Findings

### `packages/webhooks/src/github.ts`

- **F-CC-B10-001 — Critical — Webhook calls REFERENTIAL codecamp tables through TenantDB; throws `TenantScopeError` at runtime.**
  Lines 161, 166–171, 177–185, 190–195, 257–265, 290–299, 304–313, 320–325, 347–357 all route domain calls (`getPrReviewByPrUrl`, `getExerciseRepoByUrl`, `createPrReview`, `updatePrReview`, `completeApprovedPrReviewLesson`, `logWebhookEvent`) through `tenantDb = createTenantDB(db, globalTenant)` (line 161). Those domain functions in `packages/domain/src/codecamp/pr-reviews.ts` and `exercises.ts` issue `db.select().from(codecampPrReviews | codecampExerciseRepos | codecampWebhookEvents | codecampLessons)` / `db.update(...)` / `db.insert(...)` directly. All of `codecampModules`, `codecampLessons`, `codecampExerciseRepos`, `codecampPrReviews`, `codecampWebhookEvents` are registered `REFERENTIAL` (`tenant-registry.ts:184–193`), and `createTenantDB` throws `TenantScopeError` for any `select/update/delete/insert` against a `REFERENTIAL` table (`db-contract.ts:73, 350–359, 392, 428, 451`). The first domain call (`getPrReviewByPrUrl`, line 166) therefore throws → caught at line 345 → the handler then calls `logWebhookEvent` (line 347), which **also** throws `TenantScopeError` (insert into `codecampWebhookEvents`) → swallowed in `logWebhookEvent`'s own try/catch (`pr-reviews` wrapper at github.ts:49–58) → handler returns **HTTP 500** for every real PR event.
  Diagnostic confirmation: `npx vitest run packages/domain/src/__tests__/codecamp.test.ts` → **63 of 90 tests fail**, every failure being `TenantScopeError: Table "codecamp_*" is REFERENTIAL ... Cannot select through TenantDB`. The registry classification landed in commit `4b268b1d` (2026-06-10 "TenantDB proxy hardening"); `pr-reviews.ts` was never updated to use `unscoped()`, unlike sibling files `review-exercise.ts:118`, `chat.ts:16`, `progress.ts:20`, and `modules.ts:154` which *do* call `db.unscoped("codecamp tables have no schoolId")`. This is the single highest-impact defect in the batch: the entire GitHub→review→lesson-completion pipeline is dead in production while reporting green in `packages/webhooks` CI.
  Note: this defect is owned by the domain package, but it is *exercised and surfaced* by `github.ts`; anchored here because `github.ts` is the in-batch caller.

- **F-CC-B10-002 — High — LLM review runs synchronously inside the webhook response; conflicts with GitHub's ~10s delivery timeout.**
  Line 341 `await runReview();` is awaited before the handler returns at line 344. `runReview` performs a GitHub installation-token fetch (line 278), a PR-diff fetch (line 279), a full LLM `generateObject` round-trip (`reviewExercise`, lines 281–288), a DB write (290–299), an optional lesson-completion write (320–325), and an optional PR-comment POST (334). GitHub expects a webhook ACK within ~10 seconds and will mark the delivery failed and **redeliver** on timeout. A slow model call will cause GitHub to retry, producing duplicate reviews / duplicate PR comments and possibly duplicate lesson completions. The code comments and tests (`phase-6-acceptance.test.ts:348-349, 380-405`; `github-review.test.ts:349-376`) describe a "fire-and-forget posture," but the implementation is fully synchronous. Recommend decoupling the review into a worker/queue (consistent with AGENTS.md "Jobs and Workers — long-running work must not execute inside request-response paths"), and ACK immediately.

- **F-CC-B10-003 — Medium — Replay/timestamp protection is effectively inert for genuine GitHub deliveries.**
  Lines 87–113 derive the timestamp from `x-github-delivery-timestamp` / `x-hub-timestamp` headers or a `timestamp` field in the JSON body. GitHub PR webhooks send **neither** of these (no standard delivery-timestamp header, and the `pull_request` payload has no top-level `timestamp`). `timestampClaim` is therefore `undefined` for real deliveries, so `verifyWebhookSignature(payload, signature, undefined)` skips the freshness check (`github-client.ts:146`) and `isWebhookTimestampFresh` is never reached. The replay window is only enforced for synthetic callers that opt in. This is a meaningful gap between the advertised "replay attack rejected" behavior (tested at `github-webhook.test.ts:115-135`) and real-world protection. Recommend documenting the limitation or implementing GitHub's recommended delivery-dedup via `x-github-delivery` (logged but not used for dedup here).

- **F-CC-B10-004 — Low — Per-request `console.warn` from `globalTenant` with null schoolId.**
  Line 161 + 31: every webhook invocation constructs `createTenantDB(db, { schoolId: null })`, which emits a `console.warn` ("tenant scoping will not be applied … query across ALL schools") on every call (`db-contract.ts:303-308`). For a multi-tenant-by-default codebase this is noisy and, more importantly, signals that codecamp's global (non-school-scoped) data model is bolted onto a tenant-scoping primitive that warns against exactly this usage. Functionally codecamp tables are `REFERENTIAL`/global by design, but the warning floods logs and obscures real tenant-leak warnings elsewhere.

- **F-CC-B10-005 — Low — LLM-authored content is interpolated unescaped into the PR comment body.**
  Line 332 builds a Markdown comment from `reviewResult.summary` and each `reviewResult.comments[].body` with no sanitization. A crafted PR diff that survives the prompt-injection guard (`review-exercise.ts:86`) could steer the model into emitting Markdown/HTML or `@mentions` that get posted back to the PR. Low severity (output is a comment, not executed), but worth noting for an integration that posts model output to a public surface.

- **F-CC-B10-006 — Info — `data`/`pr` referenced in catch block.**
  Lines 351–356 reference `data` and `pr` inside the `catch`. These are bound at lines 141–143, before the `try` at 164, so they are always defined when the catch runs — no defect, recorded only to pre-empt a false positive.

### `packages/webhooks/src/github-client.ts`

- **F-CC-B10-007 — High — `fetchPrDiff` silently returns a fabricated mock diff when no token is present.**
  Lines 180–183: with no installation token, the function logs a warning and returns `diff --git a/README.md ... + Mock diff for PR #N`. In `github.ts`, `getInstallationTokenForRepo()` returns `undefined` whenever `GITHUB_INSTALLATION_ID` is unset (`github-client.ts:159-164`), and `fetchPrDiff(prInfo, undefined)` is then called (github.ts:279). The mock diff flows into `reviewExercise` → the LLM → a persisted review summary and, if the model returns `passed:true` on the trivial mock, into `completeApprovedPrReviewLesson` (github.ts:318-325), marking the intern's exercise lesson **completed with score 100** based on a fake diff. A misconfigured/credential-less production deploy thus silently fabricates passing reviews. Recommend failing closed (skip review + mark `reviewed`/error) instead of fabricating a diff outside an explicit dev flag.

- **F-CC-B10-008 — Low — JSDoc placed between `export` and `function` keyword.**
  Lines 20–24, 28–32, 36–40: `export /** … */ function getAppId()`. The doc comment sits *after* `export`, which is unusual and can defeat doc extractors / the repo's `build-graph` summary extraction (AGENTS.md "Documentation Standards"). Cosmetic but inconsistent with every other documented function in the file (e.g. lines 46–49, 72–75).

- **F-CC-B10-009 — Low — `postReviewComment` is exported but has no production caller.**
  Lines 240–323 implement inline (line-anchored) review comments, but `github.ts` only uses `postPrComment` (general comment). Repo-wide grep finds no non-test caller of `postReviewComment`. It is substantial dead code (fetch reviews → create-or-append) carrying its own failure modes; either wire it in for the `reviewResult.comments[].line` data (currently those line anchors are flattened into a single Markdown blob at github.ts:332) or remove it.

- **F-CC-B10-010 — Low — `getInstallationToken` mints a fresh App JWT + network round-trip on every call; no caching.**
  Lines 76–92 + 159–164: installation tokens are valid ~1 hour but are re-fetched per webhook. Under load this adds latency to the already-synchronous request path (compounding F-CC-B10-002) and extra GitHub API calls. Minor; cache by installation ID with expiry.

- **F-CC-B10-011 — Info — Signature verification is otherwise sound.**
  Lines 128–153: HMAC-SHA256 with `timingSafeEqual` wrapped in try/catch to handle length-mismatch (lines 140–144), empty-secret fail-closed (134–137). `parsePrUrl` (329–344) validates owner/repo against `^[a-zA-Z0-9\-_.]+$` to blunt SSRF. These are correct and worth crediting.

### `packages/webhooks/src/health.ts`

- **F-CC-B10-012 — Info — Liveness-only health check.**
  Lines 5–11 return a static `ok` with no dependency probe (DB, AI provider). Acceptable as a liveness endpoint, but there is no readiness check; an orchestrator cannot distinguish "process up" from "can serve webhooks" (e.g. DB unreachable). Optional improvement for production readiness.

### `packages/webhooks/src/index.ts`

- **F-CC-B10-013 — Low — Stub routes return `501` with `{ received: true }`; no shutdown/error handling.**
  Lines 13–14 register `/stripe` and `/google-classroom` returning 501 — fine as placeholders, but `received:true` alongside a 501 is contradictory. Lines 20–23 start the server with no error handler, no graceful-shutdown (SIGTERM) hook, and no startup failure handling. Minor production-readiness gaps for a long-running service container.

- **F-CC-B10-014 — Info — Mixed module-specifier styles.**
  Lines 3–4 import with explicit `.js` extensions (`./health.js`); fine for NodeNext ESM, recorded only to confirm intent (matches the package's ESM config).

### `packages/webhooks/src/__tests__/github-webhook.test.ts`

- **F-CC-B10-015 — High — Integration test mocks the entire domain layer, masking F-CC-B10-001.**
  Lines 6–24 `vi.mock` `@reading-advantage/domain/codecamp` and `@reading-advantage/domain/users`, replacing every PR-review/webhook domain function with `vi.fn()`. As a result the suite asserts handler wiring (status codes, which mock was called) but never exercises the real `createTenantDB` path, so the production-fatal `TenantScopeError` (F-CC-B10-001) passes CI green. This is the canonical "tests mock the layer that is broken" gap. Recommend at least one webhook test that runs against the real domain functions with a mock DB (as `codecamp.test.ts` does) to catch tenant-scoping regressions end-to-end.

- **F-CC-B10-016 — Low — Replay tests encode the inert header behavior as the contract.**
  Lines 106–135 assert "Invalid timestamp"/"Stale timestamp" for synthetic `x-github-delivery-timestamp` headers. These pin behavior that does not fire for real GitHub deliveries (see F-CC-B10-003), giving false confidence that replay protection is active in production.

- **F-CC-B10-017 — Info — Good negative-path coverage.**
  Lines 77–160 cover missing signature, bad signature, bad JSON, malformed/stale timestamp, non-PR event, and schema-invalid payload — solid boundary coverage for the validation front-half of the handler.

### `packages/webhooks/src/__tests__/github-review.test.ts`

- **F-CC-B10-018 — Medium — Elaborate `@reading-advantage/db` mock (lines 99–167) is dead scaffolding.**
  Because the codecamp domain functions are themselves mocked (lines 79–97), the hand-rolled query-builder DB mock is never reached by the review path. It adds ~70 lines of misleading complexity and, like F-CC-B10-015, prevents the real tenant-scoping path from being exercised.

- **F-CC-B10-019 — Low — Mock schema-validation branch is unreachable due to operator precedence.**
  Line 51: `"schema" in (input as object) === false`. `in` has higher precedence than `===`, so this parses as `("schema" in input) === false`; since `input` always carries `schema`, the expression is always `false` and the `safeParse` validation branch (lines 52–56) never runs. The mock therefore returns responses unvalidated, weakening the "schema as contract" guarantee the test claims to enforce. (The Phase 6 file fixes this by unconditionally parsing — see contrast at `phase-6-acceptance.test.ts:117`.)

- **F-CC-B10-020 — Info — `setThrowOnGenerateObject` / fire-and-forget test (349–376) pins a posture the code does not have.**
  The test verifies a 200 + "reviewed" summary on model failure, which the synchronous handler does satisfy via its inner try/catch (github.ts:302-315) — but the surrounding "fire-and-forget posture" framing (comments 350-354) misrepresents the synchronous implementation (see F-CC-B10-002).

### `packages/webhooks/src/__tests__/phase-5-dead-code.test.ts`

- **F-CC-B10-021 — Medium — Process/bookkeeping test reads source + package.json of *other* packages and pins comment wording.**
  Lines 75–116 assert that `packages/api/src/routers/codecamp.ts`, `packages/api/.../codecamp-review-router.test.ts`, and both packages' `package.json` contain / do not contain specific substrings ("createOpenAI", "current inline OpenRouter call", `@ai-sdk/openai`, regex over comment prose at lines 109, 115, 132). These are not behavior tests; they are cross-package grep assertions living in the `webhooks` suite. They will break on benign edits in unrelated packages and couple the webhooks test signal to `packages/api` file contents and comment phrasing. Recommend relocating dead-dependency guards to a lint rule or a repo-root meta-test, not per-package behavior suites.

- **F-CC-B10-022 — Low — Substring guards are blunt instruments.**
  `not.toMatch(/openrouter/)` (line 80) and `/\bgenerateObject\b/` (line 81) over raw file text will false-positive on any future legitimate mention (a comment, a variable, a doc link), making the guard fragile relative to its intent (no *vendor SDK call*).

### `packages/webhooks/src/__tests__/phase-6-acceptance.test.ts`

- **F-CC-B10-023 — Medium — Mislabeled "acceptance" test; same domain-mocking blind spot.**
  Despite the "integration + acceptance" framing (header lines 1–35) and the in-batch instruction context, the suite mocks the domain layer (lines 156–174) and the DB (176–244), so the "full webhook→domain→LLM→persist flow" (test at 342–378) never touches real persistence or tenant scoping. It validates prompt/schema wiring (good — lines 357–367) but cannot detect F-CC-B10-001. The test name overstates the coverage. (Per the review's own scope, this report makes no acceptance/closeout claim; flagging only that the *test file* asserts acceptance criteria it does not fully exercise.)

- **F-CC-B10-024 — Low — Tests assert on Measure docs in the archive path.**
  Lines 473–502 read `measure/archive/codecamp_review_ai_consolidation_20260605/plan.md` and assert it contains five filter strings and a turbo-command regex. A unit suite asserting on archived planning-doc prose is brittle and out of place; it couples the webhooks package's green status to Measure bookkeeping.

### `packages/webhooks/src/__tests__/phase-7-closeout.test.ts`

- **F-CC-B10-025 — Medium — Closeout test runs `git` via `execSync` and asserts on `git notes`, dir moves, and markdown line counts.**
  Lines 105–115, 449–517 shell out to `git log`, `git notes show`; lines 126–212 assert `tech-debt.md` row state, embedded commit SHAs (`3dc3167a`, `92eeca19`), and a ≤51-line cap; lines 219–360 assert `lessons-learned.md` wording via regexes over prose; lines 367–442 assert filesystem dir-move state. This is pure Measure-process bookkeeping encoded as a package unit test. Problems: (a) `git notes` are not fetched by default, so the test is environment-dependent and `safeExec` swallows failures into empty strings (lines 105–115), making green/red dependent on local git state; (b) it embeds hard-coded SHAs that rot; (c) it gates the `webhooks` test suite on `measure/` doc edits. These belong in the Measure orchestrator/closeout tooling, not in `packages/webhooks/src/__tests__`. Recommend removing from the package test surface.

- **F-CC-B10-026 — Low — Self-documented as a Red-phase pinning test with no runtime deliverable.**
  Header lines 5–8 and 57–77 acknowledge "Phase 7 has no source code … pure Measure-doc bookkeeping." Such tests inflate the package's test count without exercising any webhook behavior; they are noise against the AGENTS.md testing-pyramid guidance (backend-function tests first).

---

## Cross-cutting observations

- **AGENTS.md compliance (positive):** the review path correctly flows through the `@reading-advantage/ai` adapter via `aiClientToGenerateReview(getAIClient(), reviewResultSchema)` (github.ts:68-70, 287) rather than a provider SDK — the consolidation the Phase 5/6 guards protect. Provider neutrality is respected in `github.ts`.
- **AGENTS.md compliance (gap):** long-running AI/network work executes inside the request path (F-CC-B10-002), contrary to the "Jobs and Workers" guidance.
- **Test-pyramid inversion:** of the 6 test files, 3 (`phase-5`, `phase-6` partially, `phase-7`) are artifact/process assertions over source text, package.json, Measure docs, and git state rather than backend-behavior tests; the 2 genuine handler tests mock away the domain layer that contains the Critical defect. Net effect: a fully green `packages/webhooks` suite (confirmed: `78 passed`) coexists with a production-fatal `TenantScopeError` in the path it claims to cover.

---

## Verification performed (diagnostic only)

- `npx vitest run --root packages/webhooks` → **6 files, 78 tests passed** (suite is green despite F-CC-B10-001).
- `npx vitest run packages/domain/src/__tests__/codecamp.test.ts` → **63 failed / 27 passed**, all failures `TenantScopeError` on `codecamp_*` tables — direct evidence for F-CC-B10-001.
- `git log -S "register(codecampPrReviews" -- packages/domain/src/tenant-registry.ts` → classification introduced in `4b268b1d` (2026-06-10); `pr-reviews.ts` not updated to `unscoped()`.
- Grep for `postReviewComment` non-test callers → none (F-CC-B10-009).

---

## Limitations

- Read-only review; no source was modified and no fix was attempted.
- The Critical defect (F-CC-B10-001) lives in `packages/domain/src/codecamp/pr-reviews.ts` and `exercises.ts`, which are **outside this batch**; it is reported here because the in-batch `github.ts` is the caller that triggers it. The domain files should be re-confirmed in their owning batch.
- Severity for F-CC-B10-001 assumes the registry classification and `createTenantDB` enforcement on `HEAD` reflect deployed behavior. I confirmed it via the domain unit suite but did not exercise a live Postgres webhook end-to-end (no running DB / GitHub App credentials in this environment).
- F-CC-B10-002 / F-CC-B10-003 (GitHub 10s timeout, missing real timestamp header) are based on documented GitHub webhook behavior and payload shape, not on a live delivery capture.
- Markdown/git-state assertions in the phase-5/6/7 tests were read statically; their pass/fail depends on repo and git-notes state at run time, which I did not exhaustively reproduce.
- I did not assess i18n, UI, or accessibility (out of scope for these server-side files).
- This report is a line review only and asserts **no** acceptance, phase-gate, or closeout status for the track.
