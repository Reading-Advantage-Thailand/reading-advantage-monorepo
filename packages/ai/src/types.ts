import type { ModelMessage } from "ai";
import type { z } from "zod";

/**
 * Input for generating a structured object that validates against a Zod schema.
 */
export interface GenerateObjectInput<T> {
  /** Zod schema the generated JSON must satisfy. */
  schema: z.ZodSchema<T>;
  /** Prompt describing the desired output. */
  prompt: string;
  /** Override the default model configured on the client. */
  model?: string;
  /** Sampling temperature (0–2). */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
}

/**
 * Provider-reported token usage retained for an auditable AI generation.
 * Values are null when the provider does not return that measurement.
 */
export interface AIGenerationUsage {
  /** Tokens consumed by the prompt, when reported. */
  inputTokens: number | null;
  /** Tokens produced in the completion, when reported. */
  outputTokens: number | null;
  /** Total tokens reported by the provider, when available. */
  totalTokens: number | null;
  /** Reasoning tokens reported by the provider, when available. */
  reasoningTokens: number | null;
  /** Cached prompt tokens reported by the provider, when available. */
  cachedInputTokens: number | null;
}

/**
 * Stable provider-neutral provenance captured for a completed AI generation.
 *
 * Requested model records the application policy, while resolved model records
 * the provider response. Fields that a provider does not report are null rather
 * than inferred, so persisted audit records distinguish absent data from data.
 */
export interface AIGenerationProvenance {
  /** Adapter provider selected for the request. */
  provider: AIProvider;
  /** Model identifier selected by the caller or provider default. */
  requestedModel: string;
  /** Provider-reported model identifier, when supplied in the response. */
  resolvedModel: string | null;
  /** Provider-generated response identifier, when supplied. */
  responseId: string | null;
  /** Provider request identifier from response headers, when supplied. */
  requestId: string | null;
  /** Provider-reported token usage. */
  usage: AIGenerationUsage;
  /** Wall-clock duration of the adapter request in milliseconds. */
  latencyMs: number;
}

/**
 * Structured generation output paired with its immutable adapter provenance.
 */
export interface GenerateObjectWithProvenanceResult<T> {
  /** The schema-validated generated object. */
  object: T;
  /** Provider-neutral metadata recorded for the generation. */
  provenance: AIGenerationProvenance;
}

/**
 * Media payload sent alongside a prompt for multimodal generation.
 */
export interface MediaInput {
  /** Raw media bytes (audio, image, or video). */
  buffer: Buffer;
  /** MIME type of the media (e.g. `audio/webm`, `audio/wav`). */
  mimeType: string;
}

/**
 * Input for generating a structured object from a media payload (audio/image/video)
 * plus a text prompt. The provider sends both parts to a multimodal model in one
 * call and parses the response against the supplied Zod schema.
 */
export interface GenerateObjectFromMediaInput<T> {
  /** Zod schema the generated JSON must satisfy. */
  schema: z.ZodSchema<T>;
  /** Prompt describing the desired output (e.g. rubric instructions). */
  prompt: string;
  /** Media payload sent to the multimodal model. */
  media: MediaInput;
  /** Override the default model configured on the client. */
  model?: string;
  /** Sampling temperature (0–2). */
  temperature?: number;
}

/**
 * Input for transcribing audio to text via a speech-to-text (ASR) model.
 */
export interface TranscribeAudioInput {
  /** Audio payload (e.g. webm/opus or wav). */
  media: MediaInput;
  /** Override the default ASR model configured on the client. */
  model?: string;
  /** Optional language hint (ISO 639-1, e.g. "en", "th"). */
  language?: string;
}

/**
 * Result of a transcribeAudio call.
 */
export interface TranscribeAudioResult {
  /** Full transcribed text. */
  text: string;
  /** Optional per-segment timestamps when the model supplies them. */
  segments?: Array<{ start: number; end: number; text: string }>;
}

/**
 * Input for generating an image from a text prompt.
 */
export interface GenerateImageInput {
  /** Prompt describing the desired image. */
  prompt: string;
  /** Override the default model configured on the client. */
  model?: string;
  /** Desired image dimensions. */
  size?: { width: number; height: number };
  /** Seed for reproducible generation. */
  seed?: number;
}

/**
 * Input for generating plain text from a prompt.
 */
export interface GenerateTextInput {
  /** Prompt describing the desired text output. */
  prompt: string;
  /** Override the default model configured on the client. */
  model?: string;
  /** Sampling temperature (0–2). */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
}

/**
 * Input for streaming text from a prompt.
 */
export interface StreamTextInput {
  /** Prompt describing the desired text output. */
  prompt?: string;
  /** Messages array for multi-turn conversations. */
  messages?: Array<ModelMessage>;
  /** Override the default model configured on the client. */
  model?: string;
  /** Sampling temperature (0–2). */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /** System prompt. */
  system?: string;
}

/**
 * Result of a streaming text generation.
 */
export interface StreamTextResult {
  /** Async iterable text stream. */
  textStream: AsyncIterable<string>;
  /** Convert to a data stream Response for Next.js route handlers. */
  toDataStreamResponse(): Response;
}

/**
 * Abstract AI client interface. Implementations wrap provider-specific SDKs
 * (OpenAI, Google, etc.) behind a uniform API so application code never
 * depends on a vendor SDK directly.
 */
export interface AIClient {
  /**
   * Generate a structured object that validates against the provided Zod schema.
   * @returns The parsed and validated object.
   */
  generateObject<T>(input: GenerateObjectInput<T>): Promise<T>;

  /**
   * Generate a structured object from a media payload (audio/image/video) plus a
   * text prompt, using a multimodal model. The media is sent directly to the
   * model alongside the prompt in a single call — no separate transcription step.
   * @returns The parsed and validated object.
   * @throws {UnsupportedError} when the configured provider has no multimodal model.
   */
  generateObjectFromMedia<T>(input: GenerateObjectFromMediaInput<T>): Promise<T>;

  /**
   * Generate an image from a text prompt.
   * @returns The raw image bytes as a Buffer.
   */
  generateImage(input: GenerateImageInput): Promise<Buffer>;

  /**
   * Generate plain text from a prompt.
   * @returns The generated text string.
   */
  generateText(input: GenerateTextInput): Promise<string>;

  /**
   * Transcribe audio to text using a speech-to-text (ASR) model.
   * @returns The transcribed text and optional segment timestamps.
   * @throws UnsupportedError when the provider has no ASR model.
   */
  transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult>;

  /**
   * Stream text from a prompt. Returns an async iterable text stream
   * and a toDataStreamResponse() method for Next.js route handlers.
   * @returns A StreamTextResult with textStream and toDataStreamResponse.
   */
  streamText(input: StreamTextInput): Promise<StreamTextResult>;
}

/**
 * AIClient capability for structured generation with provider-neutral provenance.
 *
 * This separate interface keeps existing AIClient-typed consumers source
 * compatible while allowing callers of createAIClient/getAIClient to persist
 * model-routing and response metadata with their validated result.
 */
export interface AIClientWithProvenance extends AIClient {
  /**
   * Generate a structured object and return the validated object with provenance.
   * @param input The schema, prompt, and optional task-specific model selection.
   * @returns The parsed object together with provider-neutral generation metadata.
   */
  generateObjectWithProvenance<T>(
    input: GenerateObjectInput<T>
  ): Promise<GenerateObjectWithProvenanceResult<T>>;
}

/**
 * Supported AI provider identifiers.
 */
export type AIProvider = "openai" | "google" | "openrouter" | "mock";

/**
 * Configuration for creating an AIClient instance.
 */
export interface AIConfig {
  /** Which provider backend to use. */
  provider: AIProvider;
  /** API key for the provider. Read from env if not supplied. */
  apiKey?: string;
  /** Default model to use when not overridden per-call. */
  model?: string;
  /** OpenAI organization ID (optional, OpenAI only). */
  organization?: string;
}
