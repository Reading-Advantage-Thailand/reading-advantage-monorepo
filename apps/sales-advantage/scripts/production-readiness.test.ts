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

describe("Sales production readiness", () => {
  it("uses the pinned proxy and toolchain before migration, doctor, and runtime probe", () => {
    expect(cloudbuild.match(/node:22-slim/g)).toHaveLength(3);
    expect(cloudbuild.match(/cloud-sql-proxy\/v2\.15\.1/g)).toHaveLength(3);
    expect(cloudbuild.match(/pnpm@11\.8\.0/g)).toHaveLength(2);
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

  it("keeps runtime access relation-specific and probes real writes in rollback", () => {
    expect(grants).not.toMatch(/GRANT\s+ALL\s+PRIVILEGES/i);
    expect(grants).not.toMatch(/GRANT[^;]+ON\s+ALL\s+TABLES/i);
    for (const relation of [
      "users",
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
    expect(probe).toContain("BEGIN;");
    expect(probe).toContain("ROLLBACK;");
    expect(probe).toMatch(/INSERT INTO sales_roleplay_attempts/);
    expect(probe).toMatch(/UPDATE sales_progress/);
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
