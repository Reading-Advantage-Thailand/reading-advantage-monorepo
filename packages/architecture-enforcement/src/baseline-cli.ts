#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { validateCommittedBaselines } from "./baseline-validation.js";

/** Output representations supported by the baseline validation command. */
type BaselineValidationFormat = "human" | "json";

/** Parsed arguments accepted by the baseline validation command. */
interface BaselineCliOptions {
  /** Output representation written to standard output. */
  format: BaselineValidationFormat;
  /** Absolute repository root containing the committed baselines. */
  repoRoot: string;
}

/**
 * Discovers the containing git repository root.
 * @param cwd Working directory from which to invoke git.
 * @returns Absolute repository root reported by git.
 */
function discoverRepositoryRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/**
 * Parses strict baseline validation command-line arguments.
 * @param args User-supplied arguments after the executable name.
 * @param cwd Current working directory used for repository discovery.
 * @returns Validated repository root and output format.
 * @throws When an option or output format is unsupported.
 */
function parseArguments(
  args: readonly string[],
  cwd: string,
): BaselineCliOptions {
  let format: BaselineValidationFormat = "human";
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
      throw new Error(
        `Unsupported architecture baseline argument: ${argument}`,
      );
    }
  }
  return { format, repoRoot: repoRoot ?? discoverRepositoryRoot(cwd) };
}

/**
 * Runs fail-closed baseline validation for both architecture domains.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @returns Zero after both baselines match current reviewed violations.
 */
export async function runBaselineValidationCli(
  args: readonly string[],
  cwd: string,
): Promise<number> {
  const options = parseArguments(args, cwd);
  const summary = await validateCommittedBaselines(options.repoRoot);
  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        `Architecture baseline files scanned: ${summary.filesScanned}`,
        `Architecture database baseline entries: ${summary.databaseEntries}`,
        `Architecture provider baseline entries: ${summary.providerEntries}`,
        `Architecture database ruleset hash: ${summary.databaseRulesetHash}`,
        `Architecture provider ruleset hash: ${summary.providerRulesetHash}`,
        "",
      ].join("\n"),
    );
  }
  return 0;
}

try {
  process.exitCode = await runBaselineValidationCli(
    process.argv.slice(2),
    process.cwd(),
  );
} catch (error) {
  process.stderr.write(
    `Architecture baseline validation failed: ${
      error instanceof Error ? error.message : "unknown error"
    }\n`,
  );
  process.exitCode = 1;
}
