import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = resolve(
  import.meta.dirname,
  "..",
  "campaigns",
  "[id]",
  "video",
  "page.tsx",
);

describe("video scene identity", () => {
  it("uses local scene IDs instead of list indexes for React keys", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).not.toMatch(/key=\{index\}/);
    expect(source).toMatch(/key=\{sceneIds\[index\]\}/);
  });
});
