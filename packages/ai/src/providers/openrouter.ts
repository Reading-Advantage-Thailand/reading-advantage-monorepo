import { createOpenAI } from "@ai-sdk/openai";
import { generateObject as aiGenerateObject } from "ai";
import { generateText as aiGenerateText } from "ai";
import { streamText as aiStreamText } from "ai";
import type {
  AIClient,
  GenerateImageInput,
  GenerateObjectFromMediaInput,
  GenerateObjectInput,
  GenerateTextInput,
  StreamTextInput,
  StreamTextResult,
  TranscribeAudioInput,
  TranscribeAudioResult,
} from "../types.js";
import { AIClientError } from "../errors.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_PREFIX = "openrouter/";

/**
 * Default multimodal model used by `generateObjectFromMedia` when no model is
 * supplied per-call. NVIDIA Nemotron 3 Nano Omni is a free, open multimodal
 * model on OpenRouter that accepts audio input and reasons over it.
 */
const DEFAULT_MEDIA_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

/** Default ASR model for transcribeAudio (OpenRouter, $0.0015/min). */
const DEFAULT_ASR_MODEL = "nvidia/parakeet-tdt-0.6b-v3";

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

  async generateObjectFromMedia<T>(
    input: GenerateObjectFromMediaInput<T>
  ): Promise<T> {
    try {
      const modelId = input.model ?? DEFAULT_MEDIA_MODEL;
      const { object } = await aiGenerateObject({
        model: this.client(stripOpenRouterPrefix(modelId)),
        schema: input.schema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                data: input.media.buffer.toString("base64"),
                mediaType: input.media.mimeType,
              },
              { type: "text", text: input.prompt },
            ],
          },
        ],
        ...(input.temperature !== undefined
          ? { temperature: input.temperature }
          : {}),
        maxRetries: 1,
      });
      return object;
    } catch (error) {
      throw new AIClientError(
        `OpenRouter generateObjectFromMedia failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
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

  async streamText(input: StreamTextInput): Promise<StreamTextResult> {
    try {
      const baseOptions = {
        model: this.client(stripOpenRouterPrefix(input.model ?? this.defaultModel)),
        ...(input.system ? { system: input.system } : {}),
        ...(input.temperature !== undefined
          ? { temperature: input.temperature }
          : {}),
        ...(input.maxTokens !== undefined
          ? { maxOutputTokens: input.maxTokens }
          : {}),
      };
      const result = await aiStreamText(
        input.messages
          ? { ...baseOptions, messages: input.messages }
          : { ...baseOptions, prompt: input.prompt ?? "" }
      );
      return {
        textStream: result.textStream,
        toDataStreamResponse: () => result.toTextStreamResponse(),
      };
    } catch (error) {
      throw new AIClientError(
        `OpenRouter streamText failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }

  async transcribeAudio(
    input: TranscribeAudioInput
  ): Promise<TranscribeAudioResult> {
    try {
      const modelId = input.model ?? DEFAULT_ASR_MODEL;
      const { text } = await aiGenerateText({
        model: this.client(stripOpenRouterPrefix(modelId)),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                data: input.media.buffer.toString("base64"),
                mediaType: input.media.mimeType,
              },
              {
                type: "text",
                text: input.language
                  ? `Transcribe this audio to text. Language: ${input.language}`
                  : "Transcribe this audio to text.",
              },
            ],
          },
        ],
        maxRetries: 1,
      });
      return { text };
    } catch (error) {
      throw new AIClientError(
        `OpenRouter transcribeAudio failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }
}
