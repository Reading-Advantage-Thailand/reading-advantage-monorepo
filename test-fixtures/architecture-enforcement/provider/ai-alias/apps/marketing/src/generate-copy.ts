import OpenAI from "@fixture/ai-provider";

/** AI provider constructor leaked through a TypeScript path alias. */
export const aliasedAiProvider = OpenAI;
