import { describe, expect, it } from "vitest";

describe("package-public placement and trend API", () => {
  it("exports runtime functions and placement types through supported specifiers", async () => {
    const root = await import("@reading-advantage/knowledge-space-core");
    const placement =
      await import("@reading-advantage/knowledge-space-core/placement");
    expect(root.computeProgressTrend).toBeTypeOf("function");
    expect(root.buildKnowledgeStateSeed).toBeTypeOf("function");
    expect(placement.buildKnowledgeStateSeed).toBe(
      root.buildKnowledgeStateSeed,
    );
  });
});
