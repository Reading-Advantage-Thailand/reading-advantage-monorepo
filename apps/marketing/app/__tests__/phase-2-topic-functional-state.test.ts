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

describe("video topic state updates", () => {
  it("uses functional state updates in every topic handler", () => {
    const source = readFileSync(pagePath, "utf8");

    for (const handler of [
      "handleApprove",
      "handleReject",
      "handleEdit",
      "handleSaveEdit",
    ]) {
      const start = source.indexOf(`const ${handler}`);
      const end = source.indexOf("\n  };", start) + "\n  };".length;
      expect(start).toBeGreaterThanOrEqual(0);
      expect(source.slice(start, end)).toMatch(/setTopics\(\s*\(prev\)\s*=>/);
    }
  });
});
