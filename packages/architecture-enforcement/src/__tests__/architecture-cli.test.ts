import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  discoverArchitectureRepositoryRoot,
  isArchitectureCheckEntrypoint,
  mainArchitectureCheckCli,
  parseArchitectureCheckArguments,
  runArchitectureCheckCli,
} from "../architecture-check-cli.js";
import type { ArchitectureCheckReport } from "../architecture-check.js";
import {
  discoverBaselineUpdateRepositoryRoot,
  isBaselineUpdateEntrypoint,
  mainArchitectureBaselineUpdateCli,
  parseBaselineUpdateArguments,
  runArchitectureBaselineUpdateCli,
} from "../baseline-update-cli.js";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Creates one minimal valid architecture checker report. */
function report(
  status: ArchitectureCheckReport["status"],
): ArchitectureCheckReport {
  return {
    schemaVersion: 1,
    status,
    filesScanned: 2,
    findings: [],
    parseErrors:
      status === "analysis-error"
        ? [
            {
              schemaVersion: 1,
              sourcePath: "apps/example/src/broken.ts",
              line: 2,
              column: 4,
              code: "TYPESCRIPT_PARSE_ERROR",
            },
          ]
        : [],
  };
}

describe("architecture check CLI", () => {
  it("parses discovered and explicit roots with strict formats", () => {
    const discover = vi.fn(() => "/discovered/repo");
    expect(parseArchitectureCheckArguments([], "/cwd", discover)).toEqual({
      format: "human",
      repoRoot: "/discovered/repo",
    });
    expect(discover).toHaveBeenCalledWith("/cwd");
    expect(
      parseArchitectureCheckArguments(
        ["--format", "json", "--repo-root", "/explicit/repo"],
        "/cwd",
        discover,
      ),
    ).toEqual({ format: "json", repoRoot: "/explicit/repo" });
    expect(discover).toHaveBeenCalledTimes(1);

    for (const args of [
      ["--format"],
      ["--format", "yaml"],
      ["--repo-root"],
      ["--unsupported"],
    ]) {
      expect(() =>
        parseArchitectureCheckArguments(args, "/cwd", discover),
      ).toThrow();
    }
  });

  it("runs human and JSON reports with documented exit codes", async () => {
    const humanOutput: string[] = [];
    const debtCheck = vi.fn(async () => report("debt-change"));
    await expect(
      runArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
        checkRepository: debtCheck,
        writeStdout: (output) => humanOutput.push(output),
      }),
    ).resolves.toBe(1);
    expect(debtCheck).toHaveBeenCalledWith({ repoRoot: "/repo" });
    expect(humanOutput.join("")).toContain("architecture check: debt-change");

    const jsonOutput: string[] = [];
    await expect(
      runArchitectureCheckCli(
        ["--format", "json", "--repo-root", "/repo"],
        "/cwd",
        {
          checkRepository: async () => report("clean"),
          writeStdout: (output) => jsonOutput.push(output),
        },
      ),
    ).resolves.toBe(0);
    expect(JSON.parse(jsonOutput.join(""))).toMatchObject({ status: "clean" });

    await expect(
      runArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
        checkRepository: async () => report("analysis-error"),
        writeStdout: vi.fn(),
      }),
    ).resolves.toBe(2);
  });

  it("converts thrown and non-error failures into secret-safe exit two", async () => {
    const errors: string[] = [];
    await expect(
      mainArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
        checkRepository: async () => {
          throw new Error("fixture failure");
        },
        writeStderr: (output) => errors.push(output),
      }),
    ).resolves.toBe(2);
    await expect(
      mainArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
        checkRepository: async () => Promise.reject("credential-value"),
        writeStderr: (output) => errors.push(output),
      }),
    ).resolves.toBe(2);
    expect(errors).toEqual([
      "Architecture check failed: fixture failure\n",
      "Architecture check failed: unknown error\n",
    ]);
    expect(errors.join("")).not.toContain("credential-value");
  });

  it("uses the live process streams when no output adapters are supplied", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await expect(
      runArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
        checkRepository: async () => report("clean"),
      }),
    ).resolves.toBe(0);
    await expect(
      mainArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
        checkRepository: async () => {
          throw new Error("live stream fixture");
        },
      }),
    ).resolves.toBe(2);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("clean"));
    expect(stderr).toHaveBeenCalledWith(
      "Architecture check failed: live stream fixture\n",
    );
    stdout.mockRestore();
    stderr.mockRestore();
  });

  it("discovers the live root and identifies direct entrypoints exactly", () => {
    const repoRoot = discoverArchitectureRepositoryRoot(process.cwd());
    expect(discoverArchitectureRepositoryRoot(repoRoot)).toBe(repoRoot);
    const executable = "/tmp/architecture-check-cli.js";
    expect(
      isArchitectureCheckEntrypoint(pathToFileURL(executable).href, executable),
    ).toBe(true);
    expect(
      isArchitectureCheckEntrypoint("file:///different.js", executable),
    ).toBe(false);
    expect(
      isArchitectureCheckEntrypoint(pathToFileURL(executable).href, undefined),
    ).toBe(false);
  });
});

describe("architecture baseline update CLI", () => {
  it("parses acknowledgement, metadata, formats, and strict failures", () => {
    const discover = vi.fn(() => "/discovered/repo");
    expect(parseBaselineUpdateArguments([], "/cwd", discover)).toEqual({
      acknowledge: false,
      format: "human",
      repoRoot: "/discovered/repo",
    });
    expect(
      parseBaselineUpdateArguments(
        [
          "--acknowledge",
          "--format",
          "json",
          "--repo-root",
          "/repo",
          "--owner",
          "architecture-platform",
          "--rationale",
          "Reviewed temporary architecture debt for migration.",
        ],
        "/cwd",
        discover,
      ),
    ).toEqual({
      acknowledge: true,
      format: "json",
      repoRoot: "/repo",
      owner: "architecture-platform",
      rationale: "Reviewed temporary architecture debt for migration.",
    });
    for (const args of [
      ["--format"],
      ["--format", "yaml"],
      ["--repo-root"],
      ["--owner"],
      ["--rationale"],
      ["--owner", "architecture-platform"],
      ["--rationale", "Reviewed rationale without owner."],
      ["--unsupported"],
    ]) {
      expect(() =>
        parseBaselineUpdateArguments(args, "/cwd", discover),
      ).toThrow();
    }
  });

  it("keeps preview read-only and maps human update outcomes", async () => {
    const previewOutput: string[] = [];
    const previewUpdate = vi.fn(async () => ({
      schemaVersion: 1 as const,
      report: report("debt-change"),
      wroteBaselines: false,
    }));
    await expect(
      runArchitectureBaselineUpdateCli(
        ["--repo-root", "/repo"],
        "/cwd",
        {
          updateBaselines: previewUpdate,
          writeStdout: (output) => previewOutput.push(output),
        },
      ),
    ).resolves.toBe(1);
    expect(previewUpdate).toHaveBeenCalledWith({
      repoRoot: "/repo",
      acknowledge: false,
    });
    expect(previewOutput.join("")).toContain("preview only");

    const writtenOutput: string[] = [];
    await expect(
      runArchitectureBaselineUpdateCli(
        [
          "--acknowledge",
          "--repo-root",
          "/repo",
          "--owner",
          "architecture-platform",
          "--rationale",
          "Reviewed temporary architecture debt for migration.",
        ],
        "/cwd",
        {
          updateBaselines: async () => ({
            schemaVersion: 1,
            report: report("debt-change"),
            wroteBaselines: true,
          }),
          writeStdout: (output) => writtenOutput.push(output),
        },
      ),
    ).resolves.toBe(0);
    expect(writtenOutput.join("")).toContain("written");

    const cleanOutput: string[] = [];
    await expect(
      runArchitectureBaselineUpdateCli(
        ["--acknowledge", "--repo-root", "/repo"],
        "/cwd",
        {
          updateBaselines: async () => ({
            schemaVersion: 1,
            report: report("clean"),
            wroteBaselines: false,
          }),
          writeStdout: (output) => cleanOutput.push(output),
        },
      ),
    ).resolves.toBe(0);
    expect(cleanOutput.join("")).toContain("no write required");
  });

  it("emits stable JSON and returns two for analysis errors", async () => {
    const output: string[] = [];
    await expect(
      runArchitectureBaselineUpdateCli(
        ["--format", "json", "--repo-root", "/repo"],
        "/cwd",
        {
          updateBaselines: async () => ({
            schemaVersion: 1,
            report: report("analysis-error"),
            wroteBaselines: false,
          }),
          writeStdout: (value) => output.push(value),
        },
      ),
    ).resolves.toBe(2);
    expect(JSON.parse(output.join(""))).toMatchObject({
      schemaVersion: 1,
      wroteBaselines: false,
      report: { status: "analysis-error" },
    });
  });

  it("converts update failures into secret-safe exit two", async () => {
    const errors: string[] = [];
    await expect(
      mainArchitectureBaselineUpdateCli(
        ["--repo-root", "/repo"],
        "/cwd",
        {
          updateBaselines: async () => {
            throw new Error("fixture update failure");
          },
          writeStderr: (output) => errors.push(output),
        },
      ),
    ).resolves.toBe(2);
    await expect(
      mainArchitectureBaselineUpdateCli(
        ["--repo-root", "/repo"],
        "/cwd",
        {
          updateBaselines: async () => Promise.reject("credential-value"),
          writeStderr: (output) => errors.push(output),
        },
      ),
    ).resolves.toBe(2);
    expect(errors).toEqual([
      "Architecture baseline update failed: fixture update failure\n",
      "Architecture baseline update failed: unknown error\n",
    ]);
    expect(errors.join("")).not.toContain("credential-value");
  });

  it("uses live process streams when update output adapters are absent", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await expect(
      runArchitectureBaselineUpdateCli(["--repo-root", "/repo"], "/cwd", {
        updateBaselines: async () => ({
          schemaVersion: 1,
          report: report("clean"),
          wroteBaselines: false,
        }),
      }),
    ).resolves.toBe(0);
    await expect(
      mainArchitectureBaselineUpdateCli(["--repo-root", "/repo"], "/cwd", {
        updateBaselines: async () => {
          throw new Error("live update stream fixture");
        },
      }),
    ).resolves.toBe(2);
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining("architecture check: clean"),
    );
    expect(stderr).toHaveBeenCalledWith(
      "Architecture baseline update failed: live update stream fixture\n",
    );
    stdout.mockRestore();
    stderr.mockRestore();
  });

  it("discovers the live root and identifies direct entrypoints exactly", () => {
    const repoRoot = discoverBaselineUpdateRepositoryRoot(process.cwd());
    expect(discoverBaselineUpdateRepositoryRoot(repoRoot)).toBe(repoRoot);
    const executable = "/tmp/baseline-update-cli.js";
    expect(
      isBaselineUpdateEntrypoint(pathToFileURL(executable).href, executable),
    ).toBe(true);
    expect(isBaselineUpdateEntrypoint("file:///different.js", executable)).toBe(
      false,
    );
    expect(
      isBaselineUpdateEntrypoint(pathToFileURL(executable).href, undefined),
    ).toBe(false);
  });
});
