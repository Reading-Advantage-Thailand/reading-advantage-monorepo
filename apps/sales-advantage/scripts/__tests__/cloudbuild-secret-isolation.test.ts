import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const cloudBuild = readFileSync(
  resolve(testDirectory, "../../cloudbuild.yaml"),
  "utf8",
);

describe("Sales Cloud Build secret isolation", () => {
  it("maps shared runtime names to Sales-owned Secret Manager resources", () => {
    const requiredMappings = [
      "DATABASE_URL=SALES_DATABASE_URL:latest",
      "COMPANY_AUTH_OIDC_CLIENT_SECRET=SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest",
      "AI_PROVIDER=SALES_AI_PROVIDER:latest",
      "OPENROUTER_API_KEY=SALES_OPENROUTER_API_KEY:latest",
      "STORAGE_ENDPOINT=SALES_STORAGE_ENDPOINT:latest",
      "STORAGE_REGION=SALES_STORAGE_REGION:latest",
      "STORAGE_BUCKET=SALES_STORAGE_BUCKET:latest",
      "STORAGE_ACCESS_KEY=SALES_STORAGE_ACCESS_KEY:latest",
      "STORAGE_SECRET_KEY=SALES_STORAGE_SECRET_KEY:latest",
      "STORAGE_PUBLIC_BASE_URL=SALES_STORAGE_PUBLIC_BASE_URL:latest",
    ];

    for (const mapping of requiredMappings) {
      expect(cloudBuild).toContain(mapping);
    }
  });

  it("uses a Sales-owned direct database secret for migration gates", () => {
    expect(cloudBuild).toContain(
      "projects/$PROJECT_ID/secrets/SALES_DIRECT_DATABASE_URL/versions/latest",
    );
    expect(cloudBuild).not.toContain(
      "projects/$PROJECT_ID/secrets/DIRECT_DATABASE_URL/versions/latest",
    );
  });

  it("isolates no-traffic compatibility and company candidates", () => {
    expect(cloudBuild).toContain(
      "projects/$PROJECT_ID/secrets/SALES_LEGACY_DATABASE_URL/versions/latest",
    );
    const compatibilityRelease = cloudBuild.slice(
      cloudBuild.indexOf('id: "deploy-legacy-rollback"'),
      cloudBuild.indexOf('id: "deploy-company-candidate"'),
    );
    const companyCandidate = cloudBuild.slice(
      cloudBuild.indexOf('id: "deploy-company-candidate"'),
      cloudBuild.indexOf('id: "capture-company-candidate"'),
    );
    expect(compatibilityRelease).toContain(
      "DATABASE_URL=SALES_LEGACY_DATABASE_URL:latest",
    );
    expect(compatibilityRelease).not.toContain("SALES_DATABASE_URL:latest");
    expect(compatibilityRelease).toContain("--no-traffic");
    expect(compatibilityRelease).toContain(
      'id: "verify-repair-verify-legacy-rollback"',
    );
    expect(compatibilityRelease).toContain(
      '      - "SALES_DIRECT_DATABASE_URL"',
    );
    expect(compatibilityRelease).toContain(
      '      - "SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST"',
    );
    expect(companyCandidate).toContain(
      "DATABASE_URL=SALES_DATABASE_URL:latest",
    );
    expect(companyCandidate).not.toContain("SALES_LEGACY_DATABASE_URL:latest");
    expect(companyCandidate).not.toContain("AUTH_SECRET=");
    expect(companyCandidate).toContain("--tag=candidate");
    expect(companyCandidate).toContain("--no-traffic");
  });

  it("does not reference generic cross-service database or auth secrets", () => {
    expect(cloudBuild).not.toContain("DATABASE_URL=DATABASE_URL:latest");
    expect(cloudBuild).not.toContain("AUTH_SECRET=AUTH_SECRET:latest");
  });

  it("mounts only the selected OpenRouter provider credential", () => {
    expect(cloudBuild).toContain(
      "OPENROUTER_API_KEY=SALES_OPENROUTER_API_KEY:latest",
    );
    expect(cloudBuild).not.toContain("GOOGLE_AI_API_KEY=");
    expect(cloudBuild).not.toContain("OPENAI_API_KEY=");
  });
});
