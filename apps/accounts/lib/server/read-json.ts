/**
 * Reads a JSON response without exposing a parser exception to the caller.
 * @param response Browser fetch response.
 * @returns Parsed JSON body or undefined when the body is not valid JSON.
 */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}