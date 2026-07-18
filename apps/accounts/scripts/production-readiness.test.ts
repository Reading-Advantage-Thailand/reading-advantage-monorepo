// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const cloudbuild = readFileSync(resolve(root, "cloudbuild.yaml"), "utf8");
const codecampCloudbuild = readFileSync(
  resolve(root, "../codecamp-advantage/cloudbuild.yaml"),
  "utf8",
);
const probe = readFileSync(resolve(root, "scripts/accounts-runtime-probe.sql"), "utf8");
const smoke = readFileSync(resolve(root, "scripts/accounts-smoke.sh"), "utf8");
const identityComposition = readFileSync(resolve(root, "lib/server/identity.ts"), "utf8");
const productionBootstrapSource = readFileSync(
  resolve(root, "scripts/bootstrap-production.ts"),
  "utf8",
);

describe("Accounts production readiness", () => {
  it("orders migration, exact static bootstrap, doctor, owner/client bootstrap, and runtime proof", () => {
    const ordered = [
      "migrate-company-identity",
      "bootstrap-company-identity",
      "doctor-company-identity",
      "bootstrap-production-identity",
      "runtime-db-contract",
      "deploy-cloudrun",
    ].map((gate) => cloudbuild.indexOf(`id: "${gate}"`));
    expect(ordered.every((position) => position >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    expect(cloudbuild).toContain("company-identity:bootstrap");
    const staticBootstrap = cloudbuild.slice(
      cloudbuild.indexOf('id: "bootstrap-company-identity"'),
      cloudbuild.indexOf('id: "doctor-company-identity"'),
    );
    expect(staticBootstrap).toContain("COMPANY_AUTH_DIRECT_DATABASE_URL");
    expect(staticBootstrap).toContain("COMPANY_AUTH_DATABASE_URL");
    const productionBootstrap = cloudbuild.slice(
      cloudbuild.indexOf('id: "bootstrap-production-identity"'),
      cloudbuild.indexOf('id: "runtime-db-contract"'),
    );
    const dbBuild = productionBootstrap.indexOf("pnpm --filter @reading-advantage/db build");
    const authBuild = productionBootstrap.indexOf("pnpm --filter @reading-advantage/auth build");
    const bootstrap = productionBootstrap.indexOf("pnpm --filter accounts bootstrap:production");
    expect(dbBuild).toBeGreaterThanOrEqual(0);
    expect(authBuild).toBeGreaterThan(dbBuild);
    expect(bootstrap).toBeGreaterThan(authBuild);
    expect(cloudbuild.match(/cloud-sql-proxy\/v2\.15\.1/g)).toHaveLength(5);
    expect(cloudbuild).toContain("https://accounts.reading-advantage.com");
    expect(cloudbuild).toContain("__Host-ra_company_sso");
  });

  it("uses the side-effect-free company identity auth boundary at runtime and bootstrap", () => {
    for (const source of [identityComposition, productionBootstrapSource]) {
      expect(source).toContain("@reading-advantage/auth/company-identity");
      expect(source).not.toMatch(/from ["']@reading-advantage\/auth["']/);
    }
  });

  it("projects capability audit metadata into the immutable database allowlist", () => {
    const metadata = identityComposition.match(/metadata:\s*\{([\s\S]*?)\n\s*\},/);
    expect(metadata?.[1]).toContain('source: "accounts-capability-kernel"');
    expect(metadata?.[1]).not.toContain("eventId");
    expect(metadata?.[1]).not.toContain("eventType");
    expect(metadata?.[1]).not.toContain("resourceType");
  });

  it("keeps bootstrap credentials off Accounts runtime and pins Codecamp to one central secret", () => {
    const deploy = cloudbuild.slice(
      cloudbuild.indexOf('id: "deploy-cloudrun"'),
      cloudbuild.indexOf('id: "allow-public-invoker"'),
    );
    for (const bootstrapSecret of [
      "COMPANY_AUTH_DIRECT_DATABASE_URL",
      "COMPANY_AUTH_BOOTSTRAP_OWNER_USERNAME",
      "COMPANY_AUTH_BOOTSTRAP_OWNER_DISPLAY_NAME",
      "COMPANY_AUTH_BOOTSTRAP_OWNER_PASSWORD",
      "MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET",
      "SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET",
      "CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET",
    ]) {
      expect(deploy).not.toContain(bootstrapSecret);
    }
    const centralSecret =
      "projects/reading-advantage/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET";
    expect(cloudbuild).toContain(`${centralSecret}/versions/latest`);
    expect(codecampCloudbuild).toContain(
      `COMPANY_AUTH_OIDC_CLIENT_SECRET=${centralSecret}:latest`,
    );
  });

  it("proves runtime non-ownership, exact writes, and immutable audit denial", () => {
    for (const assertion of ["rolsuper", "rolcreatedb", "rolcreaterole", "rolbypassrls", "pg_auth_members", "must not own the database", "has_schema_privilege", "must not own identity relations"]) {
      expect(probe).toContain(assertion);
    }
    expect(probe).toContain("INSERT INTO company_login_attempts");
    expect(probe).toContain("INSERT INTO company_identity_audit_events");
    expect(probe).toContain("UPDATE company_identity_audit_events");
    expect(probe).toContain("ROLLBACK;");
  });

  it("smokes protocol discovery and exact anonymous admin denial", () => {
    expect(smoke).toContain("/.well-known/openid-configuration");
    expect(smoke).toContain('"code_challenge_methods_supported":\\["S256"\\]');
    expect(smoke).toContain('[ "$STATUS" != "401" ]');
  });
});
