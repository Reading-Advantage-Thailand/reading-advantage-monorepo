#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  architectureCheckExitCode,
  formatArchitectureCheckReport,
  serializeArchitectureCheckReport,
} from "./architecture-check.js";
import { updateArchitectureBaselines } from "./baseline-update.js";

/** Supported baseline update output representations. */
export type BaselineUpdateOutputFormat = "human" | "json";

/** Parsed explicit baseline update command-line options. */
export interface BaselineUpdateCliOptions {
  /** Explicit consent required before the update operation may write. */
  acknowledge: boolean;
  /** Selected human or JSON output representation. */
  format: BaselineUpdateOutputFormat;
  /** Exact repository root supplied or discovered for the command. */
  repoRoot: string;
  /** Optional accountable owner for genuinely new debt. */
  owner?: string;
  /** Optional reviewed rationale paired with the accountable owner. */
  rationale?: string;
}

/** Replaceable baseline-update dependencies used by direct CLI tests. */
export interface BaselineUpdateCliDependencies {
  /** Runs preview-first architecture baseline update behavior. */
  updateBaselines?: typeof updateArchitectureBaselines;
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
export function discoverBaselineUpdateRepositoryRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/** Parses explicit baseline-update arguments with no implicit acknowledgement. */
export function parseBaselineUpdateArguments(
  args: readonly string[],
  cwd: string,
  discoverRepositoryRoot: (cwd: string) => string =
    discoverBaselineUpdateRepositoryRoot,
): BaselineUpdateCliOptions {
  let acknowledge = false;
  let format: BaselineUpdateOutputFormat = "human";
  let repoRoot: string | undefined;
  let owner: string | undefined;
  let rationale: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--acknowledge") {
      acknowledge = true;
    } else if (
      argument === "--format" ||
      argument === "--repo-root" ||
      argument === "--owner" ||
      argument === "--rationale"
    ) {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      if (argument === "--format") {
        if (value !== "human" && value !== "json") {
          throw new Error("--format must be human or json");
        }
        format = value;
      } else if (argument === "--repo-root") {
        repoRoot = value;
      } else if (argument === "--owner") {
        owner = value;
      } else {
        rationale = value;
      }
      index += 1;
    } else {
      throw new Error(
        `Unsupported architecture baseline update argument: ${argument}`,
      );
    }
  }
  if ((owner === undefined) !== (rationale === undefined)) {
    throw new Error("--owner and --rationale must be supplied together");
  }
  return {
    acknowledge,
    format,
    repoRoot: repoRoot ?? discoverRepositoryRoot(cwd),
    ...(owner ? { owner } : {}),
    ...(rationale ? { rationale } : {}),
  };
}

/**
 * Runs preview-first baseline update behavior with explicit acknowledgement.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @returns Zero after clean or written state, one for preview, or two on error.
 */
export async function runArchitectureBaselineUpdateCli(
  args: readonly string[],
  cwd: string,
  dependencies: BaselineUpdateCliDependencies = {},
): Promise<0 | 1 | 2> {
  const options = parseBaselineUpdateArguments(
    args,
    cwd,
    dependencies.discoverRepositoryRoot,
  );
  const result = await (
    dependencies.updateBaselines ?? updateArchitectureBaselines
  )({
    repoRoot: options.repoRoot,
    acknowledge: options.acknowledge,
    ...(options.owner && options.rationale
      ? {
          newDebtMetadata: {
            owner: options.owner,
            rationale: options.rationale,
          },
        }
      : {}),
  });
  if (options.format === "json") {
    (dependencies.writeStdout ?? writeProcessStdout)(
      `${JSON.stringify(
        {
          schemaVersion: 1,
          wroteBaselines: result.wroteBaselines,
          report: JSON.parse(serializeArchitectureCheckReport(result.report)),
        },
        null,
        2,
      )}\n`,
    );
  } else {
    const writeStdout = dependencies.writeStdout ?? writeProcessStdout;
    writeStdout(formatArchitectureCheckReport(result.report));
    writeStdout(
      result.wroteBaselines
        ? "architecture baseline update: written\n"
        : options.acknowledge
          ? "architecture baseline update: no write required\n"
          : "architecture baseline update: preview only; rerun with --acknowledge to write\n",
    );
  }
  const checkExitCode = architectureCheckExitCode(result.report);
  if (checkExitCode === 2) return 2;
  if (result.report.status === "clean" || result.wroteBaselines) return 0;
  return 1;
}

/** Runs the guarded update CLI and converts failures into exit code two. */
export async function mainArchitectureBaselineUpdateCli(
  args: readonly string[],
  cwd: string,
  dependencies: BaselineUpdateCliDependencies = {},
): Promise<0 | 1 | 2> {
  try {
    return await runArchitectureBaselineUpdateCli(args, cwd, dependencies);
  } catch (error) {
    (dependencies.writeStderr ?? writeProcessStderr)(
      `Architecture baseline update failed: ${
        error instanceof Error ? error.message : "unknown error"
      }\n`,
    );
    return 2;
  }
}

/** Tests whether this module is the directly invoked baseline CLI entrypoint. */
export function isBaselineUpdateEntrypoint(
  moduleUrl: string,
  executablePath: string | undefined,
): boolean {
  return (
    executablePath !== undefined &&
    moduleUrl === pathToFileURL(executablePath).href
  );
}

/* v8 ignore start -- direct process wiring is exercised by the package script */
if (isBaselineUpdateEntrypoint(import.meta.url, process.argv[1])) {
  void mainArchitectureBaselineUpdateCli(
    process.argv.slice(2),
    process.cwd(),
  ).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
/* v8 ignore stop */
