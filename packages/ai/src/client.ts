import { z } from "zod";
import type { AIClient, AIConfig, AIProvider } from "./types.js";
import { ProviderNotConfiguredError } from "./errors.js";
import { OpenAIProvider } from "./providers/openai.js";
import { GoogleProvider } from "./providers/google.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import { MockProvider } from "./providers/mock.js";

const aiConfigSchema = z.object({
  provider: z.enum(["openai", "google", "openrouter", "mock"]).default("openai"),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  organization: z.string().optional(),
});

/**
 * Create an AIClient instance from the given configuration.
 * The provider field selects which backend to use.
 *
 * @param config - Provider selection and credentials.
 * @returns A concrete AIClient implementation.
 * @throws {ProviderNotConfiguredError} When the provider requires an API key
 *   that is not supplied.
 */
export function createAIClient(config: AIConfig): AIClient {
  const parsed = aiConfigSchema.parse(config);

  switch (parsed.provider as AIProvider) {
    case "openai": {
      const apiKey = parsed.apiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ProviderNotConfiguredError(
          "openai",
          "OPENAI_API_KEY is not set"
        );
      }
      return new OpenAIProvider({
        apiKey,
        model: parsed.model,
        organization: parsed.organization,
      });
    }

    case "google": {
      const apiKey =
        parsed.apiKey ??
        process.env.GEMINI_API_KEY ??
        process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new ProviderNotConfiguredError(
          "google",
          "GEMINI_API_KEY or GOOGLE_API_KEY is not set"
        );
      }
      return new GoogleProvider({ apiKey, model: parsed.model });
    }

    case "openrouter": {
      const apiKey = parsed.apiKey ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new ProviderNotConfiguredError(
          "openrouter",
          "OPENROUTER_API_KEY is not set"
        );
      }
      return new OpenRouterProvider({ apiKey, model: parsed.model });
    }

    case "mock":
      return new MockProvider();

    default:
      throw new ProviderNotConfiguredError(
        String(parsed.provider),
        "unsupported provider"
      );
  }
}

let singletonClient: AIClient | null = null;

/**
 * Return a lazily-initialised singleton AIClient. The provider and API key
 * are read from environment variables on first call:
 *
 *   AI_PROVIDER  — "openai" | "google" | "openrouter" | "mock"  (default: "openai" in
 *                   production, "mock" in test)
 *   OPENAI_API_KEY
 *   GEMINI_API_KEY / GOOGLE_API_KEY
 *   OPENROUTER_API_KEY
 *
 * Subsequent calls return the same instance. Use `resetAIClient()` in tests
 * to force re-creation.
 *
 * @returns The shared AIClient singleton.
 * @throws {ProviderNotConfiguredError} When the resolved provider requires
 *   an API key that is missing.
 */
export function getAIClient(): AIClient {
  if (singletonClient) return singletonClient;

  const envProvider = process.env.AI_PROVIDER as AIProvider | undefined;
  const isTest = process.env.NODE_ENV === "test";
  const provider: AIProvider = envProvider ?? (isTest ? "mock" : "openai");

  singletonClient = createAIClient({ provider });
  return singletonClient;
}

/**
 * Reset the lazy singleton. Intended for test isolation only.
 */
export function resetAIClient(): void {
  singletonClient = null;
}
