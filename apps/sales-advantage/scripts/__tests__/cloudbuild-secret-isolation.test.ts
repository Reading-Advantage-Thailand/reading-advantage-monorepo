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
      "AUTH_SECRET=SALES_AUTH_SECRET:latest",
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

  it("isolates company and compatibility revisions behind distinct credentials", () => {
    expect(cloudBuild).toContain(
      "projects/$PROJECT_ID/secrets/SALES_LEGACY_DATABASE_URL/versions/latest",
    );
    const compatibilityDeploy = cloudBuild.slice(
      cloudBuild.indexOf('id: "deploy-legacy-rollback"'),
      cloudBuild.indexOf('id: "repair-source-role"'),
    );
    const companyDeploy = cloudBuild.slice(
      cloudBuild.indexOf('id: "deploy-cloudrun"'),
      cloudBuild.indexOf('id: "allow-public-invoker"'),
    );
    expect(compatibilityDeploy).toContain(
      "DATABASE_URL=SALES_LEGACY_DATABASE_URL:latest",
    );
    expect(compatibilityDeploy).not.toContain("SALES_DATABASE_URL:latest");
    expect(compatibilityDeploy).toContain("--no-traffic");
    expect(companyDeploy).toContain("DATABASE_URL=SALES_DATABASE_URL:latest");
    expect(companyDeploy).not.toContain("SALES_LEGACY_DATABASE_URL:latest");
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
