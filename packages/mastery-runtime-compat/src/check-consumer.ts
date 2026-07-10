import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  evaluateConsumerCompatibility,
  runtimeManifest,
  type CompatibilityResult,
} from "./index.js";

/**
 * Evaluates a consumer descriptor against the committed mastery runtime release.
 * @param descriptor Candidate descriptor parsed from JSON or supplied by a caller.
 * @returns A fail-closed compatibility result with stable diagnostic codes.
 */
export function runConsumerCompatibilityGate(
  descriptor: unknown,
): CompatibilityResult {
  return evaluateConsumerCompatibility(runtimeManifest, descriptor);
}

/**
 * Reads a JSON descriptor and evaluates it with the reusable consumer gate.
 * @param descriptorPath Absolute or process-relative path to the descriptor.
 * @returns A fail-closed compatibility result with stable diagnostic codes.
 * @throws When the descriptor file cannot be read or is not valid JSON.
 */
export async function runConsumerCompatibilityGateFromPath(
  descriptorPath: string,
): Promise<CompatibilityResult> {
  const descriptor = JSON.parse(await readFile(descriptorPath, "utf8")) as unknown;
  return runConsumerCompatibilityGate(descriptor);
}

async function runCli(): Promise<void> {
  const descriptorPath = process.argv.slice(2).find((argument) => argument !== "--");
  if (!descriptorPath) {
    process.stderr.write("Usage: mastery-runtime-check <consumer-descriptor.json>\n");
    process.exitCode = 2;
    return;
  }

  try {
    const result = await runConsumerCompatibilityGateFromPath(descriptorPath);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.compatible) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unable to evaluate consumer descriptor: ${message}\n`);
    process.exitCode = 2;
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await runCli();
}
