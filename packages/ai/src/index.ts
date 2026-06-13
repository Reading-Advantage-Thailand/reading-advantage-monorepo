export type {
  AIClient,
  GenerateObjectInput,
  GenerateImageInput,
  GenerateTextInput,
  StreamTextInput,
  StreamTextResult,
  AIConfig,
} from "./types.js";

export { createOpenAI } from "@ai-sdk/openai";
export { createGoogleGenerativeAI } from "@ai-sdk/google";
export { createVertex } from "@ai-sdk/google-vertex";

export {
  generateObject,
  generateText,
  streamText,
  experimental_generateImage,
} from "ai";

export {
  AIClientError,
  ProviderNotConfiguredError,
  SchemaValidationError,
} from "./errors.js";

export { createAIClient, getAIClient, resetAIClient } from "./client.js";

export { MockProvider, createTestClient } from "./providers/mock.js";
export type { MockResponses } from "./providers/mock.js";
export { OpenAIProvider } from "./providers/openai.js";
export { GoogleProvider } from "./providers/google.js";
export { OpenRouterProvider, stripOpenRouterPrefix } from "./providers/openrouter.js";
