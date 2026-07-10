import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Phaser 4 workspace policy", () => {
  it("pins the selected stable Phaser 4 release without a range", () => {
    const workspace = readFileSync(
      new URL("../../../../pnpm-workspace.yaml", import.meta.url),
      "utf8",
    );
    expect(workspace).toMatch(/^\s{2}phaser: 4\.2\.1$/m);
    expect(workspace).not.toMatch(/^\s{2}phaser: [~^]/m);
  });
});
