/**
 * Represents the provider-neutral AI port used by the fixture product app.
 * @param input Provider-neutral generation input.
 * @returns Stable fixture result.
 */
export async function generateText(input: { prompt: string }) {
  return input.prompt;
}
