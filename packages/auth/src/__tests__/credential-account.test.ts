import { beforeEach, describe, expect, it, vi } from "vitest";
import { accounts, auditEvents, users } from "@reading-advantage/db";
import {
  createCredentialAccount,
  CredentialUsernameConflictError,
} from "../credential-account.js";
import { hashPassword } from "../password.js";

vi.mock("../password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("$argon2id$release-test-hash"),
}));

const input = {
  username: "  New.Rep  ",
  displayUsername: "New.Rep",
  name: "New Rep",
  password: "Secret42!",
  role: "SALES_REP" as const,
  schoolId: "00000000-0000-4000-8000-000000000001",
  actorUserId: "admin-1",
  actorRole: "SALES_ADMIN" as const,
};

/** Builds the exact transaction surface used by the credential adapter. */
function createTransactionDb(failOn?: "accounts" | "audit") {
  const writes: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const tx = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        writes.push({ table, values });
        if (failOn === "accounts" && table === accounts)
          throw new Error("account insert failed");
        if (failOn === "audit" && table === auditEvents)
          throw new Error("audit insert failed");
        return table === users
          ? {
              returning: vi.fn().mockResolvedValue([
                {
                  id: "rep-1",
                  username: "new.rep",
                  displayUsername: "New.Rep",
                  name: "New Rep",
                  role: "SALES_REP",
                  schoolId: input.schoolId,
                },
              ]),
            }
          : Promise.resolve();
      }),
    })),
  };
  return {
    writes,
    transaction: vi.fn(
      (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
}

describe("credential account compatibility adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hashes then writes user, credential, and immutable audit in one transaction", async () => {
    const database = createTransactionDb();
    const result = await createCredentialAccount(database as never, input);
    expect(hashPassword).toHaveBeenCalledWith("Secret42!");
    expect(database.transaction).toHaveBeenCalledOnce();
    expect(database.writes.map((write) => write.table)).toEqual([
      users,
      accounts,
      auditEvents,
    ]);
    expect(database.writes[1]?.values.password).toBe(
      "$argon2id$release-test-hash",
    );
    expect(database.writes[2]?.values).toMatchObject({
      action: "sales:rep_account_created",
      actorUserId: "admin-1",
      targetId: expect.any(String),
    });
    expect(result).toEqual({
      id: "rep-1",
      username: "new.rep",
      displayName: "New Rep",
      role: "SALES_REP",
      schoolId: input.schoolId,
    });
    expect(result).not.toHaveProperty("password");
  });

  it("propagates a transaction failure before audit completion", async () => {
    const database = createTransactionDb("accounts");
    await expect(
      createCredentialAccount(database as never, input),
    ).rejects.toThrow("account insert failed");
    expect(database.writes.map((write) => write.table)).toEqual([
      users,
      accounts,
    ]);
  });

  it("maps only wrapped username constraints to the stable conflict", async () => {
    const database = {
      transaction: vi.fn().mockRejectedValue({
        cause: { code: "23505", constraint: "users_username_unique" },
      }),
    };
    await expect(
      createCredentialAccount(database as never, input),
    ).rejects.toBeInstanceOf(CredentialUsernameConflictError);
  });
});
