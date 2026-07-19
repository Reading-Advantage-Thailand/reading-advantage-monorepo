// @vitest-environment node
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const descriptorPath = resolve(root, "release-continuation-f5063222.json");
const validatorPath = resolve(import.meta.dirname, "verify-sales-continuation.mjs");
const publicVerifierPath = resolve(import.meta.dirname, "verify-sales-continuation-public.py");
const promotionPath = resolve(import.meta.dirname, "promote-sales-continuation.sh");
const configPath = resolve(root, "cloudbuild.continue-f5063222.yaml");
const temporaryDirectories: string[] = [];
const digest = "sha256:ab7ca4d4429cad3d81a28fe9b9f85e03c78cb62f2e075142152982e0f7415ce3";
const buildId = "f5063222-76bd-4b73-a151-3f7994827e09";
const releaseCommit = "597241dedf712ea6a2350346fefa0459f3e1d23c";
const boundary = "2026-07-19T13:25:59Z";
const ids = [
  "validate-release-inputs", "verify-curriculum-backup", "build-image", "push-image",
  "migrate-db", "doctor-check", "build-curriculum-workspace-deps",
  "seed-production-curriculum", "verify-production-curriculum", "runtime-db-contract",
  "deploy-legacy-rollback", "capture-legacy-rollback",
  "verify-repair-verify-legacy-rollback", "deploy-company-candidate",
  "allow-public-invoker", "capture-company-candidate", "verify-company-candidate",
  "shift-company-traffic", "verify-custom-domain",
];

/** Creates complete immutable-original-release evidence for validator tests. */
function evidence(): Record<string, unknown> {
  const tag = `asia-southeast1-docker.pkg.dev/reading-advantage/sales-advantage/sales-advantage:${buildId}`;
  return {
    "build.json": {
      id: buildId,
      projectId: "reading-advantage",
      status: "FAILURE",
      steps: ids.map((id, index) => ({
        id,
        status: index <= 10 ? "SUCCESS" : index === 11 ? "FAILURE" : "QUEUED",
        args: id === "deploy-legacy-rollback"
          ? ["run", "deploy", "sales-advantage", `--image=${tag}`, "--set-env-vars=NODE_ENV=production,SALES_AUTH_MODE=legacy-school,NEXT_PUBLIC_API_URL=https://sales.reading-advantage.com", "--set-secrets=DATABASE_URL=SALES_LEGACY_DATABASE_URL:latest", "--tag=legacy-rollback", "--no-traffic"]
          : [],
      })),
      substitutions: {
        _RELEASE_COMMIT_SHA: releaseCommit,
        _CURRICULUM_BACKUP_ID: "1784467579292",
        _CURRICULUM_BACKUP_NOT_BEFORE: boundary,
        _RELEASE_SOURCE_MANIFEST_SHA256: "83b763fe90fbc08dd2024dfe6d27c05c84afa5da5960f457eb84b9ef375b28ce",
      },
      sourceProvenance: {
        resolvedStorageSource: {
          bucket: "reading-advantage_cloudbuild",
          object: "source/1784467895.426973-a2eac72fd5c247d8bf5bcf6325aa0982.tgz",
          generation: "1784467921813960",
        },
        fileHashes: {
          "gs://reading-advantage_cloudbuild/source/1784467895.426973-a2eac72fd5c247d8bf5bcf6325aa0982.tgz#1784467921813960": {
            fileHash: [{ type: "SHA256", value: "9rjGQcgEv1KnMZ6kVmpoiTOTL7OnKwDB1AbQ0X2-Ca0=" }],
          },
        },
      },
    },
    "backup.json": {
      id: "1784467579292",
      status: "SUCCESSFUL",
      type: "ON_DEMAND",
      description: `sales-curriculum-before-${releaseCommit}-not-before-${boundary}`,
      startTime: "2026-07-19T13:26:01Z",
      endTime: "2026-07-19T13:27:50.606Z",
    },
    "artifact.json": { image_summary: { digest }, requestedTag: `asia-southeast1-docker.pkg.dev/reading-advantage/sales-advantage/sales-advantage:${buildId}` },
    "service.json": { status: { traffic: [
      { revisionName: "sales-advantage-00003-v4d", percent: 100 },
      { revisionName: "sales-advantage-00004-jed", tag: "legacy-rollback", url: "https://legacy-rollback---sales.test" },
    ] } },
    "rollback-revision.json": {
      metadata: { name: "sales-advantage-00004-jed" },
      status: { conditions: [{ type: "Ready", status: "True" }] },
      spec: { containers: [{ image: `asia-southeast1-docker.pkg.dev/reading-advantage/sales-advantage/sales-advantage@${digest}`, env: [
        { name: "SALES_AUTH_MODE", value: "legacy-school" },
        { name: "DATABASE_URL", valueFrom: { secretKeyRef: { name: "SALES_LEGACY_DATABASE_URL", key: "latest" } } },
      ] }] },
    },
    "iam.json": { bindings: [{ role: "roles/run.invoker", members: ["allUsers"] }] },
    "domain.json": { metadata: { name: "sales.reading-advantage.com" }, status: { conditions: [{ type: "Ready", status: "True" }] } },
  };
}

/** Writes one JSON evidence bundle and returns its directory. */
function writeEvidence(value: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "sales-continuation-"));
  temporaryDirectories.push(dir);
  for (const [name, body] of Object.entries(value)) writeFileSync(join(dir, name), JSON.stringify(body));
  return dir;
}

/** Runs the pure continuation validator against an evidence bundle. */
function validate(value: Record<string, unknown>): void {
  execFileSync("node", [validatorPath, descriptorPath, writeEvidence(value), "cccccccccccccccccccccccccccccccccccccccc", "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"], { stdio: "pipe" });
}

/**
 * Mutates one nested fixture field without weakening the test file to any.
 * @param value Evidence object to mutate.
 * @param path Object keys and array indexes leading to the target field.
 * @param replacement Replacement value.
 * @returns Nothing.
 */
function setEvidence(
  value: Record<string, unknown>,
  path: readonly (string | number)[],
  replacement: unknown,
): void {
  let cursor: unknown = value;
  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(cursor) && typeof segment === "number") cursor = cursor[segment];
    else if (cursor && typeof cursor === "object") cursor = (cursor as Record<string, unknown>)[String(segment)];
    else throw new Error("Invalid evidence fixture path.");
  }
  const finalSegment = path.at(-1);
  if (Array.isArray(cursor) && typeof finalSegment === "number") cursor[finalSegment] = replacement;
  else if (cursor && typeof cursor === "object" && finalSegment !== undefined) {
    (cursor as Record<string, unknown>)[String(finalSegment)] = replacement;
  } else throw new Error("Invalid evidence fixture target.");
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Sales original-release continuation evidence", () => {
  it("accepts the exact failed original release state", () => expect(() => validate(evidence())).not.toThrow());

  it.each([
    ["status", ["build.json", "status"], "SUCCESS"],
    ["step status", ["build.json", "steps", 10, "status"], "FAILURE"],
    ["substitution", ["build.json", "substitutions", "_RELEASE_COMMIT_SHA"], "0".repeat(40)],
    ["source", ["build.json", "sourceProvenance", "resolvedStorageSource", "generation"], "1"],
    ["backup", ["backup.json", "status"], "RUNNING"],
    ["artifact", ["artifact.json", "image_summary", "digest"], "sha256:" + "0".repeat(64)],
    ["revision", ["rollback-revision.json", "metadata", "name"], "sales-advantage-99999-bad"],
    ["traffic", ["service.json", "status", "traffic", 0, "percent"], 99],
    ["IAM", ["iam.json", "bindings", 0, "members"], []],
    ["domain", ["domain.json", "status", "conditions", 0, "status"], "False"],
  ] as const)("rejects %s drift", (_label, path, replacement) => {
    const value = evidence();
    setEvidence(value, path, replacement);
    expect(() => validate(value)).toThrow();
  });
});

describe("Sales continuation pipeline contract", () => {
  it("orders verification, rollback safety, repair, and promotion without replaying completed mutations", () => {
    const config = readFileSync(configPath, "utf8");
    const orderedIds = [
      "validate-continuation-source", "collect-original-release-evidence",
      "validate-original-release", "build-workspace-deps", "runtime-preflight",
      "verify-rollback-pre-repair", "deploy-company-candidate",
      "verify-company-candidate-pre-repair", "shift-traffic-to-rollback",
      "verify-legacy-domain-pre-repair", "apply-source-role-repair",
      "verify-rollback-post-repair", "verify-company-candidate-post-repair",
      "promote-company-candidate", "emit-continuation-receipt",
    ];
    const positions = orderedIds.map((id) => config.indexOf(`id: "${id}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const forbidden of ["build-image", "push-image", "migrate-db", "seed-production-curriculum", "verify-curriculum-backup", "deploy-legacy-rollback", "backup-runs create"]) {
      expect(config).not.toContain(`id: "${forbidden}"`);
    }
    expect(config).not.toContain("add-iam-policy-binding");
    expect(config).not.toContain("gcloud secrets versions describe");
    expect(config).toContain("projects/$PROJECT_ID/secrets/SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST/versions/1");
    expect(config).toContain('test "$$manifest_sha256" = "6329c846ac119a0af9fa43747879b042c211b4b79e5ad8a98822940fd29b5980"');
    expect(config).toContain(`--image=asia-southeast1-docker.pkg.dev/$PROJECT_ID/sales-advantage/sales-advantage@${digest}`);
    expect(config).toContain(`--set=release_build_id=${buildId}`);
    expect(config).toContain(`--set=release_commit_sha=${releaseCommit}`);
  });

  it("binds preflight and receipt SQL to exact mapping, role, and original release metadata", () => {
    const preflight = readFileSync(resolve(import.meta.dirname, "sales-continuation-preflight.sql"), "utf8");
    const receipt = readFileSync(resolve(import.meta.dirname, "sales-continuation-receipt-probe.sql"), "utf8");
    expect(preflight).toContain("expectedCurrentRole");
    expect(preflight).toContain("company_product_principals");
    expect(preflight).toContain("sales-source-role-repair:");
    expect(preflight).toContain("completed repair receipt already exists");
    for (const value of [buildId, releaseCommit, "6329c846ac119a0af9fa43747879b042c211b4b79e5ad8a98822940fd29b5980"]) {
      expect(receipt).toContain(value);
    }
    expect(receipt).toContain("count(*) <> 1");
    expect(receipt).toContain("targetRole");
  });
});

describe("Sales continuation public verifier and promotion rollback", () => {
  it("accepts exact public evidence and rejects every release-safety dimension", () => {
    const dir = mkdtempSync(join(tmpdir(), "sales-public-"));
    temporaryDirectories.push(dir);
    const fixtures: Record<string, unknown> = {
      "service.json": { status: { traffic: [{ revisionName: "candidate-rev", percent: 100 }] } },
      "revision.json": { metadata: { name: "candidate-rev" }, status: { conditions: [{ type: "Ready", status: "True" }] }, spec: { containers: [{ image: `repo@${digest}`, env: [{ name: "SALES_AUTH_MODE", value: "company" }] }] } },
      "domain.json": { status: { conditions: [{ type: "Ready", status: "True" }] } },
      "logs.json": [{ severity: "INFO" }],
      "health.json": { status: "alive", service: "sales-advantage" },
      "ready.json": { status: "ready", service: "sales-advantage", mode: "company", dependencies: { database: "ready", accounts: "ready" } },
    };
    const run = () => execFileSync("python3", [publicVerifierPath, "--fixture-dir", dir, "--mode", "company", "--revision", "candidate-rev", "--digest", digest, "--traffic", "100"], { stdio: "pipe" });
    const write = (value: Record<string, unknown>) => {
      for (const [name, body] of Object.entries(value)) writeFileSync(join(dir, name), JSON.stringify(body));
    };
    write(fixtures);
    expect(run).not.toThrow();
    const mismatches = [
      [["ready.json", "mode"], "legacy-school"],
      [["service.json", "status", "traffic", 0, "percent"], 99],
      [["revision.json", "spec", "containers", 0, "image"], `repo@sha256:${"0".repeat(64)}`],
      [["domain.json", "status", "conditions", 0, "status"], "False"],
      [["logs.json"], [{ severity: "ERROR" }]],
    ] as const;
    for (const [path, replacement] of mismatches) {
      const drifted = structuredClone(fixtures);
      setEvidence(drifted, path, replacement);
      write(drifted);
      expect(run).toThrow();
    }
  });

  it.each([
    ["success", "0", "0", false],
    ["candidate shift failure", "0", "1", true],
    ["candidate verification failure", "1", "0", true],
  ] as const)("%s promotion has expected rollback behavior", (_label, failCompany, failShift, expectsRollback) => {
    const dir = mkdtempSync(join(tmpdir(), "sales-promote-"));
    temporaryDirectories.push(dir);
    const log = join(dir, "calls");
    const gcloud = join(dir, "gcloud");
    const python = join(dir, "python3");
    writeFileSync(gcloud, `#!/usr/bin/env bash
printf 'gcloud %s\\n' "$*" >> "$CALL_LOG"
if [[ "$*" == *"--to-revisions=candidate-rev=100"* && "\${FAIL_SHIFT:-0}" == 1 ]]; then exit 1; fi
`);
    writeFileSync(python, `#!/usr/bin/env bash
printf 'python %s\\n' "$*" >> "$CALL_LOG"
if [[ "$*" == *"--mode company"* && "\${FAIL_COMPANY:-0}" == 1 ]]; then exit 1; fi
`);
    chmodSync(gcloud, 0o755); chmodSync(python, 0o755);
    const env = { ...process.env, PATH: `${dir}:${process.env.PATH}`, CALL_LOG: log, FAIL_COMPANY: failCompany, FAIL_SHIFT: failShift, CANDIDATE_REVISION: "candidate-rev" };
    if (expectsRollback) expect(() => execFileSync("bash", [promotionPath], { env, stdio: "pipe" })).toThrow();
    else expect(() => execFileSync("bash", [promotionPath], { env, stdio: "pipe" })).not.toThrow();
    const calls = readFileSync(log, "utf8");
    expect(calls).toContain("--to-revisions=candidate-rev=100");
    expect(calls.includes("--to-revisions=sales-advantage-00004-jed=100")).toBe(expectsRollback);
  });
});
