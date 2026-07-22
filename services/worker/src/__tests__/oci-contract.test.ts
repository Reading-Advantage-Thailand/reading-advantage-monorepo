import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  parseWorkerOciContract,
  validateWorkerBuildContextDefinition,
  validateWorkerImageDefinition,
} from "../oci-contract.js";

const workerRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("worker OCI contract", () => {
  it("declares the same provider-neutral process and probes for both targets", async () => {
    const source = JSON.parse(
      await readFile(`${workerRoot}deploy/oci-contract.json`, "utf8"),
    ) as unknown;

    const contract = parseWorkerOciContract(source, [
      "cloud-run",
      "ecs-fargate",
    ]);

    expect(contract.process.command).toEqual(["node", "dist/main.js"]);
    expect(contract.process.shutdownSignals).toEqual(["SIGTERM", "SIGINT"]);
    expect(contract.http).toMatchObject({
      defaultHost: "0.0.0.0",
      defaultPort: 8080,
      hostEnv: "HOST",
      livenessPath: "/livez",
      portEnv: "PORT",
      readinessPath: "/readyz",
    });
    expect(contract.targets.map((target) => target.name)).toEqual([
      "cloud-run",
      "ecs-fargate",
    ]);
  });

  it("rejects unsupported deployment targets", async () => {
    const source = JSON.parse(
      await readFile(`${workerRoot}deploy/oci-contract.json`, "utf8"),
    ) as unknown;

    expect(() =>
      parseWorkerOciContract(source, ["unsupported-platform"]),
    ).toThrow("unsupported-platform");
  });

  it("rejects malformed contracts and duplicate deployment targets", async () => {
    const source = JSON.parse(
      await readFile(`${workerRoot}deploy/oci-contract.json`, "utf8"),
    ) as { targets: unknown[] };

    expect(() => parseWorkerOciContract({}, [])).toThrow("schemaVersion");
    expect(() =>
      parseWorkerOciContract(
        { ...source, targets: [source.targets[0], source.targets[0]] },
        [],
      ),
    ).toThrow("must be unique");
  });

  it("validates the checked-in Dockerfile against the typed contract", async () => {
    const [contractSource, dockerfile] = await Promise.all([
      readFile(`${workerRoot}deploy/oci-contract.json`, "utf8"),
      readFile(`${workerRoot}Dockerfile`, "utf8"),
    ]);
    const contract = parseWorkerOciContract(JSON.parse(contractSource), [
      "cloud-run",
      "ecs-fargate",
    ]);

    expect(() => validateWorkerImageDefinition(dockerfile, contract)).not.toThrow();
    expect(() =>
      validateWorkerImageDefinition(
        dockerfile.replace("USER node", "USER root"),
        contract,
      ),
    ).toThrow("non-root");
  });

  it("keeps the worker build context bounded to its package and shared config", async () => {
    const buildContextDefinition = await readFile(
      `${workerRoot}Dockerfile.dockerignore`,
      "utf8",
    );

    expect(buildContextDefinition.split(/\r?\n/, 1)).toEqual(["*"]);
    expect(() =>
      validateWorkerBuildContextDefinition(buildContextDefinition),
    ).not.toThrow();
    expect(() =>
      validateWorkerBuildContextDefinition(
        buildContextDefinition.replace("*\n", "!apps/**\n"),
      ),
    ).toThrow("exclude the repository by default");
    expect(() =>
      validateWorkerBuildContextDefinition(
        buildContextDefinition.replace("!package.json\n", ""),
      ),
    ).toThrow("missing required rule");
    expect(() =>
      validateWorkerBuildContextDefinition(
        `${buildContextDefinition}!apps/**\n`,
      ),
    ).toThrow("unexpected rule");
  });

  it.each([
    "packages/config/node_modules",
    "packages/config/dist",
    "packages/config/.turbo",
    "packages/config/coverage",
    "packages/config/.env",
    "packages/config/.env.*",
    "services/worker/node_modules",
    "services/worker/dist",
    "services/worker/.turbo",
    "services/worker/coverage",
    "services/worker/.env",
    "services/worker/.env.*",
  ])("requires the nested exclusion for %s", async (excludedPath) => {
    const buildContextDefinition = await readFile(
      `${workerRoot}Dockerfile.dockerignore`,
      "utf8",
    );

    expect(() =>
      validateWorkerBuildContextDefinition(
        buildContextDefinition.replace(`${excludedPath}\n`, ""),
      ),
    ).toThrow("missing required exclusion");
  });

  it("rejects exclusions placed before the broad package re-includes", async () => {
    const buildContextDefinition = await readFile(
      `${workerRoot}Dockerfile.dockerignore`,
      "utf8",
    );
    const exclusion = "services/worker/.env.*";
    const reorderedDefinition = buildContextDefinition
      .replace(`${exclusion}\n`, "")
      .replace(
        "!services/worker/**\n",
        `${exclusion}\n!services/worker/**\n`,
      );

    expect(() =>
      validateWorkerBuildContextDefinition(reorderedDefinition),
    ).toThrow("must follow the broad package re-includes");
  });
});
