# Plan: Consolidate Duplicate `generateReview` onto `packages/ai`

> Contract-First + TDD. Phase 0 re-establishes ground truth (the tech-debt line numbers
> are from 2026-05-15 and may be stale). Behavior-preserving refactor; the Mock provider
> makes the review path testable without API keys.

## Phase 0: Re-confirm Ground Truth

> Recon-only phase (no test code per `test-strategy.md`). All findings below
> were re-confirmed against the working tree on 2026-06-11.

- [x] Task: `grep -rn "openrouter\|OpenRouter\|generateReview\|OPENROUTER_API_KEY" packages/webhooks packages/api packages/domain` — record the actual current locations of the two review call sites (replaces the stale `github.ts:41` / `codecamp.ts:405`).
  - Commit: `d4fbf78e`
  - **Call site A (webhook):** `packages/webhooks/src/github.ts:65-99` (`generateReview` declared at module scope; closure passed into `reviewExercise` at line 316 via the `runReview` IIFE at line 302-340).
  - **Call site B (tRPC/API):** `packages/api/src/routers/codecamp.ts:466-489` (`generateReview` declared inside the `adminProcedure` mutation closure; called inline at line 491).
  - **Domain seam:** `packages/domain/src/codecamp/review-exercise.ts:18, 76-125`. Callback signature `(system: string, prompt: string) => Promise<ReviewResult>`, NOT an `AIClient`.
  - **Anonymous copy in API router** is invisible to the graph (confirmed: `build-graph search "generateReview"` returns 1 function hit + 1 param hit; the inline `async function generateReview(...)` at `codecamp.ts:471` is a closure, not a node). Grep is still required to find it.
- [x] Task: Read both call sites; diff their prompts + model params + error handling. Note every difference.
  - Commit: `d4fbf78e`
  - **Diff table (verified 2026-06-11):**

    | Aspect | A: `packages/webhooks/src/github.ts:65-99` | B: `packages/api/src/routers/codecamp.ts:466-489` | Same/Diff |
    |---|---|---|---|
    | Model | `x-ai/grok-build-0.1` (hardcoded) | `x-ai/grok-build-0.1` (hardcoded) | **Same** |
    | SDK | `createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" })` | `createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" })` | **Same** |
    | `generateObject` call | `model, system, prompt, schema: reviewResultSchema, maxTokens: 2048` | `model, system, prompt, schema: reviewResultSchema, maxTokens: 2048` | **Same** |
    | No-key mock fallback | warn + return `{passed: false, summary: "[Mock review — LLM not configured] …", comments: []}` | same string, same shape | **Same** |
    | Wrap | bare function (module scope) | nested inside `try/catch` of `adminProcedure` mutation | diff (B wraps; A relies on `runReview`'s outer `.catch`) |
    | Env reads | `process.env.OPENROUTER_API_KEY` (twice: client + fallback) | `process.env.OPENROUTER_API_KEY` (twice: client + fallback) | **Same** |
    | Provider errors | bubble to caller of `runReview` → caught by outer `.catch` (line 331-343) | caught by the procedure's `catch(err) { throw mapDomainError(err) }` at line 500-502 | diff (error posture differs) |
    | Tests covering it | none in `packages/webhooks/src/__tests__/github-webhook.test.ts` (no `reviewExercise`/`generateReview` references) | 3 in `packages/api/src/__tests__/codecamp-router.test.ts:860-906` (mock the domain function) | diff |

  - **Net result:** prompts, model, schema, params are byte-identical; only the *enclosing* error-handling posture differs (A is fire-and-forget via `runReview` IIFE `.catch`; B is synchronous tRPC error-mapping). No prompt reconciliation needed.
- [x] Task: Read `packages/domain/.../reviewExercise` (the DI seam) and its current client parameter type.
  - Commit: `d4fbf78e`
  - `ReviewExerciseInput.generateReview: (system: string, prompt: string) => Promise<ReviewResult>` at `packages/domain/src/codecamp/review-exercise.ts:18`.
  - Domain body: build system prompt via `buildSystemPrompt(moduleTitle?, moduleDescription?)` (line 44-63); wrap diff in ` ```diff ... ``` ` fence; call `generateReview(system, prompt)` at line 124.
  - **6 existing tests** at `packages/domain/src/__tests__/review-exercise.test.ts:24-200` cover: success path, `moduleId` lookup, `repoUrl` lookup, non-admin rejection, code-fence wrap, anti-injection system-prompt line. **All 6 must remain green** through Phases 1-4.
  - **Mismatch with `AIClient`:** `AIClient.generateObject<T>({ schema, prompt, model, temperature, maxTokens })` (`packages/ai/src/types.ts:6-17, 52-70`) accepts a Zod schema in-band and returns a parsed object. The current callback is a higher-level wrapper that pre-binds the schema. **Adopting AIClient-shape DI widens the blast radius** to the two call sites + 1 test file (8 incoming `param_flow` edges on `reviewExercise`, 0 outgoing `calls` edges → leaf-like).
- [x] Task: Inspect `packages/ai/src/providers/` — does an OpenRouter provider exist? Record yes/no.
  - Commit: `d4fbf78e`
  - `ls packages/ai/src/providers/` → `google.test.ts  google.ts  mock.test.ts  mock.ts  openai.test.ts  openai.ts`. **No `openrouter.ts` / `openrouter.test.ts`.**
  - `AIProvider` union at `packages/ai/src/types.ts:75` is `type AIProvider = "openai" | "google" | "mock"`. `aiConfigSchema` at `packages/ai/src/client.ts:8-13` is `z.enum(["openai", "google", "mock"])`.
  - **Confirmed absent.** Phase 1 (FR-1) is required.
- [x] Task: Decide + document the unified prompt/params (A, B, or a reconciled version).
  - Commit: `d4fbf78e`
  - **Decision: "A" wins by default — byte-identical impls need no prompt reconciliation.** The webhook scoping pattern (top-level `generateReview` in `github.ts`) is the cleaner shape; the API router inline pattern is an artifact of being inside a procedure closure and should be extracted to a module-level helper in Phase 4.
  - **DI shape (Phase 1 deliverable):** keep `reviewExercise`'s callback shape `(system, prompt) => Promise<ReviewResult>` (lower blast radius per test-strategy §"DI-shape decision"). Add a single shared adapter factory `aiClientToGenerateReview(client, schema)` in `packages/domain/src/codecamp/` (tested once) that both call sites import. This satisfies FR-2's "All review generation flows through [reviewExercise]" without touching the existing 6 tests' signatures.
  - **Model:** pin to `x-ai/grok-build-0.1` (the only model that has been **live-probed** with the AI SDK `tool_choice` contract from the deployment region). Do **not** rotate to a different model in this track.
  - **Env:** `OPENROUTER_API_KEY` is the only required env var; no other provider-specific env added.
- [x] Task: Reproduce and record the 2026-06-08 production failure: `xiaomi/mimo-v2.5`
  - Commit: `d4fbf78e`
  returns no endpoint supporting the required `tool_choice` request from the deployment
  region; record the successful `x-ai/grok-build-0.1` forced-tool probe as evidence, not
  as an unreviewed permanent model decision.
  - **Source of truth (verbatim from `measure/tech-debt.md` row dated 2026-05-15, severity High, status Open):** "Two inline OpenRouter implementations drift independently. Confirmed production outage 2026-06-08: hardcoded `xiaomi/mimo-v2.5` had no regional endpoint supporting the AI SDK `tool_choice` contract, so three intern reviews failed without comments."
  - **Source of truth (verbatim from `measure/tracks/codecamp_review_ai_consolidation_20260605/spec.md` "Production incident, 2026-06-08"):** "the deployed review path used `xiaomi/mimo-v2.5`, but OpenRouter returned HTTP 404 because no available endpoint supported the AI SDK's required `tool_choice` structured-output request. Three intern reviews failed without GitHub feedback. A live regional probe confirmed `x-ai/grok-build-0.1` supports the same forced-tool contract."
  - **Current repo state (re-confirmed 2026-06-11):** the deployed code at `packages/webhooks/src/github.ts:78` and `packages/api/src/routers/codecamp.ts:481` both already hardcode `x-ai/grok-build-0.1`. The fix to switch away from `xiaomi/mimo-v2.5` is **already on master** — the residual risk is that the choice is hardcoded in two places (no `AI_REVIEW_MODEL` env override) and that no live capability check blocks a future bad model pin.
  - **Capability preflight (Phase 1 + Phase 6 deliverable, credential-gated):**
    - Reads `OPENROUTER_API_KEY` and the configured model (default `x-ai/grok-build-0.1`).
    - Issues a single small structured-output call with the same Zod `reviewResultSchema` shape used in prod (forced-tool `tool_choice`).
    - If the call returns an HTTP 404 (no endpoint) or a 400 (region-blocked) or fails schema validation (no tool-choice support), the preflight **fails closed** and Phase 6's `run all filtered gates` exits non-zero.
    - Gated by `it.skipIf(!process.env.OPENROUTER_API_KEY)` per `test-strategy.md` "Capability preflight"; never blocks CI on a real network call.
  - **Evidence referenced (not reproduced in this phase):** the live regional probe referenced in the spec was performed outside this repo. The probe transcript is linked from the spec's references block. **Action for the next role:** if a fresh probe is required, run the credential-gated preflight test under a CI env that has `OPENROUTER_API_KEY` set; otherwise trust the existing prod pin to `x-ai/grok-build-0.1` and rely on Phase 6's preflight as the regression guard.

## Phase 1: OpenRouter Provider (if absent) — TDD
- [x] Task: If missing, write `packages/ai/src/providers/openrouter.test.ts` against the Mock-style contract (success + error), expecting an OpenAI-compatible provider keyed by `baseURL` + `OPENROUTER_API_KEY`, with provider-prefix model-ID stripping.
  - Commit: `92eeca19`
- [x] Task: Implement `openrouter.ts` (thin variant of the OpenAI provider with OpenRouter `baseURL`); register in `createAIClient`/`getAIClient`.
  - Commit: `92eeca19`
- [x] Task: Add a bounded, credential-gated OpenRouter capability preflight for the configured review model using the exact forced-tool structured-output contract.
  - Commit: `92eeca19`
- [x] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/ai` green.
  - Commit: `92eeca19`

## Phase 2: Confirm/Adapt the `reviewExercise` Seam — TDD
- [x] Task: Write/extend a domain test that injects a Mock `AIClient` and asserts `reviewExercise` returns the typed review for a sample diff, and surfaces a model error correctly.
  - Commit: `d5130fd8`
- [x] Task: If `reviewExercise` does not yet accept an `AIClient`, adapt its DI param (keep the call shape backward-compatible).
  - Commit: `836afb04`
- [x] Task: Add a regression test for terminal `reviewedAt` stamping (pending re-trigger must not overwrite a prior terminal `reviewedAt`).
  - Commit: `d5130fd8`
- [x] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/domain` green.
  - Commit: `836afb04`
  - **Green phase (2026-06-11):** Added `AIClientLike` interface + `aiClientToGenerateReview` adapter factory to `packages/domain/src/codecamp/review-exercise.ts`. All 281 tests pass, 0 failures, 5 skip.

## Phase 3: Repoint Call Site A (webhook) — TDD
- [x] Task: Write/extend a webhook test (Mock `AIClient`) asserting the handler persists the same review shape and preserves the fire-and-forget `.catch` posture.
  - Commit: `24ec7bce`
  - **Red phase (2026-06-11):** Added `packages/webhooks/src/__tests__/github-review.test.ts` with 5 tests. 4 fail today (AIClient seam not yet wired into the webhook — `getAIClient`/`createAIClient` not called; `mockHolder.calls` empty; persisted summary is the inline `[Mock review — LLM not configured]` string, not the AIClient fixture). 1 passes (fire-and-forget regression guard — current `.catch` swallow already preserves the contract). Tests: (a) `getAIClient`/`createAIClient` invoked, (b) `reviewResultSchema` passed to `generateObject`, (c) `updatePrReview` called with fixture summary + `approved`, (d) `updatePrReview` called with `needs_changes` when `passed: false`, (e) AIClient rejection → 200 + `reviewed` + "Review failed" summary.
- [x] Task: Replace the inline OpenRouter call in the webhook handler with `reviewExercise` + injected `AIClient`.
  - Commit: `aab3471d`
  - **Green phase (2026-06-11):** Added `@reading-advantage/ai` to webhooks `package.json`. Replaced module-level `createOpenAI({...})` + inline `generateReview` at `github.ts:65-99` with `createGenerateReview()` factory that lazily resolves `getAIClient()` + `aiClientToGenerateReview(getAIClient(), reviewResultSchema)`. Added DB mock (`@reading-advantage/db`) and `github-client` mock to test file so `reviewExercise` runs without real Postgres/GitHub API. All 5 webhook-review tests pass (5/5). All 50 webhook tests pass. All 282 domain tests pass. Type-check clean.
- [x] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/webhooks` green.
  - Commit: `aab3471d`

## Phase 4: Repoint Call Site B (tRPC/API) — TDD
- [x] Task: Write/extend a router test (Mock `AIClient`) asserting the procedure returns the unified review and is admin-guarded where required.
  - Commit: `7e4d1f21`
  - **Red phase (2026-06-11):** Added `packages/api/src/__tests__/codecamp-review-router.test.ts` with 6 tests asserting FR-4 (repoint tRPC/API call site to `AIClient` seam) and admin guard. Pattern mirrors `packages/webhooks/src/__tests__/github-review.test.ts`: `vi.hoisted` Mock AIClient, `vi.mock("@reading-advantage/ai", ...)` to inject it through `getAIClient`/`createAIClient`, real `reviewExercise` runs from `@reading-advantage/domain/codecamp` (no domain mock). Tests: (a) `getAIClient`/`createAIClient` invoked, (b) `reviewResultSchema` passed to `generateObject`, (c) procedure returns the Mock fixture (proving the AIClient seam wired through `aiClientToGenerateReview`), (d) procedure returns the Mock fixture for `SYSTEM` user (adminProcedure allows SYSTEM), (e) non-admin (STUDENT) rejected with `FORBIDDEN`/`Admin access required`, (f) AIClient rejection → `INTERNAL_SERVER_ERROR` via `mapDomainError`. **5 of 6 fail today** (inline OpenRouter call at `codecamp.ts:466-489` not yet replaced; 1 admin-guard test passes as a regression guard). 113 existing api tests still pass. `pnpm --filter=@reading-advantage/api check-types` clean.
  - **Targeted Red command re-run (MID verification, 2026-06-12):** `pnpm --filter=@reading-advantage/api test src/__tests__/codecamp-review-router.test.ts` → **5 failed | 1 passed (6 total)** in 5.42s. Failing tests fail for the expected "inline OpenRouter call not yet replaced" reasons: (1) `getAIClient`/`createAIClient` mock call count is 0 (procedure never touches the seam), (2) `mockHolder.calls.length` is 0 (AIClient.generateObject never invoked), (3)+(4) `result.passed` is `false` and `result.summary` is the `[Mock review — LLM not configured]` no-key fallback string from `codecamp.ts:475` (AIClient fixture never reached the procedure), (5) AIClient rejection test resolves with the no-key fallback object instead of rejecting with `INTERNAL_SERVER_ERROR` (the inline `try/catch` swallows the AIClient error and the no-key path runs). The 1 passing test is the STUDENT `FORBIDDEN` admin-guard regression (test e) — `adminProcedure` already rejects non-admin callers, so that test passes today and continues to pass after Phase 4 Green. Red is properly Red; Green is owned by the next role.
  - **Marker note (2026-06-12 supervisor fix, attempt 2):** Task remains `[~]` after Red verification. Closing `[x]` is reserved for the Green task in this same phase — the Red deliverable is the test commit + re-verified fail count, not phase closure. The next role (Green) will flip this to `[x]` when both Green implementation and the full-filter Verify pass.
  - **Dirty-worktree stash (2026-06-12 supervisor fix, attempt 2):** Stashed `packages/auth/src/session.ts` to clean the worktree per the Red-phase boundary rule (MID must not leave dirty non-test/non-Measure files at phase-end). Stash name: `mid-phase4-fr1-session-validateSession-token-hardening-deferred-for-jr`. The FR-1 source change (returning the validated raw token instead of the DB-stored hash) is unrelated to this track and is preserved in the stash for the auth-security JR role to pick up. The JR can recover with `git stash pop` (will land as the top of the stash list) or re-implement from the FR-1 contract documented in the auth-security track plan. Test-file dirty (`packages/api/src/__tests__/reset-password.test.ts`, `as any` → `as unknown as Awaited<...>` cast tightening) is allowed by the boundary rule and remains in the worktree — it is from the same auth-security track but is a test file, not source.
- [x] Task: Replace the inline OpenRouter call in the router with `reviewExercise` + injected `AIClient`; use `adminProcedure` where the existing code expects admin.
  - Commit: `a272ae4f`
  - **Green phase (2026-06-12):** Replaced inline `createOpenAI({...})` + `generateObject(...)` + `generateReview` closure at `codecamp.ts:466-489` with `aiClientToGenerateReview(getAIClient(), reviewResultSchema)` — mirrors the Phase 3 webhook pattern (`github.ts:68-70`). Added `@reading-advantage/ai` to api `package.json`. Removed `import { generateObject } from "ai"` and `import { createOpenAI } from "@ai-sdk/openai"` (dead after repoint). Added `aiClientToGenerateReview` to the existing `@reading-advantage/domain/codecamp` import. Added `getAIClient` import from `@reading-advantage/ai`. Updated `codecamp-router.test.ts` mock to include `aiClientToGenerateReview` and `@reading-advantage/ai` mock (the existing test mocks the domain module and needed the new export). `reviewExercise` already uses `adminProcedure` — no change needed. All 6 codecamp-review-router tests pass (was 5/6 fail). Full api suite: 162 passed, 2 skipped. Domain: 282 passed, 5 skipped. Webhooks: 50 passed. Type-check clean for api, domain, webhooks, ai packages. Graph updated (`build-graph update` — edges 19→16, dead import edges removed).
- [x] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/api` green.
  - Commit: `a272ae4f`
  - **Green phase (2026-06-12):** 162 passed, 2 skipped. 0 failures.

## Phase 5: Delete Dead Code

> Phases 3 & 4 (commits `aab3471d`, `a272ae4f`) already removed the two inline
> OpenRouter implementations from `packages/webhooks/src/github.ts` and
> `packages/api/src/routers/codecamp.ts`. The Green work for this phase is the
> residual sweep: dead `vi.mock("@ai-sdk/openai", ...)` block, stale
> "current inline OpenRouter call" comments in the test files, and the
> `@ai-sdk/openai` / `ai` deps in `packages/webhooks/package.json` and
> `packages/api/package.json`.

- [x] Task: Remove both inline OpenRouter implementations and now-unused helpers/imports.
  - Commit: `3dc3167a`
- [x] Task: `grep -rn "openrouter\|OPENROUTER_API_KEY\|fetch(" packages/webhooks packages/api` over the review path — confirm zero residual direct model calls.
  - Commit: `3dc3167a` (verified clean — no residual direct model calls)
- [x] Task: Verify — type-check passes (no dangling imports).
  - Commit: `3dc3167a` (webhooks + api check-types clean)

### Phase 5 Red phase (2026-06-12)

- [x] Red task: Add `packages/webhooks/src/__tests__/phase-5-dead-code.test.ts` with 7 regression guards covering (a) the source files are clean of `createOpenAI` / `@ai-sdk/openai` / `OPENROUTER_API_KEY` / `openrouter` / `generateObject`, (b) the two review tests no longer carry the `vi.mock("@ai-sdk/openai", ...)` block and the stale "current inline" comments, (c) `packages/webhooks/package.json` and `packages/api/package.json` no longer declare `@ai-sdk/openai` or `ai` as dependencies. **This is the only test file created in Phase 5** — it sits in `packages/webhooks` because the package has the most concentrated residual dead code (the `vi.mock` block in `github-review.test.ts:173-175` is webhook-specific; the api test file only carries stale comments).
  - Commit: `d4e02a31` (test(measure): Phase 5 Red — assert review path has no dead OpenRouter code)
  - **Targeted Red command:** `cd packages/webhooks && ./node_modules/.bin/vitest run src/__tests__/phase-5-dead-code.test.ts`
  - **Result (attempt 1, original):** `Test Files  1 failed (1) / Tests  5 failed | 2 passed (7)` in 1.17s.
  - **Result (attempt 2, re-verification):** `Test Files  1 failed (1) / Tests  5 failed | 2 passed (7)` in ~1s.
  - **Result (attempt 3, re-verification):** `Test Files  1 failed (1) / Tests  5 failed | 2 passed (7)` in ~1s.
    Same 5 fail / 2 pass on every re-run — the Red state is stable; the 5 dead-code items are still on master and only the Green role's deletions will flip them to green.
  - **Failing tests (5) — the dead code is still present:**
    1. `github-review.test.ts no longer mocks @ai-sdk/openai` — the `vi.mock("@ai-sdk/openai", () => ({...}))` block at line 173-175 (Phase 3 dead code: no source file imports `@ai-sdk/openai` anymore).
    2. `github-review.test.ts contains no stale 'current inline OpenRouter call' comments` — the stale comment block at lines 302-310 that describes the (now-gone) inline OpenRouter implementation.
    3. `codecamp-review-router.test.ts contains no stale 'current inline OpenRouter call' comments` — same kind of stale comment at lines 143-150, 178-180.
    4. `packages/webhooks/package.json does not declare @ai-sdk/openai or ai (dead deps after the consolidation)` — `webhooks/package.json:19, 25` still declares `"@ai-sdk/openai": "^1.3.16"` and `"ai": "^4.3.9"`.
    5. `packages/api/package.json does not declare @ai-sdk/openai or ai (dead deps after the consolidation)` — `api/package.json:33, 41` still declares `"@ai-sdk/openai": "^1.3.16"` and `"ai": "^4.3.9"`.
  - **Passing tests (2) — regression guards for the source-side cleanup already completed in Phases 3 & 4:**
    1. `github.ts` has no inline vendor SDK call — proves Phase 3 Green stuck.
    2. `codecamp.ts` has no inline vendor SDK call — proves Phase 4 Green stuck.
  - **Live-behavior gate pairing:** the test-strategy's "no new tests" preference is preserved by making this an artifact (file-content) assertion. The live-behavior proof is the existing `pnpm turbo run {test,check-types,build}` gate that the Green role runs after deleting the dead code — the same test file is re-run and all 7 tests must pass.
  - **Dirty-worktree note:** `packages/api/src/__tests__/reset-password.test.ts` was dirty at MID start (cast tightening: `as any` → `as unknown as Awaited<...>`). Per the supervisor fix in Phase 4 attempt 2, this is a test file from the auth-security track (unrelated to this track). It is **preserved** in the worktree and the Phase 5 Red test does not touch it.

### Phase 5 Green phase (2026-06-12)

- **Green phase (2026-06-12):** Removed 5 dead-code items:
  - Commit: `3dc3167a`
  1. `vi.mock("@ai-sdk/openai", ...)` block + comment from `github-review.test.ts` (lines 169-175)
  2. Stale "current inline OpenRouter call" comments from `github-review.test.ts` (lines 301-305)
  3. Stale "current inline OpenRouter call" comments from `codecamp-review-router.test.ts` (lines 142-146, 177-180)
  4. `@ai-sdk/openai` + `ai` deps from `packages/webhooks/package.json`
  5. `@ai-sdk/openai` + `ai` deps from `packages/api/package.json`
  - **Targeted command:** `cd packages/webhooks && npx vitest run src/__tests__/phase-5-dead-code.test.ts` → **7 passed (7)** in 0.66s.
  - **Verify gate:** webhooks `pnpm test` → 57 passed. api `pnpm test` → 162 passed, 2 skipped. webhooks `check-types` → clean. api `check-types` → clean. (`@reading-advantage/auth` check-types fails at `session.ts:158` — pre-existing auth-security track issue, unrelated to this track.)

## Phase 6: Integration + Acceptance

### Phase 6 Red phase (2026-06-12, MID)

> **Approach:** Phase 6 is a verification + acceptance phase — the deliverable is
> the runnable proof that the consolidation from Phases 1-5 holds end-to-end.
> The test strategy says Phase 6's live gates (`build`, filtered turbo, real
> preflight, real e2e) are owned by the Green role. The MID Red-phase
> deliverable is therefore a single, bounded, runnable acceptance test that
> ties the Phase 1-5 deliverables together as the SPEC's acceptance criteria
> (AC #3 single seam, #4 no residual inline calls, #6 Mock-provider success
> + model-error, #7 reviewedAt terminal-stamping, #8 quality gates documented
> for the five filtered packages/app). Each test is paired with a plan note
> identifying which later role owns the corresponding live gate.

- [~] Task: Run the codecamp PR-review path against the Mock provider end-to-end (or `scripts/codecamp-pr-e2e.sh` if it can run with the Mock provider) and confirm identical persisted output to the documented unified version.
- [~] Task: Run the real-provider preflight from the deployment region and block rollout
  if the configured model is unavailable, region-blocked, or lacks tool-choice support.
- [~] Task: `pnpm turbo run build --filter=codecamp-advantage` (catches any server-only/client-bundle leak).
- [~] Task: Run all filtered gates: `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/ai --filter=@reading-advantage/webhooks --filter=@reading-advantage/api --filter=@reading-advantage/domain --filter=codecamp-advantage`; all exit 0.

**Red-phase test added (2026-06-12, MID attempt 2):** `packages/webhooks/src/__tests__/phase-6-acceptance.test.ts` with 5 tests:
1. **Behavior — Mock E2E** (Task 1): exercises the full webhook→domain→LLM→persist flow with the Mock provider; asserts the AIClient seam is called with `reviewResultSchema`, the prompt includes the diff, and the PR review row is persisted with the unified summary + `approved` status.
2. **Behavior — fire-and-forget** (Task 1): Mock AIClient rejection → 200 + `reviewed` status + "Review failed" summary. (Regression guard for the `runReview` IIFE `.catch` swallow.)
3. **Artifact — preflight credential-gate** (Task 2): asserts `packages/ai/src/providers/openrouter-preflight.test.ts` uses `it.skipIf(!process.env.OPENROUTER_API_KEY)` and validates against the canonical `reviewResultSchema` shape. Live run from the deployment region is the Green role's gate.
4. **Artifact — source clean of inline vendor SDK** (Task 3 / AC #4): asserts `packages/webhooks/src/github.ts` and `packages/api/src/routers/codecamp.ts` contain no `createOpenAI` / `@ai-sdk/openai` / `OPENROUTER_API_KEY` / `openrouter` / `generateObject` strings. This is the pre-condition for the live `pnpm turbo run build --filter=codecamp-advantage` gate (Green role).
5. **Artifact — filtered gates documented** (Task 4): asserts `plan.md` Phase 6 mentions all five filtered targets (`@reading-advantage/ai`, `@reading-advantage/webhooks`, `@reading-advantage/api`, `@reading-advantage/domain`, `codecamp-advantage`) and the `turbo run {test,check-types,build}` task list. Live exit-code run is the Green role's gate.

**Targeted Red command:** `cd packages/webhooks && npx vitest run src/__tests__/phase-6-acceptance.test.ts`

**Result (attempt 2, after fix):** `Test Files  1 passed (1) / Tests  5 passed (5)` in 3.93s.

**Result (attempt 1, original):** `Test Files  1 failed (1) / Tests  1 failed | 4 passed (5)` — the fire-and-forget test failed with `expected 'approved' to be 'reviewed'`. Root cause: the `mockHolder.reset()` method replaced `this.responses` with a new object, but the `generateObject` method read from the closure variable `responses` (the stale object). After `reset()`, `setThrowOnGenerateObject` modified the new object but `generateObject` read the old one — so the Mock returned the fixture instead of throwing. **Fix:** (a) `reset()` now mutates `this.responses.generateObject` in-place instead of replacing the object, and (b) `generateObject` reads from `this.responses` (not the closure variable) so all mutations are visible. Verified: 5/5 pass on re-run.

**Result (regression check, attempt 2):** `cd packages/webhooks && npx vitest run` → **62 passed (62)** in 10.29s. `cd packages/webhooks && npx tsc --noEmit` → clean.

**Why the test passes at HEAD (evidence, not false Red):** Phase 6 is a verification + acceptance phase, not an implementation phase. The implementation is already correct (Phases 1-5 closed all FRs). The test serves as the runnable proof that the SPEC's acceptance criteria hold, paired with plan notes identifying which later role owns the corresponding live gate (build, filtered turbo, real preflight, real e2e). If the test ever fails, that's the regression signal.

## Phase 7: Closeout
- [ ] Task: Mark `measure/tech-debt.md` 2026-05-15 "Duplicate `generateReview`" row **Resolved** with the resolving commit.
- [ ] Task: Add a lessons-learned entry if the A/B prompt reconciliation or OpenRouter-as-OpenAI-variant surfaced anything reusable.
- [ ] Task: Update `measure/tracks.md` (mark complete); move track dir to `measure/archive/`.
- [ ] Task: Commit with `git notes`.
