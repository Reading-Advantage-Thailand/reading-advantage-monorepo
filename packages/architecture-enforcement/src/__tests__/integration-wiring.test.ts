import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

/** Reads one repository text file for exact integration assertions. */
async function readRepositoryFile(path: string): Promise<string> {
  return readFile(resolve(repositoryRoot, path), "utf8");
}

describe("architecture enforcement integration wiring", () => {
  it("exposes distinct read-only check and explicit update commands", async () => {
    const packageJson = JSON.parse(
      await readRepositoryFile("package.json"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["architecture:check"]).toContain(
      "architecture-check-cli.ts",
    );
    expect(packageJson.scripts["architecture:baseline:update"]).toContain(
      "baseline-update-cli.ts",
    );
    expect(packageJson.scripts["architecture:check"]).not.toContain("update");
  });

  it("runs the exact check in CI and Measure doctor without a bypass", async () => {
    const [ci, doctor] = await Promise.all([
      readRepositoryFile(".github/workflows/ci.yml"),
      readRepositoryFile("measure/doctor.sh"),
    ]);

    expect(ci).toContain("run: pnpm architecture:check");
    expect(doctor).toContain("\npnpm architecture:check\n");
    expect(ci).not.toMatch(/pnpm architecture:check\s*\|\|\s*true/);
    expect(doctor).not.toMatch(/pnpm architecture:check\s*\|\|\s*true/);
    expect(ci).not.toContain("architecture:baseline:update");
    expect(doctor).not.toContain("architecture:baseline:update");
  });
});
