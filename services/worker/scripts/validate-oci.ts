import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  parseWorkerOciContract,
  validateWorkerBuildContextDefinition,
  validateWorkerImageDefinition,
} from "../src/oci-contract.js";

const workerRoot = fileURLToPath(new URL("../", import.meta.url));

/**
 * Parses repeated `--target` command-line flags.
 * @param argumentsToParse Command-line arguments after the script name.
 * @returns Requested deployment-target names.
 * @throws When a flag is malformed or unsupported syntax is supplied.
 */
function parseTargetArguments(argumentsToParse: readonly string[]): string[] {
  const targets: string[] = [];
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const argument = argumentsToParse[index];
    if (argument === "--target") {
      const target = argumentsToParse[index + 1];
      if (!target || target.startsWith("--")) {
        throw new Error("--target requires a deployment target name");
      }
      targets.push(target);
      index += 1;
      continue;
    }
    if (argument?.startsWith("--target=")) {
      const target = argument.slice("--target=".length);
      if (!target) throw new Error("--target requires a deployment target name");
      targets.push(target);
      continue;
    }
    throw new Error(`Unsupported validate:oci argument: ${argument}`);
  }
  return targets;
}

/**
 * Validates the checked-in OCI contract and Dockerfile.
 * @returns A promise settled after all requested target checks pass.
 */
async function main(): Promise<void> {
  const requestedTargets = parseTargetArguments(process.argv.slice(2));
  const [buildContextDefinition, contractSource, dockerfile] = await Promise.all([
    readFile(`${workerRoot}Dockerfile.dockerignore`, "utf8"),
    readFile(`${workerRoot}deploy/oci-contract.json`, "utf8"),
    readFile(`${workerRoot}Dockerfile`, "utf8"),
  ]);
  const contract = parseWorkerOciContract(
    JSON.parse(contractSource) as unknown,
    requestedTargets,
  );
  validateWorkerBuildContextDefinition(buildContextDefinition);
  validateWorkerImageDefinition(dockerfile, contract);

  process.stdout.write(
    `${JSON.stringify({
      event: "worker.oci.validated",
      level: "info",
      service: contract.service,
      targets:
        requestedTargets.length > 0
          ? requestedTargets
          : contract.targets.map((target) => target.name),
    })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unknown OCI validation failure"}\n`,
  );
  process.exitCode = 1;
});
