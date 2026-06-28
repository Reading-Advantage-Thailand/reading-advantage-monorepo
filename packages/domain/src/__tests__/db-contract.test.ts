import { describe, it, expect, vi, beforeEach } from "vitest";
vi.unmock("../tenant-registry.js");
import { TenantScopeError } from "../db-contract.js";
import type { Tenant } from "@reading-advantage/auth";
import type { DB } from "@reading-advantage/db";

// Mock the tenant-registry so classifyTable uses our test classification
const mockClassify = vi.fn<(table: unknown) => "FLAT" | "EXEMPT" | "REFERENTIAL">();
vi.mock("../tenant-registry.js", () => ({
  classifyTable: (table: unknown) => mockClassify(table),
}));

// Import AFTER mock so the module picks up the mock
const { createTenantDB } = await import("../db-contract.js");

// ─── Helpers ──────────────────────────────────────────────

interface WhereCall {
  type: string;
  table: unknown;
  condition: unknown;
}

function createTrackableMockDb() {
  const whereCalls: WhereCall[] = [];

  function createBuilder(table: unknown, type: string) {
    const builder: Record<string, unknown> = {
      where(condition: unknown) {
        whereCalls.push({ type, table, condition });
        return builder;
      },
      limit() {
        return builder;
      },
      offset() {
        return builder;
      },
      orderBy() {
        return builder;
      },
      returning() {
        return builder;
      },
      innerJoin() {
        return builder;
      },
      leftJoin() {
        return builder;
      },
      rightJoin() {
        return builder;
      },
      fullJoin() {
        return builder;
      },
      onConflictDoUpdate(_config: unknown) {
        return builder;
      },
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve([]).then(resolve);
      },
      execute() {
        return Promise.resolve([]);
      },
    };
    return builder;
  }

  const db = {
    select() {
      return {
        from(table: unknown) {
          return createBuilder(table, "select");
        },
      };
    },
    update(table: unknown) {
      return {
        set(_data: unknown) {
          return createBuilder(table, "update");
        },
      };
    },
    delete(table: unknown) {
      return createBuilder(table, "delete");
    },
    insert(table: unknown) {
      const tbl = table;
      return {
        values(_data: unknown) {
          return {
            returning() {
              return Promise.resolve([]);
            },
            onConflictDoUpdate(_config: unknown) {
              return createBuilder(tbl, "insert");
            },
          };
        },
      };
    },
    transaction<T>(fn: (tx: typeof db) => Promise<T>) {
      return fn(db);
    },
  };

  return { db, whereCalls };
}

function searchChunks(condition: unknown, needle: string): boolean {
  if (!condition || typeof condition !== "object") return false;
  const sql = condition as Record<string, unknown>;
  if (Array.isArray(sql.queryChunks)) {
    for (const chunk of sql.queryChunks) {
      if (typeof chunk === "string" && chunk.includes(needle)) {
        return true;
      }
      if (chunk && typeof chunk === "object") {
        const value = (chunk as Record<string, unknown>).value;
        if (Array.isArray(value) && value.some((v) => typeof v === "string" && v.includes(needle))) {
          return true;
        }
        if (searchChunks(chunk, needle)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Test tables — plain objects that the mock classifyTable recognizes
const flatTable = { schoolId: "school_id_col", Symbol: { "drizzle:Name": "classrooms" } };
const exemptTable = { id: "id_col", Symbol: { "drizzle:Name": "audit_events" } };
const referentialTable = { userId: "user_id_col", Symbol: { "drizzle:Name": "lesson_progress" } };
const tenant: Tenant = { schoolId: "s1" };

// ─── Tests ────────────────────────────────────────────────

beforeEach(() => {
  mockClassify.mockReset();
  mockClassify.mockImplementation((table: unknown) => {
    if (table === flatTable) return "FLAT";
    if (table === exemptTable) return "EXEMPT";
    if (table === referentialTable) return "REFERENTIAL";
    return "REFERENTIAL"; // default: fail-safe
  });
});

describe("createTenantDB", () => {
  describe("select — FLAT tables", () => {
    it("injects tenant condition into .where() for FLAT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(flatTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
      expect(searchChunks(whereCalls[0].condition, " and ")).toBe(true);
    });

    it("injects tenant condition on await when .where() is never called", async () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      await tenantDb.select().from(flatTable).limit(10);

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("preserves tenant injection through .limit() and .offset() chaining", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(flatTable).limit(5).offset(10).where({ raw: "x" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });
  });

  describe("select — EXEMPT tables", () => {
    it("passes through without tenant scoping for EXEMPT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(exemptTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });
  });

  describe("select — REFERENTIAL tables (FR-3)", () => {
    it("throws TenantScopeError for REFERENTIAL tables", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      expect(() => tenantDb.select().from(referentialTable)).toThrow(TenantScopeError);
      expect(() => tenantDb.select().from(referentialTable)).toThrow(/REFERENTIAL/);
    });

    it("succeeds via unscoped() escape hatch", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      // unscoped returns raw db — select works normally
      const rawDb = tenantDb.unscoped("manual join on lesson_progress");
      rawDb.select().from(referentialTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });
  });

  describe("FR-2 — unclassified tables throw", () => {
    it("throws for unregistered tables", () => {
      mockClassify.mockImplementation(() => {
        throw new Error('[TenantDB] Table "unknown" is not classified in the tenant registry.');
      });
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);
      const unknownTable = { id: "x" };

      expect(() => tenantDb.select().from(unknownTable)).toThrow(/not classified/);
    });
  });

  describe("update", () => {
    it("injects tenant condition for FLAT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.update(flatTable).set({ name: "New" }).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("throws TenantScopeError for REFERENTIAL tables", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      expect(() => tenantDb.update(referentialTable).set({ name: "x" })).toThrow(TenantScopeError);
    });
  });

  describe("delete", () => {
    it("injects tenant condition for FLAT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.delete(flatTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("throws TenantScopeError for REFERENTIAL tables", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      expect(() => tenantDb.delete(referentialTable)).toThrow(TenantScopeError);
    });
  });

  describe("FR-5 — insert .values() enforcement", () => {
    it("injects schoolId when omitted in FLAT insert", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      // Should not throw — schoolId will be injected
      const result = tenantDb.insert(flatTable).values({ name: "test" });
      expect(result).toBeDefined();
    });

    it("throws when schoolId conflicts in FLAT insert", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      expect(() =>
        tenantDb.insert(flatTable).values({ name: "test", schoolId: "other-school" }),
      ).toThrow(TenantScopeError);
      expect(() =>
        tenantDb.insert(flatTable).values({ name: "test", schoolId: "other-school" }),
      ).toThrow(/conflicting schoolId/);
    });

    it("allows matching schoolId in FLAT insert", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      // Should not throw — schoolId matches
      const result = tenantDb.insert(flatTable).values({ name: "test", schoolId: "s1" });
      expect(result).toBeDefined();
    });

    it("handles array values for FLAT insert", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      // Should not throw — all schoolIds injected
      const result = tenantDb.insert(flatTable).values([
        { name: "a" },
        { name: "b" },
      ]);
      expect(result).toBeDefined();
    });

    it("throws TenantScopeError for REFERENTIAL insert", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      expect(() => tenantDb.insert(referentialTable).values({ name: "x" })).toThrow(
        TenantScopeError,
      );
    });
  });

  describe("FR-4 — join classification", () => {
    it("throws when joining a REFERENTIAL table", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      expect(() =>
        tenantDb.select().from(flatTable).innerJoin(referentialTable, { raw: "on" }),
      ).toThrow(TenantScopeError);
      expect(() =>
        tenantDb.select().from(flatTable).innerJoin(referentialTable, { raw: "on" }),
      ).toThrow(/REFERENTIAL/);
    });

    it("allows joining FLAT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(flatTable).innerJoin(flatTable, { raw: "on" }).where({ raw: "cond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("allows joining EXEMPT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(flatTable).innerJoin(exemptTable, { raw: "on" }).where({ raw: "cond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });
  });

  describe("null tenant", () => {
    it("does NOT inject when tenant.schoolId is null", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const nullTenantDb = createTenantDB(db as unknown as DB, { schoolId: null });

      nullTenantDb.select().from(flatTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });
  });

  // ─── Null-tenant fail-closed (M-SF-2) ──────────────────────
  // createTenantDB(db, { schoolId: null }) MUST throw TenantScopeError on
  // FLAT operations. A warning is insufficient — the query must never reach
  // the underlying builder when tenant identity is missing.
  describe("null-tenant fail-closed (M-SF-2)", () => {
    it("throws TenantScopeError on FLAT select when schoolId is null", () => {
      const { db } = createTrackableMockDb();
      const nullTenantDb = createTenantDB(db as unknown as DB, { schoolId: null });

      expect(() => nullTenantDb.select().from(flatTable)).toThrow(TenantScopeError);
      expect(() => nullTenantDb.select().from(flatTable)).toThrow(/null.*schoolId|schoolId.*null/i);
    });

    it("throws TenantScopeError on FLAT select when schoolId is undefined", () => {
      const { db } = createTrackableMockDb();
      const undefTenantDb = createTenantDB(db as unknown as DB, { schoolId: undefined });

      expect(() => undefTenantDb.select().from(flatTable)).toThrow(TenantScopeError);
    });

    it("throws TenantScopeError on FLAT insert when schoolId is null", () => {
      const { db } = createTrackableMockDb();
      const nullTenantDb = createTenantDB(db as unknown as DB, { schoolId: null });

      expect(() => nullTenantDb.insert(flatTable).values({ name: "test" })).toThrow(TenantScopeError);
    });

    it("throws TenantScopeError on FLAT update when schoolId is null", () => {
      const { db } = createTrackableMockDb();
      const nullTenantDb = createTenantDB(db as unknown as DB, { schoolId: null });

      expect(() => nullTenantDb.update(flatTable).set({ name: "x" })).toThrow(TenantScopeError);
    });

    it("throws TenantScopeError on FLAT delete when schoolId is null", () => {
      const { db } = createTrackableMockDb();
      const nullTenantDb = createTenantDB(db as unknown as DB, { schoolId: null });

      expect(() => nullTenantDb.delete(flatTable)).toThrow(TenantScopeError);
    });

    it("does NOT throw for EXEMPT tables when schoolId is null", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const nullTenantDb = createTenantDB(db as unknown as DB, { schoolId: null });

      // EXEMPT tables should work without tenant scoping
      nullTenantDb.select().from(exemptTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });

    it("does NOT throw for valid tenant on FLAT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(flatTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });
  });

  describe("transaction", () => {
    it("wraps the transaction db with the same tenant", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.transaction(async (tx) => {
        tx.select().from(flatTable).where({ raw: "txCond" });
        return "done";
      });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });
  });

  describe("unscoped() escape hatch", () => {
    it("returns a raw db that does not enforce tenant scoping", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      const rawDb = tenantDb.unscoped("manual join on lesson_progress");
      rawDb.select().from(referentialTable).where({ raw: "manual" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "manual" });
    });
  });

  describe("db.query guard", () => {
    it("throws when db.query is accessed", () => {
      const { db } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      expect(() => (tenantDb as Record<string, unknown>).query).toThrow(
        /db.query is not available on TenantDB/,
      );
    });
  });

  describe("insert upsert scoping", () => {
    it("wraps onConflictDoUpdate().where() with tenant condition for FLAT tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.insert(flatTable).values({ name: "x" }).onConflictDoUpdate({ target: "id", set: { name: "y" } }).where({ raw: "upsertCond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });
  });
});
