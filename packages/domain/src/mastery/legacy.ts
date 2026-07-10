/** HTTP response shape returned by the legacy mastery run transport. */
export type MasteryHttpResponse = import("./record-run.js").MasteryHttpResponse;

/** Portable legacy rate-limit error exposed without importing database code. */
export class RateLimitError extends Error {
  /** Number of seconds a caller should wait before retrying. */
  readonly retryAfter: number;

  /**
   * Creates a legacy-compatible rate-limit error.
   * @param retryAfter Retry delay in milliseconds.
   */
  constructor(retryAfter: number) {
    super("rate-limit");
    this.name = "RateLimitError";
    this.retryAfter = Math.max(1, Math.ceil(retryAfter / 1000));
  }
}

/**
 * Lazily delegates a legacy mastery run without importing database code at module load.
 * @param args Arguments accepted by the legacy record-run implementation.
 * @returns The HTTP-ready legacy mastery response.
 */
export async function recordRun(
  ...args: Parameters<typeof import("./record-run.js").recordRun>
): Promise<MasteryHttpResponse> {
  try {
    const module = await import("./record-run.js");
    return await module.recordRun(...args);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "rate-limit" &&
      "retryAfter" in error &&
      typeof error.retryAfter === "number"
    ) {
      throw new RateLimitError(error.retryAfter * 1_000);
    }
    throw error;
  }
}

/**
 * Lazily records a legacy mastery failure without importing database code at module load.
 * @param args Arguments accepted by the legacy failure implementation.
 * @returns The legacy failure response.
 */
export async function recordRunFailure(
  ...args: Parameters<typeof import("./record-run.js").recordRunFailure>
): Promise<void> {
  const module = await import("./record-run.js");
  await module.recordRunFailure(...args);
}

/** Clears the legacy rate-limit store after lazily loading its implementation. */
export function resetRateLimitStore(): void {
  void import("./record-run.js").then((module) => module.resetRateLimitStore());
}
