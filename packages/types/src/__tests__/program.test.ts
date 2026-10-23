import { describe, expect, it } from "vitest";
import { programSchema } from "../index.js";

describe("programSchema (Storytime QR page spec, dependencies)", () => {
  it("has the five subject programs and storytime", () => {
    expect(programSchema.options).toEqual(["primary", "reading", "science", "math", "zhongwen", "storytime"]);
  });

  it("rejects an unknown program", () => {
    expect(programSchema.safeParse("storytime").success).toBe(true);
    expect(programSchema.safeParse("phonics").success).toBe(false);
  });
});
