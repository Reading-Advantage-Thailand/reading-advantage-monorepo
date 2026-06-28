/**
 * Wave 0 Phase 2 — Postgres-backed rate-limit store tests.
 *
 * Proves that the production rate-limit store is durable (not process-local)
 * and that independent username/IP buckets share the same underlying db.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPostgresRateLimitStore } from "../rate-limit-store.js";

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ type: "eq", col, val })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
}));

vi.mock("@reading-advantage/db/schema", () => ({
  loginAttempts: {
    identifier: "identifier",
    kind: "kind",
    failedCount: "failed_count",
    windowStart: "window_start",
    lastAttemptAt: "last_attempt_at",
  },
}));

interface MockRow {
  identifier: string;
  kind: "username" | "ip";
  failedCount: number;
  windowStart: Date;
  lastAttemptAt: Date;
}

function extractValue(condition: unknown, key: string): unknown {
  if (typeof condition !== "object" || condition === null) return undefined;
  const c = condition as Record<string, unknown>;
  if (c.type === "eq" && c.col === key) return c.val;
  if (c.type === "and" && Array.isArray(c.args)) {
    for (const arg of c.args) {
      const v = extractValue(arg, key);
      if (v !== undefined) return v;
    }
  }
  return undefined;
}

/**
 * Builds an in-memory mock Drizzle client backed by a shared rows array.
 * The mock supports the exact query chains used by the Postgres store.
 */
function createMockDb(rows: MockRow[] = []) {
  const chain = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(function (this: typeof chain, condition: unknown) {
      (chain as unknown as Record<string, unknown>).lastWhere = condition;
      return chain;
    }),
    for: vi.fn(() => chain),
    limit: vi.fn(async () => {
      const condition = (chain as unknown as Record<string, unknown>).lastWhere;
      const targetId = extractValue(condition, "identifier");
      const targetKind = extractValue(condition, "kind");
      return rows.filter(
        (r) => r.identifier === targetId && r.kind === targetKind,
      );
    }),
    insert: vi.fn(() => chain),
    values: vi.fn((values: Record<string, unknown>) => {
      (chain as unknown as Record<string, unknown>).lastInsertValues = values;
      return chain;
    }),
    onConflictDoUpdate: vi.fn(async () => {
      const values = (chain as unknown as Record<string, unknown>)
        .lastInsertValues as Record<string, unknown> | undefined;
      if (!values) return;
      const identifier = values.identifier as string;
      const kind = values.kind as "username" | "ip";
      const existing = rows.find((r) => r.identifier === identifier && r.kind === kind);
      if (existing) {
        existing.failedCount = values.failedCount as number;
        existing.windowStart = values.windowStart as Date;
        existing.lastAttemptAt = values.lastAttemptAt as Date;
      } else {
        rows.push({
          identifier,
          kind,
          failedCount: values.failedCount as number,
          windowStart: values.windowStart as Date,
          lastAttemptAt: values.lastAttemptAt as Date,
        });
      }
    }),
    delete: vi.fn(() => chain),
  };

  return {
    chain,
    rows,
    select: () => chain.select(),
    insert: () => chain.insert(),
    delete: () => chain.delete(),
  };
}

describe("Wave 0 Phase 2 — Postgres-backed rate-limit store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists state so a second store instance sees the same bucket", async () => {
    const mockDb = createMockDb();
    const storeA = createPostgresRateLimitStore(mockDb as unknown as never);
    const storeB = createPostgresRateLimitStore(mockDb as unknown as never);

    await storeA.set("username:alice", {
      failedCount: 3,
      windowStart: Date.now(),
    });
    const entry = await storeB.get("username:alice");

    expect(entry).toBeDefined();
    expect(entry?.failedCount).toBe(3);
  });

  it("returns undefined and deletes stale rows when the window has expired", async () => {
    const mockDb = createMockDb();
    const store = createPostgresRateLimitStore(mockDb as unknown as never, {
      windowMs: 15 * 60 * 1000,
      maxAttempts: 5,
    });

    const staleWindowStart = Date.now() - 16 * 60 * 1000;
    mockDb.rows.push({
      identifier: "alice",
      kind: "username",
      failedCount: 5,
      windowStart: new Date(staleWindowStart),
      lastAttemptAt: new Date(staleWindowStart),
    });

    const entry = await store.get("username:alice");
    expect(entry).toBeUndefined();
    expect(mockDb.chain.delete).toHaveBeenCalled();
  });

  it("keeps username and IP buckets independent", async () => {
    const mockDb = createMockDb();
    const store = createPostgresRateLimitStore(mockDb as unknown as never);

    await store.set("username:alice", {
      failedCount: 5,
      windowStart: Date.now(),
    });
    const ipEntry = await store.get("ip:1.2.3.4");

    expect(ipEntry).toBeUndefined();
  });

  it("upserts rows on conflict", async () => {
    const mockDb = createMockDb();
    const store = createPostgresRateLimitStore(mockDb as unknown as never);

    await store.set("username:alice", {
      failedCount: 1,
      windowStart: Date.now(),
    });
    expect(mockDb.chain.insert).toHaveBeenCalled();
    expect(mockDb.chain.onConflictDoUpdate).toHaveBeenCalled();
  });
});
