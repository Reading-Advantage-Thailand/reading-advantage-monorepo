import OpenAI from "openai";

/**
 * Constructs an AI provider client directly inside a product app.
 * @returns Fixture provider client.
 */
export function createProductProviderClient() {
  return new OpenAI({ apiKey: "fixture" });
}
