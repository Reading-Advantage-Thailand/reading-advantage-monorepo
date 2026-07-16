import { generateText } from "@reading-advantage/ai";

/**
 * Generates copy through the provider-neutral AI interface.
 * @returns Generated fixture text.
 */
export async function generateMarketingCopy() {
  return generateText({ prompt: "fixture" });
}
