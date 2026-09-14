/**
 * Fetches JSON from an admin endpoint and throws on HTTP errors.
 * @param url Endpoint to request.
 * @param errorMessage Message for failed responses.
 * @returns The parsed JSON body.
 * @throws When the response status is not ok.
 */
export async function fetchJsonList<T>(url: string, errorMessage: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return (await response.json()) as T;
}
