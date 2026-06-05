# Specification: Consolidate Duplicate `generateReview` onto `packages/ai`

## Overview

The codecamp-advantage PR-review feature calls an LLM (OpenRouter) to review intern pull
requests. There are **two near-identical implementations** of that call. This track
collapses them onto the single shared `AIClient` abstraction delivered by
`ai_adapter_package_20260603`, so there is exactly one place that talks to the model.

## Problem

From `measure/tech-debt.md` (2026-05-15, `codecamp_review`, **Medium, Open**):

> Duplicate `generateReview` LLM implementation. Two identical OpenRouter implementations:
> `webhooks/github.ts:41` and `api/routers/codecamp.ts:405`. Domain `reviewExercise` uses
> DI correctly. Fix: extract shared impl to a new `@reading-advantage/llm` or similar
> package.

Since that note was written, `packages/ai` (the `AIClient` interface + OpenAI/Google/Mock
providers) has landed (`ai_adapter_package_20260603`, committed `9c52c8a`). The right
"shared impl" already exists — this track points both call sites at it rather than
creating yet another package.

> **Phase 0 must re-confirm the exact locations and line numbers** — code may have moved
> since 2026-05-15. The spec treats the two call sites as a *count* (two), not as fixed
> coordinates.

## Why

- **One model seam.** Duplicated provider calls drift (different prompts, params, error
  handling, retry posture). A single `AIClient` path means provider swaps, prompt-caching,
  and observability happen once.
- **Reuse over new package.** `packages/ai` already provides the interface the tech-debt
  note asked for; no `@reading-advantage/llm` needed.
- **Testability.** The Mock provider makes the review path unit-testable without API keys
  (the pattern established in `ai_adapter_package`).

## Functional Requirements

### FR-1: OpenRouter Provider in `packages/ai` (if absent)
- Inspect `packages/ai/src/providers/`. If there is no OpenRouter provider, add one.
- OpenRouter exposes an OpenAI-compatible API, so prefer a thin variant of the existing
  OpenAI provider parameterized by `baseURL` + `OPENROUTER_API_KEY`, rather than a new
  SDK. Register it in `createAIClient`/`getAIClient`.
- Strip any provider-prefixed model IDs before dispatch (the documented `packages/ai`
  behavior, e.g. `openrouter/anthropic/claude-...`).

### FR-2: Single `reviewExercise` Seam
- The domain `reviewExercise` function already takes the model client via DI. Confirm it
  accepts an `AIClient` (or adapt it to). All review generation flows through it.
- Define/confirm the review contract: input (diff/PR metadata + rubric), output (typed
  review result), and how errors propagate.

### FR-3: Repoint Call Site A (webhook path)
- The webhook handler (reported `packages/webhooks/.../github.ts:41`) must call the shared
  path (`reviewExercise` with an injected `AIClient`) instead of constructing its own
  OpenRouter request.
- Behavior preserved: same prompt intent, same persisted review shape, same
  `reviewedAt`/status semantics (per the lessons-learned rule: only stamp `reviewedAt`
  when status is terminal).

### FR-4: Repoint Call Site B (tRPC/API path)
- The API router (reported `packages/api/.../routers/codecamp.ts:405`) must call the same
  shared path. Use `adminProcedure` where the existing code expects admin (defense in
  depth, per lessons-learned).

### FR-5: Delete the Dead Implementations
- After both call sites use the shared path, remove the two inline OpenRouter
  implementations and any now-unused helpers/imports.
- `grep` for residual direct `openrouter`/`fetch`-to-model usage in `packages/webhooks`
  and `packages/api`; there should be none for the review path.

## Non-Functional Requirements
- **No behavior change** to the produced review content beyond unification (prompts/params
  reconciled to a single agreed version; document if A and B differed).
- Mock-provider unit tests cover the review path without API keys.
- `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/ai
  --filter=@reading-advantage/webhooks --filter=@reading-advantage/api
  --filter=@reading-advantage/domain --filter=codecamp-advantage` exits 0.

## Acceptance Criteria
1. Phase 0 re-confirms the two call sites' current locations (recorded in the plan).
2. `packages/ai` has an OpenRouter-capable provider registered in the client factory.
3. `reviewExercise` is the single seam; both former call sites invoke it with an injected
   `AIClient`.
4. The two inline OpenRouter implementations are deleted; no residual direct model calls
   in the review path (verified by grep).
5. If prompts/params differed between A and B, the chosen unified version is documented in
   the track.
6. Mock-provider unit tests exercise the review path (success + model-error) with no API
   keys.
7. `reviewedAt`/status terminal-stamping behavior is preserved (regression test).
8. Quality gates green for the five filtered packages/app.

## Out of Scope
- Retry / dead-letter-queue reliability for the async review pipeline — that is the sibling
  track `webhook_review_reliability_20260605` (this track is a prerequisite: it gives that
  track one impl to make reliable).
- Changing the review *rubric* content or model choice (beyond reconciling A vs B).
- Migrating the content-generation call sites (recommendation-service, image-generator) —
  already done in `ai_adapter_package_20260603`.
- A new `@reading-advantage/llm` package — explicitly avoided; reuse `packages/ai`.

## Constraints & Risks
- **Risk: prompts/params silently differ between the two impls,** so unifying changes
  output. Mitigation: diff both prompts in Phase 0, pick one, document the decision, snap a
  before/after on a sample PR.
- **Risk: the webhook path is fire-and-forget;** swapping the client must not change its
  async/error posture. Mitigation: preserve the existing `.catch` handling; the reliability
  track owns improving it.
- **Risk: client-bundle leak** if a server-only model client is dragged into a client
  component (see the Prisma→Drizzle lessons). Mitigation: keep `AIClient` server-side;
  `import "server-only"` on the review module if needed; run `pnpm build`.

## References
- `measure/tech-debt.md` row 2026-05-15 `codecamp_review` "Duplicate `generateReview`"
- `packages/ai/` (committed `9c52c8a`; `AIClient`, providers, `createAIClient`)
- `measure/archive/ai_adapter_package_20260603/` (the package's spec/plan + patterns)
- `measure/archive/codecamp_review_remediation_20260515/` (review security/DI conventions)
- lessons-learned 2026-05-15 (`adminProcedure`, injection-prone fields, `reviewedAt`),
  2026-06-05 (`ai_adapter_package`: mock-provider tests, model-ID prefix stripping)
