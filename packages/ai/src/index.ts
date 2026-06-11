export type {
  AIClient,
  GenerateObjectInput,
  GenerateImageInput,
  GenerateTextInput,
  AIConfig,
} from "./types.js";

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
