import { describe, it, expect, vi } from "vitest";
import { createTenantDB } from "../db-contract.js";
import type { Tenant } from "@reading-advantage/auth";
import type { DB } from "@reading-advantage/db";

// ─── Helpers ──────────────────────────────────────────────

interface WhereCall {
  type: string;
  table: string;
  condition: unknown;
}

function createTrackableMockDb() {
  const whereCalls: WhereCall[] = [];

  function createBuilder(table: string, type: string) {
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
        from(table: string) {
          return createBuilder(table, "select");
        },
      };
    },
    update(table: string) {
      return {
        set(_data: unknown) {
          return createBuilder(table, "update");
        },
      };
    },
    delete(table: string) {
      return createBuilder(table, "delete");
    },
    insert() {
      return {
        values(_data: unknown) {
          return {
            returning() {
              return Promise.resolve([]);
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
        // Recurse into nested SQL objects
        if (searchChunks(chunk, needle)) {
          return true;
        }
      }
    }
  }
  return false;
}

function findParamValue(condition: unknown): string | null {
  if (!condition || typeof condition !== "object") return null;
  const sql = condition as Record<string, unknown>;
  if (Array.isArray(sql.queryChunks)) {
    for (let i = 0; i < sql.queryChunks.length; i++) {
      const chunk = sql.queryChunks[i];
      if (chunk && typeof chunk === "object") {
        const val = findParamValue(chunk);
        if (val) return val;
      }
      // For eq() result, pattern is: "", col, " = ", val, ""
      // For and() result, the eq SQL is nested, so recursion handles it
      if (typeof chunk === "string" && chunk === " = " && i + 1 < sql.queryChunks.length) {
        const nextChunk = sql.queryChunks[i + 1];
        if (typeof nextChunk === "string") {
          return nextChunk;
        }
      }
    }
  }
  return null;
}

const tenantTable = { schoolId: "school_id_col" };
const nonTenantTable = { id: "id_col", name: "name_col" };
const tenant: Tenant = { schoolId: "s1" };

// ─── Tests ────────────────────────────────────────────────

describe("createTenantDB", () => {
  describe("select", () => {
    it("injects tenant condition into .where() for tenant-scoped tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(tenantTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].type).toBe("select");
      // The condition should be a real drizzle SQL object containing both tenant and user conditions
      expect(whereCalls[0].condition).toBeDefined();
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
      expect(searchChunks(whereCalls[0].condition, " and ")).toBe(true);
    });

    it("injects tenant condition when .where() is called with undefined", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(tenantTable).where(undefined);

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("does NOT inject for non-tenant-scoped tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(nonTenantTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });

    it("injects tenant condition on await when .where() is never called", async () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      await tenantDb.select().from(tenantTable).limit(10);

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("preserves tenant injection through .limit() and .offset() chaining", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.select().from(tenantTable).limit(5).offset(10).where({ raw: "x" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
      expect(searchChunks(whereCalls[0].condition, " and ")).toBe(true);
    });
  });

  describe("update", () => {
    it("injects tenant condition into .where() for tenant-scoped tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.update(tenantTable).set({ name: "New" }).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].type).toBe("update");
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
      expect(searchChunks(whereCalls[0].condition, " and ")).toBe(true);
    });

    it("injects tenant condition on await when .where() is never called", async () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      await tenantDb.update(tenantTable).set({ name: "New" }).returning();

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("does NOT inject for non-tenant-scoped tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.update(nonTenantTable).set({ name: "New" }).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });
  });

  describe("delete", () => {
    it("injects tenant condition into .where() for tenant-scoped tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.delete(tenantTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].type).toBe("delete");
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
      expect(searchChunks(whereCalls[0].condition, " and ")).toBe(true);
    });

    it("injects tenant condition on await when .where() is never called", async () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      await tenantDb.delete(tenantTable);

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
    });

    it("does NOT inject for non-tenant-scoped tables", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.delete(nonTenantTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });
  });

  describe("insert", () => {
    it("passes through untouched", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      const returning = tenantDb
        .insert(tenantTable)
        .values({ name: "New" })
        .returning();

      expect(whereCalls).toHaveLength(0);
      expect(returning).toBeInstanceOf(Promise);
    });
  });

  describe("null tenant", () => {
    it("does NOT inject when tenant.schoolId is null", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const nullTenantDb = createTenantDB(db as unknown as DB, { schoolId: null });

      nullTenantDb.select().from(tenantTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].condition).toEqual({ raw: "userCond" });
    });
  });

  describe("transaction", () => {
    it("wraps the transaction db with the same tenant", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, tenant);

      tenantDb.transaction(async (tx) => {
        tx.select().from(tenantTable).where({ raw: "txCond" });
        return "done";
      });

      expect(whereCalls).toHaveLength(1);
      expect(whereCalls[0].type).toBe("select");
      expect(searchChunks(whereCalls[0].condition, "s1")).toBe(true);
      expect(searchChunks(whereCalls[0].condition, " and ")).toBe(true);
    });
  });

  describe("cross-tenant protection", () => {
    it("rejects queries from one tenant against another tenant's data", () => {
      const { db, whereCalls } = createTrackableMockDb();
      const tenantDb = createTenantDB(db as unknown as DB, { schoolId: "s2" });

      tenantDb.select().from(tenantTable).where({ raw: "userCond" });

      expect(whereCalls).toHaveLength(1);
      expect(searchChunks(whereCalls[0].condition, "s2")).toBe(true);
    });
  });
});
