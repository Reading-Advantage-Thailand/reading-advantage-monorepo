import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import { accounts } from "@reading-advantage/db/schema";
import {
  hashNewPassword,
  generateRandomPasswordHash,
  upsertCredentialAccount,
} from "../credentials";

vi.setConfig({ testTimeout: 20000 });

describe("hashNewPassword", () => {
  it("returns an argon2id hash", async () => {
    const hash = await hashNewPassword("Secret42!");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });
});

describe("generateRandomPasswordHash", () => {
  it("returns an argon2id hash and differs on each call", async () => {
    const a = await generateRandomPasswordHash();
    const b = await generateRandomPasswordHash();
    expect(a.startsWith("$argon2id$")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("upsertCredentialAccount", () => {
  it("upserts the credential account row for the user", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn(() => ({ values }));

    await upsertCredentialAccount({ insert } as never, "user-1", "$argon2id$x");

    expect(insert).toHaveBeenCalledWith(accounts);
    expect(values).toHaveBeenCalledWith({
      id: "user-1_credential",
      userId: "user-1",
      providerId: "credential",
      password: "$argon2id$x",
    });
    const conflict = (onConflictDoUpdate.mock.calls[0] as unknown[])[0] as {
      target: unknown[];
      set: { password: string };
    };
    expect(conflict.target).toEqual([accounts.userId, accounts.providerId]);
    expect(conflict.set.password).toBe("$argon2id$x");
  });
});

describe("legacy bcrypt compatibility", () => {
  it("bcrypt hashes from the legacy build still verify through the shared verifier", async () => {
    const { verifyPassword } = await import("@reading-advantage/auth");
    const legacy = bcrypt.hashSync("OldPass1!", 10);
    expect(await verifyPassword("OldPass1!", legacy)).toBe(true);
    expect(await verifyPassword("wrong", legacy)).toBe(false);
  });
});
