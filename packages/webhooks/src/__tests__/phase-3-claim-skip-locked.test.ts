import { describe, it, expect, vi } from "vitest";
import { claimDueJobs } from "../review-worker.js";

const hasDirectDbUrl = Boolean(process.env.DIRECT_DATABASE_URL);

function createMockConn() {
  return {
    execute: vi.fn().mockResolvedValue([]),
    query: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Extracts the raw SQL text from a Drizzle `sql` template object or a plain
 * string. Used by tests that sniff `conn.execute.mock.calls[0][0]`.
 */
function sqlText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof (value as { toQuery?: unknown }).toQuery === "function") {
    const q = (value as { toQuery: (config: Record<string, unknown>) => { sql: string } }).toQuery({
      escapeName: (n: string) => `"${n}"`,
      escapeString: (s: string) => `'${String(s).replace(/'/g, "''")}'`,
      escapeParam: (p: number) => `$${p + 1}`,
    });
    return q.sql;
  }
  return String(value);
}

describe("Phase 3 — claimDueJobs uses FOR UPDATE SKIP LOCKED", () => {
  it("claimDueJobs SQL text contains FOR UPDATE SKIP LOCKED", async () => {
    const conn = createMockConn();

    try {
      await claimDueJobs(conn as unknown as import("@reading-advantage/db").DB, 5);
    } catch {
      // The mock connection may throw; we only care about the SQL text.
    }

    const calls = [
      ...(conn.execute.mock?.calls ?? []),
      ...(conn.query.mock?.calls ?? []),
      ...(conn.select.mock?.calls ?? []),
    ];

    const sqlStrings = calls.map((call) => sqlText(call[0])).join(" ");

    expect(sqlStrings, "claim SQL must contain FOR UPDATE SKIP LOCKED").toMatch(/FOR UPDATE SKIP LOCKED/i);
  });

  it("claimDueJobs uses parameterized SQL", async () => {
    const conn = createMockConn();

    try {
      await claimDueJobs(conn as unknown as import("@reading-advantage/db").DB, {
        batchSize: 5,
        workerId: "worker:test-123",
        now: new Date("2026-01-01T00:00:00Z"),
      });
    } catch {
      // Mock connection may throw; assertion is on the received query.
    }

    const calls = conn.execute.mock?.calls ?? [];
    expect(calls.length, "execute call count").toBeGreaterThan(0);

    const received = calls[0][0];
    // A parameterized query must be a Drizzle SQL object, not a plain string.
    expect(typeof received, "received query type").not.toBe("string");
    expect(received, "received query has toQuery").toHaveProperty("toQuery");

    const text = sqlText(received);
    // The workerId must NOT appear as a literal in the SQL text.
    expect(text, "workerId must not be interpolated as a literal").not.toContain("worker:test-123");
    // It must be referenced as a placeholder.
    expect(text, "SQL must use placeholders").toMatch(/\$\d+/);
  });

  it("claimDueJobs binds ISO timestamp strings so postgres-js does not reject Date params", async () => {
    const conn = createMockConn();
    const now = new Date("2026-08-03T05:13:40.837Z");

    try {
      await claimDueJobs(conn as unknown as import("@reading-advantage/db").DB, {
        batchSize: 1,
        workerId: "worker:iso-bind",
        now,
      });
    } catch {
      // Mock connection may throw; assertion is on the bound params.
    }

    const calls = conn.execute.mock?.calls ?? [];
    expect(calls.length, "execute call count").toBeGreaterThan(0);
    const received = calls[0][0] as {
      queryChunks?: unknown[];
      toQuery?: (config: Record<string, unknown>) => { sql: string; params?: unknown[] };
    };
    // Drizzle sql templates expose bound values via toQuery params and/or inline chunks.
    let params: unknown[] = [];
    if (typeof received.toQuery === "function") {
      try {
        const q = received.toQuery({
          escapeName: (n: string) => `"${n}"`,
          escapeString: (s: string) => `'${String(s).replace(/'/g, "''")}'`,
          escapeParam: (_idx: number, value: unknown) => {
            params.push(value);
            return `$${params.length}`;
          },
        });
        if (Array.isArray(q.params)) params = q.params;
      } catch {
        // Some drizzle versions throw without a full dialect; fall through to chunk scan.
      }
    }
    if (params.length === 0 && Array.isArray(received.queryChunks)) {
      params = received.queryChunks.filter((chunk) => typeof chunk === "string" || chunk instanceof Date);
    }
    // Prefer a structural assertion: no Date object may be bound (postgres-js rejects them).
    for (const value of params) {
      expect(value instanceof Date, `bound param must not be Date: ${String(value)}`).toBe(false);
    }
    const isoBound = params.some((value) => value === now.toISOString());
    const text = sqlText(received);
    expect(
      isoBound || text.includes(now.toISOString()) || params.some((value) => typeof value === "string" && value.includes("2026-08-03")),
      "claim SQL must bind the ISO timestamp string for timestamptz parameters",
    ).toBe(true);
  });

  it("claimDueJobs rejects a workerId with unsafe characters", async () => {
    const conn = createMockConn();

    await expect(
      claimDueJobs(conn as unknown as import("@reading-advantage/db").DB, {
        batchSize: 5,
        workerId: "w1' OR '1'='1",
      }),
    ).rejects.toThrow("workerId contains unsafe characters");

    expect(conn.execute, "execute must not be called with unsafe workerId").not.toHaveBeenCalled();
  });

  it("claimDueJobs rejects a non-positive batchSize", async () => {
    const conn = createMockConn();

    await expect(
      claimDueJobs(conn as unknown as import("@reading-advantage/db").DB, {
        batchSize: -1,
      }),
    ).rejects.toThrow("batchSize must be a positive integer");

    expect(conn.execute, "execute must not be called with invalid batchSize").not.toHaveBeenCalled();
  });

  (hasDirectDbUrl ? describe : describe.skip)("live DB concurrency", () => {
    it("two concurrent claims never return the same job", async () => {
      // Seeded in beforeEach by integration harness; claimed here.
      const conn = {} as import("@reading-advantage/db").DB; // placeholder for real conn
      const [a, b] = await Promise.all([
        claimDueJobs(conn, 5),
        claimDueJobs(conn, 5),
      ]);

      const idsA = new Set(a.map((j) => j.id));
      const idsB = new Set(b.map((j) => j.id));
      const overlap = [...idsA].filter((id) => idsB.has(id));

      expect(overlap.length, `overlapping claimed job count: ${overlap.length}`).toBe(0);
    });
  });
});
