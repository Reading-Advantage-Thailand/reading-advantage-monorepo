import { describe, expect, it } from "vitest";

describe("Sales knowledge package boundary", () => {
  it("loads the Domain barrel with packaged Sales evidence", async () => {
    const domain = await import("@reading-advantage/domain");

    expect(domain.createTenantDB).toBeTypeOf("function");
  });
});
