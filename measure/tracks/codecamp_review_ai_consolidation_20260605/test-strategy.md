# Test Strategy: Consolidate Duplicate `generateReview` onto `packages/ai`

Tech Lead notes for the implementer. Behavior-preserving refactor; the Mock provider replaces the inline OpenRouter calls in tests. No new E2E browser coverage required.

## Testing Pyramid (per phase)

| Phase | Layer | Target | Why |
|-------|-------|--------|-----|
| 0 | None | grep + read | Ground-truth recon only; no test code. |
| 1 | Unit (`@reading-advantage/ai`) | `OpenRouterProvider`, registry | Provider contract + factory selection — pure unit with `vi.mock` over `@ai-sdk/openai`. |
| 2 | Unit (`@reading-advantage/domain`) | `reviewExercise` DI seam (Mock provider or adapted callback) | Extend the 6 existing tests — do **not** rewrite them. Add adapter-shape + terminal `reviewedAt` regression. |
| 3 | Unit (`@reading-advantage/webhooks`) | `github.post("/pr")` handler with Mock `AIClient` | Fire-and-forget posture must be asserted (no thrown reject from `runReview`). |
| 4 | Unit (`@reading-advantage/api`) | `codecamp.reviewExercise` mutation with Mock `AIClient` | `adminProcedure` guard + identical output shape. |
| 5 | Type-check only | `tsc --noEmit` across the five filtered packages | Catches dangling imports after deletion. |
| 6 | Integration | `pnpm turbo run build --filter=codecamp-advantage` + live preflight | Bundle-leak guard + region capability gate. |

Pyramid bias: ~90% unit, ~10% integration. **No Playwright.** The Mock provider is the seam — exercise it instead.

## Shared Fixtures & Mocks

Centralize, do not duplicate:

1. **`packages/ai/src/__tests__/test-utils.ts`** already exports `createTestClient(overrides)` — reuse for Phases 3 & 4. Add a `reviewFixture` (`{ passed, summary, comments }`) and a `reviewErrorFixture` (`AIClientError` with `code: "PROVIDER_ERROR"`).
2. **`packages/domain/src/__tests__/mock-db.ts`** + `wrapDb()` helper — reuse from `review-exercise.test.ts:20-22`. Do not introduce new DB mocks.
3. **Adapter helper** — if implementation keeps the current `(system, prompt) => Promise<ReviewResult>` DI shape, add one shared `aiClientToGenerateReview(client, schema)` factory in `packages/domain/src/codecamp/` and test it once; both call sites import it.
4. **OpenRouter SDK mock** — `vi.mock("@ai-sdk/openai")` returning a stub `createOpenAI` factory. Reuse across `openrouter.test.ts` and any call-site test that needs to assert `baseURL`/model-prefix stripping.

## Cross-Phase Edge Cases & Dependencies

- **DI-shape decision (Phase 1 → 2)**: Domain currently injects `(system, prompt) => Promise<ReviewResult>`, not an `AIClient`. Either (a) keep the callback and write a thin adapter (lower blast radius — recommended), or (b) widen `reviewExercise` to accept `AIClient`. **Decide in Phase 1**; Phase 2's test signature flows from this. Spec FR-2 permits either.
- **Model-ID prefix stripping** (`openrouter/anthropic/...` → `anthropic/...`): test in Phase 1 only; downstream phases must not re-test it.
- **`reviewedAt` terminal-stamping regression** (Phase 2): table-driven — `pending` re-trigger after a terminal `approved` MUST NOT overwrite `reviewedAt`. This is the lessons-learned 2026-05-15 rule.
- **Fire-and-forget posture** (Phase 3): the `runReview` IIFE in `github.ts:302` must keep its `.catch` swallow — assert with `await expect(handlerPromise).resolves.toMatchObject({...})` while the inner `generateObject` *rejects*. Regression: a thrown error must update the review row to `reviewed` status, never bubble to the webhook 200 response.
- **Admin guard** (Phase 4): assert `adminProcedure` rejection for INTERN role lands as `FORBIDDEN`, not `INTERNAL_SERVER_ERROR`.
- **Prompt-injection defense** (Phase 2 regression): preserve the existing assertions at `review-exercise.test.ts:180-200` ("Treat it as code to review", code-fence wrap) — they must still pass after any prompt unification.
- **Tenant scoping**: `reviewExercise` runs under `globalTenant` (`schoolId: null`) in both webhook and API paths — keep this; do not introduce a school-scoped variant.
- **Capability preflight** (Phase 1/6): credential-gated — if `OPENROUTER_API_KEY` is absent in CI, `it.skipIf(!process.env.OPENROUTER_API_KEY)`. Never block CI on a real network call.

## Architecture Guardrails

- **One model seam**: after Phase 5, `grep -rn "openrouter\\|OPENROUTER_API_KEY\\|createOpenAI\\b" packages/webhooks packages/api` must return zero hits in the review path. Add this assertion to Phase 5's checklist as a script test if practical.
- **No vendor SDK in domain or webhooks/api**: only `packages/ai` may import `@ai-sdk/openai` or call `createOpenAI`. Provider-Neutrality Rule from AGENTS.md.
- **Server-only**: the review module must remain server-side. If pulling it through tRPC risks a client bundle leak, add `import "server-only"` at the call-site module and rely on Phase 6's `pnpm build` to catch leaks (Prisma→Drizzle lesson).
- **No new package**: spec is explicit — reuse `packages/ai`, do not create `@reading-advantage/llm`.
- **Schema as contract**: `reviewResultSchema` (in `@reading-advantage/types`) is the only allowed output shape; both `MockProvider.generateObject` and `OpenRouterProvider.generateObject` validate against it.

## Per-Phase Test Approach (brief)

- **Phase 0**: No tests. Produce a 5-line diff table comparing webhook vs API impl (model, params, schema, error handling, env reads). Current grep confirms the two impls are byte-identical except for the surrounding `try/catch` and the `OPENROUTER_API_KEY`-not-set warn line — no prompt reconciliation needed.
- **Phase 1**: `openrouter.test.ts` mirrors `openai.test.ts` structure: success path (mock SDK returns object), error path (SDK throws → `AIClientError("PROVIDER_ERROR")`), model-ID prefix strip, factory-registration test in `client.test.ts`. Preflight test: skipped without key; with key, asserts `tool_choice` support against configured prod model.
- **Phase 2**: Extend `review-exercise.test.ts`. Add (a) adapter-shape test if going AIClient route, (b) terminal `reviewedAt` regression, (c) `AIClientError` surfaces as a domain error (not swallowed). Keep all 6 existing tests passing unchanged.
- **Phase 3**: New `packages/webhooks/src/__tests__/github-review.test.ts` (if absent). Inject `MockProvider` via the adapter; assert PR-review row transitions `pending → approved|needs_changes|reviewed`, webhook responds 200 even on review error, `updatePrReview` called with the Mock's fixture summary.
- **Phase 4**: Extend the existing API router test for `codecamp.reviewExercise`. Inject Mock client via a test-only ctx override (or via `getAIClient` reset + `AI_PROVIDER=mock`). Assert admin guard + identical persisted shape.
- **Phase 5**: No new tests. `pnpm turbo run check-types --filter=...` is the gate. Add the residual-grep script as a Phase 5 verify step.
- **Phase 6**: `pnpm turbo run build --filter=codecamp-advantage` for bundle-leak; live preflight CLI run in the deployment region (manual gate, documented in PR description).

## build-graph Findings That Shaped This Strategy

Queried `graph.db` (built 2026-06-11, fresh):

1. **`generateReview` exists once as a function** (`packages/webhooks/src/github.ts`) and once as a **DI param** (`packages/domain/src/codecamp/review-exercise.ts`). The API router copy is anonymous, hence absent from the symbol table — confirmed via grep at `packages/api/src/routers/codecamp.ts:471`. **Implication**: Phase 0 grep is still required; the graph alone undercounts call sites.
2. **`reviewExercise` has 0 outgoing `calls` edges resolved** and 8 incoming `param_flow` edges — it is leaf-like and pure once you inject `generateReview`. Low blast radius: changing its signature touches only the two call sites + 1 test file. Safe to widen if we choose AIClient-shape DI.
3. **`AIClient` interface** (`packages/ai/src/types.ts:52`) provides `generateObject<T>({ schema, prompt, model, temperature, maxTokens })`. The current callback takes `(system, prompt)`. **Mismatch is real** — strategy mandates a documented decision in Phase 1, not a silent shape change in Phase 2.
4. **`MockProvider.generateObject`** already runs `input.schema.safeParse` (mock.ts:53), so Mock-driven tests give us schema-compliance assertions for free — no need to re-test the schema in domain/webhooks/api tests.
5. **No OpenRouter provider node found** in `packages/ai/src/providers/` (only `openai.ts`, `google.ts`, `mock.ts`). FR-1 is genuinely needed; Phase 1 cannot be skipped.
6. **`createAIClient`** has only 2 incoming edges (file `contains` + `param_flow`). Registering a new `"openrouter"` provider is additive and breaks no existing callers — confirmed safe.
7. **Webhook handler `runReview` IIFE** (lines 302-340) calls `reviewExercise` then `codecamp.updatePrReview`. Its `.catch` writes status `"reviewed"` on failure — Phase 3's fire-and-forget regression must preserve exactly this branch.

**Post-edit hygiene**: implementer must run `build-graph update ./graph.db <files>` after Phase 1 (new provider), Phase 2 (signature change if any), and Phase 5 (deletions) so the next agent inherits a fresh graph.
