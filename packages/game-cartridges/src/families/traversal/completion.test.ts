import { describe, expect, it, vi } from "vitest";

import { createCompletionLatch } from "./completion";

describe("createCompletionLatch", () => {
  it("delivers exactly one result and reports suppressed repeats", () => {
    const complete = vi.fn();
    const deliver = createCompletionLatch(complete);
    expect(deliver({ score: 100 })).toBe(true);
    expect(deliver({ score: 200 })).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith({ score: 100 });
  });
});
