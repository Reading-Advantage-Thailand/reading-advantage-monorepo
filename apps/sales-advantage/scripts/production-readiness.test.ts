// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dirname, "..");
const cloudbuild = readFileSync(resolve(appRoot, "cloudbuild.yaml"), "utf8");
const grants = readFileSync(
  resolve(appRoot, "scripts/sales-runtime-grants.sql"),
  "utf8",
);
const legacyGrants = readFileSync(
  resolve(appRoot, "scripts/sales-legacy-runtime-grants.sql"),
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
const legacyProbe = readFileSync(
  resolve(appRoot, "scripts/sales-legacy-runtime-probe.sql"),
  "utf8",
);
const probeSetup = readFileSync(
  resolve(appRoot, "scripts/sales-runtime-probe-setup.sql"),
  "utf8",
);
const probeCleanup = readFileSync(
  resolve(appRoot, "scripts/sales-runtime-probe-cleanup.sql"),
  "utf8",
);
const migrationProof = readFileSync(
  resolve(appRoot, "scripts/sales-migration-0042-probe.sql"),
  "utf8",
);
const sourceRoleRepair = readFileSync(
  resolve(appRoot, "scripts/sales-legacy-source-role-repair.sql"),
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
const cloudIgnore = readFileSync(
  resolve(appRoot, "../../.gcloudignore"),
  "utf8",
);
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

  it("builds a compatibility revision before evidence-bound repair and company cutover", () => {
    expect(cloudbuild.match(/node:22-slim/g)).toHaveLength(7);
    expect(cloudbuild.match(/cloud-sql-proxy\/v2\.15\.1/g)).toHaveLength(6);
    expect(cloudbuild.match(/pnpm@11\.8\.0/g)).toHaveLength(5);
    const ordered = [
      "migrate-db",
      "doctor-check",
      "build-curriculum-workspace-deps",
      "seed-production-curriculum",
      "verify-production-curriculum",
      "runtime-db-contract",
      "deploy-legacy-rollback",
      "repair-source-role",
      "deploy-cloudrun",
    ].map((id) => cloudbuild.indexOf(`id: "${id}"`));
    expect(ordered.every((position) => position >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((left, right) => left - right));
    expect(cloudbuild.indexOf('id: "runtime-db-contract"')).toBeLessThan(
      cloudbuild.indexOf('id: "deploy-cloudrun"'),
    );
    expect(cloudbuild).toContain("SALES_DIRECT_DATABASE_URL");
    expect(cloudbuild).toContain("SALES_DATABASE_URL");
    expect(cloudbuild).toContain("SALES_LEGACY_DATABASE_URL");
    expect(cloudbuild).not.toContain("SALES_PRIVILEGED_ADMIN_DATABASE_URL");
    expect(cloudbuild).not.toContain("sales-runtime-role-provision.sql");
    expect(cloudbuild).toContain("sales-runtime-probe-setup.sql");
    expect(cloudbuild).toContain("sales-runtime-probe-cleanup.sql");
    expect(cloudbuild).toContain("sales-legacy-runtime-grants.sql");
    expect(cloudbuild).toContain("sales-legacy-runtime-probe.sql");
    expect(cloudbuild).toContain("trap cleanup EXIT");
    expect(cloudbuild).toContain(
      "doctor --check --required-migration 0042_company_product_principal_local_unique",
    );
    expect(cloudbuild).toContain(
      'psql "$$SALES_DIRECT_DATABASE_URL" -f apps/sales-advantage/scripts/sales-migration-0042-probe.sql',
    );
    expect(cloudbuild).toContain("SALES_AUTH_MODE=legacy-school");
    expect(cloudbuild).toContain("SALES_AUTH_MODE=company");
    expect(migrationProof).toContain("constraint_record.contype = 'u'");
    expect(migrationProof).toContain(
      "ARRAY['application_key', 'local_user_id']::text[]",
    );
    expect(migrationProof).toContain(
      "ARRAY['application_key', 'company_account_id']::text[]",
    );
    expect(migrationProof).toContain("prosecdef");
    expect(migrationProof).toContain("search_path=pg_catalog");
    expect(migrationProof).toContain(
      "0042 Sales app-local principal split is incomplete",
    );
    expect(cloudbuild).toContain(
      "NEXT_PUBLIC_API_URL=https://sales.reading-advantage.com",
    );

    const legacyDeployStep = cloudbuild.slice(
      cloudbuild.indexOf('id: "deploy-legacy-rollback"'),
      cloudbuild.indexOf('id: "repair-source-role"'),
    );
    const repairStep = cloudbuild.slice(
      cloudbuild.indexOf('id: "repair-source-role"'),
      cloudbuild.indexOf('id: "deploy-cloudrun"'),
    );
    const deployStep = cloudbuild.slice(
      cloudbuild.indexOf('id: "deploy-cloudrun"'),
      cloudbuild.indexOf('id: "allow-public-invoker"'),
    );
    expect(cloudbuild.indexOf('id: "migrate-db"')).toBeLessThan(
      cloudbuild.indexOf('id: "doctor-check"'),
    );
    expect(legacyDeployStep).toContain("--no-traffic");
    expect(legacyDeployStep).toContain("--tag=legacy-rollback");
    expect(legacyDeployStep).toContain(
      "DATABASE_URL=SALES_LEGACY_DATABASE_URL:latest",
    );
    expect(legacyDeployStep).not.toContain("SALES_DATABASE_URL:latest");
    expect(repairStep).toContain("sales-legacy-source-role-repair.sql");
    expect(repairStep).toContain(
      '--set=repair_manifest="$$SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST"',
    );
    expect(repairStep).toContain("repair_manifest_sha256");
    expect(repairStep).toContain('--set=release_build_id="$BUILD_ID"');
    expect(repairStep).toContain(
      '--set=release_commit_sha="$_RELEASE_COMMIT_SHA"',
    );
    expect(repairStep).toContain(
      '      - "SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST"',
    );
    expect(deployStep).not.toContain(
      "SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST",
    );
    expect(deployStep).toContain("DATABASE_URL=SALES_DATABASE_URL:latest");
    expect(deployStep).not.toContain("SALES_LEGACY_DATABASE_URL:latest");
    expect(cloudbuild).toContain(
      "projects/$PROJECT_ID/secrets/SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST/versions/latest",
    );
    expect(sourceRoleRepair).toContain("repair_manifest is required");
    expect(sourceRoleRepair).toContain("repair_manifest_sha256 is required");
    expect(sourceRoleRepair).toContain("release_build_id is required");
    expect(sourceRoleRepair).toContain("release_commit_sha is required");
    expect(sourceRoleRepair).toContain(
      "'accountId', 'expectedCurrentRole', 'targetRole'",
    );
    expect(sourceRoleRepair).toContain("mapping_count <> 1");
    expect(sourceRoleRepair).toContain("expected_mapping_count <> 1");
    expect(sourceRoleRepair).toContain("observed_source_role = target_role");
    expect(sourceRoleRepair).toContain(
      "observed_source_role <> expected_current_role",
    );
    expect(sourceRoleRepair).toContain("completed_audit_count = 1");
    expect(sourceRoleRepair).toContain("'manifestSha256', manifest_sha256");
    expect(sourceRoleRepair).toContain("'releaseBuildId', release_build_id");
    expect(sourceRoleRepair).toContain("'releaseCommitSha', release_commit_sha");
    expect(sourceRoleRepair).toContain(
      "'sales-source-role-repair:' || account_id::text",
    );
    expect(sourceRoleRepair).toContain("INSERT INTO audit_events");
    expect(sourceRoleRepair).toContain("sales:legacy_source_role_repaired");
    expect(sourceRoleRepair).not.toContain("00000000-0000-4000");
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
    expect(reviewedSeed).toContain("SALES_CURRICULUM_FORCE_RESEED_FORBIDDEN");
    expect(staticSeed).toContain(
      "SALES_CURRICULUM_DIRECT_SEED_FORBIDDEN_USE_REVIEWED_ENTRYPOINT",
    );
    expect(curriculumVerifier).toContain("verifyProductionSalesCurriculum");
    expect(curriculumVerifier).toContain("PINNED_SALES_CURRICULUM_COUNTS");
    expect(curriculumVerifier).toContain(
      "PINNED_SALES_CURRICULUM_GRAPH_SHA256",
    );
    expect(curriculumVerifier).not.toContain('from "./static-seed"');
    expect(staticSeed).not.toContain("client.end({ timeout: 5 })");
    expect(reviewedSeed).toContain("client.end({ timeout: 5 })");
    expect(curriculumVerifier).toContain("client.end({ timeout: 5 })");
    expect(packageJson).toContain(
      '"seed:production-curriculum": "tsx scripts/seed-reviewed-curriculum.ts"',
    );
    expect(reviewedSeed).toContain("assertCurriculumReleaseReady");
    expect(reviewedSeed).toContain("SALES_CURRICULUM_APPROVAL_SHA256");
    expect(reviewedSeed).toContain("release-candidate.json");
    expect(releaseCandidate).toContain('"status": "awaiting_human_review"');
    expect(releaseCandidate).not.toContain('"status": "approved"');
  });

  it("separates company runtime access from the compatibility credential", () => {
    for (const contract of [grants, legacyGrants]) {
      expect(contract).not.toMatch(/GRANT\s+ALL\s+PRIVILEGES/i);
      expect(contract).not.toMatch(/GRANT[^;]+ON\s+ALL\s+TABLES/i);
    }
    expect(grants).toContain("GRANT SELECT ON TABLE users TO sales_runtime;");
    expect(grants).toContain(
      "GRANT SELECT ON TABLE company_product_principals TO sales_runtime;",
    );
    expect(grants).toMatch(
      /GRANT EXECUTE ON FUNCTION\s+sync_sales_company_principal\(uuid, text, uuid, text, text\)\s+TO sales_runtime;/,
    );
    for (const relation of ["accounts", "sessions", "login_attempts"]) {
      expect(grants).not.toMatch(new RegExp(`GRANT[^;]+TABLE ${relation}`, "i"));
      expect(probe).toMatch(
        new RegExp(
          `has_table_privilege\\(\\s*current_user, '${relation}', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'`,
        ),
      );
    }
    expect(grants).not.toMatch(/GRANT[^;]+UPDATE[^;]+TABLE users/i);
    expect(grants).not.toMatch(
      /GRANT[^;]+(?:INSERT|UPDATE|DELETE)[^;]+TABLE company_product_principals/i,
    );
    expect(probe).toContain("sync_sales_company_principal");
    expect(probe).toMatch(/INSERT INTO sales_roleplay_attempts/);
    expect(probe).toMatch(/UPDATE sales_progress/);
    expect(legacyGrants).toContain(
      "GRANT SELECT ON TABLE accounts TO sales_legacy_runtime;",
    );
    expect(legacyGrants).toMatch(
      /GRANT UPDATE \(password, updated_at\) ON TABLE accounts\s+TO sales_legacy_runtime;/,
    );
    expect(legacyGrants).toContain(
      "GRANT SELECT, INSERT, DELETE ON TABLE sessions TO sales_legacy_runtime;",
    );
    expect(legacyGrants).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE login_attempts\s+TO sales_legacy_runtime;/,
    );
    expect(legacyGrants).not.toMatch(
      /GRANT[^;]+(?:INSERT|UPDATE|DELETE)[^;]+TABLE users/i,
    );
    expect(legacyGrants).not.toMatch(
      /GRANT[^;]+(?:INSERT|UPDATE|DELETE)[^;]+TABLE company_product_principals/i,
    );
    expect(legacyGrants).not.toContain("sync_sales_company_principal");
    expect(legacyProbe).toContain("forbidden provisioning privileges");
    expect(legacyProbe).toContain("INSERT INTO sessions");
    expect(legacyProbe).toContain("INSERT INTO login_attempts");
    expect(legacyProbe).toContain("UPDATE accounts");
    for (const contract of [probe, legacyProbe]) {
      expect(contract).toContain("BEGIN;");
      expect(contract).toContain("ROLLBACK;");
      expect(contract).toContain("probe_owner");
    }
    for (const contract of [probeSetup, probeCleanup]) {
      expect(contract).toContain("probe_owner");
      expect(contract).toContain("md5(");
      expect(contract).not.toContain("00000000-0000-0000-0000-000000000051");
      expect(contract).not.toContain("00000000-0000-0000-0000-000000000053");
    }
    expect(probe).toContain("rolsuper");
    expect(probe).toContain("rolcreaterole");
    expect(probe).toContain("rolcreatedb");
    expect(probe).toContain("rolbypassrls");
    expect(probe).toContain("rolinherit");
    expect(probe).toContain("rolreplication");
    expect(grants).not.toMatch(/ALTER\s+ROLE/i);
    expect(roleProvisioning).toMatch(
      /BEGIN;[\s\S]+Both Sales runtime identities must already exist[\s\S]+ALTER ROLE sales_runtime[\s\S]+ALTER ROLE sales_legacy_runtime[\s\S]+COMMIT;/,
    );
    expect(roleProvisioning).toContain(") <> 2 THEN");
    expect(roleProvisioning).toMatch(
      /ALTER ROLE sales_runtime NOCREATEDB NOCREATEROLE NOINHERIT/,
    );
    expect(roleProvisioning).toMatch(
      /ALTER ROLE sales_legacy_runtime NOCREATEDB NOCREATEROLE NOINHERIT/,
    );
    expect(roleProvisioning).toContain(
      "rolsuper OR rolreplication OR rolbypassrls",
    );
    expect(roleProvisioning).toContain(
      "Sales runtime identities retain a forbidden sensitive attribute",
    );
    expect(roleProvisioning).not.toMatch(
      /ALTER ROLE sales_(?:legacy_)?runtime[^;]*(?:NOSUPERUSER|NOREPLICATION|NOBYPASSRLS)/,
    );
    expect(roleRunbook).toContain("SALES_PRIVILEGED_ADMIN_DATABASE_URL");
    expect(roleRunbook).toContain("sales_migration");
    expect(roleRunbook).toContain("sales_legacy_runtime");
    expect(roleRunbook).toContain("SALES_LEGACY_DATABASE_URL");
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
