import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  codeGraphSourceProvenance,
  defaultMasteryAdvantageRoot,
  runCodeGraphCli,
  verifySourceSnapshot,
} from "../index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoots: string[] = [];
const originalMasteryRoot = process.env.MASTERY_ADVANTAGE_ROOT;

function createNormativeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "codecamp-knowledge-source-"));
  fixtureRoots.push(root);
  const target = resolve(root, codeGraphSourceProvenance.authorityPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    readFileSync(join(packageRoot, "src/data/code-knowledge-space.json")),
  );
  return root;
}

afterEach(() => {
  if (originalMasteryRoot === undefined) delete process.env.MASTERY_ADVANTAGE_ROOT;
  else process.env.MASTERY_ADVANTAGE_ROOT = originalMasteryRoot;
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true });
});

describe("source snapshot provenance", () => {
  it("accepts identical bytes whose digest matches the separate manifest", () => {
    const bytes = new TextEncoder().encode("authoritative graph\n");
    const provenance = {
      ...codeGraphSourceProvenance,
      sourceDigest: "1d0c953785a70ef932efbea62c8cc103a5c6d072abc8ba731d14a6999561c719",
    };
    expect(verifySourceSnapshot(bytes, bytes, provenance)).toMatchObject({ valid: true, issues: [] });
  });

  it("fails independently for byte divergence and stale provenance", () => {
    const source = new TextEncoder().encode("source");
    const snapshot = new TextEncoder().encode("snapshot");
    const result = verifySourceSnapshot(source, snapshot, codeGraphSourceProvenance);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(3);
  });
});

describe("graph CLI", () => {
  it.each([
    ["validate", 0, '"valid": true'],
    ["report", 0, '"graphId": "codecamp.core"'],
    ["bindings-validate", 0, '"valid": true'],
    ["bindings-report", 0, '"totalBindings": 209'],
    ["bindings-verify-source", 0, '"valid": true'],
  ])("returns deterministic output for %s", (command, exitCode, fragment) => {
    const stdout = vi.fn();
    expect(runCodeGraphCli([command], { stdout, stderr: vi.fn() })).toBe(exitCode);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining(fragment));
  });

  it("returns usage exit code two for unknown commands", () => {
    const stderr = vi.fn();
    expect(runCodeGraphCli(["unknown"], { stdout: vi.fn(), stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });

  it("uses an explicit normative source root", () => {
    const stdout = vi.fn();
    const sourceRoot = createNormativeFixture();
    expect(runCodeGraphCli(["verify-source"], {
      stdout,
      stderr: vi.fn(),
      sourceRoot,
    })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining(codeGraphSourceProvenance.sourceCommit));
  });

  it("uses the environment source root when no explicit root exists", () => {
    const stdout = vi.fn();
    process.env.MASTERY_ADVANTAGE_ROOT = createNormativeFixture();
    expect(runCodeGraphCli(["verify-source"], {
      stdout,
      stderr: vi.fn(),
    })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('"valid": true'));
  });

  it("resolves the default root as a sibling checkout", () => {
    expect(defaultMasteryAdvantageRoot).toBe(resolve(packageRoot, "../../../mastery-advantage"));
  });
});
