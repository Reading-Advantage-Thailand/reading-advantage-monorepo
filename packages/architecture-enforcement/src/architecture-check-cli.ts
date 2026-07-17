#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  architectureCheckExitCode,
  checkArchitectureRepository,
  formatArchitectureCheckReport,
  serializeArchitectureCheckReport,
} from "./architecture-check.js";

/** Supported architecture check output representations. */
export type ArchitectureCheckOutputFormat = "human" | "json";

/** Parsed architecture check command-line options. */
export interface ArchitectureCheckCliOptions {
  /** Selected human or JSON output representation. */
  format: ArchitectureCheckOutputFormat;
  /** Exact repository root supplied or discovered for the command. */
  repoRoot: string;
}

/** Replaceable command dependencies used by direct, side-effect-free tests. */
export interface ArchitectureCheckCliDependencies {
  /** Runs the read-only repository architecture check. */
  checkRepository?: typeof checkArchitectureRepository;
  /** Discovers a repository root when no explicit path is supplied. */
  discoverRepositoryRoot?: (cwd: string) => string;
  /** Writes successful command output. */
  writeStdout?: (output: string) => void;
  /** Writes a secret-safe command failure. */
  writeStderr?: (output: string) => void;
}

/** Writes successful output to the live process stream. */
function writeProcessStdout(output: string): void {
  process.stdout.write(output);
}

/** Writes failure output to the live process stream. */
function writeProcessStderr(output: string): void {
  process.stderr.write(output);
}

/** Discovers the containing git repository root. */
export function discoverArchitectureRepositoryRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/** Parses strict check CLI arguments without accepting silent fallbacks. */
export function parseArchitectureCheckArguments(
  args: readonly string[],
  cwd: string,
  discoverRepositoryRoot: (cwd: string) => string =
    discoverArchitectureRepositoryRoot,
): ArchitectureCheckCliOptions {
  let format: ArchitectureCheckOutputFormat = "human";
  let repoRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--format") {
      const value = args[index + 1];
      if (value !== "human" && value !== "json") {
        throw new Error("--format must be human or json");
      }
      format = value;
      index += 1;
    } else if (argument === "--repo-root") {
      const value = args[index + 1];
      if (!value) throw new Error("--repo-root requires a path");
      repoRoot = value;
      index += 1;
    } else {
      throw new Error(`Unsupported architecture check argument: ${argument}`);
    }
  }
  return { format, repoRoot: repoRoot ?? discoverRepositoryRoot(cwd) };
}

/**
 * Runs the read-only non-interactive architecture check command.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @returns Zero for clean, one for debt changes, or two for analysis failure.
 */
export async function runArchitectureCheckCli(
  args: readonly string[],
  cwd: string,
  dependencies: ArchitectureCheckCliDependencies = {},
): Promise<0 | 1 | 2> {
  const options = parseArchitectureCheckArguments(
    args,
    cwd,
    dependencies.discoverRepositoryRoot,
  );
  const report = await (
    dependencies.checkRepository ?? checkArchitectureRepository
  )({
    repoRoot: options.repoRoot,
  });
  (dependencies.writeStdout ?? writeProcessStdout)(
    options.format === "json"
      ? serializeArchitectureCheckReport(report)
      : formatArchitectureCheckReport(report),
  );
  return architectureCheckExitCode(report);
}

/** Runs the checked CLI boundary and converts failures into exit code two. */
export async function mainArchitectureCheckCli(
  args: readonly string[],
  cwd: string,
  dependencies: ArchitectureCheckCliDependencies = {},
): Promise<0 | 1 | 2> {
  try {
    return await runArchitectureCheckCli(args, cwd, dependencies);
  } catch (error) {
    (dependencies.writeStderr ?? writeProcessStderr)(
      `Architecture check failed: ${
        error instanceof Error ? error.message : "unknown error"
      }\n`,
    );
    return 2;
  }
}

/** Tests whether this module is the directly invoked CLI entrypoint. */
export function isArchitectureCheckEntrypoint(
  moduleUrl: string,
  executablePath: string | undefined,
): boolean {
  return (
    executablePath !== undefined &&
    moduleUrl === pathToFileURL(executablePath).href
  );
}

/* v8 ignore start -- direct process wiring is exercised by the package script */
if (isArchitectureCheckEntrypoint(import.meta.url, process.argv[1])) {
  void mainArchitectureCheckCli(process.argv.slice(2), process.cwd()).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
  );
}
/* v8 ignore stop */
