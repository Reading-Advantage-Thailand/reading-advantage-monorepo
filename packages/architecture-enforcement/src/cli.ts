#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  inventoryRepository,
  proposeDirectViolations,
  serializeDirectViolationReview,
  serializeInventory,
} from "./inventory.js";
import { loadOwnershipMap } from "./ownership-map.js";

/** Supported architecture inventory CLI output format. */
type InventoryOutputFormat = "human" | "json" | "review-json";

/** Parsed architecture inventory CLI options. */
interface InventoryCliOptions {
  /** Output representation written to standard output. */
  format: InventoryOutputFormat;
  /** Absolute repository root discovered from git or provided by the caller. */
  repoRoot: string;
}

/**
 * Discovers the containing git repository root.
 * @param cwd Working directory from which to invoke git.
 * @returns Absolute repository root reported by git.
 * @throws When the working directory is not inside a git repository.
 */
function discoverRepositoryRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/**
 * Parses strict architecture inventory command-line arguments.
 * @param args User-supplied arguments after the executable name.
 * @param cwd Current working directory used for repository discovery.
 * @returns Validated output and repository options.
 * @throws When an argument or format is unsupported.
 */
function parseArguments(
  args: readonly string[],
  cwd: string,
): InventoryCliOptions {
  let format: InventoryOutputFormat = "human";
  let repoRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--format") {
      const value = args[index + 1];
      if (value !== "human" && value !== "json" && value !== "review-json") {
        throw new Error("--format must be human, json, or review-json");
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
        `Unsupported architecture inventory argument: ${argument}`,
      );
    }
  }
  return { format, repoRoot: repoRoot ?? discoverRepositoryRoot(cwd) };
}

/**
 * Runs the read-only architecture inventory command.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @returns Exit code where parse or read failures fail closed.
 */
export async function runInventoryCli(
  args: readonly string[],
  cwd: string,
): Promise<number> {
  const options = parseArguments(args, cwd);
  const inventory = await inventoryRepository({ repoRoot: options.repoRoot });
  if (options.format === "json") {
    process.stdout.write(serializeInventory(inventory));
  } else if (options.format === "review-json") {
    process.stdout.write(
      serializeDirectViolationReview(
        proposeDirectViolations(inventory, loadOwnershipMap()),
      ),
    );
  } else {
    const candidates = proposeDirectViolations(inventory, loadOwnershipMap());
    process.stdout.write(
      [
        `Architecture inventory files scanned: ${inventory.filesScanned}`,
        `Architecture inventory fact count: ${inventory.facts.length}`,
        `Architecture inventory parse error count: ${inventory.parseErrors.length}`,
        `Architecture direct baseline review count: ${candidates.filter((candidate) => candidate.proposedDisposition === "baseline-review").length}`,
        `Architecture exact exception review count: ${candidates.filter((candidate) => candidate.proposedDisposition === "exact-exception-review").length}`,
        ...inventory.parseErrors.map(
          (error) =>
            `${error.sourcePath}:${error.line}:${error.column} ${error.code}`,
        ),
        "",
      ].join("\n"),
    );
  }
  return inventory.parseErrors.length === 0 ? 0 : 1;
}

try {
  process.exitCode = await runInventoryCli(
    process.argv.slice(2),
    process.cwd(),
  );
} catch (error) {
  process.stderr.write(
    `Architecture inventory failed: ${
      error instanceof Error ? error.message : "unknown error"
    }\n`,
  );
  process.exitCode = 1;
}
