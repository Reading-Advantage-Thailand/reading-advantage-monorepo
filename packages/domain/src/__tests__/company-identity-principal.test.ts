import { describe, expect, it, vi } from "vitest";
vi.unmock("../tenant-registry.js");

import {
  capabilityIdempotencyRecords,
  companyProductPrincipals,
  type DB,
} from "@reading-advantage/db";

import {
  resolveCodecampCompanyPrincipal,
  resolveLegacySalesCompanyPrincipal,
  resolveSalesCompanyPrincipal,
} from "../company-identity-principal.js";
import { classifyTable } from "../tenant-registry.js";

const baseIdentity = {
  sub: "00000000-0000-4000-8000-000000000001",
  aud: "sales",
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
  username: "company.sales.rep",
  displayName: "Company Sales Rep",
  roles: ["SALES_REP"],
} as const;

const mappedUser = {
  id: "sales:" + baseIdentity.sub,
  username: "sales:" + baseIdentity.sub,
  name: "Company Sales Rep",
  schoolId: null,
  xp: 12,
  level: 2,
  cefrLevel: "N/A",
};

function principalDatabase(
  options: {
    mapped?: typeof mappedUser | null;
    executeError?: Error;
  } = {},
) {
  const mapped = options.mapped === undefined ? mappedUser : options.mapped;
  const execute = vi.fn(async () => {
    if (options.executeError) throw options.executeError;
  });
  const limit = vi.fn().mockResolvedValue(mapped ? [mapped] : []);
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit })),
    })),
  }));
  const tx = { execute, select };
  const transaction = vi.fn(
    async (callback: (transaction: typeof tx) => unknown) => callback(tx),
  );
  return {
    database: { transaction } as unknown as DB,
    execute,
    select,
    transaction,
  };
}

function legacyDatabase(rows: readonly Record<string, unknown>[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({ limit })),
      })),
    })),
  }));
  return {
    database: { select } as unknown as DB,
    limit,
    select,
  };
}

function codecampDatabase(
  rows: readonly Record<string, unknown>[],
  executeError?: Error,
) {
  const execute = vi.fn(async () => {
    if (executeError) throw executeError;
  });
  const limit = vi.fn().mockResolvedValue(rows);
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({ limit })),
      })),
    })),
  }));
  const tx = { execute, select };
  const transaction = vi.fn(
    async (callback: (transaction: typeof tx) => unknown) => callback(tx),
  );
  return {
    database: { transaction } as unknown as DB,
    execute,
    select,
    transaction,
  };
}

describe("resolveCodecampCompanyPrincipal", () => {
  const identity = {
    ...baseIdentity,
    aud: "codecamp",
    username: "company.intern",
    displayName: "Company Intern",
    roles: ["INTERN"],
  } as const;
  const mapped = {
    organizationId: identity.organizationId,
    organizationKey: identity.organizationKey,
    mappingRole: "INTERN",
    id: "legacy-codecamp-user",
    userRole: "INTERN",
    schoolId: null,
    xp: 42,
    level: 3,
    cefrLevel: "N/A",
  };

  it("preserves the existing local owner while synchronizing current SSO claims", async () => {
    const { database, execute } = codecampDatabase([mapped]);
    await expect(
      resolveCodecampCompanyPrincipal(database, identity),
    ).resolves.toEqual({
      user: {
        id: mapped.id,
        username: identity.username,
        name: identity.displayName,
        role: "INTERN",
        schoolId: null,
        xp: mapped.xp,
        level: mapped.level,
        cefrLevel: mapped.cefrLevel,
      },
      scope: {
        kind: "company",
        applicationKey: "codecamp",
        organizationId: identity.organizationId,
        organizationKey: identity.organizationKey,
      },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("projects a newly synchronized namespaced local owner", async () => {
    const provisioned = {
      ...mapped,
      id: `codecamp:${identity.sub}`,
    };
    const { database } = codecampDatabase([provisioned]);
    await expect(
      resolveCodecampCompanyPrincipal(database, identity),
    ).resolves.toMatchObject({
      user: {
        id: `codecamp:${identity.sub}`,
        role: "INTERN",
        schoolId: null,
      },
    });
  });

  it.each([{ roles: [] }, { roles: ["SALES_ADMIN"] }])(
    "durably revokes identities without a Codecamp role",
    async (patch) => {
      const { database, execute, select } = codecampDatabase([]);
      await expect(
        resolveCodecampCompanyPrincipal(database, {
          ...identity,
          ...patch,
        }),
      ).resolves.toBeNull();
      expect(execute).toHaveBeenCalledTimes(1);
      expect(select).not.toHaveBeenCalled();
    },
  );

  it.each([
    { rows: [] },
    { rows: [mapped, { ...mapped }] },
    { rows: [{ ...mapped, schoolId: "30000000-0000-4000-8000-000000000007" }] },
    { rows: [{ ...mapped, mappingRole: "STUDENT" }] },
    { rows: [{ ...mapped, userRole: "STUDENT" }] },
  ])(
    "fails closed for an inconsistent synchronized mapping",
    async ({ rows }) => {
      const { database } = codecampDatabase(rows);
      await expect(
        resolveCodecampCompanyPrincipal(database, identity),
      ).rejects.toThrow("principal synchronization failed");
    },
  );

  it("surfaces explicit mapping-manifest conflicts from PostgreSQL", async () => {
    const error = new Error("database wrapper", {
      cause: Object.assign(new Error("database contract"), { code: "RA002" }),
    });
    const { database } = codecampDatabase([], error);
    await expect(
      resolveCodecampCompanyPrincipal(database, identity),
    ).rejects.toThrow("mapping manifest is required");
  });

  it("rejects the wrong audience or organization before database access", async () => {
    const { database, transaction } = codecampDatabase([]);
    await expect(
      resolveCodecampCompanyPrincipal(database, {
        ...identity,
        aud: "sales",
      }),
    ).rejects.toThrow("audience is invalid");
    await expect(
      resolveCodecampCompanyPrincipal(database, {
        ...identity,
        organizationKey: "other-company",
      }),
    ).rejects.toThrow("organization is invalid");
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([{ sub: "not-a-uuid" }, { organizationId: "not-a-uuid" }])(
    "denies malformed principal identifiers before database access",
    async (patch) => {
      const { database, transaction } = codecampDatabase([]);
      await expect(
        resolveCodecampCompanyPrincipal(database, {
          ...identity,
          ...patch,
        }),
      ).resolves.toBeNull();
      expect(transaction).not.toHaveBeenCalled();
    },
  );
});

describe("resolveSalesCompanyPrincipal", () => {
  it.each(["SALES_ADMIN", "SALES_REP"] as const)(
    "synchronizes an exact product-local principal when Accounts resolves %s",
    async (role) => {
      const { database, execute } = principalDatabase();
      await expect(
        resolveSalesCompanyPrincipal(database, {
          ...baseIdentity,
          roles: [role],
        }),
      ).resolves.toMatchObject({
        user: {
          id: mappedUser.id,
          username: baseIdentity.username,
          role,
          schoolId: null,
        },
      });
      expect(execute).toHaveBeenCalledTimes(1);
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
    const { database, transaction } = principalDatabase();
    await expect(
      resolveSalesCompanyPrincipal(database, {
        ...baseIdentity,
        organizationKey: "other-company",
      }),
    ).rejects.toThrow("Sales identity organization is invalid");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns the product-local row created by the constrained function", async () => {
    const { database } = principalDatabase();
    await expect(
      resolveSalesCompanyPrincipal(database, baseIdentity),
    ).resolves.toMatchObject({
      user: {
        id: "sales:" + baseIdentity.sub,
        username: baseIdentity.username,
        role: "SALES_REP",
        schoolId: null,
      },
    });
  });

  it("serializes concurrent resolutions inside the constrained function", async () => {
    const { database, execute } = principalDatabase();
    const results = await Promise.all([
      resolveSalesCompanyPrincipal(database, baseIdentity),
      resolveSalesCompanyPrincipal(database, baseIdentity),
    ]);
    expect(results.map((result) => result?.user.id)).toEqual([
      mappedUser.id,
      mappedUser.id,
    ]);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("surfaces explicit mapping-manifest conflicts from PostgreSQL", async () => {
    const { database } = principalDatabase({
      executeError: new Error("database adapter wrapper", {
        cause: Object.assign(
          new Error("database contract message may change"),
          {
            code: "RA001",
          },
        ),
      }),
    });
    await expect(
      resolveSalesCompanyPrincipal(database, baseIdentity),
    ).rejects.toThrow("mapping manifest is required");
  });

  it("does not classify a message-only database error as a manifest conflict", async () => {
    const databaseError = new Error(
      "Sales organization change requires an explicit mapping manifest",
    );
    const { database } = principalDatabase({ executeError: databaseError });
    await expect(
      resolveSalesCompanyPrincipal(database, baseIdentity),
    ).rejects.toBe(databaseError);
  });

  it("durably revokes through the constrained function without projecting a user", async () => {
    const { database, execute, select } = principalDatabase();
    await expect(
      resolveSalesCompanyPrincipal(database, {
        ...baseIdentity,
        roles: [],
      }),
    ).resolves.toBeNull();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
  });

  it("never projects a school-scoped row into the company boundary", async () => {
    const { database } = principalDatabase({
      mapped: {
        ...mappedUser,
        schoolId: "30000000-0000-4000-8000-000000000007",
      },
    });
    await expect(
      resolveSalesCompanyPrincipal(database, baseIdentity),
    ).rejects.toThrow("product-local principal synchronization failed");
  });

  it("projects the trusted company organization", async () => {
    const { database } = principalDatabase();
    await expect(
      resolveSalesCompanyPrincipal(database, baseIdentity),
    ).resolves.toMatchObject({
      scope: {
        kind: "company",
        applicationKey: "sales",
        organizationId: baseIdentity.organizationId,
        organizationKey: baseIdentity.organizationKey,
      },
    });
  });
});

describe("resolveLegacySalesCompanyPrincipal", () => {
  const mappedLegacy = {
    organizationId: baseIdentity.organizationId,
    organizationKey: baseIdentity.organizationKey,
    mappingRole: "SALES_REP",
    id: "sales:" + baseIdentity.sub,
    username: "sales:" + baseIdentity.sub,
    name: "Sales Rep",
    role: "SALES_REP",
    schoolId: null,
    xp: 0,
    level: 1,
    cefrLevel: "N/A",
  };

  it("returns only one exact namespaced active Sales mapping", async () => {
    const { database, limit } = legacyDatabase([mappedLegacy]);
    await expect(
      resolveLegacySalesCompanyPrincipal(database, baseIdentity.sub),
    ).resolves.toMatchObject({
      user: {
        id: "sales:" + baseIdentity.sub,
        role: "SALES_REP",
        schoolId: null,
      },
      scope: { kind: "company", applicationKey: "sales" },
    });
    expect(limit).toHaveBeenCalledWith(2);
  });

  it.each([
    [{ ...mappedLegacy, mappingRole: "REVOKED" }],
    [{ ...mappedLegacy, schoolId: "30000000-0000-4000-8000-000000000007" }],
    [mappedLegacy, { ...mappedLegacy }],
  ])(
    "denies revoked, school-scoped, or duplicate mappings",
    async (...rows) => {
      const { database } = legacyDatabase(rows);
      await expect(
        resolveLegacySalesCompanyPrincipal(database, baseIdentity.sub),
      ).resolves.toBeNull();
    },
  );

  it("rejects invalid source IDs before database access", async () => {
    const database = { select: vi.fn() } as unknown as DB;
    await expect(
      resolveLegacySalesCompanyPrincipal(database, "global-admin"),
    ).resolves.toBeNull();
    expect(database.select).not.toHaveBeenCalled();
  });
});
