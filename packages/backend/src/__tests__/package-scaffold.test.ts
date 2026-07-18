import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("@reading-advantage/backend package scaffold", () => {
  it("publishes the expected portable package boundary and quality scripts", async () => {
    const source = await readFile(
      new URL("../../package.json", import.meta.url),
      "utf8",
    );
    const manifest = JSON.parse(source) as {
      name?: string;
      type?: string;
      exports?: Record<string, unknown>;
      scripts?: Record<string, string>;
    };

    expect(manifest.name).toBe("@reading-advantage/backend");
    expect(manifest.type).toBe("module");
    expect(Object.keys(manifest.exports ?? {}).sort()).toEqual([".", "./kernel"]);
    expect(manifest.exports).toHaveProperty(".");
    expect(manifest.exports).toHaveProperty("./kernel");
    expect(manifest.scripts).toMatchObject({
      build: "tsc",
      lint: "eslint .",
      test: "vitest run",
      "check-types": "tsc --noEmit && tsc --noEmit -p tsconfig.test.json",
    });
  });
});
