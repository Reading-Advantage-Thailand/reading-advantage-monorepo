import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCredentialAccount,
  CredentialUsernameConflictError,
} from "../credential-account.js";

vi.mock("../password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("$argon2id$test-hash"),
}));

const input = {
  username: "Rep.Two",
  displayUsername: " Rep.Two ",
  name: " Rep Two ",
  password: "Secret42!",
  role: "SALES_REP" as const,
  schoolId: "00000000-0000-4000-8000-000000000001",
  actorUserId: "admin-1",
  actorRole: "SALES_ADMIN" as const,
};

/** Builds a database whose transaction rejects with the given error. */
function rejectingDb(error: unknown) {
  return { transaction: vi.fn().mockRejectedValue(error) };
}

/** Builds a database whose users insert returns the given rows. */
function returningDb(rows: unknown[]) {
  const writes: Array<Record<string, unknown>> = [];
  const tx = {
    insert: vi.fn(() => ({
      values: vi.fn((v: Record<string, unknown>) => {
        writes.push(v);
        return Object.assign(Promise.resolve(), {
          returning: vi.fn().mockResolvedValue(rows),
        });
      }),
    })),
  };
  return {
    writes,
    transaction: vi.fn((cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("credential account unique-violation mapping", () => {
  it.each([
    ["a direct username violation", { code: "23505", constraint: "users_username_unique" }],
    ["a display username violation", { code: "23505", constraint: "users_display_username_unique" }],
    ["a constraint_name field", { code: "23505", constraint_name: "users_username_unique" }],
    ["a twice-wrapped violation", {
      cause: { cause: { code: "23505", constraint_name: "users_display_username_unique" } },
    }],
  ])("maps %s to the conflict error", async (_label, error) => {
    await expect(
      createCredentialAccount(rejectingDb(error) as never, input),
    ).rejects.toBeInstanceOf(CredentialUsernameConflictError);
  });

  it("gives the conflict a stable public code and message", async () => {
    const error = await createCredentialAccount(
      rejectingDb({ code: "23505", constraint: "users_username_unique" }) as never,
      input,
    ).catch((e: unknown) => e);

    expect(error).toMatchObject({
      code: "CREDENTIAL_USERNAME_CONFLICT",
      name: "CredentialUsernameConflictError",
      message: "Username is already registered",
    });
  });

  it.each([
    ["another unique constraint", { code: "23505", constraint: "accounts_pkey" }],
    ["another error code", { code: "23503", constraint: "users_username_unique" }],
    ["a string error", "boom"],
    ["a null error", null],
  ])("rethrows %s unchanged", async (_label, error) => {
    await expect(createCredentialAccount(rejectingDb(error) as never, input)).rejects.toBe(error);
  });

  it("stops at an error whose cause is itself", async () => {
    const error: Record<string, unknown> = { code: "XX000" };
    error.cause = error;

    await expect(createCredentialAccount(rejectingDb(error) as never, input)).rejects.toBe(error);
  });
});

describe("credential account result shape", () => {
  it("fails when the users insert returns no row", async () => {
    const db = returningDb([]);
    await expect(createCredentialAccount(db as never, input)).rejects.toThrow(
      "Credential account insert returned no user",
    );
  });

  it("falls back to the display username when name is null", async () => {
    const db = returningDb([{
      id: "rep-2",
      username: "rep.two",
      displayUsername: "Rep.Two",
      name: null,
      role: "SALES_REP",
      schoolId: input.schoolId,
    }]);

    await expect(createCredentialAccount(db as never, input)).resolves.toEqual({
      id: "rep-2",
      username: "rep.two",
      displayName: "Rep.Two",
      role: "SALES_REP",
      schoolId: input.schoolId,
    });
  });

  it("normalizes username and trims names before insert", async () => {
    const db = returningDb([{ id: "x", username: "rep.two", displayUsername: "Rep.Two", name: "Rep Two", role: "SALES_REP", schoolId: input.schoolId }]);
    await createCredentialAccount(db as never, input);

    expect(db.writes[0]).toMatchObject({
      username: "rep.two",
      displayUsername: "Rep.Two",
      name: "Rep Two",
      role: "SALES_REP",
      xp: 0,
      level: 1,
      cefrLevel: "A1-",
    });
    expect(db.writes[1]).toMatchObject({
      id: `${db.writes[0].id}_credential`,
      providerId: "credential",
      password: "$argon2id$test-hash",
    });
    expect(db.writes[2]).toMatchObject({
      actorRole: "SALES_ADMIN",
      targetType: "user",
      targetId: db.writes[0].id,
      metadata: {
        source: "sales-advantage-compatibility-adapter",
        schoolId: input.schoolId,
        role: "SALES_REP",
      },
    });
  });
});
