import { describe, expect, it } from "vitest";
import { salesAppRouter } from "../sales-root.js";

describe("salesAppRouter", () => {
  it("mounts only the sales router", () => {
    expect(Object.keys(salesAppRouter._def.record)).toEqual(["sales"]);
  });

  it("exposes no school product procedures", () => {
    const paths = Object.keys(salesAppRouter._def.procedures);

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => path.startsWith("sales."))).toBe(true);
    expect(paths).toContain("sales.admin.approveContent");
  });
});
