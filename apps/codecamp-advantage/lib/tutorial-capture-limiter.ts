/** Error emitted when repository capture exceeds an instance safety limit. */
export class TutorialCaptureLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TutorialCaptureLimitError";
  }
}

/** Process-local repository capture limiter configuration. */
export interface TutorialCaptureLimiterOptions {
  maxConcurrent: number;
  maxPerLearner: number;
  windowMs: number;
  now?: () => number;
}

/** Process-local limiter used in addition to the worker's OS resource quotas. */
export interface TutorialCaptureLimiter {
  /**
   * Runs one capture only when global, learner-concurrency, and learner-rate limits permit it.
   * @param learnerId Server-resolved learner identity carried by the authenticated request.
   * @param operation Capture operation guarded by the limiter.
   * @returns The capture operation result.
   * @throws When a concurrency or sliding-window rate limit is exceeded.
   */
  run<T>(learnerId: string, operation: () => Promise<T>): Promise<T>;
}

/**
 * Creates a bounded capture limiter for one worker instance.
 * @param options Concurrency and sliding-window limits.
 * @returns A limiter that fails fast instead of queueing expensive clone work.
 */
export function createTutorialCaptureLimiter(options: TutorialCaptureLimiterOptions): TutorialCaptureLimiter {
  const attempts = new Map<string, number[]>();
  const activeLearners = new Set<string>();
  let active = 0;
  const now = options.now ?? Date.now;
  return {
    async run<T>(learnerId: string, operation: () => Promise<T>): Promise<T> {
      const cutoff = now() - options.windowMs;
      const recent = (attempts.get(learnerId) ?? []).filter((timestamp) => timestamp > cutoff);
      if (active >= options.maxConcurrent) throw new TutorialCaptureLimitError("Tutorial capture worker is busy");
      if (activeLearners.has(learnerId)) throw new TutorialCaptureLimitError("A tutorial capture is already running for this learner");
      if (recent.length >= options.maxPerLearner) throw new TutorialCaptureLimitError("Tutorial capture rate limit exceeded");
      recent.push(now());
      attempts.set(learnerId, recent);
      active += 1;
      activeLearners.add(learnerId);
      try {
        return await operation();
      } finally {
        active -= 1;
        activeLearners.delete(learnerId);
      }
    },
  };
}
