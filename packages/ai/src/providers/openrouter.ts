import { createOpenAI } from "@ai-sdk/openai";
import { generateObject as aiGenerateObject } from "ai";
import { generateText as aiGenerateText } from "ai";
import type {
  AIClient,
  GenerateImageInput,
  GenerateObjectInput,
  GenerateTextInput,
} from "../types.js";
import { AIClientError } from "../errors.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_PREFIX = "openrouter/";

/**
 * Configuration for the OpenRouter provider.
 */
export interface OpenRouterProviderConfig {
  /** OpenRouter API key. Must be provided explicitly — never read from process.env. */
  apiKey: string;
  /** Default model for text/object generation. */
  model?: string;
}

/**
 * Strip the `openrouter/` prefix from a model ID if present.
 * OpenRouter model IDs like `openrouter/anthropic/claude-3.5-sonnet`
 * must be passed as `anthropic/claude-3.5-sonnet` to the underlying
 * OpenAI-compatible SDK.
 *
 * @param modelId - The raw model identifier.
 * @returns The model ID with the openrouter/ prefix removed, if it was present.
 */
export function stripOpenRouterPrefix(modelId: string): string {
  if (modelId.startsWith(OPENROUTER_PREFIX)) {
    return modelId.slice(OPENROUTER_PREFIX.length);
  }
  return modelId;
}

/**
 * AIClient implementation backed by OpenRouter via the Vercel AI SDK.
 * OpenRouter exposes an OpenAI-compatible API, so this provider reuses
 * `@ai-sdk/openai` with a custom `baseURL`. The API key is passed
 * through the constructor — no process.env reads.
 */
export class OpenRouterProvider implements AIClient {
  private readonly client: ReturnType<typeof createOpenAI>;
  private readonly defaultModel: string;

  constructor(config: OpenRouterProviderConfig) {
    this.client = createOpenAI({
      apiKey: config.apiKey,
      baseURL: OPENROUTER_BASE_URL,
    });
    this.defaultModel = config.model ?? "x-ai/grok-build-0.1";
  }

  async generateObject<T>(input: GenerateObjectInput<T>): Promise<T> {
    try {
      const { object } = await aiGenerateObject({
        model: this.client(stripOpenRouterPrefix(input.model ?? this.defaultModel)),
        schema: input.schema,
        prompt: input.prompt,
        ...(input.temperature !== undefined
          ? { temperature: input.temperature }
          : {}),
        ...(input.maxTokens !== undefined
          ? { maxOutputTokens: input.maxTokens }
          : {}),
        maxRetries: 1,
      });
      return object;
    } catch (error) {
      throw new AIClientError(
        `OpenRouter generateObject failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }

  async generateImage(_input: GenerateImageInput): Promise<Buffer> {
    throw new AIClientError(
      "OpenRouter does not support image generation",
      "PROVIDER_ERROR"
    );
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    try {
      const { text } = await aiGenerateText({
        model: this.client(stripOpenRouterPrefix(input.model ?? this.defaultModel)),
        prompt: input.prompt,
        ...(input.temperature !== undefined
          ? { temperature: input.temperature }
          : {}),
        ...(input.maxTokens !== undefined
          ? { maxOutputTokens: input.maxTokens }
          : {}),
        maxRetries: 1,
      });
      return text;
    } catch (error) {
      throw new AIClientError(
        `OpenRouter generateText failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }
}
