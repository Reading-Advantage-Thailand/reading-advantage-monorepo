import { describe, expect, it } from "vitest";
import { compareStableStrings } from "../stable-order.js";

describe("stable architecture ordering", () => {
  it("orders punctuation, case, and non-ASCII values without locale collation", () => {
    expect(["á", "a", "Z", "_", "@"].sort(compareStableStrings)).toEqual([
      "@",
      "Z",
      "_",
      "a",
      "á",
    ]);
  });
});
