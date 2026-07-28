import { describe, expect, it, vi } from "vitest";

import {
  createCompletionLatch,
  type CompletionLatch,
} from "../single-completion.js";

describe("single completion emission latch", () => {
  it("delivers the first completed result exactly once", () => {
    const deliver = vi.fn();
    const latch = createCompletionLatch(deliver);

    latch.complete({ score: 120 });
    latch.complete({ score: 200 });

    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith({ score: 120 });
  });

  it("reports whether a result has already been emitted", () => {
    const latch = createCompletionLatch(() => undefined);

    expect(latch.hasCompleted).toBe(false);
    latch.complete({ value: 1 });
    expect(latch.hasCompleted).toBe(true);
  });

  it("ignores subsequent completion attempts without invoking the callback", () => {
    const deliver = vi.fn();
    const latch = createCompletionLatch(deliver);

    latch.complete({ value: 1 });
    latch.complete({ value: 2 });

    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("returns a boolean indicating whether each call was the first", () => {
    const latch = createCompletionLatch(() => undefined);

    expect(latch.complete({ a: 1 })).toBe(true);
    expect(latch.complete({ a: 2 })).toBe(false);
  });

  it("rejects synchronous re-entrancy from within the delivery callback", () => {
    const latchRef: { current: CompletionLatch<unknown> | undefined } = { current: undefined };
    const deliver = vi.fn(() => {
      latchRef.current?.complete({ reentrant: true });
    });
    latchRef.current = createCompletionLatch(deliver);

    latchRef.current.complete({ initial: true });

    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith({ initial: true });
  });

  it("awaits async delivery callbacks and preserves first-wins ordering", async () => {
    const delivered: unknown[] = [];
    const deliver = vi.fn(async (result: unknown) => {
      delivered.push(result);
    });
    const latch = createCompletionLatch(deliver);

    latch.complete({ order: 1 });
    latch.complete({ order: 2 });
    await latch.drained();

    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith({ order: 1 });
    expect(delivered).toEqual([{ order: 1 }]);
  });

  it("does not deliver after the latch is sealed shut by sealWithoutDelivery", () => {
    const deliver = vi.fn();
    const latch = createCompletionLatch(deliver);

    expect(latch.sealWithoutDelivery()).toBe(true);
    expect(latch.complete({ value: 1 })).toBe(false);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("sealWithoutDelivery is itself idempotent and at-most-once", () => {
    const latch = createCompletionLatch(() => undefined);

    expect(latch.sealWithoutDelivery()).toBe(true);
    expect(latch.sealWithoutDelivery()).toBe(false);
    expect(latch.hasCompleted).toBe(true);
  });
});
