import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const corePackageRoot = join(packageRoot, "../knowledge-space-core");
const tempRoot = mkdtempSync(join(tmpdir(), "codecamp-knowledge-pack-"));
const coreSnapshotRoot = join(tempRoot, "knowledge-space-core");
let extractedPackage = "";

/**
 * Builds a private copy of the knowledge-space-core package for the packed CLI.
 *
 * Another turbo task rewrites `packages/knowledge-space-core/dist` in place
 * through `tsc -p` (mastery-runtime-compat release proof). A reader of the
 * shared dist can catch a file that tsc truncated and has not finished
 * (CI run 44984746870). The private copy keeps this test on stable bytes.
 */
function buildCoreSnapshot(): void {
  mkdirSync(coreSnapshotRoot, { recursive: true });
  copyFileSync(
    join(corePackageRoot, "package.json"),
    join(coreSnapshotRoot, "package.json"),
  );
  execFileSync(
    "node",
    [
      join(packageRoot, "../../node_modules/typescript/bin/tsc"),
      "--project",
      join(corePackageRoot, "tsconfig.json"),
      "--outDir",
      join(coreSnapshotRoot, "dist"),
    ],
    { cwd: corePackageRoot, stdio: "pipe" },
  );
  mkdirSync(join(coreSnapshotRoot, "node_modules"), { recursive: true });
  symlinkSync(
    join(corePackageRoot, "node_modules/zod"),
    join(coreSnapshotRoot, "node_modules/zod"),
    "dir",
  );
}

describe("packed graph release artifact", () => {
  beforeAll(() => {
    execFileSync(
      "node",
      [join(packageRoot, "../../node_modules/typescript/bin/tsc")],
      { cwd: packageRoot, stdio: "pipe" },
    );
    execFileSync("node", [join(packageRoot, "scripts/copy-data.mjs")], {
      cwd: packageRoot,
      stdio: "pipe",
    });
    buildCoreSnapshot();
    execFileSync("npm", ["pack", "--pack-destination", tempRoot], {
      cwd: packageRoot,
      stdio: "pipe",
    });
    const archive = join(tempRoot, readdirSync(tempRoot).find((entry) => entry.endsWith(".tgz"))!);
    execFileSync("tar", ["-xzf", archive, "-C", tempRoot]);
    extractedPackage = join(tempRoot, "package");
    mkdirSync(join(extractedPackage, "node_modules/@reading-advantage"), { recursive: true });
    symlinkSync(
      coreSnapshotRoot,
      join(extractedPackage, "node_modules/@reading-advantage/knowledge-space-core"),
      "dir",
    );
    symlinkSync(
      join(packageRoot, "node_modules/zod"),
      join(extractedPackage, "node_modules/zod"),
      "dir",
    );
  }, 180_000);

  afterAll(() => rmSync(tempRoot, { recursive: true, force: true }));

  it("ships byte-identical ./graph data and separate source provenance", () => {
    const sourceGraph = readFileSync(join(packageRoot, "src/data/code-knowledge-space.json"));
    const packedGraph = readFileSync(join(extractedPackage, "dist/data/code-knowledge-space.json"));
    expect(packedGraph.equals(sourceGraph)).toBe(true);
    const manifest = JSON.parse(readFileSync(join(extractedPackage, "package.json"), "utf8")) as {
      exports: Record<string, unknown>;
    };
    expect(manifest.exports["./graph"]).toBe("./dist/data/code-knowledge-space.json");
    expect(() => readFileSync(join(extractedPackage, "dist/data/code-knowledge-space.provenance.json"))).not.toThrow();
    for (const file of [
      "curriculum-bindings.json",
      "curriculum-source-inventory.json",
      "curriculum-source-provenance.json",
    ]) {
      expect(() => readFileSync(join(extractedPackage, "dist/data", file))).not.toThrow();
    }
    expect(() =>
      readFileSync(
        join(
          extractedPackage,
          "source-snapshots/codecamp-curriculum-e4d3fc7cc9927f91.ts",
        ),
      ),
    ).not.toThrow();
  });

  it.each([
    ["validate", '"valid": true'],
    ["report", '"graphId": "codecamp.core"'],
    ["bindings-validate", '"valid": true'],
    ["bindings-report", '"totalBindings": 209'],
  ])("runs the packed CLI %s command with stable output", (command, fragment) => {
    const output = execFileSync("node", [join(extractedPackage, "dist/cli.js"), command], {
      cwd: extractedPackage,
      encoding: "utf8",
    });
    expect(output).toContain(fragment);
  });
});
