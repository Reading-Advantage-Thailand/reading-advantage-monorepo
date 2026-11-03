import postgres from "postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routedSql, type ScriptedSql, type SqlRoute } from "../../../__tests__/support/scripted-sql.js";
import { DevLocalProductAccessError } from "../dev-local-product-access.js";
import {
  runPostgresDevLocalProductAccess,
  validateDevLocalProductAccessInput,
} from "../postgres-dev-local-product-access.js";

vi.mock("postgres", () => ({ default: vi.fn() }));
vi.mock("@reading-advantage/auth/company-identity", () => ({
  hashPassword: vi.fn(async (secret: string) => `hashed:${secret.length}`),
}));

const ACCOUNT = "40000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "40000000-0000-4000-8000-000000000002";
const ORG = "40000000-0000-4000-8000-000000000003";
const CODECAMP = "40000000-0000-4000-8000-0000000000c1";
const WORKBOOKS = "40000000-0000-4000-8000-0000000000c4";
const URL_LOCAL = "postgres://dev:dev@localhost:5432/company_identity";
const SECRET = "s".repeat(32);
const TABLES = [
  "company_accounts", "company_organizations", "company_organization_memberships", "company_applications",
  "company_application_role_definitions", "company_application_role_assignments", "company_identity_audit_events",
  "company_oidc_clients", "company_oidc_redirect_uris",
];

const candidate = { accountId: ACCOUNT, username: "alice", normalizedUsername: "alice", membershipId: MEMBERSHIP, organizationId: ORG };

interface WorldOptions {
  readonly database?: string;
  readonly tables?: readonly string[];
  readonly candidates?: readonly Record<string, unknown>[];
  readonly workbooksPresent?: boolean;
  readonly roleDefined?: boolean;
  readonly clientPresent?: boolean;
  readonly redirectPresent?: boolean;
  readonly heldAssignments?: readonly Record<string, unknown>[];
  readonly existingGrant?: readonly Record<string, unknown>[];
  readonly extra?: readonly SqlRoute[];
}

let end: ReturnType<typeof vi.fn>;

/**
 * Installs a routed database behind the mocked postgres factory.
 * @param options World state.
 * @returns The routed SQL double.
 */
function world(options: WorldOptions = {}): ScriptedSql {
  const workbooksPresent = options.workbooksPresent ?? true;
  const db = routedSql([
    ...(options.extra ?? []),
    { match: "current_database()", rows: [{ name: options.database ?? "company_identity" }] },
    { match: "information_schema.tables", rows: (options.tables ?? TABLES).map((name) => ({ name })) },
    { match: /from company_accounts account|stable_key = 'codecamp'/, rows: options.candidates ?? [candidate] },
    { match: "from company_applications order by stable_key", rows: [{ id: CODECAMP, stableKey: "codecamp" }, ...(workbooksPresent ? [{ id: WORKBOOKS, stableKey: "workbooks" }] : [])] },
    { match: "where status = 'ACTIVE'\n     order by application_id", rows: [{ applicationId: CODECAMP, roleKey: "ADMIN" }, ...(options.roleDefined ?? true ? [{ applicationId: WORKBOOKS, roleKey: "WORKBOOK_ADMIN" }] : [])] },
    { match: "and (expires_at is null or expires_at > now())", rows: options.heldAssignments ?? [] },
    { match: "select id::text as id from company_applications", rows: workbooksPresent ? [{ id: WORKBOOKS }] : [] },
    { match: /from company_application_role_definitions\s+where application_id/, rows: [{ present: options.roleDefined ?? true }] },
    { match: "select id::text as id from company_oidc_clients", rows: options.clientPresent ?? true ? [{ id: "client-1" }] : [] },
    { match: "from company_oidc_redirect_uris", rows: [{ present: options.redirectPresent ?? true }] },
    { match: "insert into company_oidc_clients", rows: [{ id: "client-new" }] },
    { match: "for update", rows: options.existingGrant ?? [] },
  ]);
  end = vi.fn(async () => undefined);
  Object.assign(db.sql, { end });
  vi.mocked(postgres).mockReturnValue(db.sql as never);
  return db;
}

/**
 * Lists the audit operations written by a run.
 * @param db Routed SQL double.
 * @returns Operation names in order.
 */
function auditOperations(db: ScriptedSql): unknown[] {
  return db.statements.flatMap((text, index) => text.includes("insert into company_identity_audit_events") ? [db.bindings[index]?.[3]] : []);
}

/**
 * Captures the dev-local error code of a rejected promise.
 * @param promise Run expected to reject.
 * @returns The error code.
 */
async function codeOf(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(DevLocalProductAccessError);
  return (error as DevLocalProductAccessError).code;
}

const apply = { targetDatabaseUrl: URL_LOCAL, mode: "apply" as const, confirmation: "LOCAL-TESTING-ONLY" };

beforeEach(() => {
  vi.mocked(postgres).mockReset();
});

describe("dev-local product access input validation", () => {
  it("accepts a dry run with no confirmation", () => {
    expect(() => validateDevLocalProductAccessInput({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run" })).not.toThrow();
  });

  it("rejects a dry run that carries a confirmation", () => {
    expect(() => validateDevLocalProductAccessInput({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run", confirmation: "LOCAL-TESTING-ONLY" })).toThrow("Dry run does not accept apply authorization values.");
  });

  it.each([undefined, "local-testing-only", "YES"])("rejects an apply with the confirmation %j", (confirmation) => {
    expect(() => validateDevLocalProductAccessInput({ targetDatabaseUrl: URL_LOCAL, mode: "apply", confirmation })).toThrow("Apply requires the exact local testing confirmation phrase.");
  });
});

describe("dev-local product access run gates", () => {
  it("refuses a remote database before connecting", async () => {
    expect(await codeOf(runPostgresDevLocalProductAccess({ ...apply, targetDatabaseUrl: "postgres://db.example.com/company_identity" }))).toBe("NON_LOCAL_DATABASE_REFUSED");
    expect(postgres).not.toHaveBeenCalled();
  });

  it("refuses an apply without confirmation before connecting", async () => {
    expect(await codeOf(runPostgresDevLocalProductAccess({ ...apply, confirmation: undefined }))).toBe("APPLY_CONFIRMATION_REQUIRED");
    expect(postgres).not.toHaveBeenCalled();
  });

  it("refuses the wrong database and closes the connection", async () => {
    const db = world({ database: "reading_advantage" });

    expect(await codeOf(runPostgresDevLocalProductAccess({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run" }))).toBe("DATABASE_INVALID");
    expect(postgres).toHaveBeenCalledWith(URL_LOCAL, { max: 1, prepare: false });
    expect(end).toHaveBeenCalledWith({ timeout: 5 });
    expect(db.statements).toHaveLength(1);
  });

  it("refuses a schema with a missing table", async () => {
    world({ tables: TABLES.slice(1) });

    expect(await codeOf(runPostgresDevLocalProductAccess({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run" }))).toBe("SCHEMA_NOT_READY");
  });

  it("hides a raw database error behind SEED_DATABASE_ERROR", async () => {
    world({ extra: [{ match: "current_database()", rows: () => { throw new Error("password authentication failed for user dev"); } }] });

    const error = await runPostgresDevLocalProductAccess({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run" }).catch((caught: unknown) => caught);
    expect((error as DevLocalProductAccessError).code).toBe("SEED_DATABASE_ERROR");
    expect((error as Error).message).not.toContain("password");
    expect(end).toHaveBeenCalled();
  });

  it("reports no discovered codecamp admin", async () => {
    world({ candidates: [] });

    expect(await codeOf(runPostgresDevLocalProductAccess({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run" }))).toBe("ADMIN_CANDIDATE_NOT_FOUND");
  });
});

describe("dev-local product access dry run", () => {
  it("plans without writing anything", async () => {
    const db = world({ heldAssignments: [{ applicationId: CODECAMP, roleKey: "ADMIN" }] });

    const summary = await runPostgresDevLocalProductAccess({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run" });
    expect(summary.grants.map((grant) => [grant.applicationKey, grant.status])).toEqual([["codecamp", "ALREADY_HELD"], ["workbooks", "TO_GRANT"]]);
    expect(db.transactions()).toBe(0);
    expect(db.statements.some((text) => /\b(insert|update|delete)\b/i.test(text))).toBe(false);
  });

  it("looks up an explicit username by its normalized form", async () => {
    const db = world();

    await runPostgresDevLocalProductAccess({ targetDatabaseUrl: URL_LOCAL, mode: "dry-run", username: " ALICE " });
    const lookup = db.statements.findIndex((text) => text.includes("account.normalized_username = "));
    expect(db.bindings[lookup]).toEqual(["alice"]);
    const held = db.statements.findIndex((text) => text.includes("where membership_id = "));
    expect(db.bindings[held]).toEqual([MEMBERSHIP]);
  });
});

describe("dev-local product access apply", () => {
  it("creates the missing workbooks setup and grants under an advisory lock", async () => {
    const db = world({ workbooksPresent: false, roleDefined: false, clientPresent: false, redirectPresent: false });

    const summary = await runPostgresDevLocalProductAccess({ ...apply, workbooksLocalOidcClientSecret: SECRET });
    expect(db.transactions()).toBe(1);
    expect(db.statements.some((text) => text.includes("pg_advisory_xact_lock"))).toBe(true);
    expect(auditOperations(db)).toEqual([
      "DEV_LOCAL_APPLICATION_ENSURE", "DEV_LOCAL_ROLE_DEFINITION_ENSURE", "DEV_LOCAL_OIDC_CLIENT_ENSURE",
      "DEV_LOCAL_OIDC_REDIRECT_URI_ENSURE", "DEV_LOCAL_ROLE_GRANT", "DEV_LOCAL_ROLE_GRANT",
    ]);
    expect(summary).toMatchObject({ mode: "apply", appliedGrantCount: 2, auditEventCount: 6 });
    const client = db.statements.findIndex((text) => text.includes("insert into company_oidc_clients"));
    expect(db.bindings[client]).toEqual([expect.any(String), "workbooks-web-local", "hashed:32"]);
    expect(db.bindings[client]).not.toContain(SECRET);
    const redirect = db.statements.findIndex((text) => text.includes("insert into company_oidc_redirect_uris"));
    expect(db.bindings[redirect]).toEqual(["client-new", "http://localhost:3011/api/auth/callback"]);
  });

  it("uses the existing OIDC client when only the redirect is missing", async () => {
    const db = world({ redirectPresent: false, heldAssignments: [{ applicationId: CODECAMP, roleKey: "ADMIN" }, { applicationId: WORKBOOKS, roleKey: "WORKBOOK_ADMIN" }] });

    const summary = await runPostgresDevLocalProductAccess(apply);
    expect(auditOperations(db)).toEqual(["DEV_LOCAL_OIDC_REDIRECT_URI_ENSURE"]);
    expect(summary).toMatchObject({ appliedGrantCount: 0, auditEventCount: 1 });
    const redirect = db.statements.findIndex((text) => text.includes("insert into company_oidc_redirect_uris"));
    expect(db.bindings[redirect]?.[0]).toBe("client-1");
  });

  it("reactivates an expired assignment instead of inserting a new one", async () => {
    const db = world({ heldAssignments: [{ applicationId: CODECAMP, roleKey: "ADMIN" }], existingGrant: [{ id: "assignment-1", expiresAt: new Date("2020-01-01") }] });

    const summary = await runPostgresDevLocalProductAccess(apply);
    expect(summary.appliedGrantCount).toBe(1);
    expect(db.statements.some((text) => text.includes("set expires_at = null"))).toBe(true);
    expect(db.statements.some((text) => text.includes("insert into company_application_role_assignments"))).toBe(false);
  });

  it("skips a grant that became permanent after planning", async () => {
    const db = world({ heldAssignments: [{ applicationId: CODECAMP, roleKey: "ADMIN" }], existingGrant: [{ id: "assignment-1", expiresAt: null }] });

    const summary = await runPostgresDevLocalProductAccess(apply);
    expect(summary).toMatchObject({ appliedGrantCount: 0, auditEventCount: 0 });
    expect(auditOperations(db)).toEqual([]);
  });

  it("inserts a new assignment with the target organization and membership", async () => {
    const db = world({ heldAssignments: [{ applicationId: CODECAMP, roleKey: "ADMIN" }] });

    await runPostgresDevLocalProductAccess(apply);
    const insert = db.statements.findIndex((text) => text.includes("insert into company_application_role_assignments"));
    expect(db.bindings[insert]).toEqual([ORG, MEMBERSHIP, WORKBOOKS, "WORKBOOK_ADMIN"]);
  });

  it("refuses an apply that needs the OIDC client without a secret", async () => {
    world({ clientPresent: false });

    expect(await codeOf(runPostgresDevLocalProductAccess(apply))).toBe("OIDC_CLIENT_SECRET_REQUIRED");
  });

  it("fails when the OIDC client insert returns no row", async () => {
    world({ clientPresent: false, extra: [{ match: "insert into company_oidc_clients", rows: [] }] });

    expect(await codeOf(runPostgresDevLocalProductAccess({ ...apply, workbooksLocalOidcClientSecret: SECRET }))).toBe("OIDC_CLIENT_CREATE_FAILED");
  });

  it("fails when the existing OIDC client disappears inside the transaction", async () => {
    world({ redirectPresent: false, extra: [{ match: "select id::text as id from company_oidc_clients", rows: (_values, call) => call < 2 ? [{ id: "client-1" }] : [] }] });

    expect(await codeOf(runPostgresDevLocalProductAccess(apply))).toBe("OIDC_CLIENT_READ_FAILED");
  });
});
