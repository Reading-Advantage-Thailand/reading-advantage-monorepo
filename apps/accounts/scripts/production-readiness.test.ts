// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const cloudbuild = readFileSync(resolve(root, "cloudbuild.yaml"), "utf8");
const codecampCloudbuild = readFileSync(
  resolve(root, "../codecamp-advantage/cloudbuild.yaml"),
  "utf8",
);
const probe = readFileSync(
  resolve(root, "scripts/accounts-runtime-probe.sql"),
  "utf8",
);
const smoke = readFileSync(resolve(root, "scripts/accounts-smoke.sh"), "utf8");
const identityComposition = readFileSync(
  resolve(root, "lib/server/identity.ts"),
  "utf8",
);
const identityCapabilities = readFileSync(
  resolve(
    root,
    "../../packages/backend/src/modules/company-identity/capabilities.ts",
  ),
  "utf8",
);
const backendRouteBindings = readFileSync(
  resolve(
    root,
    "../../packages/backend/src/modules/company-identity/route-bindings.ts",
  ),
  "utf8",
);
const readinessRoute = readFileSync(
  resolve(root, "app/api/ready/route.ts"),
  "utf8",
);
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
    const dbBuild = productionBootstrap.indexOf(
      "pnpm --filter @reading-advantage/db build",
    );
    const authBuild = productionBootstrap.indexOf(
      "pnpm --filter @reading-advantage/auth build",
    );
    const bootstrap = productionBootstrap.indexOf(
      "pnpm --filter accounts bootstrap:production",
    );
    expect(dbBuild).toBeGreaterThanOrEqual(0);
    expect(authBuild).toBeGreaterThan(dbBuild);
    expect(bootstrap).toBeGreaterThan(authBuild);
    for (const clientSecret of [
      "MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET",
      "SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET",
      "CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET",
      "ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET",
    ]) {
      expect(productionBootstrap).toContain(clientSecret);
    }
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

  it("executes a current database probe for every readiness request", () => {
    expect(identityComposition).toContain("probeDatabase:");
    expect(readinessRoute).toContain("probeDatabase()");
  });

  it("composes capability idempotency through the identity-owned store", () => {
    expect(identityComposition).toContain(
      "createCompanyIdentityDurableIdempotencyPort(sql)",
    );
    expect(identityComposition).not.toContain(
      "createPostgresDurableIdempotencyPort(sql)",
    );
  });

  it("projects capability audit metadata into the immutable database allowlist", () => {
    expect(identityComposition).toContain("projectSecretSafeAuditMetadata({");
    expect(identityComposition).toContain(
      'source: "accounts-capability-kernel"',
    );
    expect(identityComposition).toContain("targetAccountId");
    expect(identityComposition).toContain("applicationKey");
    expect(identityComposition).toContain("resourceType");
    const metadataStart = identityComposition.indexOf(
      "metadata: projectSecretSafeAuditMetadata({",
    );
    const metadataEnd = identityComposition.indexOf(
      "}),\n          });",
      metadataStart,
    );
    expect(metadataStart).toBeGreaterThanOrEqual(0);
    expect(identityComposition.slice(metadataStart, metadataEnd)).not.toContain(
      "eventId",
    );
    expect(identityComposition.slice(metadataStart, metadataEnd)).not.toContain(
      "eventType",
    );
  });

  it("requires a backend-owned exact route registry before a capability audit can claim HTTP method or route evidence", () => {
    const registryPath = resolve(
      root,
      "lib/server/company-identity-route-bindings.ts",
    );
    const registry = existsSync(registryPath)
      ? readFileSync(registryPath, "utf8")
      : "";
    const expectedBindings = [
      ["company-identity.employees.list", "GET", "/api/admin/employees"],
      ["company-identity.employees.create", "POST", "/api/admin/employees"],
      [
        "company-identity.employees.set-status",
        "PATCH",
        "/api/admin/employees/:accountId/status",
      ],
      [
        "company-identity.employees.set-application-roles",
        "PUT",
        "/api/admin/employees/:accountId/roles",
      ],
      [
        "company-identity.employees.set-company-roles",
        "PUT",
        "/api/admin/employees/:accountId/company-roles",
      ],
      [
        "company-identity.employees.reset-credential",
        "PUT",
        "/api/admin/employees/:accountId/credential",
      ],
      [
        "company-identity.employees.revoke-sessions",
        "DELETE",
        "/api/admin/employees/:accountId/sessions",
      ],
    ] as const;

    expect(existsSync(registryPath)).toBe(true);
    expect(registry).toContain("createCompanyIdentityRouteAdapter");
    expect(registry).not.toContain("companyIdentityRouteBindingIds");
    for (const [capabilityId, method, path] of expectedBindings) {
      expect(backendRouteBindings).toContain(capabilityId);
      expect(backendRouteBindings).toContain(`method: "${method}"`);
      expect(backendRouteBindings).toContain(`path: "${path}"`);
    }
    expect(identityCapabilities).not.toContain("httpMethod:");
    expect(identityCapabilities).not.toContain("httpRoute:");
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
      "ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET",
    ]) {
      expect(deploy).not.toContain(bootstrapSecret);
    }
    const accountsCentralSecret =
      "projects/reading-advantage/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET";
    expect(cloudbuild).toContain(`${accountsCentralSecret}/versions/latest`);
    const codecampCentralSecret =
      "projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET";
    expect(codecampCloudbuild).toContain(
      `COMPANY_AUTH_OIDC_CLIENT_SECRET=${codecampCentralSecret}:latest`,
    );
    expect(codecampCloudbuild).not.toContain(
      "COMPANY_AUTH_OIDC_CLIENT_SECRET=CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest",
    );
  });

  it("proves runtime non-ownership, exact writes, and immutable audit denial", () => {
    for (const assertion of [
      "rolsuper",
      "rolcreatedb",
      "rolcreaterole",
      "rolbypassrls",
      "pg_auth_members",
      "must not own the database",
      "has_schema_privilege",
      "must not own identity relations",
    ]) {
      expect(probe).toContain(assertion);
    }
    expect(probe).toContain("INSERT INTO company_login_attempts");
    expect(probe).toContain("INSERT INTO company_identity_audit_events");
    expect(probe).toContain("INSERT INTO company_identity_idempotency_records");
    expect(probe).toContain("UPDATE company_identity_idempotency_records");
    expect(probe).toContain("DELETE FROM company_identity_idempotency_records");
    expect(probe).toContain("UPDATE company_identity_audit_events");
    expect(probe).toContain("ROLLBACK;");
  });

  it("smokes protocol discovery and exact anonymous admin denial", () => {
    expect(smoke).toContain("/.well-known/openid-configuration");
    expect(smoke).toContain('"code_challenge_methods_supported":\\["S256"\\]');
    expect(smoke).toContain('[ "$STATUS" != "401" ]');
  });
});
