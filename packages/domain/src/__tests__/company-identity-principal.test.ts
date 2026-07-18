import { describe, expect, it, vi } from "vitest";
vi.unmock("../tenant-registry.js");

import {
  capabilityIdempotencyRecords,
  companyProductPrincipals,
  users,
  type DB,
} from "@reading-advantage/db";

import { resolveSalesCompanyPrincipal } from "../company-identity-principal.js";
import { classifyTable } from "../tenant-registry.js";

const mappedUser = {
  id: "sales-local-user",
  username: "sales.rep",
  name: "Sales Rep",
  schoolId: null,
  xp: 12,
  level: 2,
  cefrLevel: "N/A",
};

const baseIdentity = {
  sub: "00000000-0000-4000-8000-000000000001",
  aud: "sales",
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
  username: "company.sales.rep",
  displayName: "Company Sales Rep",
  roles: ["SALES_REP"],
} as const;

function mappedDatabase() {
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const tx = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mappedUser]),
          })),
        })),
      })),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: unknown) => ({
        where: vi.fn(async () => {
          updates.push({ table, values });
        }),
      })),
    })),
  };
  return {
    database: {
      transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx)),
    } as unknown as DB,
    updates,
  };
}

function firstLoginDatabase(options: {
  occupiedId?: boolean;
  userInsertError?: unknown;
  mappingInsertError?: unknown;
} = {}) {
  let selectCount = 0;
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  let rolledBack = false;
  const created = { ...mappedUser, id: baseIdentity.sub, username: baseIdentity.username };
  const tx = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(() => {
      selectCount += 1;
      if (selectCount === 1) {
        return { from: vi.fn(() => ({ innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })) })) };
      }
      return { from: vi.fn(() => ({ where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(options.occupiedId ? [{ id: baseIdentity.sub }] : []),
      })) })) };
    }),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        inserts.push({ table, values });
        if (table === users) {
          return { returning: vi.fn(async () => {
            if (options.userInsertError) throw options.userInsertError;
            return [created];
          }) };
        }
        if (options.mappingInsertError) return Promise.reject(options.mappingInsertError);
        return Promise.resolve(undefined);
      }),
    })),
  };
  return {
    database: {
      transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => {
        try { return await callback(tx); }
        catch (error) { rolledBack = true; throw error; }
      }),
    } as unknown as DB,
    inserts,
    wasRolledBack: () => rolledBack,
  };
}

describe("resolveSalesCompanyPrincipal", () => {
  it.each(["SALES_ADMIN", "SALES_REP"] as const)(
    "synchronizes mapped users.role when Accounts resolves %s",
    async (role) => {
      const { database, updates } = mappedDatabase();
      const principal = await resolveSalesCompanyPrincipal(database, {
        sub: "00000000-0000-4000-8000-000000000001",
        aud: "sales",
        organizationId: "20000000-0000-4000-8000-000000000003",
        organizationKey: "internal-company",
        username: "company.sales.rep",
        displayName: "Company Sales Rep",
        roles: [role],
      });

      expect(principal).toMatchObject({ id: mappedUser.id, role });
      expect(updates).toContainEqual({ table: users, values: { role } });
      expect(updates).toContainEqual({
        table: companyProductPrincipals,
        values: expect.objectContaining({ roleKey: role }),
      });
    },
  );

  it("classifies the app-scoped mapping as referential tenant data", () => {
    expect({
      mapping: classifyTable(companyProductPrincipals),
      infrastructure: classifyTable(capabilityIdempotencyRecords),
      distinctTables: companyProductPrincipals !== capabilityIdempotencyRecords,
    }).toEqual({
      mapping: "REFERENTIAL",
      infrastructure: "EXEMPT",
      distinctTables: true,
    });
  });

  it("rejects a Sales claim outside the internal company before database access", async () => {
    const { database } = mappedDatabase();
    await expect(resolveSalesCompanyPrincipal(database, {
      sub: "00000000-0000-4000-8000-000000000001",
      aud: "sales",
      organizationId: "20000000-0000-4000-8000-000000000004",
      organizationKey: "other-company",
      username: "outside.rep",
      displayName: "Outside Rep",
      roles: ["SALES_REP"],
    })).rejects.toThrow("Sales identity organization is invalid");
  });

  it("provisions and maps an unclaimed principal on first login", async () => {
    const { database, inserts } = firstLoginDatabase();
    await expect(resolveSalesCompanyPrincipal(database, baseIdentity)).resolves
      .toMatchObject({ id: baseIdentity.sub, role: "SALES_REP" });
    expect(inserts).toContainEqual({
      table: companyProductPrincipals,
      values: expect.objectContaining({
        organizationId: baseIdentity.organizationId,
        organizationKey: baseIdentity.organizationKey,
        companyAccountId: baseIdentity.sub,
        localUserId: baseIdentity.sub,
      }),
    });
  });

  it("serializes concurrent mapped resolutions and returns one stable local ID", async () => {
    const { database } = mappedDatabase();
    const results = await Promise.all([
      resolveSalesCompanyPrincipal(database, baseIdentity),
      resolveSalesCompanyPrincipal(database, baseIdentity),
    ]);
    expect(results.map((result) => result.id)).toEqual([
      mappedUser.id,
      mappedUser.id,
    ]);
  });

  it("fails closed when the company ID already occupies an unmapped local user", async () => {
    const { database, inserts } = firstLoginDatabase({ occupiedId: true });
    await expect(resolveSalesCompanyPrincipal(database, baseIdentity)).rejects
      .toThrow("mapping is required");
    expect(inserts).toHaveLength(0);
  });

  it("fails closed on an existing username instead of heuristic linking", async () => {
    const { database } = firstLoginDatabase({ userInsertError: { code: "23505" } });
    await expect(resolveSalesCompanyPrincipal(database, baseIdentity)).rejects
      .toThrow("mapping manifest is required");
  });

  it("rejects removed Sales roles before opening a transaction", async () => {
    const { database } = mappedDatabase();
    await expect(resolveSalesCompanyPrincipal(database, {
      ...baseIdentity,
      roles: [],
    })).rejects.toThrow("no recognized Sales role");
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("rolls back first-login provisioning when mapping persistence fails", async () => {
    const { database, wasRolledBack } = firstLoginDatabase({
      mappingInsertError: new Error("mapping write failed"),
    });
    await expect(resolveSalesCompanyPrincipal(database, baseIdentity)).rejects
      .toThrow("mapping write failed");
    expect(wasRolledBack()).toBe(true);
  });
});
