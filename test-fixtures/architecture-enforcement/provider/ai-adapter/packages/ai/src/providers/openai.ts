import OpenAI from "openai";

/**
 * Constructs an OpenAI client inside the exact provider adapter root.
 * @returns Fixture provider client.
 */
export function createOpenAiAdapterClient() {
  return new OpenAI({ apiKey: "fixture" });
}
