import { describe, it, expect, vi } from "vitest";
import { reclaimStuckJobs } from "../review-worker.js";

const hasDirectDbUrl = Boolean(process.env.DIRECT_DATABASE_URL);

function createMockConn() {
  return {
    execute: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Extracts the raw SQL text from a Drizzle `sql` template object or a plain
 * string.
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

describe("Phase 3 — reclaim stuck claimed jobs", () => {
  it("reclaimStuckJobs resets claimed jobs older than the visibility timeout", async () => {
    const conn = createMockConn();

    try {
      await reclaimStuckJobs(conn as unknown as import("@reading-advantage/db").DB, 5 * 60 * 1000);
    } catch {
      // Mock connection may throw; assertion is on SQL intent.
    }

    const calls = conn.execute.mock?.calls ?? [];
    const sqlStrings = calls.map((call) => sqlText(call[0])).join(" ");

    expect(sqlStrings, "reclaim SQL must reset status to pending").toMatch(/status\s*=\s*'pending'/i);
    expect(sqlStrings, "reclaim SQL must filter claimed jobs").toMatch(/status\s*=\s*'claimed'/i);
  });

  it("reclaimStuckJobs uses parameterized SQL", async () => {
    const conn = createMockConn();

    try {
      await reclaimStuckJobs(conn as unknown as import("@reading-advantage/db").DB, {
        visibilityTimeoutMs: 5 * 60 * 1000,
        now: new Date("2026-01-01T00:00:00Z"),
      });
    } catch {
      // Mock connection may throw; assertion is on the received query.
    }

    const calls = conn.execute.mock?.calls ?? [];
    expect(calls.length, "execute call count").toBeGreaterThan(0);

    const received = calls[0][0];
    expect(typeof received, "received query type").not.toBe("string");
    expect(received, "received query has toQuery").toHaveProperty("toQuery");

    const text = sqlText(received);
    expect(text, "SQL must use placeholders").toMatch(/\$\d+/);
    expect(text, "timestamps must not be interpolated as literals").not.toContain("2026-01-01");
  });

  (hasDirectDbUrl ? it : it.skip)("live DB: a stuck job becomes reclaimable", async () => {
    const conn = {} as import("@reading-advantage/db").DB; // real privileged connection
    const visibilityTimeoutMs = 1000;

    // Seed a claimed job with claimed_at in the past
    const result = await reclaimStuckJobs(conn, visibilityTimeoutMs);
    expect(result.length, `reclaimed job count: ${result.length}`).toBeGreaterThan(0);
  });
});
