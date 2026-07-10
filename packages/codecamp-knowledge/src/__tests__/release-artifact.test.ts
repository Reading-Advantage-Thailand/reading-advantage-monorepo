import { execFileSync } from "node:child_process";
import {
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
const tempRoot = mkdtempSync(join(tmpdir(), "codecamp-knowledge-pack-"));
let extractedPackage = "";

describe("packed graph release artifact", () => {
  beforeAll(() => {
    execFileSync("pnpm", ["build"], { cwd: packageRoot, stdio: "pipe" });
    execFileSync("pnpm", ["pack", "--pack-destination", tempRoot], {
      cwd: packageRoot,
      stdio: "pipe",
    });
    const archive = join(tempRoot, readdirSync(tempRoot).find((entry) => entry.endsWith(".tgz"))!);
    execFileSync("tar", ["-xzf", archive, "-C", tempRoot]);
    extractedPackage = join(tempRoot, "package");
    mkdirSync(join(extractedPackage, "node_modules/@reading-advantage"), { recursive: true });
    symlinkSync(
      join(packageRoot, "../knowledge-space-core"),
      join(extractedPackage, "node_modules/@reading-advantage/knowledge-space-core"),
      "dir",
    );
    symlinkSync(
      join(packageRoot, "node_modules/zod"),
      join(extractedPackage, "node_modules/zod"),
      "dir",
    );
  });

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
  });

  it.each([
    ["validate", '"valid": true'],
    ["report", '"graphId": "codecamp.core"'],
  ])("runs the packed CLI %s command with stable output", (command, fragment) => {
    const output = execFileSync("node", [join(extractedPackage, "dist/cli.js"), command], {
      cwd: extractedPackage,
      encoding: "utf8",
    });
    expect(output).toContain(fragment);
  });
});
