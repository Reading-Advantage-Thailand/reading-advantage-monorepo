import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ postgres: vi.fn() }));

vi.mock("postgres", () => ({ default: mocks.postgres }));

import { createAccountingRuntimeClient } from "../client.js";

const RUNTIME_URL =
  "postgresql://accounting_runtime:runtime-secret@127.0.0.1:6432/accounting";

const safeProbe = {
  bypass_rls: false,
  can_create_database: false,
  can_create_role: false,
  database_name: "accounting",
  database_owner: "accounting_migrator",
  has_memberships: false,
  inherits_privileges: false,
  replication: false,
  role_name: "accounting_runtime",
  superuser: false,
};

/** Installs a callable PostgreSQL test client that returns one connection probe. */
function installProbe(probe: typeof safeProbe): ReturnType<typeof vi.fn> & {
  end: ReturnType<typeof vi.fn>;
} {
  const sql = Object.assign(vi.fn().mockResolvedValue([probe]), {
    end: vi.fn().mockResolvedValue(undefined),
  });
  mocks.postgres.mockReturnValue(sql);
  return sql;
}

describe("accounting runtime client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses existing connection options with prepare disabled and the bounded pool", async () => {
    const sql = installProbe(safeProbe);

    await expect(
      createAccountingRuntimeClient({
        databaseUrl: RUNTIME_URL,
        poolMax: 7,
      }),
    ).resolves.toBe(sql);
    expect(mocks.postgres).toHaveBeenCalledWith(
      RUNTIME_URL,
      expect.objectContaining({ max: 7, prepare: false }),
    );
  });

  it("rejects database ownership and every reviewed cluster privilege", async () => {
    const violations: Array<Partial<typeof safeProbe>> = [
      { database_owner: "accounting_runtime" },
      { bypass_rls: true },
      { can_create_database: true },
      { can_create_role: true },
      { has_memberships: true },
      { inherits_privileges: true },
      { replication: true },
      { superuser: true },
    ];

    for (const violation of violations) {
      installProbe({ ...safeProbe, ...violation });
      await expect(
        createAccountingRuntimeClient({ databaseUrl: RUNTIME_URL }),
      ).rejects.toMatchObject({ code: "ACCOUNTING_PRIVILEGE_MISMATCH" });
    }
  });

  it("rejects a live role that differs from the reviewed URL role", async () => {
    installProbe({ ...safeProbe, role_name: "other_runtime" });

    await expect(
      createAccountingRuntimeClient({ databaseUrl: RUNTIME_URL }),
    ).rejects.toMatchObject({ code: "ACCOUNTING_ROLE_MISMATCH" });
  });

  it("rejects wrong databases and invalid pool bounds before opening a connection", async () => {
    const wrongDatabaseUrl = RUNTIME_URL.replace(
      /\/accounting$/,
      "/company_identity",
    );

    await expect(
      createAccountingRuntimeClient({ databaseUrl: wrongDatabaseUrl }),
    ).rejects.toMatchObject({ code: "ACCOUNTING_DATABASE_MISMATCH" });
    for (const poolMax of [0, 21, 1.5]) {
      await expect(
        createAccountingRuntimeClient({
          databaseUrl: RUNTIME_URL,
          poolMax,
        }),
      ).rejects.toThrow(/poolMax|1.*20/i);
    }
    expect(mocks.postgres).not.toHaveBeenCalled();
  });
});
