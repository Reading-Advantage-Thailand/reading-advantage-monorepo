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
   * Generate an image from a text prompt.
   * @returns The raw image bytes as a Buffer.
   */
  generateImage(input: GenerateImageInput): Promise<Buffer>;

  /**
   * Generate plain text from a prompt.
   * @returns The generated text string.
   */
  generateText(input: GenerateTextInput): Promise<string>;
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
