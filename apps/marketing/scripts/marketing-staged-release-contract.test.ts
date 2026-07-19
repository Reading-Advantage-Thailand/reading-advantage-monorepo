// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface CloudBuildStep {
  readonly id?: string;
  readonly args?: readonly string[];
}

interface CloudBuildConfig {
  readonly steps?: readonly CloudBuildStep[];
  readonly substitutions?: Readonly<Record<string, string>>;
}

const marketingRoot = resolve(import.meta.dirname, "..");
const cloudbuild = parse(
  readFileSync(resolve(marketingRoot, "cloudbuild.yaml"), "utf8"),
) as CloudBuildConfig;

/**
 * Returns a required Marketing Cloud Build step.
 * @param id Exact Cloud Build step identifier.
 * @returns Matching parsed step.
 */
function requireStep(id: string): CloudBuildStep {
  const step = cloudbuild.steps?.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`Missing Cloud Build step: ${id}`);
  return step;
}

describe("Marketing staged Cloud Run release contract", () => {
  it("binds a collision-safe no-traffic candidate before explicit promotion", () => {
    const ids = cloudbuild.steps?.map((step) => step.id) ?? [];
    const deploy = requireStep("deploy-candidate");
    const capture = requireStep("capture-candidate");
    const verify = requireStep("verify-candidate");
    const promote = requireStep("promote-candidate");

    expect(ids.indexOf("runtime-db-contract")).toBeLessThan(
      ids.indexOf("capture-current-release"),
    );
    expect(ids.indexOf("capture-current-release")).toBeLessThan(
      ids.indexOf("deploy-candidate"),
    );
    expect(ids.indexOf("deploy-candidate")).toBeLessThan(
      ids.indexOf("allow-public-invoker"),
    );
    expect(ids.indexOf("allow-public-invoker")).toBeLessThan(
      ids.indexOf("capture-candidate"),
    );
    expect(ids.indexOf("capture-candidate")).toBeLessThan(
      ids.indexOf("verify-candidate"),
    );
    expect(ids.indexOf("verify-candidate")).toBeLessThan(
      ids.indexOf("promote-candidate"),
    );
    expect(deploy.args).toEqual(
      expect.arrayContaining(["--tag=candidate-$BUILD_ID", "--no-traffic"]),
    );
    expect(capture.args?.join(" ")).toContain(
      "capture-marketing-cloud-run-release.sh candidate candidate-$BUILD_ID",
    );
    expect(verify.args?.join(" ")).toContain("verify-marketing-release.ts");
    expect(promote.args?.join(" ")).toContain(
      '--to-revisions="$$candidate_revision=100"',
    );
    expect(cloudbuild.substitutions?._RELEASE_COMMIT_SHA).toBe(
      "REQUIRED_RELEASE_COMMIT_SHA",
    );
  });

  it("verifies the mapped domain, release dependencies, smoke, and rollback evidence", () => {
    const ids = cloudbuild.steps?.map((step) => step.id) ?? [];
    const mapping = requireStep("verify-domain-mapping");
    const domain = requireStep("verify-custom-domain");
    const evidence = requireStep("record-release-evidence");

    expect(ids.indexOf("promote-candidate")).toBeLessThan(
      ids.indexOf("verify-domain-mapping"),
    );
    expect(ids.indexOf("verify-domain-mapping")).toBeLessThan(
      ids.indexOf("verify-custom-domain"),
    );
    expect(ids.indexOf("verify-custom-domain")).toBeLessThan(
      ids.indexOf("record-release-evidence"),
    );
    expect(mapping.args?.join(" ")).toContain(
      "marketing.reading-advantage.com",
    );
    expect(mapping.args?.join(" ")).toContain("CertificateProvisioned");
    expect(domain.args?.join(" ")).toContain("verify-marketing-release.ts");
    expect(domain.args?.join(" ")).toContain("marketing-smoke.sh");
    expect(evidence.args?.join(" ")).toContain(".marketing-previous.revision");
    expect(evidence.args?.join(" ")).toContain(".marketing-candidate.revision");
    expect(evidence.args?.join(" ")).toContain("_RELEASE_COMMIT_SHA");
  });
});
