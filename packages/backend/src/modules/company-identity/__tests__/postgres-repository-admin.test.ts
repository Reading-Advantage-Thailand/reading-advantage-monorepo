import { describe, expect, it } from "vitest";

import { routedSql, type SqlRoute } from "../../../__tests__/support/scripted-sql.js";
import { CompanyIdentityError } from "../errors.js";
import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";

const ORG = "10000000-0000-4000-8000-000000000001";
const ACTOR = "10000000-0000-4000-8000-000000000002";
const TARGET = "10000000-0000-4000-8000-000000000003";
const MEMBERSHIP = "10000000-0000-4000-8000-000000000004";
const APP = "10000000-0000-4000-8000-000000000005";
const CREATED = new Date("2026-01-01T00:00:00.000Z");

const ADMIN_CHECK = "select organization.id as organization_id";
const AUDIT_INSERT = "insert into company_identity_audit_events";
const ACCOUNT_SELECT = "select account.id, account.username, account.display_name";
const COMPANY_ROLES = "select role_key from company_role_assignments";
const APP_ROLES = "select application.stable_key as application_key, assignment.role_key";
const IDEMPOTENCY_INSERT = "insert into company_identity_idempotency_records";
const IDEMPOTENCY_SELECT = "select request_hash, state, owner_token_hash";
const ADMIN_COUNT = "select count(*)::int as active_admins";

interface WorldOptions {
  /** Organization returned by the admin check, or null to deny. */
  readonly adminOrg?: string | null;
  /** Organization returned by the admin check inside the transaction. */
  readonly transactionAdminOrg?: string | null;
  /** Account status of the loaded employee, or null for no employee. */
  readonly employeeStatus?: "ACTIVE" | "SUSPENDED" | null;
  /** Company roles of the loaded employee. */
  readonly companyRoles?: readonly string[];
  /** Number of active company admins in the organization. */
  readonly activeAdmins?: number;
  /** Idempotency record override; default is a fresh owned record. */
  readonly idempotency?: (insert: readonly unknown[]) => Record<string, unknown>;
  /** Routes checked before the defaults. */
  readonly extra?: readonly SqlRoute[];
}

/**
 * Builds a routed database for the admin operations of the repository.
 * @param options World state.
 * @returns The routed SQL double.
 */
function world(options: WorldOptions = {}) {
  let idempotencyInsert: readonly unknown[] = [];
  const adminOrg = options.adminOrg === undefined ? ORG : options.adminOrg;
  const transactionAdminOrg = options.transactionAdminOrg === undefined ? adminOrg : options.transactionAdminOrg;
  const status = options.employeeStatus === undefined ? "ACTIVE" : options.employeeStatus;
  return routedSql([
    ...(options.extra ?? []),
    { match: ADMIN_CHECK, rows: (_values, call) => {
      const org = call === 0 ? adminOrg : transactionAdminOrg;
      return org === null ? [] : [{ organization_id: org }];
    } },
    { match: ACCOUNT_SELECT, rows: (values) => status === null ? [] : [{
      id: values[0], username: "Target", display_name: "Target User", status, created_at: CREATED, membership_id: MEMBERSHIP,
    }] },
    { match: COMPANY_ROLES, rows: (options.companyRoles ?? ["EMPLOYEE"]).map((role_key) => ({ role_key })) },
    { match: APP_ROLES, rows: [{ application_key: "workbooks", role_key: "EDITOR" }, { application_key: "workbooks", role_key: "VIEWER" }] },
    { match: IDEMPOTENCY_INSERT, rows: (values) => { idempotencyInsert = values; return []; } },
    { match: IDEMPOTENCY_SELECT, rows: () => [options.idempotency?.(idempotencyInsert) ?? {
      request_hash: idempotencyInsert[3], state: "IN_PROGRESS", owner_token_hash: idempotencyInsert[4], safe_result: null, safe_error_code: null,
    }] },
    { match: ADMIN_COUNT, rows: [{ active_admins: options.activeAdmins ?? 2 }] },
    { match: "insert into company_accounts", rows: [{ id: "new" }] },
    { match: "insert into company_organization_memberships", rows: [{ id: MEMBERSHIP }] },
    { match: "select id from company_applications where stable_key", rows: [{ id: APP }] },
    { match: "update company_password_credentials", rows: [{ account_id: TARGET }] },
    { match: "update company_sso_sessions session", rows: [{ id: "sso-1" }, { id: "sso-2" }] },
  ]);
}

/**
 * Finds the bound values of the audit inserts.
 * @param db Routed SQL double.
 * @returns Values of each audit insert.
 */
function audits(db: ReturnType<typeof world>): (readonly unknown[])[] {
  return db.statements.flatMap((text, index) => text.includes(AUDIT_INSERT) ? [db.bindings[index]!] : []);
}

/**
 * Counts statements that contain a fragment.
 * @param db Routed SQL double.
 * @param fragment Statement fragment.
 * @returns Number of matching statements.
 */
function count(db: ReturnType<typeof world>, fragment: string): number {
  return db.statements.filter((text) => text.includes(fragment)).length;
}

/**
 * Captures the identity error code of a rejected promise.
 * @param promise Operation expected to reject.
 * @returns The error code.
 */
async function errorCode(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(CompanyIdentityError);
  return (error as CompanyIdentityError).code;
}

const base = { actorAccountId: ACTOR, targetAccountId: TARGET, idempotencyKey: "key-1", correlationId: "corr-1" };

describe("PostgreSQL company identity repository admin checks", () => {
  it("denies a non-admin, writes a denied audit event, and runs no list query", async () => {
    const db = world({ adminOrg: null });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.listEmployees(ACTOR))).toBe("FORBIDDEN");
    const [audit] = audits(db);
    expect(audit?.slice(1, 3)).toEqual(["ACCOUNT", ACTOR]);
    expect(audit?.slice(6, 10)).toEqual(["identity:admin-denied", "DENIED", "COMPANY_ADMIN_REQUIRED", { reasonCategory: "authorization" }]);
    expect(count(db, ACCOUNT_SELECT)).toBe(0);
  });

  it("binds the target account so the admin check covers the target organization", async () => {
    const db = world({ adminOrg: null });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setEmployeeStatus({ ...base, status: "SUSPENDED" }))).toBe("FORBIDDEN");
    expect(db.bindings[0]).toEqual([ACTOR, false, TARGET]);
    expect(count(db, IDEMPOTENCY_INSERT)).toBe(0);
  });

  it("lists organization employees with roles grouped by application", async () => {
    const db = world({ extra: [{ match: "order by account.display_name", rows: [{ id: TARGET }, { id: ACTOR }] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    const employees = await repository.listEmployees(ACTOR);
    expect(employees).toHaveLength(2);
    expect(employees[0]).toEqual({
      id: TARGET, username: "Target", displayName: "Target User", status: "ACTIVE",
      companyRoles: ["EMPLOYEE"], appRoles: { workbooks: ["EDITOR", "VIEWER"] }, createdAt: CREATED.toISOString(),
    });
    expect(db.bindings[db.statements.findIndex((text) => text.includes("order by account.display_name"))]).toEqual([ORG]);
  });

  it("returns null from getEmployee when no account exists", async () => {
    const db = world({ employeeStatus: null });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.getEmployee(TARGET)).resolves.toBeNull();
    expect(count(db, COMPANY_ROLES)).toBe(0);
  });
});

describe("PostgreSQL company identity repository employee creation", () => {
  const create = {
    actorAccountId: ACTOR, username: " NewUser ", displayName: "New User", passwordHash: "argon-hash",
    credentialFingerprint: "fp", companyRoles: ["EMPLOYEE", "EMPLOYEE", "COMPANY_ADMIN"] as ("EMPLOYEE" | "COMPANY_ADMIN")[],
    appRoles: { workbooks: ["EDITOR", "EDITOR"] }, idempotencyKey: "key-1", correlationId: "corr-1",
  };

  it("creates the account, credential, membership and deduplicated roles in one transaction", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    const employee = await repository.createEmployee(create);
    expect(employee.username).toBe("Target");
    expect(db.transactions()).toBe(1);
    const account = db.bindings[db.statements.findIndex((text) => text.includes("insert into company_accounts"))]!;
    expect(account.slice(1, 4)).toEqual(["NewUser", "newuser", "New User"]);
    expect(count(db, "insert into company_password_credentials")).toBe(1);
    expect(count(db, "insert into company_role_assignments")).toBe(2);
    expect(count(db, "insert into company_application_role_assignments")).toBe(1);
    const [audit] = audits(db);
    expect(audit?.slice(6, 8)).toEqual(["identity:employee-create", "SUCCEEDED"]);
    expect(audit?.[3]).toBe(ORG);
    expect(count(db, "set state = 'SUCCEEDED'")).toBe(1);
  });

  it("rejects an invalid username inside the transaction", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.createEmployee({ ...create, username: "bad name!" }))).toBe("AUTHENTICATION_FAILED");
    expect(count(db, "insert into company_accounts")).toBe(0);
  });

  it("rejects the create when the admin organization changes inside the transaction", async () => {
    const db = world({ transactionAdminOrg: "10000000-0000-4000-8000-0000000000ff" });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.createEmployee(create))).toBe("FORBIDDEN");
    expect(count(db, "insert into company_accounts")).toBe(0);
  });

  it("maps a unique violation to USERNAME_CONFLICT", async () => {
    const db = world({ extra: [{ match: "insert into company_accounts", rows: () => { throw Object.assign(new Error("dup"), { code: "23505" }); } }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.createEmployee(create))).toBe("USERNAME_CONFLICT");
  });

  it("rethrows other account insert errors", async () => {
    const db = world({ extra: [{ match: "insert into company_accounts", rows: () => { throw new Error("disk full"); } }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.createEmployee(create)).rejects.toThrow("disk full");
  });

  it("fails when the account insert returns no row", async () => {
    const db = world({ extra: [{ match: "insert into company_accounts", rows: [] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.createEmployee(create)).rejects.toThrow("IDENTITY_ACCOUNT_CREATE_FAILED");
  });

  it("fails when the membership insert returns no row", async () => {
    const db = world({ extra: [{ match: "insert into company_organization_memberships", rows: [] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.createEmployee(create)).rejects.toThrow("IDENTITY_MEMBERSHIP_CREATE_FAILED");
  });

  it("rejects an unknown or inactive application role scope", async () => {
    const db = world({ extra: [{ match: "select id from company_applications where stable_key", rows: [] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.createEmployee(create))).toBe("CLIENT_INVALID");
    expect(count(db, "insert into company_application_role_assignments")).toBe(0);
  });

  it("fails when the created employee cannot be loaded", async () => {
    const db = world({ employeeStatus: null });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.createEmployee(create)).rejects.toThrow("IDENTITY_EMPLOYEE_PROJECTION_FAILED");
  });
});

describe("PostgreSQL company identity repository idempotency", () => {
  const create = {
    actorAccountId: ACTOR, username: "newuser", displayName: "New User", passwordHash: "h", credentialFingerprint: "fp",
    companyRoles: ["EMPLOYEE"] as ("EMPLOYEE" | "COMPANY_ADMIN")[], appRoles: {}, idempotencyKey: "key-1", correlationId: "corr-1",
  };

  it("replays a succeeded result without running the work", async () => {
    const stored = { id: TARGET, username: "stored" };
    const db = world({ idempotency: (insert) => ({ request_hash: insert[3], state: "SUCCEEDED", owner_token_hash: null, safe_result: stored }) });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.createEmployee(create)).resolves.toEqual(stored);
    expect(count(db, "insert into company_accounts")).toBe(0);
  });

  it("hashes the key and the request instead of storing them", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.createEmployee(create);
    const insert = db.bindings[db.statements.findIndex((text) => text.includes(IDEMPOTENCY_INSERT))]!;
    expect(insert.slice(0, 2)).toEqual(["identity:employee-create", `account:${ACTOR}`]);
    expect(insert[2]).toMatch(/^[0-9a-f]{64}$/);
    expect(insert[3]).toMatch(/^[0-9a-f]{64}$/);
    expect(insert).not.toContain("key-1");
  });

  it("rejects a reused key with a different request", async () => {
    const db = world({ idempotency: (insert) => ({ request_hash: "other", state: "IN_PROGRESS", owner_token_hash: insert[4] }) });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.createEmployee(create))).toBe("USERNAME_CONFLICT");
  });

  it("rejects a key whose earlier operation failed", async () => {
    const db = world({ idempotency: (insert) => ({ request_hash: insert[3], state: "FAILED", owner_token_hash: null }) });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.createEmployee(create))).toBe("FORBIDDEN");
  });

  it("rejects a key that another request owns", async () => {
    const db = world({ idempotency: (insert) => ({ request_hash: insert[3], state: "IN_PROGRESS", owner_token_hash: "someone-else" }) });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.createEmployee(create))).toBe("USERNAME_CONFLICT");
    expect(count(db, "insert into company_accounts")).toBe(0);
  });
});

describe("PostgreSQL company identity repository status changes", () => {
  it("suspends an employee, bumps the auth version, and revokes all sessions", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    const result = await repository.setEmployeeStatus({ ...base, status: "SUSPENDED" });
    expect(result.sessionsRevoked).toBe(2);
    expect(count(db, "auth_version = auth_version + 1")).toBe(1);
    const childRevoke = db.statements.findIndex((text) => text.includes("update company_application_sessions"));
    expect(db.bindings[childRevoke]?.slice(1)).toEqual(["ACCOUNT_SUSPENDED", { helper: ["sso-1", "sso-2"] }]);
    const [audit] = audits(db);
    expect(audit?.[9]).toEqual({ previousStatus: "ACTIVE", newStatus: "SUSPENDED", sessionCount: 2 });
  });

  it("activates an employee without revoking sessions", async () => {
    const db = world({ employeeStatus: "SUSPENDED" });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    const result = await repository.setEmployeeStatus({ ...base, status: "ACTIVE" });
    expect(result.sessionsRevoked).toBe(0);
    expect(count(db, "update company_sso_sessions")).toBe(0);
  });

  it("skips the child revoke when the account has no open sessions", async () => {
    const db = world({ extra: [{ match: "update company_sso_sessions session", rows: [] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    const result = await repository.setEmployeeStatus({ ...base, status: "SUSPENDED" });
    expect(result.sessionsRevoked).toBe(0);
    expect(count(db, "update company_application_sessions")).toBe(0);
  });

  it("blocks suspending the last active company admin", async () => {
    const db = world({ companyRoles: ["COMPANY_ADMIN"], activeAdmins: 1 });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setEmployeeStatus({ ...base, status: "SUSPENDED" }))).toBe("LAST_COMPANY_ADMIN_REQUIRED");
    expect(count(db, "for update of account")).toBe(1);
    expect(count(db, "update company_accounts set status")).toBe(0);
  });

  it("treats a missing admin count as zero admins", async () => {
    const db = world({ companyRoles: ["COMPANY_ADMIN"], extra: [{ match: ADMIN_COUNT, rows: [] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setEmployeeStatus({ ...base, status: "SUSPENDED" }))).toBe("LAST_COMPANY_ADMIN_REQUIRED");
  });

  it("allows suspending an admin when another active admin remains", async () => {
    const db = world({ companyRoles: ["COMPANY_ADMIN"], activeAdmins: 2 });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.setEmployeeStatus({ ...base, status: "SUSPENDED" })).resolves.toMatchObject({ sessionsRevoked: 2 });
  });

  it("reports a missing target employee", async () => {
    const db = world({ employeeStatus: null });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setEmployeeStatus({ ...base, status: "SUSPENDED" }))).toBe("EMPLOYEE_NOT_FOUND");
  });
});

describe("PostgreSQL company identity repository role changes", () => {
  it("replaces application roles with a deduplicated set", async () => {
    const db = world({ extra: [{ match: "cross join company_applications", rows: [{ application_id: APP, organization_id: ORG, membership_id: MEMBERSHIP }] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.setApplicationRoles({ ...base, applicationKey: "workbooks", roleKeys: ["EDITOR", "EDITOR", "VIEWER"] });
    expect(count(db, "delete from company_application_role_assignments")).toBe(1);
    expect(count(db, "insert into company_application_role_assignments")).toBe(2);
    expect(audits(db)[0]?.[9]).toEqual({ source: "accounts-ui", roleKey: "EDITOR" });
  });

  it("records NONE when all application roles are removed", async () => {
    const db = world({ extra: [{ match: "cross join company_applications", rows: [{ application_id: APP, organization_id: ORG, membership_id: MEMBERSHIP }] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.setApplicationRoles({ ...base, applicationKey: "workbooks", roleKeys: [] });
    expect(count(db, "insert into company_application_role_assignments")).toBe(0);
    expect(audits(db)[0]?.[9]).toEqual({ source: "accounts-ui", roleKey: "NONE" });
  });

  it("reports a missing employee or application scope", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setApplicationRoles({ ...base, applicationKey: "missing", roleKeys: ["EDITOR"] }))).toBe("EMPLOYEE_NOT_FOUND");
    expect(count(db, "delete from company_application_role_assignments")).toBe(0);
  });

  it("replaces company roles for an active membership", async () => {
    const db = world({ extra: [{ match: "select id, organization_id from company_organization_memberships", rows: [{ id: MEMBERSHIP, organization_id: ORG }] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.setCompanyRoles({ ...base, roleKeys: ["COMPANY_ADMIN", "COMPANY_ADMIN", "EMPLOYEE"] });
    expect(count(db, "delete from company_role_assignments")).toBe(1);
    expect(count(db, "insert into company_role_assignments")).toBe(2);
    expect(count(db, ADMIN_COUNT)).toBe(0);
  });

  it("blocks removing the admin role from the last active admin", async () => {
    const db = world({ companyRoles: ["COMPANY_ADMIN"], activeAdmins: 1 });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setCompanyRoles({ ...base, roleKeys: ["EMPLOYEE"] }))).toBe("LAST_COMPANY_ADMIN_REQUIRED");
    expect(count(db, "delete from company_role_assignments")).toBe(0);
  });

  // Defect: the last-admin guard counts only ACTIVE admins but fires for a SUSPENDED
  // target too, so removing the admin role from a suspended admin is blocked while
  // another active admin remains (postgres-repository.ts:1200-1228).
  it.fails("allows removing the admin role from a suspended admin while one active admin remains", async () => {
    const db = world({
      employeeStatus: "SUSPENDED",
      companyRoles: ["COMPANY_ADMIN"],
      activeAdmins: 1,
      extra: [{ match: "select id, organization_id from company_organization_memberships", rows: [{ id: MEMBERSHIP, organization_id: ORG }] }],
    });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.setCompanyRoles({ ...base, roleKeys: ["EMPLOYEE"] })).resolves.toMatchObject({ id: TARGET });
  });

  it("reports an employee with no active membership", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setCompanyRoles({ ...base, roleKeys: ["EMPLOYEE"] }))).toBe("EMPLOYEE_NOT_FOUND");
  });

  it("reports a missing employee before the role change", async () => {
    const db = world({ employeeStatus: null });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.setCompanyRoles({ ...base, roleKeys: ["EMPLOYEE"] }))).toBe("EMPLOYEE_NOT_FOUND");
  });
});

describe("PostgreSQL company identity repository credentials and sessions", () => {
  it("resets the credential, bumps the auth version, and revokes sessions", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    const result = await repository.resetCredential({ ...base, passwordHash: "new-hash", credentialFingerprint: "fp" });
    expect(result.sessionsRevoked).toBe(2);
    const update = db.bindings[db.statements.findIndex((text) => text.includes("update company_password_credentials"))];
    expect(update).toEqual(["new-hash", TARGET]);
    expect(count(db, "update company_accounts set auth_version = auth_version + 1")).toBe(1);
    expect(audits(db)[0]?.[9]).toEqual({ credentialAlgorithm: "ARGON2ID", sessionCount: 2 });
  });

  it("reports a target with no credential", async () => {
    const db = world({ extra: [{ match: "update company_password_credentials", rows: [] }] });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.resetCredential({ ...base, passwordHash: "h", credentialFingerprint: "fp" }))).toBe("EMPLOYEE_NOT_FOUND");
    expect(count(db, "auth_version = auth_version + 1")).toBe(0);
  });

  it("revokes all sessions of an employee", async () => {
    const db = world();
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.revokeEmployeeSessions(base)).resolves.toMatchObject({ sessionsRevoked: 2 });
    const revoke = db.bindings[db.statements.findIndex((text) => text.includes("update company_sso_sessions session"))];
    expect(revoke).toEqual([expect.any(Date), "ADMIN_REVOKE", TARGET]);
  });

  it("reports a missing employee before revoking sessions", async () => {
    const db = world({ employeeStatus: null });
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    expect(await errorCode(repository.revokeEmployeeSessions(base))).toBe("EMPLOYEE_NOT_FOUND");
    expect(count(db, "update company_sso_sessions")).toBe(0);
  });
});
