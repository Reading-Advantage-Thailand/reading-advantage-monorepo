# Plan: Consolidate Duplicate `generateReview` onto `packages/ai`

> Contract-First + TDD. Phase 0 re-establishes ground truth (the tech-debt line numbers
> are from 2026-05-15 and may be stale). Behavior-preserving refactor; the Mock provider
> makes the review path testable without API keys.

## Phase 0: Re-confirm Ground Truth
- [ ] Task: `grep -rn "openrouter\|OpenRouter\|generateReview\|OPENROUTER_API_KEY" packages/webhooks packages/api packages/domain` — record the actual current locations of the two review call sites (replaces the stale `github.ts:41` / `codecamp.ts:405`).
- [ ] Task: Read both call sites; diff their prompts + model params + error handling. Note every difference.
- [ ] Task: Read `packages/domain/.../reviewExercise` (the DI seam) and its current client parameter type.
- [ ] Task: Inspect `packages/ai/src/providers/` — does an OpenRouter provider exist? Record yes/no.
- [ ] Task: Decide + document the unified prompt/params (A, B, or a reconciled version).
- [~] Task: Reproduce and record the 2026-06-08 production failure: `xiaomi/mimo-v2.5`
  returns no endpoint supporting the required `tool_choice` request from the deployment
  region; record the successful `x-ai/grok-build-0.1` forced-tool probe as evidence, not
  as an unreviewed permanent model decision.

## Phase 1: OpenRouter Provider (if absent) — TDD
- [ ] Task: If missing, write `packages/ai/src/providers/openrouter.test.ts` against the Mock-style contract (success + error), expecting an OpenAI-compatible provider keyed by `baseURL` + `OPENROUTER_API_KEY`, with provider-prefix model-ID stripping.
- [ ] Task: Implement `openrouter.ts` (thin variant of the OpenAI provider with OpenRouter `baseURL`); register in `createAIClient`/`getAIClient`.
- [ ] Task: Add a bounded, credential-gated OpenRouter capability preflight for the
  configured review model using the exact forced-tool structured-output contract.
- [ ] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/ai` green.

## Phase 2: Confirm/Adapt the `reviewExercise` Seam — TDD
- [ ] Task: Write/extend a domain test that injects a Mock `AIClient` and asserts `reviewExercise` returns the typed review for a sample diff, and surfaces a model error correctly.
- [ ] Task: If `reviewExercise` does not yet accept an `AIClient`, adapt its DI param (keep the call shape backward-compatible).
- [ ] Task: Add a regression test for terminal `reviewedAt` stamping (pending re-trigger must not overwrite a prior terminal `reviewedAt`).
- [ ] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/domain` green.

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
