import { describe, expect, it } from "vitest";

import { safeJobErrorSchema } from "../index.js";

describe("secret-safe durable job error contract", () => {
  it("requires an explicitly classified safe summary and rejects raw messages", () => {
    expect(
      safeJobErrorSchema.safeParse({
        code: "UPSTREAM_TIMEOUT",
        safeSummary: "The upstream service timed out.",
      }).success,
    ).toBe(true);
    expect(
      safeJobErrorSchema.safeParse({
        code: "UPSTREAM_TIMEOUT",
        message: "raw provider error",
      }).success,
    ).toBe(false);
  });
});
