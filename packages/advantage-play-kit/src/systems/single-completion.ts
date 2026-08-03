/**
 * `capability:single-completion-emission` shared core.
 *
 * A shared completion latch owns at-most-once delivery for a terminal result.
 * The emitter accepts a completed result and callback without importing any UI
 * or transport layer. Games own result construction, terminal phase mapping,
 * diagnostics, fullscreen effects, and host payload shape.
 *
 * Source evidence: abyssal-well, babel-architect, enchanted-library,
 * griffin-riders-escape.
 */

/** Delivery callback invoked at most once with the first accepted terminal result. */
export type CompletionDelivery<Result> = (result: Result) => void | Promise<void>;

/** At-most-once terminal completion latch. */
export interface CompletionLatch<Result> {
  /** Whether a terminal result has been emitted or the latch sealed. */
  readonly hasCompleted: boolean;
  /**
   * Attempts to deliver a terminal result.
   * @param result The terminal result constructed by game-owned rules.
   * @returns True when this call was the first and delivery was scheduled.
   */
  complete(result: Result): boolean;
  /** Returns a promise that resolves once any in-flight async delivery finishes. */
  drained(): Promise<void>;
  /**
   * Seals the latch without delivering a result.
   * @returns True when this call sealed the latch for the first time.
   */
  sealWithoutDelivery(): boolean;
}

/**
 * Creates an at-most-once completion latch bound to a delivery callback.
 * @param deliver Callback invoked exactly once with the first accepted result.
 * @returns A completion latch that ignores all subsequent attempts.
 */
export function createCompletionLatch<Result>(
  deliver: CompletionDelivery<Result>,
): CompletionLatch<Result> {
  let completed = false;
  let delivery: Promise<void> = Promise.resolve();

  return Object.freeze({
    get hasCompleted() {
      return completed;
    },
    complete(result: Result): boolean {
      if (completed) return false;
      completed = true;
      try {
        const maybe = deliver(result);
        delivery = maybe instanceof Promise ? maybe.catch(() => undefined) : Promise.resolve();
      } catch (error) {
        delivery = Promise.reject(error).catch(() => undefined);
      }
      return true;
    },
    drained(): Promise<void> {
      return delivery;
    },
    sealWithoutDelivery(): boolean {
      if (completed) return false;
      completed = true;
      return true;
    },
  });
}
