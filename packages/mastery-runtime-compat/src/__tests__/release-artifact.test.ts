import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../../..");
const PACKAGES = [
  "knowledge-space-core",
  "knowledge-space-practice",
  "practice-core",
  "srs-engine",
] as const;

type ReleaseModule = {
  runReleaseArtifactCheck: () => Promise<{
    packages: string[];
    dryRun: true;
    exportsVerified: true;
    workspaceDependencies: string[];
    cleanConsumer: true;
  }>;
};

async function loadReleaseGate(): Promise<ReleaseModule | null> {
  try {
    const url = new URL("../release-artifact.js", import.meta.url).href;
    return (await import(url)) as ReleaseModule;
  } catch {
    return null;
  }
}

describe("mastery runtime packed release contract", () => {
  it("has deterministic package metadata as a harness control", async () => {
    for (const directory of PACKAGES) {
      const manifest = JSON.parse(
        await readFile(resolve(ROOT, "packages", directory, "package.json"), "utf8"),
      ) as { name: string; version: string; files?: string[]; exports?: unknown };
      expect(manifest.name).toBe(`@reading-advantage/${directory}`);
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(manifest.files).toContain("dist");
      expect(manifest.exports).toBeTruthy();
    }
  });

  it("dry-runs all packs and validates a clean non-workspace consumer", async () => {
    const module = await loadReleaseGate();
    expect(module, "missing reusable src/release-artifact.ts gate").not.toBeNull();
    if (!module) return;

    const result = await module.runReleaseArtifactCheck();
    expect(result.packages).toEqual(PACKAGES.map((name) => `@reading-advantage/${name}`));
    expect(result).toMatchObject({
      dryRun: true,
      exportsVerified: true,
      workspaceDependencies: [],
      cleanConsumer: true,
    });
  }, 120_000);
});
