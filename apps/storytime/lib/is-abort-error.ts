/**
 * Reports whether a play rejection is the abort of a replaced load (finding F120).
 * A new `src` on an audio element aborts its pending play; that is not a failed sound.
 * @param error The rejection value of a play promise.
 * @returns `true` for an `AbortError` DOMException.
 */
export function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null
    && (error as { name?: string }).name === "AbortError";
}
