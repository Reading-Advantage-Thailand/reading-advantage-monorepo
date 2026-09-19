import { NextResponse } from "next/server";

const NO_STORE_CACHE_CONTROL = "no-store, private";

/**
 * Adds the private no-store policy to a route response.
 * @param response Response that must not be cached.
 * @returns The same response with its cache policy set.
 */
export function withNoStore<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);
  return response;
}

/**
 * Creates a JSON response that cannot be cached by shared or private caches.
 * @param body JSON-serializable response body.
 * @param init Optional response status and header values.
 * @returns A JSON response with the private no-store policy.
 */
export function noStoreJson(
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return withNoStore(NextResponse.json(body, init));
}
