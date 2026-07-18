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
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings: Array.from(strings),
    values,
  })),
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
      const existing = rows.find(
        (r) => r.identifier === identifier && r.kind === kind,
      );
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
    execute: vi.fn(async (query: unknown) => {
      const q = query as { type: "sql"; strings: string[]; values: unknown[] };
      // Best-effort simulation of the atomic increment statement.
      const identifier = q.values[0] as string;
      const kind = q.values[1] as "username" | "ip";
      const windowStart = new Date(q.values[3] as string | Date);
      const lastAttemptAt = new Date(q.values[4] as string | Date);
      const cutoff = new Date(q.values[5] as string | Date);
      const existing = rows.find(
        (r) => r.identifier === identifier && r.kind === kind,
      );
      if (!existing) {
        rows.push({
          identifier,
          kind,
          failedCount: 1,
          windowStart,
          lastAttemptAt,
        });
      } else if (existing.windowStart.getTime() < cutoff.getTime()) {
        existing.failedCount = 1;
        existing.windowStart = windowStart;
        existing.lastAttemptAt = lastAttemptAt;
      } else {
        existing.failedCount += 1;
        existing.lastAttemptAt = lastAttemptAt;
      }
      const result = rows.find(
        (r) => r.identifier === identifier && r.kind === kind,
      )!;
      return [
        {
          failed_count: result.failedCount,
          window_start: result.windowStart,
        },
      ];
    }),
  };

  return {
    chain,
    rows,
    select: () => chain.select(),
    insert: () => chain.insert(),
    delete: () => chain.delete(),
    execute: (query: unknown) => chain.execute(query),
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

  it("issues an atomic increment statement", async () => {
    const mockDb = createMockDb();
    const store = createPostgresRateLimitStore(mockDb as unknown as never);

    await store.increment!("username:alice", Date.now(), 15 * 60 * 1000);

    expect(mockDb.chain.execute).toHaveBeenCalled();
    const query = mockDb.chain.execute.mock.calls[0][0] as {
      type: string;
      strings: string[];
    };
    expect(query.type).toBe("sql");
    const text = query.strings.join(" ");
    expect(text).toContain("INSERT INTO login_attempts");
    expect(text).toContain("ON CONFLICT");
    expect(text).toContain("failed_count");
  });

  it("increments existing rows atomically", async () => {
    const mockDb = createMockDb();
    const store = createPostgresRateLimitStore(mockDb as unknown as never);
    const now = Date.now();

    mockDb.rows.push({
      identifier: "alice",
      kind: "username",
      failedCount: 2,
      windowStart: new Date(now - 1000),
      lastAttemptAt: new Date(now - 1000),
    });

    await store.increment!("username:alice", now, 15 * 60 * 1000);
    expect(mockDb.rows[0].failedCount).toBe(3);
  });

  it("resets the counter when the window has expired", async () => {
    const mockDb = createMockDb();
    const store = createPostgresRateLimitStore(mockDb as unknown as never);
    const now = Date.now();

    mockDb.rows.push({
      identifier: "alice",
      kind: "username",
      failedCount: 5,
      windowStart: new Date(now - 16 * 60 * 1000),
      lastAttemptAt: new Date(now - 16 * 60 * 1000),
    });

    await store.increment!("username:alice", now, 15 * 60 * 1000);
    expect(mockDb.rows[0].failedCount).toBe(1);
  });

  it("atomically consumes and returns the post-increment bucket", async () => {
    const mockDb = createMockDb();
    const store = createPostgresRateLimitStore(mockDb as unknown as never);
    const now = Date.now();

    const first = await store.consume!(
      "username:sales:roleplay:user-1",
      now,
      60_000,
    );
    const second = await store.consume!(
      "username:sales:roleplay:user-1",
      now + 1,
      60_000,
    );

    expect(first.failedCount).toBe(1);
    expect(second.failedCount).toBe(2);
    expect(mockDb.rows[0]).toMatchObject({
      identifier: "sales:roleplay:user-1",
      kind: "username",
      failedCount: 2,
    });
  });
});
