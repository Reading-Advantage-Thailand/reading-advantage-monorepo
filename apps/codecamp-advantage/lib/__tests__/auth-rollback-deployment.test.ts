import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "../..");
const cloudbuild = readFileSync(resolve(appRoot, "cloudbuild.yaml"), "utf8");
const runbook = readFileSync(
  resolve(appRoot, "docs/company-auth-rollback.md"),
  "utf8",
);

describe("Codecamp company-auth deployment and rollback contract", () => {
  it("deploys the candidate in explicit company mode", () => {
    expect(cloudbuild).toContain("CODECAMP_AUTH_MODE=company");
  });

  it("uses authoritative codecamp-advantage secret names", () => {
    expect(cloudbuild).toContain("OPENAI_API_KEY=OPENAI_API_KEY:latest");
    expect(cloudbuild).toContain("GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest");
    expect(cloudbuild).not.toContain("OpenAI_API_Key");
    expect(cloudbuild).not.toContain("Goole_Cloud_API_Key");
    expect(cloudbuild).toContain(
      "COMPANY_AUTH_OIDC_CLIENT_SECRET=projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest",
    );
  });

  it("keeps deployment and domain mapping ownership in codecamp-advantage", () => {
    expect(runbook).toContain("--project=codecamp-advantage");
    expect(runbook).toContain("codecamp-advantage-00019-682");
    expect(runbook).toContain("CODECAMP_AUTH_MODE=legacy");
    expect(runbook).toContain("domain mapping remains in `codecamp-advantage`");
    expect(runbook).not.toContain("domain mapping to `reading-advantage`");
  });
});
