import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, "../../scripts/strip-nomodule-polyfill.mjs");
const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "strip-nomodule-polyfill-"));
  tempDirs.push(dir);
  return dir;
}

function runStrip(args: string[], cwd: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    execFile(process.execPath, [scriptPath, ...args], { cwd }, (error, stdout, stderr) => {
      resolve({
        code: typeof error?.code === "number" ? error.code : 0,
        stdout,
        stderr,
      });
    });
  });
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("strip-nomodule-polyfill CLI", () => {
  it("patches build manifests when the dist argument is absolute", async () => {
    const cwd = await makeTempDir();
    const unrelatedCwd = await makeTempDir();
    const nextDir = join(cwd, ".next");
    const nestedDir = join(nextDir, "server", "app");
    const manifestPath = join(nestedDir, "build-manifest.json");
    await mkdir(nestedDir, { recursive: true });
    await writeFile(
      manifestPath,
      JSON.stringify({ polyfillFiles: ["static/chunks/polyfill.js"], pages: { "/": [] } }),
      "utf8",
    );

    const result = await runStrip([nextDir], unrelatedCwd);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("patched 1 of 1 build-manifest.json files");
    expect(manifest.polyfillFiles).toEqual([]);
  });

  it("is idempotent after stripping all polyfill files", async () => {
    const cwd = await makeTempDir();
    const nextDir = join(cwd, ".next");
    const manifestPath = join(nextDir, "build-manifest.json");
    await mkdir(nextDir, { recursive: true });
    await writeFile(
      manifestPath,
      JSON.stringify({ polyfillFiles: ["static/chunks/polyfill.js"] }),
      "utf8",
    );

    const first = await runStrip([".next"], cwd);
    const second = await runStrip([".next"], cwd);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    expect(first.code).toBe(0);
    expect(second.code).toBe(0);
    expect(second.stdout).toContain("no changes needed");
    expect(manifest.polyfillFiles).toEqual([]);
  });
});
