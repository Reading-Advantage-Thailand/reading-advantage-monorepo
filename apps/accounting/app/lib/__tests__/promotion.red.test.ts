// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

const script = new URL(
  "../../../scripts/promote-accounting-candidate.sh",
  import.meta.url,
).pathname;
const temporaryDirectory = mkdtempSync(join(tmpdir(), "accounting-promote-"));
const source = readFileSync(script, "utf8");

afterAll(() => {
  rmSync(temporaryDirectory, { force: true, recursive: true });
});

/** Runs the promotion script with an isolated environment. */
function runPromotion(environment: Record<string, string>): number | null {
  return spawnSync("bash", [script], {
    env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", ...environment },
    stdio: "ignore",
  }).status;
}

describe("Accounting promotion gate contract", () => {
  it("passes a Bash syntax check", () => {
    expect(spawnSync("bash", ["-n", script]).status).toBe(0);
  });

  it("opens public access only after acceptance and traffic promotion", () => {
    const acceptanceGate = source.indexOf("grep -Eq");
    const trafficShift = source.indexOf("update-traffic");
    const publicBinding = source.indexOf("add-iam-policy-binding");
    const tokenRemoval = source.indexOf("unset ACCOUNTING_VERIFY_IDENTITY_TOKEN");
    const productionVerification = source.indexOf("verify-accounting-release.ts");

    expect(acceptanceGate).toBeGreaterThan(-1);
    expect(trafficShift).toBeGreaterThan(acceptanceGate);
    expect(publicBinding).toBeGreaterThan(trafficShift);
    expect(tokenRemoval).toBeGreaterThan(publicBinding);
    expect(productionVerification).toBeGreaterThan(tokenRemoval);
    expect(source).toContain("--member=allUsers");
    expect(source).toContain("--role=roles/run.invoker");
    expect(source).toContain("Opening public Accounting access after acceptance.");
  });

  it("rejects a missing candidate revision", () => {
    const note = join(temporaryDirectory, "passing-note");
    writeFileSync(note, "status: pass\n");
    expect(runPromotion({ ACCEPTANCE_NOTE: note })).not.toBe(0);
  });

  it.each([
    ["missing", join(temporaryDirectory, "missing-note")],
    ["empty", join(temporaryDirectory, "empty-note")],
    ["failed", join(temporaryDirectory, "failed-note")],
  ])("rejects a %s acceptance note", (_caseName, note) => {
    if (_caseName === "empty") writeFileSync(note, "");
    if (_caseName === "failed") writeFileSync(note, "status: fail\n");

    expect(
      runPromotion({ ACCEPTANCE_NOTE: note, CANDIDATE_REVISION: "revision-1" }),
    ).not.toBe(0);
  });
});
