// @vitest-environment node
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const script = resolve(import.meta.dirname, "capture-sales-cloud-run-tag.sh");
const temporaryDirectories: string[] = [];
const digest = `sha256:${"d".repeat(64)}`;
const repository =
  "asia-southeast1-docker.pkg.dev/project/sales-advantage/sales-advantage";

/**
 * Creates a deterministic gcloud executable for tag-binding behavior tests.
 * @returns Directory containing the fake gcloud command.
 */
function createFakeGcloud(): string {
  const directory = mkdtempSync(join(tmpdir(), "sales-tag-capture-"));
  temporaryDirectories.push(directory);
  const executable = join(directory, "gcloud");
  writeFileSync(
    executable,
    `#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  *"status.traffic"*".url)"*) printf %s "https://candidate---sales.example.test" ;;
  *"status.traffic"*".revisionName)"*) printf %s "sales-advantage-00010-new" ;;
  *"status.latestCreatedRevisionName)"*) printf %s "\${FAKE_LATEST_REVISION:-sales-advantage-00010-new}" ;;
  *"artifacts docker images describe"*) printf %s "${digest}" ;;
  *"run revisions describe"*) printf %s "${repository}@${digest}" ;;
  *) echo "unexpected gcloud arguments: $*" >&2; exit 9 ;;
esac
`,
  );
  chmodSync(executable, 0o755);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Sales Cloud Run tag capture", () => {
  it("writes a tag only when it binds the latest revision and release digest", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    execFileSync(
      "bash",
      [script, "candidate", `${repository}:build-id`, outputPrefix],
      { env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } },
    );

    expect(readFileSync(`${outputPrefix}.url`, "utf8")).toBe(
      "https://candidate---sales.example.test",
    );
    expect(readFileSync(`${outputPrefix}.revision`, "utf8")).toBe(
      "sales-advantage-00010-new",
    );
  });

  it("fails closed when the tag points at a prior revision", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    expect(() =>
      execFileSync(
        "bash",
        [script, "candidate", `${repository}:build-id`, outputPrefix],
        {
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            FAKE_LATEST_REVISION: "sales-advantage-00009-old",
          },
          stdio: "pipe",
        },
      ),
    ).toThrow();
    expect(() => readFileSync(`${outputPrefix}.url`, "utf8")).toThrow();
  });
});
