import { describe, expect, it } from "vitest";

import {
  DevLocalProductAccessError,
  assertLocalOnlyDatabaseHost,
  deriveDevLocalWorkbooksApplicationId,
  normalizeDevLocalUsername,
  planDevLocalProductAccess,
  resolveAdminRoleKeyForApplication,
  resolveDevLocalTargetAccount,
  summarizeDevLocalProductAccessPlan,
  type DevLocalAccountCandidate,
  type PlanDevLocalProductAccessInput,
} from "../dev-local-product-access.js";

const target: DevLocalAccountCandidate = {
  accountId: "30000000-0000-4000-8000-000000000001",
  username: "Alice",
  normalizedUsername: "alice",
  membershipId: "30000000-0000-4000-8000-000000000002",
  organizationId: "30000000-0000-4000-8000-000000000003",
};
const CODECAMP = "30000000-0000-4000-8000-0000000000c1";
const SALES = "30000000-0000-4000-8000-0000000000c2";
const OTHER = "30000000-0000-4000-8000-0000000000c3";
const WORKBOOKS = "30000000-0000-4000-8000-0000000000c4";
const SECRET = "s".repeat(32);

/**
 * Captures the error code of a synchronous call.
 * @param work Call expected to throw.
 * @returns The dev-local error code.
 */
function codeOf(work: () => unknown): string {
  try {
    work();
  } catch (error) {
    expect(error).toBeInstanceOf(DevLocalProductAccessError);
    return (error as DevLocalProductAccessError).code;
  }
  throw new Error("Expected the call to throw.");
}

/**
 * Builds plan input with every ensure step present.
 * @param overrides Fields that replace the defaults.
 * @returns Plan input.
 */
function planInput(overrides: Partial<PlanDevLocalProductAccessInput> = {}): PlanDevLocalProductAccessInput {
  return {
    mode: "dry-run",
    target,
    applications: [{ id: CODECAMP, stableKey: "codecamp" }, { id: WORKBOOKS, stableKey: "workbooks" }],
    roleDefinitionsByApplicationId: { [CODECAMP]: ["ADMIN", "STUDENT"], [WORKBOOKS]: ["WORKBOOK_ADMIN"] },
    heldAssignments: [],
    workbooksApplicationPresent: true,
    workbooksRoleDefined: true,
    workbooksLocalOidcClientPresent: true,
    workbooksLocalRedirectUriPresent: true,
    ...overrides,
  };
}

describe("dev-local product access guards", () => {
  it.each([
    "postgres://u:p@localhost:5432/company_identity",
    "postgres://127.0.0.1/company_identity",
    "postgres://[::1]:5432/company_identity",
  ])("accepts the local host in %s", (url) => {
    expect(() => assertLocalOnlyDatabaseHost(url)).not.toThrow();
  });

  it.each([
    "postgres://db.example.com/company_identity",
    "postgres://localhost.example.com/company_identity",
    "postgres://10.0.0.5/company_identity",
    "postgres://localhost@db.example.com/company_identity",
    "postgres:///company_identity?host=/var/run/postgresql",
  ])("refuses the non-local host in %s", (url) => {
    expect(codeOf(() => assertLocalOnlyDatabaseHost(url))).toBe("NON_LOCAL_DATABASE_REFUSED");
  });

  it("refuses an unparseable URL without echoing it", () => {
    let message = "";
    try {
      assertLocalOnlyDatabaseHost("not a url secret-password");
    } catch (error) {
      message = (error as Error).message;
      expect((error as DevLocalProductAccessError).code).toBe("NON_LOCAL_DATABASE_REFUSED");
    }
    expect(message).toContain("<unparseable>");
    expect(message).not.toContain("secret-password");
  });

  it("normalizes usernames like Accounts", () => {
    expect(normalizeDevLocalUsername("  ＡＬＩＣＥ.Smith ")).toBe("alice.smith");
  });

  it.each(["", "a b", "-alice", "alice-", "a".repeat(65)])("rejects the username %j", (username) => {
    expect(codeOf(() => normalizeDevLocalUsername(username))).toBe("TARGET_USERNAME_INVALID");
  });

  it("derives a stable RFC 4122 version 5 workbooks application id", () => {
    const id = deriveDevLocalWorkbooksApplicationId();
    expect(id).toBe(deriveDevLocalWorkbooksApplicationId());
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("dev-local target account resolution", () => {
  const other = { ...target, accountId: "30000000-0000-4000-8000-000000000009", username: "bob", normalizedUsername: "bob" };

  it("selects the one candidate that matches the normalized username", () => {
    expect(resolveDevLocalTargetAccount({ username: " ALICE ", discoveryCandidates: [other, target] })).toBe(target);
  });

  it("reports a username with no match", () => {
    expect(codeOf(() => resolveDevLocalTargetAccount({ username: "carol", discoveryCandidates: [target] }))).toBe("TARGET_ACCOUNT_NOT_FOUND");
  });

  it("reports a username with several memberships", () => {
    expect(codeOf(() => resolveDevLocalTargetAccount({ username: "alice", discoveryCandidates: [target, target] }))).toBe("TARGET_ACCOUNT_AMBIGUOUS");
  });

  it("selects the only discovered admin", () => {
    expect(resolveDevLocalTargetAccount({ discoveryCandidates: [other] })).toBe(other);
  });

  it("reports no discovered admin", () => {
    expect(codeOf(() => resolveDevLocalTargetAccount({ discoveryCandidates: [] }))).toBe("ADMIN_CANDIDATE_NOT_FOUND");
  });

  it("refuses to choose between several discovered admins", () => {
    expect(codeOf(() => resolveDevLocalTargetAccount({ discoveryCandidates: [target, other] }))).toBe("ADMIN_CANDIDATE_AMBIGUOUS");
  });
});

describe("dev-local admin role resolution", () => {
  it("uses the explicit admin role of a known application", () => {
    expect(resolveAdminRoleKeyForApplication("sales", ["SALES_ADMIN", "ADMIN"])).toEqual({ roleKey: "SALES_ADMIN", reason: null });
  });

  it("fails when the explicit admin role is not defined", () => {
    expect(codeOf(() => resolveAdminRoleKeyForApplication("codecamp", ["STUDENT"]))).toBe("ADMIN_ROLE_DEFINITION_MISSING");
  });

  it("uses the single ADMIN-suffixed role of an unknown application", () => {
    expect(resolveAdminRoleKeyForApplication("reports", ["VIEWER", "REPORT_ADMIN"])).toEqual({ roleKey: "REPORT_ADMIN", reason: null });
  });

  it("skips an unknown application with no admin role", () => {
    expect(resolveAdminRoleKeyForApplication("reports", ["VIEWER"])).toEqual({ roleKey: null, reason: 'Application "reports" defines no ADMIN role.' });
  });

  it("skips an unknown application with two admin roles", () => {
    expect(resolveAdminRoleKeyForApplication("reports", ["A_ADMIN", "B_ADMIN"]).roleKey).toBeNull();
  });
});

describe("dev-local product access plan", () => {
  it("plans grants sorted by application key with held and skipped entries", () => {
    const plan = planDevLocalProductAccess(planInput({
      applications: [
        { id: WORKBOOKS, stableKey: "workbooks" },
        { id: OTHER, stableKey: "reports" },
        { id: CODECAMP, stableKey: "codecamp" },
      ],
      heldAssignments: [{ applicationId: CODECAMP, roleKey: "ADMIN" }],
    }));
    expect(plan.grants.map((grant) => [grant.applicationKey, grant.status, grant.roleKey])).toEqual([
      ["codecamp", "ALREADY_HELD", "ADMIN"],
      ["reports", "SKIPPED", null],
      ["workbooks", "TO_GRANT", "WORKBOOK_ADMIN"],
    ]);
    expect([plan.toGrantCount, plan.alreadyHeldCount, plan.skippedCount, plan.ensurePendingCount]).toEqual([1, 1, 1, 0]);
    expect(plan.workbooksApplicationId).toBe(WORKBOOKS);
    expect(plan.workbooksOidcClientSecretRequired).toBe(false);
  });

  it("adds the derived workbooks application and role when they are missing", () => {
    const plan = planDevLocalProductAccess(planInput({
      applications: [{ id: SALES, stableKey: "sales" }],
      roleDefinitionsByApplicationId: { [SALES]: ["SALES_ADMIN"] },
      workbooksApplicationPresent: false,
      workbooksRoleDefined: false,
      workbooksLocalOidcClientPresent: false,
      workbooksLocalRedirectUriPresent: false,
    }));
    expect(plan.workbooksApplicationId).toBe(deriveDevLocalWorkbooksApplicationId());
    expect(plan.grants.map((grant) => [grant.applicationKey, grant.status])).toEqual([["sales", "TO_GRANT"], ["workbooks", "TO_GRANT"]]);
    expect(plan.ensureSteps.map((step) => step.status)).toEqual(["WOULD_CREATE", "WOULD_CREATE", "WOULD_CREATE", "WOULD_CREATE"]);
    expect(plan.ensurePendingCount).toBe(4);
    expect(plan.workbooksOidcClientSecretRequired).toBe(true);
    expect(plan.workbooksOidcClientSecretSet).toBe(false);
  });

  it("refuses an apply that must create the OIDC client without a 32-character secret", () => {
    expect(codeOf(() => planDevLocalProductAccess(planInput({ mode: "apply", workbooksLocalOidcClientPresent: false, workbooksLocalOidcClientSecret: "s".repeat(31) })))).toBe("OIDC_CLIENT_SECRET_REQUIRED");
  });

  it("accepts an apply with a 32-character secret", () => {
    const plan = planDevLocalProductAccess(planInput({ mode: "apply", workbooksLocalOidcClientPresent: false, workbooksLocalOidcClientSecret: SECRET }));
    expect(plan.workbooksOidcClientSecretSet).toBe(true);
  });

  it("rejects an invalid target account", () => {
    expect(() => planDevLocalProductAccess(planInput({ target: { ...target, accountId: "nope" } }))).toThrow();
  });

  it("does not put the secret into the plan", () => {
    const plan = planDevLocalProductAccess(planInput({ workbooksLocalOidcClientSecret: SECRET }));
    expect(JSON.stringify(plan)).not.toContain(SECRET);
  });
});

describe("dev-local product access summary", () => {
  it("warns about skipped grants and a missing secret in a dry run", () => {
    const plan = planDevLocalProductAccess(planInput({
      applications: [{ id: OTHER, stableKey: "reports" }, { id: WORKBOOKS, stableKey: "workbooks" }],
      workbooksLocalOidcClientPresent: false,
    }));
    const summary = summarizeDevLocalProductAccessPlan({ mode: "dry-run", plan });
    expect(summary.warnings).toHaveLength(2);
    expect(summary.warnings[0]).toContain('Application "reports"');
    expect(summary.warnings[1]).toContain("WORKBOOKS_LOCAL_OIDC_CLIENT_SECRET");
    expect(summary).not.toHaveProperty("appliedGrantCount");
  });

  it("reports applied and audit counts for an apply", () => {
    const plan = planDevLocalProductAccess(planInput());
    const summary = summarizeDevLocalProductAccessPlan({ mode: "apply", plan, appliedGrantCount: 1, auditEventCount: 3 });
    expect(summary).toMatchObject({ mode: "apply", accountUsername: "Alice", appliedGrantCount: 1, auditEventCount: 3, warnings: [] });
  });
});
