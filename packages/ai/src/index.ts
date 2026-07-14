export type {
  AIClient,
  AIClientWithProvenance,
  AIProvider,
  AIGenerationProvenance,
  AIGenerationUsage,
  GenerateObjectInput,
  GenerateObjectWithProvenanceResult,
  GenerateObjectFromMediaInput,
  MediaInput,
  GenerateImageInput,
  GenerateTextInput,
  StreamTextInput,
  StreamTextResult,
  TranscribeAudioInput,
  TranscribeAudioResult,
  AIConfig,
} from "./types.js";

export {
  AIClientError,
  ProviderNotConfiguredError,
  SchemaValidationError,
  UnsupportedError,
} from "./errors.js";

export { createAIClient, getAIClient, resetAIClient } from "./client.js";

export { MockProvider, createTestClient } from "./providers/mock.js";
export type { MockResponses } from "./providers/mock.js";
export { OpenAIProvider } from "./providers/openai.js";
export { GoogleProvider } from "./providers/google.js";
export { OpenRouterProvider, stripOpenRouterPrefix } from "./providers/openrouter.js";
