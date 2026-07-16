import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadWorkspaceModuleTargets } from "../workspace-resolution.js";

describe("workspace package resolution", () => {
  it("maps exact package exports to tracked TypeScript source files", async () => {
    const targets = await loadWorkspaceModuleTargets(resolve("../.."));

    expect(targets.get("@reading-advantage/db")).toBe(
      "packages/db/src/index.ts",
    );
    expect(targets.get("@reading-advantage/db/schema")).toBe(
      "packages/db/src/schema/index.ts",
    );
    expect(targets.get("@reading-advantage/db/client")).toBe(
      "packages/db/src/client.ts",
    );
    expect([...targets.keys()].some((key) => /[*?{}]/.test(key))).toBe(false);
  });
});
