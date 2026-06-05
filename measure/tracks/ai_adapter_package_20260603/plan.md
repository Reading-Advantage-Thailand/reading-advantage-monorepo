# Plan: Shared `packages/ai` + `lib/ai/` Refactor

> TDD-first. Mock provider is implemented first; OpenAI and Google providers are tested against the mock's interface contract.

## Phase 0: Setup

- [x] Task: Confirm `packages/` directory has no `ai/` package today. Initialize `packages/ai/` with `package.json`, `tsconfig.json` (extending monorepo shared config), and `src/index.ts` barrel. (`a5ed0b9`)
- [x] Task: Add `@node-rs/argon2` and `ai` / `@ai-sdk/openai` / `@ai-sdk/google` to `packages/ai/package.json` `dependencies`. Pin versions per AGENTS.md §Version Policy. (`a5ed0b9`)
- [x] Task: Add to monorepo root `pnpm-workspace.yaml` if not already. (`a5ed0b9`)
- [x] Task: Pull `apps/science-advantage`; confirm baseline tests pass. (`b628bdb`, `a1b9272` — fixed ImageModelV2 type error, updated mocks, increased vitest timeout for turbo parallel)

## Phase 1: `AIClient` Interface

- [x] Task: Create `packages/ai/src/types.ts` with the `AIClient` interface, `GenerateObjectInput`, `GenerateImageInput`, `GenerateTextInput` (FR-1). (`9c52c8a`)
- [x] Task: Create `packages/ai/src/errors.ts` with `AIClientError`, `ProviderNotConfiguredError`, `SchemaValidationError`. (`9c52c8a`)
- [x] Task: Export from `packages/ai/src/index.ts` barrel. (`9c52c8a`)
- [x] Task: Phase 1 Red — type-level contract codified in `packages/ai/src/__tests__/phase-1-interface.test-d.ts` using `expectTypeOf` against FR-1/FR-2/FR-3. Verified by the existing Phase 0 build smoke (`tsc --noEmit` from `packages/ai/`); drift probe confirmed `tsc` exits non-zero on a deliberately wrong assertion. (`769b6ba`)
- [x] Fix: vitest RPC timeout under turbo — added `hookTimeout`/`teardownTimeout` to `vitest.config.ts`. (`1c4c8fa`)
- [x] Fix: phase-0 tsc smoke test blocks vitest worker — switched `execSync` to async `exec` to allow RPC processing. (`a9b7eee`)

## Phase 2: Mock Provider

- [~] Task: Create `packages/ai/src/providers/mock.ts` implementing `AIClient`.
- [~] Task: Mock takes a `responses: { generateObject?: ..., generateImage?: ..., generateText?: ... }` config in the constructor. If a response is configured, return it; otherwise throw `ProviderNotConfiguredError`.
- [~] Task: Write failing tests:
  - `mock.generateObject({ schema, prompt: 'test' })` with a configured response returns the configured object.
  - `mock.generateImage({ prompt: 'test' })` with a configured response returns a Buffer.
  - `mock.generateText({ prompt: 'test' })` with no configured response throws.
  - `mock.generateObject` validates the response against the schema; invalid response throws `SchemaValidationError`.
- [~] Task: Implement. Confirm tests pass.
- [~] Task: Add snapshot test: feed a prompt, capture the response, snapshot for regression.

> **Red-phase notes (2026-06-06, mid-agent, commit `24659f3`):** Existing code (commit `9c52c8a`) already
> ships `MockProvider`, the four basic mock tests (`src/providers/mock.test.ts`), and the
> production wiring. Phase 2 Red work adds the test-strategy §2 artifacts that the plan
> tasks above implicitly require but do not yet exist:
>   - `src/__fixtures__/recommendations.ts` (production-shape `recommendationSchema` fixture)
>   - `src/__fixtures__/diagram.ts` (1×1 PNG bytes exposed as `diagramBuffer` —
>     kept as a `.ts` module instead of a `.png` binary so vitest/tsc need no
>     asset-loader config; documented inline in the file)
>   - `src/__fixtures__/contract-suite.ts` (`runAIClientContract(makeClient)` harness for Phases 3–4)
>   - `src/__tests__/test-utils.ts` (`withEnv()` helper that snapshots/restores `process.env` + calls `resetAIClient()`)
>   - `src/__tests__/phase-2-mock-provider.test.ts` (new RED tests: `createTestClient` export, snapshot, contract-suite invocation)
> The new RED tests intentionally fail until the implementer adds `createTestClient` to
> `src/providers/mock.ts` (and re-exports it from `src/index.ts`).

## Phase 3: OpenAI Provider

- [ ] Task: Create `packages/ai/src/providers/openai.ts` implementing `AIClient` using `@ai-sdk/openai`.
- [ ] Task: Constructor takes `{ apiKey, model?, organization? }`. **No `process.env` reads** — the API key is passed explicitly.
- [ ] Task: `generateObject` uses Vercel AI SDK `generateObject` with the configured client.
- [ ] Task: Write failing tests with the mock as the "openai" provider's underlying model (avoid real network): assert the OpenAI provider delegates to `generateObject` with the right schema and prompt.
- [ ] Task: Add a single integration test that hits the real OpenAI API (gated by `OPENAI_API_KEY` env in CI). Confirm response shape.
- [ ] Task: Confirm tests pass.

## Phase 4: Google Provider

- [ ] Task: Create `packages/ai/src/providers/google.ts` implementing `AIClient` using `@ai-sdk/google`.
- [ ] Task: Same pattern as OpenAI provider; constructor takes `{ apiKey, model? }`.
- [ ] Task: Write failing tests with the mock as the underlying model.
- [ ] Task: Add a single integration test gated by `GEMINI_API_KEY` env.
- [ ] Task: Confirm.

## Phase 5: Provider Selector

- [ ] Task: Create `packages/ai/src/client.ts` with `createAIClient(config: AIConfig)` and `getAIClient()` lazy singleton.
- [ ] Task: `AIConfig` Zod schema: `{ provider: z.enum(['openai', 'google', 'mock']).default('openai'), apiKey: z.string().optional(), model: z.string().optional(), organization: z.string().optional() }`.
- [ ] Task: `getAIClient()` reads `AI_PROVIDER`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_RECOMMENDER_MODEL` from `process.env` (via the validated `env` from Track 7, when available) and constructs the right provider.
- [ ] Task: Write failing tests:
  - `getAIClient()` with `AI_PROVIDER='mock'` returns the mock provider.
  - `getAIClient()` with `AI_PROVIDER='openai'` + `OPENAI_API_KEY='test-key'` returns the OpenAI provider.
  - `getAIClient()` with no env vars + `NODE_ENV='production'` throws `ProviderNotConfiguredError`.
  - `getAIClient()` with no env vars + `NODE_ENV='test'` returns the mock provider.
- [ ] Task: Confirm.

## Phase 6: Refactor `lib/ai/recommendation-service.ts`

- [ ] Task: Write a failing test for the new `RecommendationService` class (constructor takes `AIClient`; `getRecommendation(input)` calls `client.generateObject(...)`).
- [ ] Task: Replace the direct `generateObject` import with `getAIClient().generateObject(...)`.
- [ ] Task: Refactor the existing `generateRecommendation(input)` exported function into a thin wrapper that calls the service.
- [ ] Task: Update the call site `app/api/ai/recommendations/route.ts:21` to use the new wrapper (or the service directly).
- [ ] Task: Run `pnpm turbo run test --filter=science-advantage`; the existing tests should still pass (the wrapper preserves the public API).

## Phase 7: Refactor `lib/ai/image-generator.ts`

- [ ] Task: Write a failing test for the new `ImageGenerator` class (constructor takes `AIClient`; `generateDiagram(input)` calls `client.generateImage(...)`).
- [ ] Task: **Remove the `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY` mutation** in `ensureApiKey()`. The API key is passed via the `AIClient` constructor (set in Phase 5 by `getAIClient()`).
- [ ] Task: Refactor the existing `generateLessonDiagram(input)` exported function into a thin wrapper.
- [ ] Task: Update call sites in `components/features/lesson/blocks/image-block.tsx` etc.
- [ ] Task: Run `pnpm turbo run test --filter=science-advantage`; confirm.

## Phase 8: Remove Direct Provider SDK Deps

- [ ] Task: Remove `ai`, `@ai-sdk/openai`, `@ai-sdk/google` from `apps/science-advantage/package.json` `dependencies`.
- [ ] Task: Add `@reading-advantage/ai` to `dependencies` (workspace:*).
- [ ] Task: `pnpm install` from monorepo root; verify no errors.
- [ ] Task: Grep gate: `rg "from ['\"]@?ai['\"]|from ['\"]@ai-sdk" apps/science-advantage/` returns 0 hits.
- [ ] Task: Grep gate: `rg "process\.env\.(OPENAI_API_KEY|GOOGLE_API_KEY|GEMINI_API_KEY)" apps/science-advantage/lib/ai/` returns 0 hits.

## Phase 9: Update Docs

- [ ] Task: Update `apps/science-advantage/docs/specs/ai-structured-data-generation/spec.md:79-86` to reference `@reading-advantage/ai` interface.
- [ ] Task: Update `apps/science-advantage/docs/ai-image-generation.md:9` similarly.
- [ ] Task: Write `packages/ai/README.md` with provider config examples.

## Phase 10: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-101, F-202 `Resolved`.
- [ ] Task: Add a lessons-learned entry: "The mock provider with snapshot tests is the unit-test pattern; the real provider is integration-tested only with API keys present in env."
- [ ] Task: Move track to `measure/archive/ai_adapter_package_20260603/` and update `measure/tracks.md`.
