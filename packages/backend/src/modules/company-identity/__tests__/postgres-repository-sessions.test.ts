import { describe, expect, it, vi } from "vitest";

import { routedSql, type SqlRoute } from "../../../__tests__/support/scripted-sql.js";
import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";
import { executeCompanyIdentityAuthorizationCode } from "../repository.js";

const ACCOUNT = "20000000-0000-4000-8000-000000000001";
const MEMBERSHIP = "20000000-0000-4000-8000-000000000002";
const ORG = "20000000-0000-4000-8000-000000000003";
const APP = "20000000-0000-4000-8000-000000000004";
const NOW = new Date("2026-02-01T00:00:00.000Z");
const IDLE = new Date("2026-02-01T01:00:00.000Z");
const EXPIRES = new Date("2026-02-02T00:00:00.000Z");

const AUDIT_INSERT = "insert into company_identity_audit_events";
const CREDENTIAL_SELECT = "account.auth_version, credential.password_hash";
const ACCOUNT_SELECT = "select account.id, account.username, account.display_name";

const employeeRoutes: SqlRoute[] = [
  { match: ACCOUNT_SELECT, rows: [{ id: ACCOUNT, username: "alice", display_name: "Alice", status: "ACTIVE", created_at: NOW, membership_id: MEMBERSHIP }] },
  { match: "select role_key from company_role_assignments", rows: [{ role_key: "EMPLOYEE" }] },
];

const audit = { correlationId: "corr-1", operation: "identity:test", outcome: "SUCCEEDED" as const, metadata: { source: "test" } };

/**
 * Finds the bound values of the audit inserts.
 * @param db Routed SQL double.
 * @returns Values of each audit insert.
 */
function audits(db: ReturnType<typeof routedSql>): (readonly unknown[])[] {
  return db.statements.flatMap((text, index) => text.includes(AUDIT_INSERT) ? [db.bindings[index]!] : []);
}

const sessionRow = {
  id: "sso-1", account_id: ACCOUNT, membership_id: MEMBERSHIP, organization_id: ORG,
  organization_key: "internal-company", auth_version: "3", absolute_expires_at: EXPIRES,
};

describe("PostgreSQL company identity repository login", () => {
  it("returns null without SQL for a username that fails normalization", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findCredentialByUsername("not valid!")).resolves.toBeNull();
    await expect(repository.findCredentialByUsername("-alice")).resolves.toBeNull();
    expect(db.statements).toHaveLength(0);
  });

  it("looks up the NFKC lower-case username and returns the credential", async () => {
    const db = routedSql([
      { match: CREDENTIAL_SELECT, rows: [{ account_id: ACCOUNT, membership_id: MEMBERSHIP, organization_id: ORG, organization_key: "internal-company", auth_version: 4, password_hash: "hash", algorithm: "BCRYPT" }] },
      ...employeeRoutes,
    ]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    const found = await repository.findCredentialByUsername("  ＡＬＩＣＥ ");
    expect(db.bindings[0]).toEqual(["alice"]);
    expect(found).toMatchObject({ membershipId: MEMBERSHIP, organizationId: ORG, authVersion: 4, passwordHash: "hash", passwordAlgorithm: "BCRYPT" });
    expect(found?.employee).toMatchObject({ id: ACCOUNT, companyRoles: ["EMPLOYEE"], appRoles: {} });
  });

  it("returns null for an unknown username", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findCredentialByUsername("alice")).resolves.toBeNull();
  });

  it("returns null when the credential account has no employee projection", async () => {
    const db = routedSql([{ match: CREDENTIAL_SELECT, rows: [{ account_id: ACCOUNT, auth_version: 1 }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findCredentialByUsername("alice")).resolves.toBeNull();
  });

  it("rejects an invalid stored auth version", async () => {
    const db = routedSql([{ match: CREDENTIAL_SELECT, rows: [{ account_id: ACCOUNT, auth_version: 0 }] }, ...employeeRoutes]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findCredentialByUsername("alice")).rejects.toThrow("COMPANY_IDENTITY_AUTH_VERSION_INVALID");
  });

  it("upgrades the password hash, inserts the session and audits in one transaction", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.createSsoSessionWithAudit({
      session: { id: "sso-1", tokenHash: "th", organizationId: ORG, membershipId: MEMBERSHIP, authVersion: 3, createdAt: NOW, idleExpiresAt: IDLE, absoluteExpiresAt: EXPIRES, userAgent: "ua" },
      audit: { ...audit, actorAccountId: ACCOUNT },
      credentialUpgrade: { accountId: ACCOUNT, passwordHash: "argon" },
    });
    expect(db.transactions()).toBe(1);
    expect(db.statements[0]).toContain("algorithm = 'ARGON2ID'");
    expect(db.bindings[0]).toEqual(["argon", ACCOUNT]);
    expect(db.bindings[1]).toEqual(["sso-1", "th", ORG, MEMBERSHIP, 3, NOW, NOW, IDLE, EXPIRES, "ua"]);
    expect(audits(db)).toHaveLength(1);
  });

  it("creates a session without a credential upgrade", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.createSsoSessionWithAudit({
      session: { id: "sso-1", tokenHash: "th", organizationId: ORG, membershipId: MEMBERSHIP, authVersion: 3, createdAt: NOW, idleExpiresAt: IDLE, absoluteExpiresAt: EXPIRES, userAgent: "ua" },
      audit,
    });
    expect(db.statements.some((text) => text.includes("company_password_credentials"))).toBe(false);
    expect(audits(db)[0]?.slice(1, 3)).toEqual(["SYSTEM", null]);
  });
});

describe("PostgreSQL company identity repository audit", () => {
  it("drops unknown metadata keys and resolves the application key", async () => {
    const db = routedSql([{ match: "select id from company_applications where stable_key", rows: [{ id: APP }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.appendAudit({ ...audit, metadata: { applicationKey: "workbooks", password: "secret", sessionCount: 1 } });
    const [row] = audits(db);
    expect(row?.[4]).toBe(APP);
    expect(row?.[9]).toEqual({ applicationKey: "workbooks", sessionCount: 1 });
  });

  it("keeps a supplied application id without a lookup", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.appendAudit({ ...audit, applicationId: APP, metadata: { applicationKey: "workbooks" } });
    expect(db.statements).toHaveLength(1);
    expect(audits(db)[0]?.[4]).toBe(APP);
  });

  it("stores a null application id for an unknown application key", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.appendAudit({ ...audit, metadata: { applicationKey: "missing" } });
    expect(audits(db)[0]?.[4]).toBeNull();
  });
});

describe("PostgreSQL company identity repository SSO sessions", () => {
  it("refreshes and maps an SSO session by token hash", async () => {
    const db = routedSql([{ match: "session.token_hash = ", rows: [sessionRow] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findSsoSession("th", NOW, IDLE)).resolves.toEqual({
      id: "sso-1", accountId: ACCOUNT, membershipId: MEMBERSHIP, organizationId: ORG,
      organizationKey: "internal-company", authVersion: 3, expiresAt: EXPIRES,
    });
    expect(db.bindings[0]).toEqual([NOW, IDLE, "th", NOW, NOW]);
  });

  it("returns null for an unknown, revoked, or expired session", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findSsoSession("th", NOW, IDLE)).resolves.toBeNull();
    await expect(repository.findSsoSessionById("sso-1", NOW, IDLE)).resolves.toBeNull();
  });

  it("revokes an SSO session and its child sessions with one audit", async () => {
    const db = routedSql([
      { match: "revoke_reason = 'GLOBAL_LOGOUT'\n            from", rows: [{ id: "sso-1", membership_id: MEMBERSHIP }] },
      { match: "update company_application_sessions", rows: [{ id: "a" }, { id: "b" }] },
      { match: "select account_id from company_organization_memberships", rows: [{ account_id: ACCOUNT }] },
    ]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.revokeSsoSessionWithAudit({ tokenHash: "th", now: NOW, audit })).resolves.toBe(2);
    const [row] = audits(db);
    expect(row?.[2]).toBe(ACCOUNT);
    expect(row?.[5]).toBe(ACCOUNT);
    expect(row?.[9]).toEqual({ source: "test", sessionCount: 2 });
  });

  it("audits a global logout with no session and revokes nothing", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.revokeSsoSessionWithAudit({ tokenHash: "th", now: NOW, audit: { ...audit, actorAccountId: "fallback" } })).resolves.toBe(0);
    expect(db.statements.some((text) => text.includes("update company_application_sessions"))).toBe(false);
    expect(audits(db)[0]?.[2]).toBe("fallback");
  });
});

describe("PostgreSQL company identity repository OIDC clients and codes", () => {
  it("maps an OIDC client with its redirect URI", async () => {
    const db = routedSql([{ match: "redirect.redirect_uri = ", rows: [{ id: "c1", client_id: "cid", application_id: APP, application_key: "workbooks", client_type: "PUBLIC", client_secret_hash: null, redirect_uri_id: "r1", redirect_uri: "https://app/cb" }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findOidcClient("cid", "https://app/cb")).resolves.toEqual({
      id: "c1", clientId: "cid", applicationId: APP, applicationKey: "workbooks", clientType: "PUBLIC",
      clientSecretHash: null, redirectUriId: "r1", redirectUri: "https://app/cb",
    });
    expect(db.bindings[0]).toEqual(["cid", "https://app/cb"]);
  });

  it("returns null for an unknown client", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findOidcClient("cid", "https://app/cb")).resolves.toBeNull();
    await expect(repository.findOidcClientByClientId("cid")).resolves.toBeNull();
  });

  it("maps a client found by client id", async () => {
    const db = routedSql([{ match: "client.client_type, client.client_secret_hash", rows: [{ id: "c1", application_key: "workbooks", client_type: "CONFIDENTIAL", client_secret_hash: "sh" }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.findOidcClientByClientId("cid")).resolves.toEqual({ id: "c1", applicationKey: "workbooks", clientType: "CONFIDENTIAL", clientSecretHash: "sh" });
  });

  it("lists active application role keys", async () => {
    const db = routedSql([{ match: "definition.status = 'ACTIVE'", rows: [{ role_key: "EDITOR" }, { role_key: "VIEWER" }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.listApplicationRoles(MEMBERSHIP, APP, NOW)).resolves.toEqual(["EDITOR", "VIEWER"]);
    expect(db.bindings[0]).toEqual([MEMBERSHIP, APP, NOW]);
  });

  it("inserts an S256 authorization code and its audit in one transaction", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await repository.createAuthorizationCodeWithAudit({
      code: { id: "code-1", codeHash: "ch", clientId: "c1", redirectUriId: "r1", ssoSessionId: "sso-1", codeChallenge: "cc", nonce: "n", scope: ["openid"], issuedAt: NOW, expiresAt: EXPIRES },
      audit,
    });
    expect(db.transactions()).toBe(1);
    expect(db.statements[0]).toContain("'S256'");
    expect(db.bindings[0]).toEqual(["code-1", "ch", "c1", "r1", "sso-1", "cc", "n", ["openid"], NOW, EXPIRES]);
    expect(audits(db)).toHaveLength(1);
  });

  it("consumes a locked code, runs the handler, and marks the code consumed", async () => {
    const db = routedSql([{ match: "for update of code", rows: [{
      id: "code-1", sso_session_id: "sso-1", code_challenge: "cc", nonce: "n", expires_at: EXPIRES, oidc_client_id: "c1",
      client_id: "cid", application_id: APP, application_key: "workbooks", client_type: "PUBLIC", client_secret_hash: null,
      redirect_uri_id: "r1", redirect_uri: "https://app/cb",
    }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);
    const handler = vi.fn(async (context: Parameters<Parameters<typeof executeCompanyIdentityAuthorizationCode>[3]>[0]) => {
      await context.insertApplicationSession({ transaction: context.transaction, id: "app-1", tokenHash: "ath", ssoSessionId: "sso-1", organizationId: ORG, membershipId: MEMBERSHIP, applicationId: APP, authVersion: 3, createdAt: NOW, expiresAt: EXPIRES });
      await context.appendAudit(audit);
      return context.code.client.clientId;
    });

    await expect(executeCompanyIdentityAuthorizationCode(repository, "ch", NOW, handler)).resolves.toBe("cid");
    expect(handler.mock.calls[0]?.[0].code).toMatchObject({ id: "code-1", ssoSessionId: "sso-1", codeChallenge: "cc", nonce: "n" });
    expect(db.bindings[0]).toEqual(["ch", NOW]);
    expect(db.bindings[1]).toEqual(["app-1", "ath", "sso-1", ORG, MEMBERSHIP, APP, 3, NOW, NOW, EXPIRES]);
    expect(audits(db)).toHaveLength(1);
    expect(db.statements.at(-1)).toContain("set consumed_at");
    expect(db.bindings.at(-1)).toEqual([NOW, "code-1"]);
  });

  it("returns null and runs no handler for an unusable code", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);
    const handler = vi.fn();

    await expect(executeCompanyIdentityAuthorizationCode(repository, "ch", NOW, handler)).resolves.toBeNull();
    expect(handler).not.toHaveBeenCalled();
    expect(db.statements).toHaveLength(1);
  });

  it("leaves the code unconsumed when the handler fails", async () => {
    const db = routedSql([{ match: "for update of code", rows: [{ id: "code-1" }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(executeCompanyIdentityAuthorizationCode(repository, "ch", NOW, async () => { throw new Error("pkce"); })).rejects.toThrow("pkce");
    expect(db.statements.some((text) => text.includes("set consumed_at"))).toBe(false);
  });
});

describe("PostgreSQL company identity repository application sessions", () => {
  const appSessionRow = {
    session_id: "app-1", account_id: ACCOUNT, organization_id: ORG, organization_key: "internal-company",
    application_id: APP, application_key: "workbooks", auth_version: "5", expires_at: EXPIRES, membership_id: MEMBERSHIP,
  };

  it("introspects a live application session with roles", async () => {
    const db = routedSql([
      { match: "with refreshed_sso", rows: [appSessionRow] },
      { match: "definition.status = 'ACTIVE'", rows: [{ role_key: "EDITOR" }] },
      ...employeeRoutes,
    ]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.introspectApplicationSession("ath", NOW, IDLE)).resolves.toMatchObject({
      sessionId: "app-1", organizationId: ORG, applicationKey: "workbooks", roles: ["EDITOR"], authVersion: 5, expiresAt: EXPIRES,
      employee: { id: ACCOUNT },
    });
  });

  it("returns null for an unknown session or a missing employee", async () => {
    const empty = routedSql([]);
    await expect(createPostgresCompanyIdentityRepository(empty.sql).introspectApplicationSession("ath", NOW, IDLE)).resolves.toBeNull();

    const orphan = routedSql([{ match: "with refreshed_sso", rows: [appSessionRow] }]);
    await expect(createPostgresCompanyIdentityRepository(orphan.sql).introspectApplicationSession("ath", NOW, IDLE)).resolves.toBeNull();
  });

  it("revokes an application session and audits the owning account", async () => {
    const db = routedSql([
      { match: "revoke_reason = 'LOCAL_LOGOUT'", rows: [{ membership_id: MEMBERSHIP, application_id: APP }] },
      { match: "select account_id from company_organization_memberships", rows: [{ account_id: ACCOUNT }] },
    ]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.revokeApplicationSessionWithAudit({ tokenHash: "ath", now: NOW, audit })).resolves.toEqual({ revoked: true, accountId: ACCOUNT, applicationId: APP });
    const [row] = audits(db);
    expect(row?.slice(2, 6)).toEqual([ACCOUNT, null, APP, ACCOUNT]);
    expect(row?.[9]).toEqual({ source: "test", sessionCount: 1 });
  });

  it("audits a local logout with no session", async () => {
    const db = routedSql([]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.revokeApplicationSessionWithAudit({ tokenHash: "ath", now: NOW, audit })).resolves.toEqual({ revoked: false });
    expect(audits(db)[0]?.[9]).toEqual({ source: "test", sessionCount: 0 });
  });

  it("reports no revoke when the session membership is gone", async () => {
    const db = routedSql([{ match: "revoke_reason = 'LOCAL_LOGOUT'", rows: [{ membership_id: MEMBERSHIP, application_id: APP }] }]);
    const repository = createPostgresCompanyIdentityRepository(db.sql);

    await expect(repository.revokeApplicationSessionWithAudit({ tokenHash: "ath", now: NOW, audit })).resolves.toEqual({ revoked: false });
  });

  it("freezes the repository", () => {
    expect(Object.isFrozen(createPostgresCompanyIdentityRepository(routedSql([]).sql))).toBe(true);
  });
});
