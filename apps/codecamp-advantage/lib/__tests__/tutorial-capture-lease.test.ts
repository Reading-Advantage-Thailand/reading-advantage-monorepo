import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { acquireTutorialCaptureLease } from "../tutorial-capture-lease";

function mockDb(claims: Array<boolean>) {
  const returning = vi.fn(async () => claims.shift() ? [{ leaseKey: "claimed" }] : []);
  const onConflictDoUpdate = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { db: { insert, update } as never, insert, onConflictDoUpdate, update, set, where };
}

describe("fleet-wide tutorial capture leases", () => {
  it("claims a global slot and learner lease, then releases both token-fenced rows", async () => {
    const adapter = mockDb([true, true]);
    const lease = await acquireTutorialCaptureLease(adapter.db, "learner-1", new Date("2026-07-11T00:00:00Z"));
    expect(lease).not.toBeNull();
    expect(adapter.insert).toHaveBeenCalledTimes(2);
    await lease!.release();
    expect(adapter.update).toHaveBeenCalledTimes(2);
    expect(adapter.where).toHaveBeenCalledTimes(2);
  });

  it("fails closed when every shared global slot is occupied", async () => {
    const adapter = mockDb([false, false]);
    await expect(acquireTutorialCaptureLease(adapter.db, "learner-1", new Date("2026-07-11T00:00:00Z"))).resolves.toBeNull();
    expect(adapter.insert).toHaveBeenCalledTimes(2);
    expect(adapter.update).not.toHaveBeenCalled();
  });

  it("releases the global slot when the learner lease is busy or rate limited", async () => {
    const adapter = mockDb([true, false]);
    await expect(acquireTutorialCaptureLease(adapter.db, "learner-1", new Date("2026-07-11T00:00:00Z"))).resolves.toBeNull();
    expect(adapter.update).toHaveBeenCalledTimes(1);
  });

  it("binds raw CASE timestamps as ISO values and keeps the global limit in PostgreSQL integer range", async () => {
    const adapter = mockDb([true, true]);
    await acquireTutorialCaptureLease(adapter.db, "learner-1", new Date("2026-07-11T00:00:00Z"));

    const conflict = adapter.onConflictDoUpdate.mock.calls[0]![0];
    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(conflict.set.windowStartedAt).params).toEqual([
      "2026-07-10T23:59:00.000Z",
      "2026-07-11T00:00:00.000Z",
    ]);
    expect(dialect.sqlToQuery(conflict.where).params.at(-1)).toBe(2_147_483_647);
  });
});
