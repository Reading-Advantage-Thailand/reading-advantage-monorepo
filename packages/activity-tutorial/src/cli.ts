#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createNodeTutorialCheckerPorts, runTutorialStep } from "./checker.js";
import { tutorialManifestSchema } from "./contracts.js";

/**
 * Runs the tutorial checker CLI over one scaffold without uploading repository output.
 * @param argv Command arguments containing `--step <step-id>`.
 * @param root Tutorial repository root.
 * @param write Secret-free structured result writer.
 * @returns Process-compatible zero for success or one for failed checks.
 */
export async function runTutorialCli(argv: string[], root: string, write: (output: string) => void): Promise<number> {
  const stepIndex = argv.indexOf("--step");
  const stepId = stepIndex >= 0 ? argv[stepIndex + 1] : undefined;
  if (!stepId) throw new Error("Usage: tutorial-check --step <step-id>");
  const manifest = tutorialManifestSchema.parse(JSON.parse(await readFile(resolve(root, "activity-tutorial.json"), "utf8")));
  const result = await runTutorialStep(manifest, stepId, createNodeTutorialCheckerPorts(root, manifest));
  write(`${JSON.stringify(result)}\n`);
  return result.passed ? 0 : 1;
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href;
if (isMain) process.exitCode = await runTutorialCli(process.argv.slice(2), process.cwd(), (output) => process.stdout.write(output));
