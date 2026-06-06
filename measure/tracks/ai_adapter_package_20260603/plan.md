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

- [x] Task: Create `packages/ai/src/providers/mock.ts` implementing `AIClient`. (`9c52c8a`)
- [x] Task: Mock takes a `responses: { generateObject?: ..., generateImage?: ..., generateText?: ... }` config in the constructor. If a response is configured, return it; otherwise throw `ProviderNotConfiguredError`. (`9c52c8a`)
- [x] Task: Write failing tests: (`24659f3`)
  - `mock.generateObject({ schema, prompt: 'test' })` with a configured response returns the configured object.
  - `mock.generateImage({ prompt: 'test' })` with a configured response returns a Buffer.
  - `mock.generateText({ prompt: 'test' })` with no configured response throws.
  - `mock.generateObject` validates the response against the schema; invalid response throws `SchemaValidationError`.
- [x] Task: Implement. Confirm tests pass. (`abcac78`)
- [x] Task: Add snapshot test: feed a prompt, capture the response, snapshot for regression. (`abcac78`)

> **Red-phase notes (2026-06-06, mid-agent, commits `24659f3` → restructured by follow-up):** Existing code (commit `9c52c8a`) already
> ships `MockProvider`, the four basic mock tests (`src/providers/mock.test.ts`), and the
> production wiring. Phase 2 Red work adds the test-strategy §2 artifacts that the plan
> tasks above implicitly require but do not yet exist. All Red-phase artifacts live
> under `packages/ai/src/__tests__/` so the automation supervisor's Red-phase boundary
> check accepts them:
>   - `src/__tests__/recommendations.fixture.ts` (production-shape `recommendationSchema` fixture)
>   - `src/__tests__/diagram.fixture.ts` (1×1 PNG bytes exposed as `diagramBuffer` —
>     kept as a `.ts` module instead of a `.png` binary so vitest/tsc need no
>     asset-loader config; documented inline in the file)
>   - `src/__tests__/contract-suite.ts` (`runAIClientContract(makeClient)` harness for Phases 3–4)
>   - `src/__tests__/test-utils.ts` (`withEnv()` helper that snapshots/restores `process.env` + calls `resetAIClient()`)
>   - `src/__tests__/phase-2-mock-provider.test.ts` (new RED tests: `createTestClient` export, snapshot, contract-suite invocation)
>
> The new RED tests intentionally fail until the implementer adds `createTestClient` to
> `src/providers/mock.ts` (and re-exports it from `src/index.ts`).
>
> **Green-phase complete (2026-06-06, commit `abcac78`):** Added `createTestClient(overrides?)`
> factory to `src/providers/mock.ts` with default fixture set (recommendation object, diagram
> buffer, text output). Re-exported `createTestClient` and `MockResponses` from `src/index.ts`.
> All 44 tests pass including the 10 Phase 2 RED tests. Snapshots written.
>
> **Test gate note:** `npm test` (turbo run test) fails at monorepo level due to pre-existing
> failures in `www-reading-advantage` and `vocabulary-games` (unrelated to Phase 2). The
> targeted gate `@reading-advantage/ai:test` passes: 6 files, 44 tests, 0 failures. Use
> `pnpm vitest run` from `packages/ai/` or `turbo run test --filter=@reading-advantage/ai`.

## Phase 3: OpenAI Provider

> **GREEN TEST COMMAND: `npx turbo run test --filter=@reading-advantage/ai`**
> (NOT `npm test` — monorepo-level tests have pre-existing failures in
> `www-reading-advantage` and `vocabulary-games` unrelated to this track.)

> **Red-phase notes (2026-06-06, mid-agent):** Implementation already shipped in
> `feat(ai): commit shared packages/ai adapter package` (`9c52c8a`) and the
> basic delegation tests live in `src/providers/openai.test.ts`. The
> test-strategy §1 / §4 / §5.1 artifacts that the plan tasks implicitly
> require were never added — Phase 3 Red fills those gaps with
> `src/__tests__/phase-3-openai-provider.test.ts` so the Green-phase
> implementer (and any future regression) is held to the full contract:
>   1. `runAIClientContract` re-runs the Phase 2 contract suite against
>      the OpenAI provider (test-strategy §1 contract column).
>   2. Explicit-`apiKey` assertion: `createOpenAI` is constructed with
>      the constructor's `apiKey`, never from `process.env`
>      (test-strategy §5.1; G-3).
>   3. Architecture guardrail G-3: `src/providers/openai.ts` must not
>      `import "process"` (test-strategy §4).
>   4. Schema-validation boundary: provider surfaces
>      `AIClientError`/schema failure rather than silent passthrough
>      (test-strategy §3.3).
>   5. Gated real-network integration test (`skipIf(!OPENAI_API_KEY)`,
>      per test-strategy §1 integration + §5.7 "skipped, not hidden").
>
> Existing tasks 1–3 are implementation-only and were satisfied in
> `9c52c8a`; the Red-phase work below is the *test* coverage the
> test-strategy and FR-3/FR-5 require.
>
> **Green-phase complete (2026-06-06):** No new implementation needed — the
> `OpenAIProvider` class in `src/providers/openai.ts` already satisfies all
> Phase 3 Red tests from the original `9c52c8a` implementation. The Red-phase
> test additions (`280ce39`) confirm the existing code passes the full contract:
> 15 tests in `phase-3-openai-provider.test.ts` (14 pass, 1 skipped — gated
> integration), plus 4 delegation tests in `openai.test.ts`. Total suite:
> 58 passed, 1 skipped.
>
> **Test gate note:** Use `npx vitest run` from `packages/ai/` or
> `turbo run test --filter=@reading-advantage/ai`. Monorepo-level `npm test`
> has pre-existing failures in unrelated packages.

- [x] Task: Create `packages/ai/src/providers/openai.ts` implementing `AIClient` using `@ai-sdk/openai`. (`9c52c8a`)
- [x] Task: Constructor takes `{ apiKey, model?, organization? }`. **No `process.env` reads** — the API key is passed explicitly. (`9c52c8a`)
- [x] Task: `generateObject` uses Vercel AI SDK `generateObject` with the configured client. (`9c52c8a`)
- [x] Task: Write failing tests with the mock as the "openai" provider's underlying model (avoid real network): assert the OpenAI provider delegates to `generateObject` with the right schema and prompt. (`9c52c8a`, basic; expanded in Phase 3 Red — `280ce39`)
- [x] Task: Add a single integration test that hits the real OpenAI API (gated by `OPENAI_API_KEY` env in CI). Confirm response shape. (`280ce39`)
- [x] Task: Confirm tests pass. (58 passed, 1 skipped — gated integration; `fd279d4`)

## Phase 4: Google Provider

> **GREEN TEST COMMAND: `npx turbo run test --filter=@reading-advantage/ai`**
> (NOT `npm test` — monorepo-level tests have pre-existing failures in
> `www-reading-advantage` and `vocabulary-games` unrelated to this track.)

> **Red-phase notes (2026-06-06, mid-agent):** Implementation already shipped in
> `feat(ai): commit shared packages/ai adapter package` (`9c52c8a`) and the
> basic delegation tests live in `src/providers/google.test.ts` (4 tests).
> The test-strategy §1 / §4 / §5.1 artifacts that the plan tasks implicitly
> require are missing — Phase 4 Red fills those gaps with
> `src/__tests__/phase-4-google-provider.test.ts` so the Green-phase
> implementer (and any future regression) is held to the full contract:
>   1. `runAIClientContract` re-runs the Phase 2 contract suite against
>      the Google provider (test-strategy §1, contract column).
>   2. Explicit-`apiKey` assertion: `createGoogleGenerativeAI` is
>      constructed with the constructor's `apiKey`, never from
>      `process.env.GOOGLE_API_KEY` / `GEMINI_API_KEY` (test-strategy
>      §5.1; G-3).
>   3. Architecture guardrail G-3: `src/providers/google.ts` must not
>      `import "process"` (test-strategy §4).
>   4. Schema-validation boundary: provider surfaces
>      `AIClientError`/schema failure rather than silent passthrough
>      (test-strategy §3.3).
>   5. Gated real-network integration test (`skipIf(!GEMINI_API_KEY)`,
>      per test-strategy §1 integration + §5.7 "skipped, not hidden").
>   6. Google-specific default-model assertions: text/object default
>      is `gemini-2.5-flash`; image default is
>      `gemini-2.0-flash-preview-image-generation`; no `organization`
>      concept is forwarded.
>
> Existing tasks 1–3 are implementation-only and were satisfied in
> `9c52c8a`; the Red-phase work below is the *test* coverage the
> test-strategy and FR-3 require.
>
> **Green-phase complete (2026-06-06, commit `d0d5da2`):** No new
> implementation needed — the `GoogleProvider` class in
> `src/providers/google.ts` already satisfies all Phase 4 Red tests
> from the original `9c52c8a` implementation. The Red-phase test
> additions (`d0d5da2`) confirm the existing code passes the full
> contract: 15 tests in `phase-4-google-provider.test.ts` (14 pass, 1
> skipped — gated integration), plus 4 delegation tests in
> `google.test.ts`. Total suite for `@reading-advantage/ai`: 73 passed,
> 2 skipped across 8 test files.
>
> **Test gate note:** Use `npx vitest run` from `packages/ai/` (pnpm is
> not installed in this sandbox; `turbo run test --filter=...` reports
> "cannot find binary path" for the same reason). Monorepo-level
> `npm test` has pre-existing failures in unrelated packages
> (`vocabulary-games` performance benchmark + GameEndScreen;
> `www-reading-advantage` 0-test files). The GREEN TEST COMMAND for
> this track is `npx vitest run` from `packages/ai/`, NOT `npm test`.

- [x] Task: Create `packages/ai/src/providers/google.ts` implementing `AIClient` using `@ai-sdk/google`. (`9c52c8a`)
- [x] Task: Same pattern as OpenAI provider; constructor takes `{ apiKey, model? }`. (`9c52c8a`)
- [x] Task: Write failing tests with the mock as the underlying model. (basic delegation: `9c52c8a`; full contract: `d0d5da2` — 14 pass + contract suite, 1 gated skip)
- [x] Task: Add a single integration test gated by `GEMINI_API_KEY` env. (`d0d5da2`)
- [x] Task: Confirm. (73 passed, 2 skipped across 8 test files in `@reading-advantage/ai`; `d0d5da2`)

## Phase 5: Provider Selector

> **GREEN TEST COMMAND: `npx vitest run` from `packages/ai/`**
> (NOT `npm test` — monorepo-level tests have pre-existing failures in
> `www-reading-advantage` and `vocabulary-games` unrelated to this track.)

> **Red-phase notes (2026-06-06, mid-agent):** Implementation already shipped in
> `feat(ai): commit shared packages/ai adapter package` (`9c52c8a`) and the
> basic delegation tests live in `src/client.test.ts` (9 tests using
> `vi.stubEnv`/`vi.unstubAllEnvs`). The test-strategy §1 / §3.1 / §3.4 / §5
> artifacts that the plan tasks implicitly require are missing — Phase 5 Red
> fills those gaps with `src/__tests__/phase-5-provider-selector.test.ts`
> so the Green-phase implementer (and any future regression) is held to the
> full env-matrix contract:
>   1. Env-matrix table-driven tests via `describe.each` covering
>      `{AI_PROVIDER, OPENAI_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY,
>      NODE_ENV}` × expected client or thrown error, all wrapped in the
>      `withEnv()` helper (test-strategy §1 row 5, §3.1, §3.4, §5).
>   2. Explicit plan task 4 scenarios re-codified under the
>      `withEnv()` pattern (mock by `AI_PROVIDER`, openai via
>      `AI_PROVIDER`+`OPENAI_API_KEY`, no-env production throw, no-env
>      test default).
>   3. Singleton identity + `resetAIClient()` behaviour (test-strategy
>      §3.1: singleton state must not leak between tests).
>   4. G-4 barrel-export assertion: `src/index.ts` re-exports
>      `createAIClient`, `getAIClient`, `resetAIClient`, the three error
>      classes, `MockProvider`, and (per Phase 2/3/4 additions)
>      `createTestClient`, `OpenAIProvider`, `GoogleProvider`
>      (test-strategy §4 G-4).
>   5. Static check: `client.ts` declares an `AIConfig` Zod schema with
>      `provider`, `apiKey`, `model`, `organization` keys and a default
>      `provider` of `'openai'` (test-strategy §1 row 5 + plan task 2).
>
> Existing tasks 1–3 are implementation-only and were satisfied in
> `9c52c8a`; the Red-phase work below is the *test* coverage the
> test-strategy and FR-2/FR-6 require.

- [~] Task: Create `packages/ai/src/client.ts` with `createAIClient(config: AIConfig)` and `getAIClient()` lazy singleton. (`9c52c8a` — implementation present; Red-phase test addition in progress)
- [~] Task: `AIConfig` Zod schema: `{ provider: z.enum(['openai', 'google', 'mock']).default('openai'), apiKey: z.string().optional(), model: z.string().optional(), organization: z.string().optional() }`. (`9c52c8a` — implementation present; Red-phase test addition in progress)
- [~] Task: `getAIClient()` reads `AI_PROVIDER`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_RECOMMENDER_MODEL` from `process.env` (via the validated `env` from Track 7, when available) and constructs the right provider. (`9c52c8a` reads the first three; `AI_RECOMMENDER_MODEL` is gated on Track 7's env validator — out of Phase 5 scope)
- [~] Task: Write failing tests:
  - `getAIClient()` with `AI_PROVIDER='mock'` returns the mock provider.
  - `getAIClient()` with `AI_PROVIDER='openai'` + `OPENAI_API_KEY='test-key'` returns the OpenAI provider.
  - `getAIClient()` with no env vars + `NODE_ENV='production'` throws `ProviderNotConfiguredError`.
  - `getAIClient()` with no env vars + `NODE_ENV='test'` returns the mock provider.
  - Plus the full env-matrix from test-strategy §3.4, wrapped in `withEnv()` and driven by `describe.each`.
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
