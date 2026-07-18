// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dirname, "..");
const cloudbuild = readFileSync(resolve(appRoot, "cloudbuild.yaml"), "utf8");
const grants = readFileSync(
  resolve(appRoot, "scripts/sales-runtime-grants.sql"),
  "utf8",
);
const roleProvisioning = readFileSync(
  resolve(appRoot, "scripts/sales-runtime-role-provision.sql"),
  "utf8",
);
const roleRunbook = readFileSync(
  resolve(appRoot, "../../docs/deployment/sales-database-role-provisioning.md"),
  "utf8",
);
const probe = readFileSync(
  resolve(appRoot, "scripts/sales-runtime-probe.sql"),
  "utf8",
);
const smoke = readFileSync(resolve(appRoot, "scripts/sales-smoke.sh"), "utf8");
const staticSeed = readFileSync(
  resolve(appRoot, "scripts/static-seed.ts"),
  "utf8",
);
const reviewedSeed = readFileSync(
  resolve(appRoot, "scripts/seed-reviewed-curriculum.ts"),
  "utf8",
);
const packageJson = readFileSync(resolve(appRoot, "package.json"), "utf8");
const releaseCandidate = readFileSync(
  resolve(appRoot, "curriculum/release-candidate.json"),
  "utf8",
);
const curriculumVerifier = readFileSync(
  resolve(appRoot, "scripts/verify-sales-curriculum.ts"),
  "utf8",
);
const cloudIgnore = readFileSync(resolve(appRoot, "../../.gcloudignore"), "utf8");
const oidcCallback = readFileSync(
  resolve(appRoot, "app/api/auth/callback/route.ts"),
  "utf8",
);

describe("Sales production readiness", () => {
  it("redirects callbacks through the registered public Sales origin", () => {
    expect(oidcCallback).toContain("getSalesPublicOrigin");
    expect(oidcCallback).toContain("new URL(session.returnTo, publicOrigin)");
    expect(oidcCallback).not.toContain("session.returnTo, url.origin");
  });

  it("uses the pinned proxy and toolchain before migration, doctor, and runtime probe", () => {
    expect(cloudbuild.match(/node:22-slim/g)).toHaveLength(6);
    expect(cloudbuild.match(/cloud-sql-proxy\/v2\.15\.1/g)).toHaveLength(5);
    expect(cloudbuild.match(/pnpm@11\.8\.0/g)).toHaveLength(5);
    const ordered = [
      "migrate-db",
      "doctor-check",
      "build-curriculum-workspace-deps",
      "seed-production-curriculum",
      "verify-production-curriculum",
      "runtime-db-contract",
      "deploy-cloudrun",
    ].map((id) => cloudbuild.indexOf(`id: "${id}"`));
    expect(ordered.every((position) => position >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((left, right) => left - right));
    expect(cloudbuild.indexOf('id: "runtime-db-contract"')).toBeLessThan(
      cloudbuild.indexOf('id: "deploy-cloudrun"'),
    );
    expect(cloudbuild).toContain("SALES_DIRECT_DATABASE_URL");
    expect(cloudbuild).toContain("SALES_DATABASE_URL");
    expect(cloudbuild).not.toContain("SALES_PRIVILEGED_ADMIN_DATABASE_URL");
    expect(cloudbuild).not.toContain("sales-runtime-role-provision.sql");
    expect(cloudbuild).toContain("sales-runtime-probe-setup.sql");
    expect(cloudbuild).toContain("sales-runtime-probe-cleanup.sql");
    expect(cloudbuild).toContain("trap cleanup EXIT");
    expect(cloudbuild).toContain(
      "NEXT_PUBLIC_API_URL=https://sales.reading-advantage.com",
    );
  });

  it("seeds only deterministic approved curriculum and gates exact completeness", () => {
    const seedStep = cloudbuild.slice(
      cloudbuild.indexOf('id: "seed-production-curriculum"'),
      cloudbuild.indexOf('id: "verify-production-curriculum"'),
    );
    const verifyStep = cloudbuild.slice(
      cloudbuild.indexOf('id: "verify-production-curriculum"'),
      cloudbuild.indexOf('id: "runtime-db-contract"'),
    );
    expect(seedStep).toContain("seed:production-curriculum");
    expect(verifyStep).toContain("verify:production-curriculum");
    expect(seedStep).toContain(
      'secretEnv:\n      - "SALES_DIRECT_DATABASE_URL"',
    );
    expect(verifyStep).toContain(
      'secretEnv:\n      - "SALES_DIRECT_DATABASE_URL"',
    );
    expect(seedStep).not.toContain("SALES_DATABASE_URL");
    expect(verifyStep).not.toContain("SALES_DATABASE_URL");
    const dependencyBuild = cloudbuild.slice(
      cloudbuild.indexOf('id: "build-curriculum-workspace-deps"'),
      cloudbuild.indexOf('id: "seed-production-curriculum"'),
    );
    expect(cloudIgnore).toContain("**/dist");
    expect(dependencyBuild).toContain(
      "pnpm --filter @reading-advantage/db build",
    );
    expect(dependencyBuild).not.toContain("DATABASE_URL");
    expect(staticSeed).toContain("reading-advantage-sales-curriculum-v1");
    expect(staticSeed).toContain("database.transaction");
    expect(staticSeed).toContain("already-complete");
    expect(staticSeed).toContain("SALES_CURRICULUM_INCOMPLETE_OR_INCONSISTENT");
    expect(staticSeed).toContain('reviewStatus: "approved"');
    expect(staticSeed).toContain("SALES_CURRICULUM_FORCE_RESEED_FORBIDDEN");
    expect(curriculumVerifier).toContain("verifyProductionSalesCurriculum");
    expect(curriculumVerifier).toContain("PINNED_SALES_CURRICULUM_COUNTS");
    expect(curriculumVerifier).toContain("PINNED_SALES_CURRICULUM_GRAPH_SHA256");
    expect(curriculumVerifier).not.toContain('from "./static-seed"');
    expect(staticSeed).toContain("client.end({ timeout: 5 })");
    expect(curriculumVerifier).toContain("client.end({ timeout: 5 })");
    expect(packageJson).toContain(
      '"seed:production-curriculum": "tsx scripts/seed-reviewed-curriculum.ts"',
    );
    expect(reviewedSeed).toContain("assertCurriculumReleaseReady");
    expect(reviewedSeed).toContain("release-candidate.json");
    expect(releaseCandidate).toContain('"status": "awaiting_human_review"');
    expect(releaseCandidate).not.toContain('"status": "approved"');
  });

  it("keeps runtime access relation-specific and probes real writes in rollback", () => {
    expect(grants).not.toMatch(/GRANT\s+ALL\s+PRIVILEGES/i);
    expect(grants).not.toMatch(/GRANT[^;]+ON\s+ALL\s+TABLES/i);
    for (const relation of [
      "users",
      "company_product_principals",
      "accounts",
      "sessions",
      "login_attempts",
      "audit_events",
      "sales_modules",
      "sales_lessons",
      "sales_rubrics",
      "sales_roleplay_scenarios",
      "sales_quiz_questions",
      "sales_roleplay_attempts",
      "sales_progress",
      "sales_conversations",
      "sales_chat_messages",
    ]) {
      expect(grants).toContain(`TABLE ${relation}`);
      expect(probe).toContain(relation);
    }
    const transactionStart = probe.indexOf("BEGIN;");
    const mappingInsert = probe.indexOf(
      "INSERT INTO company_product_principals",
    );
    const mappingUpdate = probe.indexOf("UPDATE company_product_principals");
    const transactionRollback = probe.indexOf("ROLLBACK;");
    expect(transactionStart).toBeGreaterThanOrEqual(0);
    expect(transactionStart).toBeLessThan(mappingInsert);
    expect(mappingInsert).toBeLessThan(mappingUpdate);
    expect(mappingUpdate).toBeLessThan(transactionRollback);
    expect(probe).toMatch(/INSERT INTO sales_roleplay_attempts/);
    expect(probe).toMatch(/UPDATE sales_progress/);
    expect(grants).toContain(
      "GRANT SELECT, INSERT ON TABLE users TO sales_runtime;",
    );
    expect(grants).toContain(
      "GRANT UPDATE (role) ON TABLE users TO sales_runtime;",
    );
    expect(grants).toContain(
      "GRANT SELECT, INSERT ON TABLE company_product_principals TO sales_runtime;",
    );
    expect(grants).toContain(
      "GRANT UPDATE (role_key, updated_at) ON TABLE company_product_principals TO sales_runtime;",
    );
    expect(grants).not.toMatch(/GRANT[^;]*UPDATE\s+ON TABLE users/i);
    expect(grants).not.toMatch(
      /GRANT[^;]*UPDATE\s+ON TABLE company_product_principals/i,
    );
    expect(grants).not.toMatch(
      /GRANT[^;]*(?:DELETE|TRUNCATE)[^;]*ON TABLE (?:users|company_product_principals)/i,
    );
    expect(probe).toMatch(/INSERT INTO company_product_principals/);
    expect(probe).toMatch(
      /SELECT local_user_id, role_key[\s\S]+FROM company_product_principals/,
    );
    expect(probe).toMatch(/UPDATE users[\s\S]+SET role = 'SALES_ADMIN'/);
    expect(probe).toMatch(
      /UPDATE company_product_principals[\s\S]+SET role_key = 'SALES_ADMIN'/,
    );
    for (const relation of ["users", "company_product_principals"]) {
      for (const privilege of [
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "TRUNCATE",
      ]) {
        expect(probe).toContain(
          `has_table_privilege(current_user, '${relation}', '${privilege}')`,
        );
      }
    }
    for (const allowed of [
      "has_column_privilege(current_user, 'users', 'role', 'UPDATE')",
      "has_column_privilege(current_user, 'company_product_principals', 'role_key', 'UPDATE')",
      "has_column_privilege(current_user, 'company_product_principals', 'updated_at', 'UPDATE')",
    ]) {
      expect(probe).toContain(allowed);
    }
    for (const denied of [
      "has_column_privilege(current_user, 'users', 'id', 'UPDATE')",
      "has_column_privilege(current_user, 'users', 'username', 'UPDATE')",
      "has_column_privilege(current_user, 'users', 'school_id', 'UPDATE')",
      "has_column_privilege(current_user, 'company_product_principals', 'organization_id', 'UPDATE')",
      "has_column_privilege(current_user, 'company_product_principals', 'company_account_id', 'UPDATE')",
      "has_column_privilege(current_user, 'company_product_principals', 'local_user_id', 'UPDATE')",
    ]) {
      expect(probe).toContain(denied);
    }
    expect(probe).toContain("rolsuper");
    expect(probe).toContain("rolcreaterole");
    expect(probe).toContain("rolcreatedb");
    expect(probe).toContain("rolbypassrls");
    expect(probe).toContain("rolinherit");
    expect(probe).toContain("rolreplication");
    expect(grants).not.toMatch(/ALTER\s+ROLE/i);
    expect(roleProvisioning).toMatch(
      /ALTER ROLE sales_runtime[\s\S]+NOINHERIT NOREPLICATION/,
    );
    expect(roleRunbook).toContain("SALES_PRIVILEGED_ADMIN_DATABASE_URL");
    expect(roleRunbook).toContain("sales_migration");
    expect(roleRunbook).toContain("NOCREATEROLE");
    expect(probe).toContain("pg_auth_members");
    expect(probe).toContain(
      "has_schema_privilege(current_user, 'public', 'CREATE')",
    );
    expect(probe).toContain("must not own the database");
    expect(probe).toContain("must not own application relations");
    expect(probe).toContain("representative forbidden operations");
  });

  it("requires the exact unauthenticated tRPC response", () => {
    expect(smoke).toContain('"$BASE_URL/en"');
    expect(smoke).toContain("/api/trpc/sales.dashboard?input=");
    expect(smoke).toContain('if [ "$HTTP_STATUS" = "401" ]');
    expect(smoke).not.toContain("unexpected but not blocking");
    expect(smoke).not.toContain("may be a public endpoint");
  });
});
