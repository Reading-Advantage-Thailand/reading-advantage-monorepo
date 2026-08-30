// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const grants = readFileSync(
  new URL("../../../scripts/accounting-runtime-grants.sql", import.meta.url),
  "utf8",
);
const probe = readFileSync(
  new URL("../../../scripts/accounting-runtime-probe.sql", import.meta.url),
  "utf8",
);
const cleanup = readFileSync(
  new URL("../../../scripts/accounting-runtime-probe-cleanup.sql", import.meta.url),
  "utf8",
);
const provision = readFileSync(
  new URL("../../../scripts/accounting-runtime-role-provision.sql", import.meta.url),
  "utf8",
);

describe("Accounting database access contracts", () => {
  it("revokes access before granting the exact table privileges", () => {
    const revokeIndex = grants.indexOf(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM accounting_runtime",
    );
    const firstGrantIndex = grants.indexOf("GRANT SELECT");
    expect(revokeIndex).toBeGreaterThanOrEqual(0);
    expect(firstGrantIndex).toBeGreaterThan(revokeIndex);
    expect(grants.match(/^GRANT .* ON TABLE .* TO accounting_runtime;$/gmu)).toEqual([
      "GRANT SELECT, INSERT, UPDATE ON TABLE accounting_submissions TO accounting_runtime;",
      "GRANT SELECT, INSERT ON TABLE accounting_submission_audit_events TO accounting_runtime;",
    ]);
    expect(grants).not.toMatch(
      /^GRANT .*\b(?:UPDATE|DELETE)\b.*accounting_submission_audit_events/gmu,
    );
  });

  it("denies schema creation and future implicit privileges", () => {
    expect(grants).toContain("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    expect(grants).toContain(
      "REVOKE CREATE ON SCHEMA public FROM accounting_runtime",
    );
    expect(grants).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public",
    );
    expect(grants).not.toContain("ALTER ROLE");
  });

  it("provisions constrained login roles from required psql variables", () => {
    expect(provision).toContain(":'accounting_migration_password'");
    expect(provision).toContain(":'accounting_runtime_password'");
    expect(provision).not.toContain("current_setting('accounting_");
    expect(provision.match(/NOCREATEDB NOCREATEROLE NOINHERIT/gmu)).toHaveLength(
      2,
    );
    expect(provision).toContain(
      "ALTER DATABASE accounting OWNER TO accounting_migration",
    );
  });

  it("exercises application writes and only accepts privilege-denial errors", () => {
    expect(probe).toContain("INSERT INTO accounting_submissions");
    expect(probe).toContain("UPDATE accounting_submissions");
    expect(probe).toContain("FROM accounting_submissions");
    expect(probe).toContain("INSERT INTO accounting_submission_audit_events");
    expect(probe.match(/EXCEPTION WHEN insufficient_privilege THEN/gmu)).toHaveLength(
      3,
    );
    expect(probe).not.toContain("OR OTHERS");
    expect(probe).toContain("CREATE TABLE accounting_runtime_probe_forbidden");
  });

  it("uses one owner namespace and cleans both probe tables", () => {
    expect(probe).toContain("probe_owner_id");
    expect(cleanup).toContain("probe_owner_id");
    expect(cleanup).toContain("DELETE FROM accounting_submission_audit_events");
    expect(cleanup).toContain("DELETE FROM accounting_submissions");
  });
});
