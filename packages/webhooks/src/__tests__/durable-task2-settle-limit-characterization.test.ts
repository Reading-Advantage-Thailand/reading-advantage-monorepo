import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { DB } from "@reading-advantage/db";
import { applySettle } from "../review-worker.js";

describe("Durable worker Task 2 — current settle ownership limitation", () => {
  it("settles by job id plus claimed status without a worker or lease token", async () => {
    const capturedWhere: unknown[] = [];
    const db = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation((condition: unknown) => {
            capturedWhere.push(condition);
            return Promise.resolve([]);
          }),
        }),
      }),
    } as unknown as DB;

    await applySettle(db, "00000000-0000-4000-8000-000000000001", {
      status: "succeeded",
      attempts: 1,
      nextAttemptAt: new Date("2026-07-22T00:00:00.000Z"),
      lastError: null,
      claimedAt: null,
      claimedBy: null,
    });

    expect(capturedWhere, "settle WHERE predicate count").toHaveLength(1);
    const query = new PgDialect().sqlToQuery(capturedWhere[0] as never);
    expect(query.params, "current settle CAS parameters").toEqual([
      "00000000-0000-4000-8000-000000000001",
      "claimed",
    ]);
    expect(
      query.params,
      "no worker identity or lease token participates in the current settle CAS",
    ).not.toContain("worker-b");
  });
});
