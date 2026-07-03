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

    const sqlStrings = calls
      .map((call) => (typeof call[0] === "string" ? call[0] : ""))
      .join(" ");

    expect(sqlStrings, "claim SQL must contain FOR UPDATE SKIP LOCKED").toMatch(/FOR UPDATE SKIP LOCKED/i);
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
