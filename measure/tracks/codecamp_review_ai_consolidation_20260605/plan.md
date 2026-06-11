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
- [x] Task: Add a bounded, credential-gated OpenRouter capability preflight for the
  configured review model using the exact forced-tool structured-output contract.
  - Commit: `92eeca19`
- [x] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/ai` green.
  - Commit: `92eeca19`

## Phase 2: Confirm/Adapt the `reviewExercise` Seam — TDD
- [x] Task: Write/extend a domain test that injects a Mock `AIClient` and asserts `reviewExercise` returns the typed review for a sample diff, and surfaces a model error correctly.
  - Commit: `d5130fd8`
- [x] Task: If `reviewExercise` does not yet accept an `AIClient`, adapt its DI param (keep the call shape backward-compatible).
  - Commit: `d5130fd8` (tests), `1bba0fdc` (implementation)
- [x] Task: Add a regression test for terminal `reviewedAt` stamping (pending re-trigger must not overwrite a prior terminal `reviewedAt`).
  - Commit: `d5130fd8`
- [x] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/domain` green.
  - **Green phase (2026-06-11):** Added `AIClientLike` interface + `aiClientToGenerateReview` adapter factory to `packages/domain/src/codecamp/review-exercise.ts`. All 281 tests pass, 0 failures, 5 skip.

## Phase 3: Repoint Call Site A (webhook) — TDD
- [ ] Task: Write/extend a webhook test (Mock `AIClient`) asserting the handler persists the same review shape and preserves the fire-and-forget `.catch` posture.
- [ ] Task: Replace the inline OpenRouter call in the webhook handler with `reviewExercise` + injected `AIClient`.
- [ ] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/webhooks` green.

## Phase 4: Repoint Call Site B (tRPC/API) — TDD
- [ ] Task: Write/extend a router test (Mock `AIClient`) asserting the procedure returns the unified review and is admin-guarded where required.
- [ ] Task: Replace the inline OpenRouter call in the router with `reviewExercise` + injected `AIClient`; use `adminProcedure` where the existing code expects admin.
- [ ] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/api` green.

## Phase 5: Delete Dead Code
- [ ] Task: Remove both inline OpenRouter implementations and now-unused helpers/imports.
- [ ] Task: `grep -rn "openrouter\|OPENROUTER_API_KEY\|fetch(" packages/webhooks packages/api` over the review path — confirm zero residual direct model calls.
- [ ] Task: Verify — type-check passes (no dangling imports).

## Phase 6: Integration + Acceptance
- [ ] Task: Run the codecamp PR-review path against the Mock provider end-to-end (or `scripts/codecamp-pr-e2e.sh` if it can run with the Mock provider) and confirm identical persisted output to the documented unified version.
- [ ] Task: Run the real-provider preflight from the deployment region and block rollout
  if the configured model is unavailable, region-blocked, or lacks tool-choice support.
- [ ] Task: `pnpm turbo run build --filter=codecamp-advantage` (catches any server-only/client-bundle leak).
- [ ] Task: Run all filtered gates: `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/ai --filter=@reading-advantage/webhooks --filter=@reading-advantage/api --filter=@reading-advantage/domain --filter=codecamp-advantage`; all exit 0.

## Phase 7: Closeout
- [ ] Task: Mark `measure/tech-debt.md` 2026-05-15 "Duplicate `generateReview`" row **Resolved** with the resolving commit.
- [ ] Task: Add a lessons-learned entry if the A/B prompt reconciliation or OpenRouter-as-OpenAI-variant surfaced anything reusable.
- [ ] Task: Update `measure/tracks.md` (mark complete); move track dir to `measure/archive/`.
- [ ] Task: Commit with `git notes`.
