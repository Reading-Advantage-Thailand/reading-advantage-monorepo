// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const script = resolve(
  import.meta.dirname,
  "capture-marketing-cloud-run-release.sh",
);
const temporaryDirectories: string[] = [];
const candidateDigest = `sha256:${"c".repeat(64)}`;
const previousDigest = `sha256:${"d".repeat(64)}`;
const repository = "asia-southeast1-docker.pkg.dev/project/marketing/marketing";
const defaultCandidateServiceJson = JSON.stringify({
  status: {
    latestCreatedRevisionName: "marketing-00006-new",
    traffic: [
      { percent: 100, revisionName: "marketing-00005-old" },
      {
        revisionName: "marketing-00006-new",
        tag: "cdeadbeef",
        url: "https://cdeadbeef---marketing.example.test",
      },
    ],
  },
});

/**
 * Creates a deterministic gcloud executable for release-binding tests.
 * @returns Directory containing the fake gcloud command.
 */
function createFakeGcloud(): string {
  const directory = mkdtempSync(join(tmpdir(), "marketing-release-capture-"));
  temporaryDirectories.push(directory);
  const executable = join(directory, "gcloud");
  writeFileSync(
    executable,
    `#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  *"--format=json"*)
    if [[ -n "\${FAKE_SERVICE_JSON+x}" ]]; then
      printf %s "$FAKE_SERVICE_JSON"
    else
      printf %s '${defaultCandidateServiceJson}'
    fi
    ;;
  *"artifacts docker images describe"*) printf %s "${candidateDigest}" ;;
  *"run revisions describe marketing-00005-old"*) printf %s "${repository}@${previousDigest}" ;;
  *"run revisions describe marketing-00006-new"*) printf %s "${repository}@${candidateDigest}" ;;
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

describe("Marketing Cloud Run release capture", () => {
  it("preserves the exact serving revision and digest for rollback", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "previous");

    execFileSync("bash", [script, "current", outputPrefix], {
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
    });

    expect(readFileSync(`${outputPrefix}.revision`, "utf8")).toBe(
      "marketing-00005-old",
    );
    expect(readFileSync(`${outputPrefix}.image`, "utf8")).toBe(
      `${repository}@${previousDigest}`,
    );
  });

  it.each([
    ["blank traffic", { status: { traffic: [] } }],
    [
      "split traffic",
      {
        status: {
          traffic: [
            { revisionName: "marketing-00005-old", percent: 50 },
            { revisionName: "marketing-00004-older", percent: 50 },
          ],
        },
      },
    ],
    [
      "multiple 100-percent rows",
      {
        status: {
          traffic: [
            { revisionName: "marketing-00005-old", percent: 100 },
            { revisionName: "marketing-00004-older", percent: 100 },
          ],
        },
      },
    ],
    [
      "malformed traffic",
      {
        status: {
          traffic: [{ revisionName: "marketing-00005-old", percent: "100" }],
        },
      },
    ],
    [
      "a non-100 percent",
      {
        status: {
          traffic: [{ revisionName: "marketing-00005-old", percent: 99 }],
        },
      },
    ],
  ])("fails closed for %s", (_caseName, serviceStatus) => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "previous");

    expect(() =>
      execFileSync("bash", [script, "current", outputPrefix], {
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          FAKE_SERVICE_JSON: JSON.stringify(serviceStatus),
        },
        stdio: "pipe",
      }),
    ).toThrow();
    expect(() => readFileSync(`${outputPrefix}.revision`, "utf8")).toThrow();
    expect(() => readFileSync(`${outputPrefix}.image`, "utf8")).toThrow();
  });

  it("binds a collision-safe tag to the latest release image", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    execFileSync(
      "bash",
      [
        script,
        "candidate",
        "cdeadbeef",
        `${repository}:build-id`,
        outputPrefix,
      ],
      { env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } },
    );

    expect(readFileSync(`${outputPrefix}.url`, "utf8")).toBe(
      "https://cdeadbeef---marketing.example.test",
    );
    expect(readFileSync(`${outputPrefix}.revision`, "utf8")).toBe(
      "marketing-00006-new",
    );
    expect(readFileSync(`${outputPrefix}.image`, "utf8")).toBe(
      `${repository}@${candidateDigest}`,
    );
  });

  it.each([
    [
      "zero matching rows",
      {
        status: {
          latestCreatedRevisionName: "marketing-00006-new",
          traffic: [{ percent: 100, revisionName: "marketing-00005-old" }],
        },
      },
    ],
    [
      "duplicate matching rows",
      {
        status: {
          latestCreatedRevisionName: "marketing-00006-new",
          traffic: [
            {
              revisionName: "marketing-00006-new",
              tag: "cdeadbeef",
              url: "https://cdeadbeef---marketing.example.test",
            },
            {
              revisionName: "marketing-00007-other",
              tag: "cdeadbeef",
              url: "https://cdeadbeef---marketing-other.example.test",
            },
          ],
        },
      },
    ],
    [
      "a malformed tag row",
      {
        status: {
          latestCreatedRevisionName: "marketing-00006-new",
          traffic: [
            {
              revisionName: "marketing-00006-new",
              tag: 123,
              url: "https://cdeadbeef---marketing.example.test",
            },
          ],
        },
      },
    ],
    [
      "a matching row without a URL",
      {
        status: {
          latestCreatedRevisionName: "marketing-00006-new",
          traffic: [{ revisionName: "marketing-00006-new", tag: "cdeadbeef" }],
        },
      },
    ],
    [
      "a matching row without a revision",
      {
        status: {
          latestCreatedRevisionName: "marketing-00006-new",
          traffic: [
            {
              tag: "cdeadbeef",
              url: "https://cdeadbeef---marketing.example.test",
            },
          ],
        },
      },
    ],
    [
      "a malformed traffic collection",
      {
        status: {
          latestCreatedRevisionName: "marketing-00006-new",
          traffic: { tag: "cdeadbeef" },
        },
      },
    ],
  ])("fails closed for %s", (_caseName, serviceStatus) => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    expect(() =>
      execFileSync(
        "bash",
        [
          script,
          "candidate",
          "cdeadbeef",
          `${repository}:build-id`,
          outputPrefix,
        ],
        {
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            FAKE_SERVICE_JSON: JSON.stringify(serviceStatus),
          },
          stdio: "pipe",
        },
      ),
    ).toThrow();
    expect(() => readFileSync(`${outputPrefix}.url`, "utf8")).toThrow();
    expect(() => readFileSync(`${outputPrefix}.revision`, "utf8")).toThrow();
    expect(() => readFileSync(`${outputPrefix}.image`, "utf8")).toThrow();
  });

  it.each(["candidate-build-id", "cDEADBEEF", "cdeadbee", "cdeadbeef0"])(
    "rejects invalid candidate tag %s",
    (tag) => {
      const directory = createFakeGcloud();
      const outputPrefix = join(directory, "candidate");

      expect(() =>
        execFileSync(
          "bash",
          [script, "candidate", tag, `${repository}:build-id`, outputPrefix],
          {
            env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
            stdio: "pipe",
          },
        ),
      ).toThrow();
      expect(() => readFileSync(`${outputPrefix}.url`, "utf8")).toThrow();
    },
  );

  it("fails closed when another revision wins the candidate tag race", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    expect(() =>
      execFileSync(
        "bash",
        [
          script,
          "candidate",
          "cdeadbeef",
          `${repository}:build-id`,
          outputPrefix,
        ],
        {
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            FAKE_SERVICE_JSON: JSON.stringify({
              status: {
                latestCreatedRevisionName: "marketing-00007-other",
                traffic: [
                  {
                    revisionName: "marketing-00006-new",
                    tag: "cdeadbeef",
                    url: "https://cdeadbeef---marketing.example.test",
                  },
                ],
              },
            }),
          },
          stdio: "pipe",
        },
      ),
    ).toThrow();
    expect(() => readFileSync(`${outputPrefix}.url`, "utf8")).toThrow();
  });
});
