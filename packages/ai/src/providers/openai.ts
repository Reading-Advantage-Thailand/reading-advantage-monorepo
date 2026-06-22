import { createOpenAI } from "@ai-sdk/openai";
import { generateObject as aiGenerateObject } from "ai";
import { experimental_generateImage as aiGenerateImage } from "ai";
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
import { AIClientError, UnsupportedError } from "../errors.js";

/**
 * Configuration for the OpenAI provider.
 */
export interface OpenAIProviderConfig {
  /** OpenAI API key. Must be provided explicitly — never read from process.env. */
  apiKey: string;
  /** Default model for text/object generation. */
  model?: string;
  /** Default model for image generation. */
  imageModel?: string;
  /** OpenAI organization ID. */
  organization?: string;
}

/**
 * AIClient implementation backed by OpenAI via the Vercel AI SDK.
 * The API key is passed through the constructor — no process.env reads.
 */
export class OpenAIProvider implements AIClient {
  private readonly client: ReturnType<typeof createOpenAI>;
  private readonly defaultModel: string;
  private readonly defaultImageModel: string;

  constructor(config: OpenAIProviderConfig) {
    this.client = createOpenAI({
      apiKey: config.apiKey,
      ...(config.organization ? { organization: config.organization } : {}),
    });
    this.defaultModel = config.model ?? "gpt-4o-mini";
    this.defaultImageModel = config.imageModel ?? "dall-e-3";
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
          ? { maxOutputTokens: input.maxTokens }
          : {}),
        maxRetries: 1,
      });
      return object;
    } catch (error) {
      throw new AIClientError(
        `OpenAI generateObject failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }

  async generateImage(input: GenerateImageInput): Promise<Buffer> {
    try {
      const modelId = input.model ?? this.defaultImageModel;
      const { image } = await aiGenerateImage({
        model: this.client.image(modelId),
        prompt: input.prompt,
      });

      if (!image) {
        throw new AIClientError(
          `OpenAI model '${modelId}' did not return an image`,
          "PROVIDER_ERROR"
        );
      }

      return Buffer.from(image.base64, "base64");
    } catch (error) {
      if (error instanceof AIClientError) throw error;
      throw new AIClientError(
        `OpenAI generateImage failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }

  async generateObjectFromMedia<T>(
    _input: GenerateObjectFromMediaInput<T>
  ): Promise<T> {
    throw new UnsupportedError(
      "generateObjectFromMedia requires the openrouter or google provider — set AI_PROVIDER=openrouter or AI_PROVIDER=google"
    );
  }

  async transcribeAudio(
    _input: TranscribeAudioInput
  ): Promise<TranscribeAudioResult> {
    throw new UnsupportedError(
      "transcribeAudio requires the openrouter or google provider — set AI_PROVIDER=openrouter or AI_PROVIDER=google"
    );
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
          ? { maxOutputTokens: input.maxTokens }
          : {}),
        maxRetries: 1,
      });
      return text;
    } catch (error) {
      throw new AIClientError(
        `OpenAI generateText failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }

  async streamText(input: StreamTextInput): Promise<StreamTextResult> {
    try {
      const baseOptions = {
        model: this.client(input.model ?? this.defaultModel),
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
        `OpenAI streamText failed: ${error instanceof Error ? error.message : "unknown"}`,
        "PROVIDER_ERROR",
        error
      );
    }
  }
}
