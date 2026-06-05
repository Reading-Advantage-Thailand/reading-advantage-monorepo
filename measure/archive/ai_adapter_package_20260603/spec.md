# Specification: Shared `packages/ai` + `lib/ai/` Refactor

## Overview

Extract the AI provider coupling out of `apps/science-advantage/lib/ai/` into a shared `packages/ai` package with an `AIClient` interface that abstracts over `@ai-sdk/openai`, `@ai-sdk/google`, and a `mock` provider for tests. Refactor the existing `lib/ai/recommendation-service.ts` and `image-generator.ts` to depend on the interface, not on provider SDKs. Removes the direct `process.env` mutation in `image-generator.ts:30,39` and makes the AI surface unit-testable without a real network. Fulfills AGENTS.md §AI ("AI access must go through an internal adapter") and §1.1 ("No direct provider SDK imports").

## Problem

Audited 2026-06-03. Findings F-101 (Medium) + F-202 (Low):

- `apps/science-advantage/lib/ai/recommendation-service.ts:2-4` — `import { generateObject } from 'ai'`, `import { createOpenAI } from '@ai-sdk/openai'`, `import { createGoogleGenerativeAI } from '@ai-sdk/google'`.
- `apps/science-advantage/lib/ai/recommendation-service.ts:55-61` — provider client instantiated directly, gated only by env-var API-key presence.
- `apps/science-advantage/lib/ai/recommendation-service.ts:63-76` — `resolveModel()` branches on model-id string prefix (`gemini` vs default), not on an injected `AIClient` reference.
- `apps/science-advantage/lib/ai/image-generator.ts:1` — `import { experimental_generateImage } from 'ai'`.
- `apps/science-advantage/lib/ai/image-generator.ts:34-42` — `ensureApiKey()` mutates `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY` at call time to satisfy the AI SDK's env-var lookup. **Fragile**: concurrent requests with unset env vars would race.
- `apps/science-advantage/lib/ai/image-generator.ts:106-115` — `generateWithModel()` passes the raw model-id string straight to `experimental_generateImage`.
- `apps/science-advantage/package.json:22,23,37` — `@ai-sdk/google`, `@ai-sdk/openai`, `ai` are direct app dependencies.
- **No `AIClient` / `AIClientProvider` / `LLMClient` interface** is exported anywhere in `lib/ai/`.
- The positive reference (the model to mirror) is `lib/platform/redis-client.ts:3` (`RedisClient` interface), `lib/platform/cache-adapter.ts:1,14` (`RedisLike` + `CacheAdapter`), `lib/platform/rate-limit-store.ts:1` (`RateLimitStore`), `lib/platform/session-cleanup.ts:1` (`SessionStore`).

## Why

- AGENTS.md §AI has mandated the adapter pattern since the monorepo was scaffolded. This track is the implementation.
- A shared `packages/ai` is reusable across all 6 apps. One PR lands the infrastructure; future apps adopt it.
- The lack of an interface blocks Track 1 (App → Domain Migration) for AI features: domain functions cannot accept an `AIClient` parameter and be unit-tested without a real network.
- The `process.env` mutation in `image-generator.ts` is a real concurrency bug waiting to happen.

## Functional Requirements

### FR-1: `AIClient` Interface

```ts
// packages/ai/src/client.ts
export interface AIClient {
  generateObject<T>(input: GenerateObjectInput<T>): Promise<T>;
  generateImage(input: GenerateImageInput): Promise<Buffer>;
  generateText(input: GenerateTextInput): Promise<string>;
}

export interface GenerateObjectInput<T> {
  schema: ZodSchema<T>;
  prompt: string;
  model?: string;                // default: from constructor
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateImageInput {
  prompt: string;
  model?: string;                // default: from constructor
  size?: { width: number; height: number };
  seed?: number;
}

export interface GenerateTextInput {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### FR-2: Provider Selector

- `createAIClient(config: AIConfig): AIClient` — factory function that returns the right provider based on `config.provider` (`'openai' | 'google' | 'mock'`).
- `getAIClient(): AIClient` — lazy singleton, similar to the existing `getStorageClient()` pattern (FR-3 in `storage_s3_compat_20260522/spec.md`). Env vars are read and Zod-validated on first call, not at module load.
- The default `provider` is `'openai'` (the current production default per `lib/config/ai.ts`).

### FR-3: Provider Implementations

- `packages/ai/src/providers/openai.ts` — implements `AIClient` using `@ai-sdk/openai`. Passes the API key via constructor (NOT via `process.env`).
- `packages/ai/src/providers/google.ts` — implements `AIClient` using `@ai-sdk/google`. Passes the API key via constructor.
- `packages/ai/src/providers/mock.ts` — implements `AIClient` for tests. Returns deterministic responses from a fixture file or a callback.

### FR-4: Refactor `lib/ai/recommendation-service.ts`

- Replace direct `generateObject` import with `getAIClient().generateObject(...)`.
- Remove the `resolveModel()` string-prefix branching; use the provider selector instead.
- Constructor injection: `createRecommendationService(client: AIClient)` — the route handler gets a service instance.
- The exported `generateRecommendation(input)` becomes a thin wrapper that calls the service.

### FR-5: Refactor `lib/ai/image-generator.ts`

- Replace `experimental_generateImage` with `getAIClient().generateImage(...)`.
- **Remove the `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY` mutation** in `ensureApiKey()`. The API key is passed via the `AIClient` constructor.
- Constructor injection: `createImageGenerator(client: AIClient)`.
- The exported `generateLessonDiagram(input)` becomes a thin wrapper.

### FR-6: Remove Direct Provider SDK Deps

- Remove `ai`, `@ai-sdk/openai`, `@ai-sdk/google` from `apps/science-advantage/package.json` `dependencies`.
- Add `@reading-advantage/ai` to `dependencies` (workspace:*).
- Grep gate: `rg "from ['\"](ai|@ai-sdk/)" apps/science-advantage/` returns 0 hits.

### FR-7: Update Docs

- Update `apps/science-advantage/docs/specs/ai-structured-data-generation/spec.md:79-86` to reference the new `packages/ai` interface.
- Update `apps/science-advantage/docs/ai-image-generation.md:9` similarly.
- Add a `packages/ai/README.md` with provider config examples (OpenAI, Google, Mock).

## Non-Functional Requirements

- **Zero `ai` / `@ai-sdk/*` imports** in `apps/science-advantage/`. Grep gate: `rg "from ['\"]@?ai['\"]|from ['\"]@ai-sdk" apps/science-advantage/` returns 0 hits.
- **Zero `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY` mutations** in `apps/science-advantage/lib/ai/`. The interface constructor is the only entry point for API keys.
- **Mock provider returns deterministic responses**: same input → same output, suitable for snapshot tests.
- **Provider selection is configurable at runtime** via the `AI_PROVIDER` env var (`openai` | `google` | `mock`). The mock provider is the default in test environments.
- **Lint + type-check + build** green for `packages/ai` and `apps/science-advantage`.

## Acceptance Criteria

1. `packages/ai/` package exists with `AIClient` interface, `createAIClient`, `getAIClient`, and 3 provider implementations.
2. `lib/ai/recommendation-service.ts` depends on `AIClient` (not on `ai`/`@ai-sdk/*`).
3. `lib/ai/image-generator.ts` depends on `AIClient` and does NOT mutate `process.env` at call time.
4. 0 `ai` / `@ai-sdk/*` imports in `apps/science-advantage/`.
5. 0 `process.env.OPENAI_API_KEY` / `process.env.GOOGLE_API_KEY` reads in `apps/science-advantage/lib/ai/`.
6. `pnpm turbo run test --filter=@reading-advantage/ai` exits 0 (mock provider snapshot tests).
7. `pnpm turbo run test --filter=science-advantage` exits 0 (existing tests still pass with the new interface).
8. `pnpm turbo run build --filter=science-advantage` exits 0.
9. `docs/specs/ai-structured-data-generation/spec.md` and `docs/ai-image-generation.md` updated to reference `@reading-advantage/ai`.

## Out of Scope

- Adding new providers (Anthropic, Mistral, OpenRouter) — separate track.
- Caching AI responses in Redis (currently done inline in `recommendation-service.ts`) — separate track; will use the shared cache adapter (already in `lib/platform/cache-adapter.ts`).
- Moving AI call sites out of route handlers — Track 1 (App → Domain Migration) covers that.
- Replacing the inline `recommendation-cache` with a shared abstraction — out of scope.
- Per-app AI policies (e.g. science-advantage uses `gemini-2.5-flash`, advantage-games uses `gpt-5-mini`) — out of scope; per-app config is the existing pattern.

## Constraints & Risks

- **Risk: The existing `recommendation-service.ts` has an inline `Map`-based cache + Redis cache; refactoring may regress performance.** Mitigation: keep the cache logic; the change is the `generateObject` call site. Benchmark before/after with `pnpm test:integration`.
- **Risk: The mock provider must be feature-complete enough to satisfy the existing tests.** Mitigation: implement the mock from a fixture file that captures the current production responses; this is a snapshot test ground truth.
- **Risk: Removing the `process.env` mutation may break existing deployment configs that rely on env-var-based key lookup.** Mitigation: the `AIClient` constructor accepts the key explicitly. The Vercel / Cloud Run deployment secrets (`OPENAI_API_KEY`, `GEMINI_API_KEY`) are still set in env; the `getAIClient()` lazy singleton reads them once and passes them to the constructor. Document in `packages/ai/README.md`.
- **Cross-track dependency**: Track 1 (App → Domain Migration) will want to inject `AIClient` into domain functions for AI features. The `getAIClient()` lazy singleton is the right shape; Track 1 does not need to complete first.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 1 (F-101, F-102)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 5
- `apps/science-advantage/lib/ai/recommendation-service.ts` (the file to refactor)
- `apps/science-advantage/lib/ai/image-generator.ts` (the file to refactor; the `process.env` mutation is here)
- `apps/science-advantage/lib/platform/redis-client.ts:3` (`RedisClient` interface — the template)
- AGENTS.md §AI: "Application code should depend on: `ai.generateText()`, `ai.streamText()`, `ai.generateObject()`, `ai.embed()`. Internally the adapter may use Vercel AI SDK, OpenAI SDK, Anthropic SDK, Google SDK, or local model runtimes."
