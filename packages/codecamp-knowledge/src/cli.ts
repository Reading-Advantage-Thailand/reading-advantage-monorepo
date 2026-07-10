import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { codeKnowledgeGraph } from "./data.js";
import { codeGraphSourceProvenance } from "./provenance.js";
import { buildCodeGraphReport } from "./report.js";
import { validateCodeKnowledgeGraph } from "./validation.js";
import { verifySourceSnapshot } from "./source-sync.js";

/** Output and source seams for deterministic CLI tests. */
export interface CodeGraphCliContext {
  /** Receives normal command output. */
  stdout: (message: string) => void;
  /** Receives usage and failure output. */
  stderr: (message: string) => void;
  /** Optional checkout root for the normative Mastery Advantage source. */
  sourceRoot?: string;
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));

/** Default sibling checkout path resolved from either the source or built package directory. */
export const defaultMasteryAdvantageRoot = resolve(
  currentDirectory,
  "../../../../mastery-advantage",
);

/** Executes one Codecamp graph validation/report/source command.
 * @param args Command arguments after the executable name.
 * @param context Output callbacks and optional source checkout root.
 * @returns Process-compatible exit code, with zero only for a successful gate.
 */
export function runCodeGraphCli(args: string[], context: CodeGraphCliContext): number {
  const [command] = args;
  if (command === "validate") {
    const result = validateCodeKnowledgeGraph(codeKnowledgeGraph);
    context.stdout(JSON.stringify(result, null, 2));
    return result.valid ? 0 : 1;
  }
  if (command === "report") {
    context.stdout(JSON.stringify(buildCodeGraphReport(codeKnowledgeGraph), null, 2));
    return 0;
  }
  if (command === "verify-source") {
    const sourceRoot =
      context.sourceRoot ??
      process.env.MASTERY_ADVANTAGE_ROOT ??
      defaultMasteryAdvantageRoot;
    try {
      const sourceBytes = readFileSync(resolve(sourceRoot, codeGraphSourceProvenance.authorityPath));
      const snapshotBytes = readFileSync(resolve(currentDirectory, "data/code-knowledge-space.json"));
      const result = verifySourceSnapshot(sourceBytes, snapshotBytes, codeGraphSourceProvenance);
      context.stdout(JSON.stringify({ ...result, sourceCommit: codeGraphSourceProvenance.sourceCommit }, null, 2));
      return result.valid ? 0 : 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.stderr(`${message} Set MASTERY_ADVANTAGE_ROOT to the normative checkout.`);
      return 1;
    }
  }
  context.stderr("Usage: codecamp-knowledge <validate|report|verify-source>");
  return 2;
}

const isEntrypoint = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  process.exitCode = runCodeGraphCli(process.argv.slice(2), {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  });
}
