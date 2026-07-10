import { describe, expect, it, vi } from "vitest";

import {
  codeGraphSourceProvenance,
  runCodeGraphCli,
  verifySourceSnapshot,
} from "../index.js";

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

  it("verifies the actual normative checkout against the packaged bytes", () => {
    const stdout = vi.fn();
    expect(runCodeGraphCli(["verify-source"], {
      stdout,
      stderr: vi.fn(),
      sourceRoot: "/home/daniel-bo/Desktop/mastery-advantage",
    })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining(codeGraphSourceProvenance.sourceCommit));
  });

  it("resolves the sibling normative checkout by default", () => {
    const stdout = vi.fn();
    expect(runCodeGraphCli(["verify-source"], {
      stdout,
      stderr: vi.fn(),
    })).toBe(0);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('"valid": true'));
  });
});
