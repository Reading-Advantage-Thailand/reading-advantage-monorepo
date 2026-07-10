import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { codeKnowledgeGraph } from "./data.js";
import { codeGraphSourceProvenance } from "./provenance.js";
import { curriculumBindings } from "./binding-data.js";
import { buildBindingCoverageReport, validateCurriculumBindings } from "./bindings.js";
import {
  curriculumSourceInventory,
  curriculumSourceProvenance,
} from "./curriculum-inventory.js";
import { verifyCurriculumSource } from "./curriculum-inventory-contract.js";
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

/** Default monorepo root resolved from either the source or built package directory. */
export const defaultCodecampMonorepoRoot = resolve(currentDirectory, "../../..");

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
  if (command === "bindings-validate") {
    const result = validateCurriculumBindings(
      curriculumBindings,
      codeKnowledgeGraph,
      curriculumSourceInventory,
      curriculumSourceProvenance,
    );
    context.stdout(JSON.stringify(result, null, 2));
    return result.valid ? 0 : 1;
  }
  if (command === "bindings-report") {
    context.stdout(JSON.stringify(buildBindingCoverageReport(curriculumBindings), null, 2));
    return 0;
  }
  if (command === "bindings-verify-source") {
    const repoRoot = process.env.CODECAMP_MONOREPO_ROOT ?? defaultCodecampMonorepoRoot;
    try {
      const sourceBytes = readFileSync(
        resolve(repoRoot, curriculumSourceProvenance.sourcePath),
      );
      const artifactBytes = readFileSync(
        resolve(currentDirectory, "../", curriculumSourceProvenance.sourceArtifact),
      );
      const baseBytes = execFileSync(
        "git",
        [
          "show",
          `${curriculumSourceProvenance.originBaseRevision}:${curriculumSourceProvenance.sourcePath}`,
        ],
        { cwd: repoRoot },
      );
      const result = verifyCurriculumSource(
        sourceBytes,
        artifactBytes,
        baseBytes,
        curriculumSourceInventory,
        curriculumSourceProvenance,
      );
      context.stdout(JSON.stringify(result, null, 2));
      return result.valid ? 0 : 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.stderr(`${message} Set CODECAMP_MONOREPO_ROOT to the source checkout.`);
      return 1;
    }
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
  context.stderr(
    "Usage: codecamp-knowledge <validate|report|verify-source|bindings-validate|bindings-report|bindings-verify-source>",
  );
  return 2;
}

const isEntrypoint = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  process.exitCode = runCodeGraphCli(process.argv.slice(2), {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  });
}
