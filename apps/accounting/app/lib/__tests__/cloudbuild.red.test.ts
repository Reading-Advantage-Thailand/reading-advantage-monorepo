// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cloudbuild = readFileSync(
  new URL("../../../cloudbuild.yaml", import.meta.url),
  "utf8",
);

const BUILD_STEP_SECRETS = [
  "ACCOUNTING_DATABASE_URL",
  "ACCOUNTING_DIRECT_DATABASE_URL",
];

const gcloudignore = readFileSync(
  new URL("../../../../../.gcloudignore", import.meta.url),
  "utf8",
);

describe("Accounting Cloud Build candidate pipeline contract", () => {
  it("builds, pushes, migrates, checks, grants, probes, and verifies", () => {
    expect(cloudbuild).toContain(
      "asia-southeast1-docker.pkg.dev/$PROJECT_ID/accounting/accounting:$BUILD_ID",
    );
    for (const requiredStep of [
      "accounting:migrate",
      "ACCOUNTING_DIRECT_DATABASE_URL",
      "accounting:doctor",
      "accounting-runtime-grants.sql",
      "accounting-runtime-probe.sql",
      "mint-company-candidate-token",
      "verify-accounting-release.ts",
    ]) {
      expect(cloudbuild).toContain(requiredStep);
    }
  });

  it("deploys existing and first-service candidates without an unsafe traffic shift", () => {
    const deployStep = cloudbuild.match(
      /id: "deploy-company-candidate"(?<body>[\s\S]*?)\n {2}- name:/u,
    )?.groups?.body;
    const deployBranches = deployStep?.match(
      /if gcloud run services describe[^\n]+; then(?<existing>[\s\S]*?)\n {8}else(?<first>[\s\S]*?)\n {8}fi/u,
    )?.groups;

    expect(cloudbuild).toContain("--tag=candidate");
    expect(cloudbuild).toContain("--no-traffic");
    expect(deployBranches?.existing).toContain("--tag=candidate --no-traffic");
    // Cloud Run rejects --no-traffic when it creates a service's first revision.
    expect(deployBranches?.first).toContain('"$${deploy_args[@]}" --tag=candidate');
    expect(deployBranches?.first).not.toContain("--no-traffic");
    expect(cloudbuild).not.toContain("--allow-unauthenticated");
    expect(cloudbuild).not.toContain("allUsers");
    expect(cloudbuild).not.toContain('id: "allow-public-invoker"');
    expect(cloudbuild).toContain('id: "allow-build-invoker"');
    expect(cloudbuild).toContain(
      "--member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com",
    );
    expect(cloudbuild).not.toContain("update-traffic");
    expect(cloudbuild).not.toMatch(/--to-revisions=/u);
  });

  it("declares only secrets consumed by Cloud Build steps", () => {
    const availableSecrets = Array.from(
      cloudbuild.matchAll(/^\s+env: "(ACCOUNTING_[A-Z0-9_]+)"$/gmu),
      (match) => match[1],
    ).sort();

    expect(availableSecrets).toEqual(BUILD_STEP_SECRETS);
  });

  it("includes the Accounting app in the Cloud Build source upload", () => {
    expect(gcloudignore).toMatch(/^!apps\/accounting$/mu);
    expect(gcloudignore).toMatch(/^!apps\/accounting\/\*\*$/mu);
  });

  it("maps app-prefixed secrets to the runtime adapter variables", () => {
    for (const mapping of [
      "COMPANY_AUTH_OIDC_CLIENT_SECRET=ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest",
      "STORAGE_ENDPOINT=ACCOUNTING_STORAGE_ENDPOINT:latest",
      "STORAGE_REGION=ACCOUNTING_STORAGE_REGION:latest",
      "STORAGE_BUCKET=ACCOUNTING_STORAGE_BUCKET:latest",
      "STORAGE_ACCESS_KEY=ACCOUNTING_STORAGE_ACCESS_KEY:latest",
      "STORAGE_SECRET_KEY=ACCOUNTING_STORAGE_SECRET_KEY:latest",
      "STORAGE_PUBLIC_BASE_URL=ACCOUNTING_STORAGE_PUBLIC_BASE_URL:latest",
    ]) {
      expect(cloudbuild).toContain(mapping);
    }
  });

  it("pins the shared Cloud SQL attachment and candidate identity settings", () => {
    expect(cloudbuild).toContain(
      "--add-cloudsql-instances=reading-advantage:asia-southeast1:cloud-sql",
    );
    expect(cloudbuild).toContain(
      "--service-account=accounting-cloud-run@$PROJECT_ID.iam.gserviceaccount.com",
    );
    expect(cloudbuild).toContain("ACCOUNTING_PREVIEW_ORIGINS=https://candidate---");
    expect(cloudbuild).toContain("COMPANY_AUTH_OIDC_CLIENT_ID=accounting-web");
    expect(cloudbuild).toContain("COMPANY_AUTH_EXPECTED_AUDIENCE=accounting");
  });
});
