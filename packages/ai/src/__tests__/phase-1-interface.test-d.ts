/**
 * Phase 1 type-level contract tests for the `AIClient` interface and
 * accompanying error classes. Per `test-strategy.md` §5, Phase 1 is type-only:
 * `expectTypeOf(...)` assertions codified against FR-1 in `spec.md`.
 *
 * These tests are picked up by `vitest --typecheck` (enabled in
 * `vitest.config.ts`). They are intentionally side-effect free: the only
 * purpose is to assert that the public type surface matches the spec at the
 * type level. If the interface or error classes drift from FR-1, the type
 * checker will fail these tests.
 *
 * This file has the `.test-d.ts` suffix so that `vitest run` (default) skips
 * it and `vitest --typecheck` picks it up.
 */

import { expectTypeOf } from "vitest";
import { z } from "zod";

import type {
  AIClient,
  AIConfig,
  AIProvider,
  GenerateImageInput,
  GenerateObjectInput,
  GenerateTextInput,
  StreamTextInput,
  StreamTextResult,
} from "../types.js";

import {
  AIClientError,
  ProviderNotConfiguredError,
  SchemaValidationError,
} from "../errors.js";

// ---------------------------------------------------------------------------
// Expected shape mirrors (FR-1 / FR-2 / FR-3 in spec.md). All `toEqualTypeOf`
// assertions below compare the exported type against its expected mirror so
// the contract is declared in one place and reusable across the suite.
// ---------------------------------------------------------------------------

type ExpectedGenerateObjectInput = {
  schema: z.ZodSchema<unknown>;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type ExpectedGenerateImageInput = {
  prompt: string;
  model?: string;
  size?: { width: number; height: number };
  seed?: number;
};

type ExpectedGenerateTextInput = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type ExpectedAIClient = {
  generateObject: <T>(input: GenerateObjectInput<T>) => Promise<T>;
  generateImage: (input: GenerateImageInput) => Promise<Buffer>;
  generateText: (input: GenerateTextInput) => Promise<string>;
  streamText: (input: StreamTextInput) => Promise<StreamTextResult>;
};

type ExpectedAIConfig = {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  organization?: string;
};

// ---------------------------------------------------------------------------
// FR-1: input shape
// ---------------------------------------------------------------------------

expectTypeOf<GenerateObjectInput<{ foo: string; count: number }>>().toEqualTypeOf<{
  schema: z.ZodSchema<{ foo: string; count: number }>;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}>();

expectTypeOf<GenerateObjectInput<{ foo: string }>["schema"]>().toEqualTypeOf<
  z.ZodSchema<{ foo: string }>
>();

// `prompt` is required; `model` / `temperature` / `maxTokens` are optional.
expectTypeOf<GenerateObjectInput<unknown>["prompt"]>().toEqualTypeOf<string>();
expectTypeOf<GenerateObjectInput<unknown>["model"]>().toEqualTypeOf<
  string | undefined
>();

expectTypeOf<GenerateImageInput>().toEqualTypeOf<ExpectedGenerateImageInput>();
expectTypeOf<GenerateImageInput["prompt"]>().toEqualTypeOf<string>();
expectTypeOf<GenerateImageInput["size"]>().toEqualTypeOf<
  { width: number; height: number } | undefined
>();

expectTypeOf<GenerateTextInput>().toEqualTypeOf<ExpectedGenerateTextInput>();
expectTypeOf<GenerateTextInput["prompt"]>().toEqualTypeOf<string>();
expectTypeOf<GenerateTextInput["temperature"]>().toEqualTypeOf<
  number | undefined
>();

// ---------------------------------------------------------------------------
// FR-1 + FR-2 + FR-3: AIClient, AIProvider, AIConfig
// ---------------------------------------------------------------------------

// Exactly four methods on AIClient, with the right call signatures.
expectTypeOf<AIClient>().toEqualTypeOf<ExpectedAIClient>();
expectTypeOf<keyof AIClient>().toEqualTypeOf<
  "generateObject" | "generateImage" | "generateText" | "streamText"
>();

// Callability checks (FR-1 inputs are accepted by the method).
expectTypeOf<AIClient["generateObject"]>().toBeCallableWith({
  schema: z.object({ foo: z.string() }),
  prompt: "test",
});
expectTypeOf<AIClient["generateImage"]>().toBeCallableWith({ prompt: "img" });
expectTypeOf<AIClient["generateImage"]>().toBeCallableWith({
  prompt: "img",
  size: { width: 256, height: 256 },
  seed: 42,
});
expectTypeOf<AIClient["generateText"]>().toBeCallableWith({ prompt: "txt" });

expectTypeOf<AIProvider>().toEqualTypeOf<"openai" | "google" | "openrouter" | "mock">();
expectTypeOf<AIConfig>().toEqualTypeOf<ExpectedAIConfig>();
expectTypeOf<AIConfig["provider"]>().toEqualTypeOf<AIProvider>();

// ---------------------------------------------------------------------------
// Error class hierarchy (Phase 1 task 2)
// ---------------------------------------------------------------------------

// All three error classes extend AIClientError.
expectTypeOf<ProviderNotConfiguredError>().toMatchTypeOf<AIClientError>();
expectTypeOf<SchemaValidationError>().toMatchTypeOf<AIClientError>();

// AIClientError carries a `code` string and an optional `cause`.
expectTypeOf<AIClientError["code"]>().toEqualTypeOf<string>();
expectTypeOf<AIClientError["cause"]>().toEqualTypeOf<unknown>();

// ProviderNotConfiguredError: name field and code field exist on the instance.
const providerErr = new ProviderNotConfiguredError("openai");
expectTypeOf(providerErr.code).toEqualTypeOf<string>();
expectTypeOf(providerErr.name).toEqualTypeOf<string>();
expectTypeOf(providerErr.cause).toEqualTypeOf<unknown>();

// SchemaValidationError: schemaName + validationErrors exist on the instance.
const schemaErr = new SchemaValidationError("MySchema", []);
expectTypeOf(schemaErr.code).toEqualTypeOf<string>();
expectTypeOf(schemaErr.name).toEqualTypeOf<string>();
expectTypeOf(schemaErr.schemaName).toEqualTypeOf<string>();
expectTypeOf(schemaErr.validationErrors).toEqualTypeOf<unknown>();
