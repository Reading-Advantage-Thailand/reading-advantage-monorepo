import { describe, expect, it } from "vitest";

import {
  DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION,
  DEV_LOCAL_WORKBOOKS_SECRET_ENV,
  DevLocalProductAccessError,
  assertLocalOnlyDatabaseHost,
  deriveDevLocalWorkbooksApplicationId,
  planDevLocalProductAccess,
  resolveAdminRoleKeyForApplication,
  resolveDevLocalTargetAccount,
  summarizeDevLocalProductAccessPlan,
  type DevLocalAccountCandidate,
} from "@reading-advantage/backend";

import { createDevLocalProductAccessInput } from "./dev-local-product-access";

const environment = {
  COMPANY_AUTH_DIRECT_DATABASE_URL:
    "postgresql://local:secret@localhost/company_identity",
};

const candidate = (overrides: Partial<DevLocalAccountCandidate> = {}): DevLocalAccountCandidate => ({
  accountId: "11111111-1111-4111-8111-111111111111",
  username: "codecamp-admin",
  normalizedUsername: "codecamp-admin",
  membershipId: "22222222-2222-4222-8222-222222222222",
  organizationId: "33333333-3333-4333-8333-333333333333",
  ...overrides,
});

const application = (id: string, stableKey: string) => ({ id, stableKey });

const APP_IDS = {
  workbooks: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  codecamp: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  sales: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  marketing: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  extra: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
};

const DEFINED_ROLES: Record<string, string[]> = {
  [APP_IDS.workbooks]: ["WORKBOOK_ADMIN"],
  [APP_IDS.codecamp]: ["ADMIN", "INTERN", "STUDENT", "TEACHER"],
  [APP_IDS.sales]: ["SALES_REP", "SALES_ADMIN"],
  [APP_IDS.marketing]: ["MEMBER", "ADMIN"],
  [APP_IDS.extra]: ["VIEWER", "EDITOR", "SUPER_ADMIN"],
};

function errorOf(call: () => unknown): DevLocalProductAccessError {
  try {
    call();
  } catch (error) {
    expect(error).toBeInstanceOf(DevLocalProductAccessError);
    return error as DevLocalProductAccessError;
  }
  throw new Error("Expected a DevLocalProductAccessError.");
}

function planInput(
  overrides: Parameters<typeof planDevLocalProductAccess>[0] extends infer T
    ? Partial<T>
    : never = {},
) {
  return {
    mode: "dry-run" as const,
    target: candidate(),
    applications: [
      application(APP_IDS.workbooks, "workbooks"),
      application(APP_IDS.codecamp, "codecamp"),
      application(APP_IDS.sales, "sales"),
      application(APP_IDS.marketing, "marketing"),
    ],
    roleDefinitionsByApplicationId: DEFINED_ROLES,
    heldAssignments: [],
    workbooksApplicationPresent: true,
    workbooksRoleDefined: true,
    workbooksLocalOidcClientPresent: true,
    workbooksLocalRedirectUriPresent: true,
    ...overrides,
  };
}

describe("local-only database guard", () => {
  it("admits loopback-only hosts", () => {
    expect(() =>
      assertLocalOnlyDatabaseHost("postgresql://local:secret@localhost/company_identity"),
    ).not.toThrow();
    expect(() =>
      assertLocalOnlyDatabaseHost("postgresql://local:secret@127.0.0.1:5432/company_identity"),
    ).not.toThrow();
    expect(() =>
      assertLocalOnlyDatabaseHost("postgresql://local:secret@[::1]:5432/company_identity"),
    ).not.toThrow();
  });

  it("refuses every non-loopback host and states the observed host", () => {
    for (const url of [
      "postgresql://local:secret@db.example.com/company_identity",
      "postgresql://local:secret@10.0.0.5:5432/company_identity",
    ]) {
      const error = errorOf(() => assertLocalOnlyDatabaseHost(url));
      expect(error.code).toBe("NON_LOCAL_DATABASE_REFUSED");
      expect(error.message).toContain("localhost-only");
    }
    const domainError = errorOf(() =>
      assertLocalOnlyDatabaseHost("postgresql://local:secret@db.example.com/company_identity"),
    );
    expect(domainError.message).toContain("db.example.com");
    const ipError = errorOf(() =>
      assertLocalOnlyDatabaseHost("postgresql://local:secret@10.0.0.5:5432/company_identity"),
    );
    expect(ipError.message).toContain("10.0.0.5");
  });

  it("refuses cloud SQL socket paths and empty hosts", () => {
    const socketError = errorOf(() =>
      assertLocalOnlyDatabaseHost("postgresql://local:secret@/company_identity?host=/cloudsql/project:region:instance"),
    );
    expect(socketError.code).toBe("NON_LOCAL_DATABASE_REFUSED");
    const emptyError = errorOf(() =>
      assertLocalOnlyDatabaseHost("postgresql://local:secret@/company_identity"),
    );
    expect(emptyError.code).toBe("NON_LOCAL_DATABASE_REFUSED");
  });

  it("never leaks credentials from the refused URL", () => {
    const secret = "super-secret-password";
    const error = errorOf(() =>
      assertLocalOnlyDatabaseHost(`postgresql://local:${secret}@db.example.com/company_identity`),
    );
    expect(error.message).not.toContain(secret);
  });
});

describe("local product access CLI input", () => {
  it("creates a read-only dry-run input without apply authorization", () => {
    expect(createDevLocalProductAccessInput(environment, ["--dry-run"])).toMatchObject({
      mode: "dry-run",
      targetDatabaseUrl: environment.COMPANY_AUTH_DIRECT_DATABASE_URL,
    });
  });

  it("requires exactly one of --dry-run or --apply", () => {
    expect(() => createDevLocalProductAccessInput(environment, [])).toThrow(
      "Choose exactly one of --dry-run or --apply.",
    );
    expect(() =>
      createDevLocalProductAccessInput(environment, ["--dry-run", "--apply"]),
    ).toThrow("Choose exactly one of --dry-run or --apply.");
  });

  it("requires the exact confirmation phrase for apply", () => {
    expect(() => createDevLocalProductAccessInput(environment, ["--apply"])).toThrow(
      `--confirm=${DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION}`,
    );
    expect(() =>
      createDevLocalProductAccessInput(environment, ["--apply", "--confirm=almost"]),
    ).toThrow(`--confirm=${DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION}`);
    expect(
      createDevLocalProductAccessInput(environment, [
        "--apply",
        `--confirm=${DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION}`,
      ]),
    ).toMatchObject({ mode: "apply" });
  });

  it("parses an explicit username selector", () => {
    expect(
      createDevLocalProductAccessInput(environment, [
        "--dry-run",
        "--username=codecamp-admin",
      ]),
    ).toMatchObject({ mode: "dry-run", username: "codecamp-admin" });
  });

  it("falls back to DATABASE_URL and fails without either variable", () => {
    expect(
      createDevLocalProductAccessInput(
        { DATABASE_URL: "postgresql://local:secret@localhost/company_identity" },
        ["--dry-run"],
      ),
    ).toMatchObject({ targetDatabaseUrl: "postgresql://local:secret@localhost/company_identity" });
    expect(() => createDevLocalProductAccessInput({}, ["--dry-run"])).toThrow(
      "database environment is incomplete",
    );
  });

  it("passes the workbooks local client secret through without logging it", () => {
    const secret = "workbooks-local-client-secret-42";
    expect(
      createDevLocalProductAccessInput(
        { ...environment, [DEV_LOCAL_WORKBOOKS_SECRET_ENV]: secret },
        ["--apply", `--confirm=${DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION}`],
      ),
    ).toMatchObject({ mode: "apply", workbooksLocalOidcClientSecret: secret });
    expect(
      createDevLocalProductAccessInput(environment, ["--dry-run"]),
    ).not.toHaveProperty("workbooksLocalOidcClientSecret");
  });
});

describe("target account selection", () => {
  it("prefers an explicit username match", () => {
    expect(
      resolveDevLocalTargetAccount({
        username: "Codecamp-Admin ",
        discoveryCandidates: [candidate()],
      }),
    ).toMatchObject({ normalizedUsername: "codecamp-admin" });
  });

  it("fails when the explicit username has no active account", () => {
    const error = errorOf(() =>
      resolveDevLocalTargetAccount({
        username: "missing-user",
        discoveryCandidates: [candidate()],
      }),
    );
    expect(error.code).toBe("TARGET_ACCOUNT_NOT_FOUND");
  });

  it("fails when discovery finds zero candidates", () => {
    const error = errorOf(() =>
      resolveDevLocalTargetAccount({ discoveryCandidates: [] }),
    );
    expect(error.code).toBe("ADMIN_CANDIDATE_NOT_FOUND");
    expect(error.message).toContain("Codecamp ADMIN");
  });

  it("fails when discovery finds multiple candidates", () => {
    const error = errorOf(() =>
      resolveDevLocalTargetAccount({
        discoveryCandidates: [candidate(), candidate({ accountId: "99999999-9999-4999-8999-999999999999" })],
      }),
    );
    expect(error.code).toBe("ADMIN_CANDIDATE_AMBIGUOUS");
    expect(error.message).toContain("2 accounts");
  });

  it("selects the single discovery candidate", () => {
    expect(
      resolveDevLocalTargetAccount({ discoveryCandidates: [candidate()] }),
    ).toMatchObject({ username: "codecamp-admin" });
  });
});

describe("admin-role resolution per application", () => {
  it("hits the explicit preference map", () => {
    expect(resolveAdminRoleKeyForApplication("workbooks", ["WORKBOOK_ADMIN"])).toEqual({
      roleKey: "WORKBOOK_ADMIN",
      reason: null,
    });
    expect(resolveAdminRoleKeyForApplication("codecamp", ["ADMIN", "TEACHER"])).toEqual({
      roleKey: "ADMIN",
      reason: null,
    });
    expect(resolveAdminRoleKeyForApplication("sales", ["SALES_REP", "SALES_ADMIN"])).toEqual({
      roleKey: "SALES_ADMIN",
      reason: null,
    });
    expect(resolveAdminRoleKeyForApplication("marketing", ["MEMBER", "ADMIN"])).toEqual({
      roleKey: "ADMIN",
      reason: null,
    });
  });

  it("fails closed when a preference-map role is not defined", () => {
    const error = errorOf(() =>
      resolveAdminRoleKeyForApplication("workbooks", ["WORKBOOK_VIEWER"]),
    );
    expect(error.code).toBe("ADMIN_ROLE_DEFINITION_MISSING");
    expect(error.message).toContain("WORKBOOK_ADMIN");
  });

  it("falls back to a unique ADMIN-suffixed definition", () => {
    expect(resolveAdminRoleKeyForApplication("reports", ["VIEWER", "SUPER_ADMIN", "EDITOR"])).toEqual({
      roleKey: "SUPER_ADMIN",
      reason: null,
    });
  });

  it("skips when the suffix fallback is ambiguous", () => {
    expect(
      resolveAdminRoleKeyForApplication("reports", ["CONTENT_ADMIN", "SYSTEM_ADMIN"]),
    ).toMatchObject({
      roleKey: null,
      reason: expect.stringContaining("refusing ambiguous"),
    });
  });

  it("skips when no ADMIN-suffixed definition exists", () => {
    expect(resolveAdminRoleKeyForApplication("reports", ["USER", "EDITOR"])).toMatchObject({
      roleKey: null,
      reason: expect.stringContaining("defines no ADMIN role"),
    });
  });
});

describe("local product access grant plan", () => {
  it("maps every application to its admin role as TO_GRANT", () => {
    const plan = planDevLocalProductAccess(planInput());
    expect(plan.accountUsername).toBe("codecamp-admin");
    expect(plan.toGrantCount).toBe(4);
    expect(plan.alreadyHeldCount).toBe(0);
    expect(plan.skippedCount).toBe(0);
    expect(plan.grants.map((grant) => [grant.applicationKey, grant.roleKey])).toEqual([
      ["codecamp", "ADMIN"],
      ["marketing", "ADMIN"],
      ["sales", "SALES_ADMIN"],
      ["workbooks", "WORKBOOK_ADMIN"],
    ]);
  });

  it("reports already-held roles without re-granting", () => {
    const plan = planDevLocalProductAccess(
      planInput({
        applications: [application(APP_IDS.workbooks, "workbooks"), application(APP_IDS.sales, "sales")],
        heldAssignments: [
          { applicationId: APP_IDS.workbooks, roleKey: "WORKBOOK_ADMIN" },
        ],
      }),
    );
    expect(plan.toGrantCount).toBe(1);
    expect(plan.alreadyHeldCount).toBe(1);
    expect(plan.grants.find((grant) => grant.applicationKey === "workbooks")).toMatchObject({
      status: "ALREADY_HELD",
    });
  });

  it("skips unknown applications without a unique ADMIN role", () => {
    const plan = planDevLocalProductAccess(
      planInput({
        applications: [
          application(APP_IDS.workbooks, "workbooks"),
          application(APP_IDS.extra, "reports"),
        ],
        roleDefinitionsByApplicationId: {
          [APP_IDS.workbooks]: DEFINED_ROLES[APP_IDS.workbooks]!,
          [APP_IDS.extra]: ["CONTENT_ADMIN", "SYSTEM_ADMIN"],
        },
      }),
    );
    expect(plan.toGrantCount).toBe(1);
    expect(plan.skippedCount).toBe(1);
    expect(plan.grants.find((grant) => grant.applicationKey === "reports")).toMatchObject({
      status: "SKIPPED",
      roleKey: null,
    });
  });
});

describe("workbooks local infrastructure ensure", () => {
  it("reports every ensure step as present when the local bootstrap is complete", () => {
    const plan = planDevLocalProductAccess(planInput());
    expect(plan.ensureSteps).toEqual([
      { step: "APPLICATION", status: "PRESENT", detail: "workbooks" },
      { step: "ROLE_DEFINITION", status: "PRESENT", detail: "WORKBOOK_ADMIN" },
      { step: "OIDC_CLIENT", status: "PRESENT", detail: "workbooks-web-local" },
      {
        step: "OIDC_REDIRECT_URI",
        status: "PRESENT",
        detail: "http://localhost:3011/api/auth/callback",
      },
    ]);
    expect(plan.ensurePendingCount).toBe(0);
    expect(plan.workbooksOidcClientSecretRequired).toBe(false);
  });

  it("plans creation of every missing workbooks step on a fresh bootstrap", () => {
    const plan = planDevLocalProductAccess(
      planInput({
        applications: [
          application(APP_IDS.codecamp, "codecamp"),
          application(APP_IDS.sales, "sales"),
          application(APP_IDS.marketing, "marketing"),
        ],
        workbooksApplicationPresent: false,
        workbooksRoleDefined: false,
        workbooksLocalOidcClientPresent: false,
        workbooksLocalRedirectUriPresent: false,
      }),
    );
    expect(plan.ensurePendingCount).toBe(4);
    expect(plan.workbooksOidcClientSecretRequired).toBe(true);
    expect(plan.grants.map((grant) => [grant.applicationKey, grant.roleKey, grant.status])).toEqual([
      ["codecamp", "ADMIN", "TO_GRANT"],
      ["marketing", "ADMIN", "TO_GRANT"],
      ["sales", "SALES_ADMIN", "TO_GRANT"],
      ["workbooks", "WORKBOOK_ADMIN", "TO_GRANT"],
    ]);
    expect(plan.workbooksApplicationId).toBe(deriveDevLocalWorkbooksApplicationId());
    expect(plan.workbooksApplicationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("refuses apply without the client secret only when the client must be created", () => {
    const createRequired = errorOf(() =>
      planDevLocalProductAccess(
        planInput({
          mode: "apply",
          workbooksLocalOidcClientPresent: false,
          workbooksLocalRedirectUriPresent: false,
        }),
      ),
    );
    expect(createRequired.code).toBe("OIDC_CLIENT_SECRET_REQUIRED");
    expect(createRequired.message).toContain(DEV_LOCAL_WORKBOOKS_SECRET_ENV);

    const shortSecret = errorOf(() =>
      planDevLocalProductAccess(
        planInput({
          mode: "apply",
          workbooksLocalOidcClientPresent: false,
          workbooksLocalRedirectUriPresent: false,
          workbooksLocalOidcClientSecret: "too-short",
        }),
      ),
    );
    expect(shortSecret.code).toBe("OIDC_CLIENT_SECRET_REQUIRED");

    expect(() =>
      planDevLocalProductAccess(
        planInput({
          mode: "apply",
          workbooksLocalOidcClientPresent: false,
          workbooksLocalRedirectUriPresent: false,
          workbooksLocalOidcClientSecret: "a".repeat(32),
        }),
      ),
    ).not.toThrow();

    expect(() =>
      planDevLocalProductAccess(
        planInput({ mode: "apply", workbooksLocalOidcClientPresent: true }),
      ),
    ).not.toThrow();

    expect(() =>
      planDevLocalProductAccess(
        planInput({ workbooksLocalOidcClientPresent: false }),
      ),
    ).not.toThrow();
  });

  it("warns on dry-run without the secret and never leaks it", () => {
    const secret = "correct-horse-battery-staple-42";
    const plan = planDevLocalProductAccess(
      planInput({
        workbooksLocalOidcClientPresent: false,
        workbooksLocalRedirectUriPresent: false,
        workbooksLocalOidcClientSecret: secret,
      }),
    );
    const summary = summarizeDevLocalProductAccessPlan({ mode: "dry-run", plan });
    const rendered = JSON.stringify(summary);
    expect(rendered).not.toContain(secret);
    expect(summary.ensurePendingCount).toBe(2);

    const secretMissingPlan = planDevLocalProductAccess(
      planInput({
        workbooksLocalOidcClientPresent: false,
        workbooksLocalRedirectUriPresent: false,
      }),
    );
    const warned = summarizeDevLocalProductAccessPlan({
      mode: "dry-run",
      plan: secretMissingPlan,
    });
    expect(warned.warnings).toContainEqual(
      expect.stringContaining(DEV_LOCAL_WORKBOOKS_SECRET_ENV),
    );
  });
});
