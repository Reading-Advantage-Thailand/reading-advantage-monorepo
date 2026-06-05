import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject as aiGenerateObject } from "ai";
import { experimental_generateImage as aiGenerateImage } from "ai";
import { generateText as aiGenerateText } from "ai";
import type {
  AIClient,
  GenerateImageInput,
  GenerateObjectInput,
  GenerateTextInput,
} from "../types.js";
import { AIClientError } from "../errors.js";

/**
 * Configuration for the Google (Gemini) provider.
 */
export interface GoogleProviderConfig {
  /** Google AI API key. Must be provided explicitly — never read from process.env. */
  apiKey: string;
  /** Default model for text/object generation. */
  model?: string;
  /** Default model for image generation. */
  imageModel?: string;
}

/**
 * AIClient implementation backed by Google Gemini via the Vercel AI SDK.
 * The API key is passed through the constructor — no process.env reads.
 */
export class GoogleProvider implements AIClient {
  private readonly client: ReturnType<typeof createGoogleGenerativeAI>;
  private readonly defaultModel: string;
  private readonly defaultImageModel: string;

  constructor(config: GoogleProviderConfig) {
    this.client = createGoogleGenerativeAI({ apiKey: config.apiKey });
    this.defaultModel = config.model ?? "gemini-2.5-flash";
    this.defaultImageModel = config.imageModel ?? "gemini-2.0-flash-preview-image-generation";
  }

  async generateObject<T>(input: GenerateObjectInput<T>): Promise<T> {
    try {
      const { object } = await aiGenerateObject({
        model: this.client(input.model ?? this.defaultModel),
        schema: input.schema,
        prompt: input.prompt,
        ...(input.temperature !== undefined
          ? { temperature: input.temperature }
          : {}),
        ...(input.maxTokens !== undefined
          ? { maxTokens: input.maxTokens }
          : {}),
        maxRetries: 1,
      });
      return object;
    } catch (error) {
      throw new AIClientError(
        `Google generateObject failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }

  async generateImage(input: GenerateImageInput): Promise<Buffer> {
    try {
      const modelId = input.model ?? this.defaultImageModel;
      const { image } = await aiGenerateImage({
        model: this.client(modelId),
        prompt: input.prompt,
      });

      if (!image) {
        throw new AIClientError(
          `Google model '${modelId}' did not return an image`,
          "PROVIDER_ERROR"
        );
      }

      return Buffer.from(image.base64, "base64");
    } catch (error) {
      if (error instanceof AIClientError) throw error;
      throw new AIClientError(
        `Google generateImage failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    try {
      const { text } = await aiGenerateText({
        model: this.client(input.model ?? this.defaultModel),
        prompt: input.prompt,
        ...(input.temperature !== undefined
          ? { temperature: input.temperature }
          : {}),
        ...(input.maxTokens !== undefined
          ? { maxTokens: input.maxTokens }
          : {}),
        maxRetries: 1,
      });
      return text;
    } catch (error) {
      throw new AIClientError(
        `Google generateText failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }
}
