import { createOpenAI } from "@ai-sdk/openai";
import { generateObject as aiGenerateObject } from "ai";
import { generateText as aiGenerateText } from "ai";
import { streamText as aiStreamText } from "ai";
import { zodSchema } from "ai";
import type {
  AIClientWithProvenance,
  GenerateImageInput,
  GenerateObjectFromMediaInput,
  GenerateObjectInput,
  GenerateObjectWithProvenanceResult,
  GenerateTextInput,
  MediaInput,
  StreamTextInput,
  StreamTextResult,
  TranscribeAudioInput,
  TranscribeAudioResult,
} from "../types.js";
import {
  AIClientError,
  SchemaValidationError,
  UnsupportedError,
} from "../errors.js";
import { createGenerationProvenance } from "../provenance.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_PREFIX = "openrouter/";

/**
 * Default audio model for `generateObjectFromMedia` when no model is supplied
 * per call. It hears Thai and English speech and accepts WebM (tested
 * 2026-10-15).
 */
const DEFAULT_MEDIA_MODEL = "qwen/qwen3.8-omni-flash";

/**
 * Default model for `transcribeAudio`. An audio chat model, because OpenRouter
 * serves its speech-to-text models only on a separate transcription endpoint.
 */
const DEFAULT_ASR_MODEL = "google/gemini-2.5-flash-lite";

/** Time limit for one audio request; the slowest tested scoring call took 79 s. */
const MEDIA_TIMEOUT_MS = 120_000;

/** OpenRouter `input_audio` format for each accepted audio MIME type. */
const AUDIO_FORMATS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

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
export class OpenRouterProvider implements AIClientWithProvenance {
  private readonly client: ReturnType<typeof createOpenAI>;
  private readonly defaultModel: string;
  private readonly apiKey: string;

  constructor(config: OpenRouterProviderConfig) {
    this.apiKey = config.apiKey;
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

  /**
   * Generates a structured object and captures OpenRouter response provenance.
   * @param input The structured generation request.
   * @returns The validated object and provider-neutral generation provenance.
   */
  async generateObjectWithProvenance<T>(
    input: GenerateObjectInput<T>
  ): Promise<GenerateObjectWithProvenanceResult<T>> {
    const requestedModel = input.model ?? this.defaultModel;
    const startedAtMs = Date.now();

    try {
      const result = await aiGenerateObject({
        model: this.client(stripOpenRouterPrefix(requestedModel)),
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

      return {
        object: result.object,
        provenance: createGenerationProvenance({
          provider: "openrouter",
          requestedModel,
          startedAtMs,
          result,
        }),
      };
    } catch (error) {
      throw new AIClientError(
        `OpenRouter generateObjectWithProvenance failed: ${error instanceof Error ? error.message : "unknown"}`,
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

  /**
   * Scores or reads one audio clip and returns an object that matches the schema.
   * @param input The schema, prompt, audio clip, optional model, and temperature.
   * @returns The parsed object.
   * @throws UnsupportedError When the audio type has no OpenRouter format.
   * @throws SchemaValidationError When the reply is not JSON or does not match the schema.
   * @throws AIClientError With code `PROVIDER_ERROR` when the request fails.
   */
  async generateObjectFromMedia<T>(
    input: GenerateObjectFromMediaInput<T>
  ): Promise<T> {
    const content = await this.chatWithAudio("generateObjectFromMedia", {
      media: input.media,
      text: input.prompt,
      model: input.model ?? DEFAULT_MEDIA_MODEL,
      temperature: input.temperature,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: false,
          schema: zodSchema(input.schema).jsonSchema,
        },
      },
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        content.replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, "")
      );
    } catch (error) {
      throw new SchemaValidationError("generateObjectFromMedia", error);
    }
    const result = input.schema.safeParse(parsed);
    if (!result.success) {
      throw new SchemaValidationError("generateObjectFromMedia", result.error.issues);
    }
    return result.data;
  }

  /**
   * Sends one audio clip and one text instruction to OpenRouter chat
   * completions as `input_audio`. The AI SDK cannot send WebM audio (its chat
   * converter takes only WAV and MP3, and the Responses format takes no audio),
   * so this call builds the request itself.
   * @param operation The public method name, used in error messages.
   * @param input The audio clip, instruction, model, and optional request settings.
   * @returns The text content of the first choice.
   * @throws UnsupportedError When the audio type has no OpenRouter format.
   * @throws AIClientError With code `PROVIDER_ERROR` for a failed request, an HTTP or provider error, or a reply without content.
   */
  private async chatWithAudio(
    operation: string,
    input: {
      media: MediaInput;
      text: string;
      model: string;
      temperature?: number;
      responseFormat?: Record<string, unknown>;
    }
  ): Promise<string> {
    const mimeType = input.media.mimeType.split(";")[0]!.trim().toLowerCase();
    const format = AUDIO_FORMATS[mimeType];
    if (!format) {
      throw new UnsupportedError(
        `OpenRouter ${operation} cannot send audio of type '${input.media.mimeType}'`
      );
    }
    let response: Response;
    try {
      response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: stripOpenRouterPrefix(input.model),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: { data: input.media.buffer.toString("base64"), format },
                },
                { type: "text", text: input.text },
              ],
            },
          ],
          ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
          ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
        }),
        signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AIClientError(
        `OpenRouter ${operation} failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: unknown } }>;
    } | null;
    const content = body?.choices?.[0]?.message?.content;
    if (!response.ok || body?.error || typeof content !== "string" || !content) {
      throw new AIClientError(
        `OpenRouter ${operation} failed: HTTP ${response.status}${
          body?.error?.message ? ` ${body.error.message}` : ""
        }`,
        "PROVIDER_ERROR",
        body
      );
    }
    return content;
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

  /**
   * Transcribes one audio clip with an audio chat model.
   * @param input The audio clip, optional model, and optional language hint.
   * @returns The transcript text.
   * @throws UnsupportedError When the audio type has no OpenRouter format.
   * @throws AIClientError With code `PROVIDER_ERROR` when the request fails.
   */
  async transcribeAudio(
    input: TranscribeAudioInput
  ): Promise<TranscribeAudioResult> {
    const text = await this.chatWithAudio("transcribeAudio", {
      media: input.media,
      model: input.model ?? DEFAULT_ASR_MODEL,
      text: input.language
        ? `Transcribe this audio verbatim. Language: ${input.language}. Return only the transcript.`
        : "Transcribe this audio verbatim in its original language. Return only the transcript.",
    });
    return { text };
  }
}
