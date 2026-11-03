import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const { createPrivilegedDb, recordAuditEvent } = vi.hoisted(() => ({
  createPrivilegedDb: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ createPrivilegedDb }));
vi.mock("../audit.js", () => ({ recordAuditEvent }));

import { purgeExpiredAuditEvents } from "../audit-retention.js";

const dialect = new PgDialect();
const NOW = new Date("2026-06-06T00:00:00Z");

/** Builds a fake privileged connection whose execute returns the given batches in order. */
function fakeConn(batches: unknown[]) {
  const execute = vi.fn();
  for (const b of batches) execute.mockResolvedValueOnce(b);
  const end = vi.fn().mockResolvedValue(undefined);
  return { db: { execute }, client: { end } };
}

/** Builds an array of n fake deleted-row records. */
function rows(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `id-${i}` }));
}

describe("purgeExpiredAuditEvents", () => {
  const original = process.env.AUDIT_RETENTION_DAYS;

  beforeEach(() => {
    createPrivilegedDb.mockReset();
    recordAuditEvent.mockReset().mockResolvedValue(undefined);
    process.env.AUDIT_RETENTION_DAYS = "365";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUDIT_RETENTION_DAYS;
    else process.env.AUDIT_RETENTION_DAYS = original;
  });

  it("deletes one short batch on a shared connection and records a purge event", async () => {
    const conn = fakeConn([rows(3)]);
    const result = await purgeExpiredAuditEvents(NOW, conn as never);

    expect(result).toEqual({ deleted: 3 });
    expect(conn.db.execute).toHaveBeenCalledTimes(1);
    expect(createPrivilegedDb).not.toHaveBeenCalled();
    expect(conn.client.end).not.toHaveBeenCalled();
    expect(recordAuditEvent).toHaveBeenCalledWith(
      { actorUserId: null, actorRole: "SYSTEM", ipAddress: null, userAgent: null },
      {
        action: "audit:retention_purge",
        metadata: {
          deletedCount: 3,
          retentionDays: 365,
          cutoff: "2025-06-06T00:00:00.000Z",
        },
      }
    );
  });

  it("binds the cutoff and the 5000 batch size into the DELETE statement", async () => {
    const conn = fakeConn([[]]);
    await purgeExpiredAuditEvents(NOW, conn as never);

    const query = dialect.sqlToQuery(conn.db.execute.mock.calls[0][0] as SQL);
    expect(query.sql).toMatch(/DELETE FROM audit_events/);
    expect(query.sql).toMatch(/created_at </);
    expect(query.sql).toMatch(/RETURNING id/);
    expect(query.params).toEqual(["2025-06-06T00:00:00.000Z", 5000]);
  });

  it("keeps deleting while a batch is full and sums every batch", async () => {
    const conn = fakeConn([rows(5000), rows(5000), rows(7)]);
    const result = await purgeExpiredAuditEvents(NOW, conn as never);

    expect(result).toEqual({ deleted: 10007 });
    expect(conn.db.execute).toHaveBeenCalledTimes(3);
    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
    expect(recordAuditEvent.mock.calls[0][1].metadata.deletedCount).toBe(10007);
  });

  it("runs one more query when the last full batch is exactly 5000 rows", async () => {
    const conn = fakeConn([rows(5000), []]);
    const result = await purgeExpiredAuditEvents(NOW, conn as never);

    expect(result).toEqual({ deleted: 5000 });
    expect(conn.db.execute).toHaveBeenCalledTimes(2);
  });

  it("records no purge event when nothing expired", async () => {
    const conn = fakeConn([[]]);
    const result = await purgeExpiredAuditEvents(NOW, conn as never);

    expect(result).toEqual({ deleted: 0 });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("counts a non-array result as zero rows and stops", async () => {
    const conn = fakeConn([{ rowCount: 9 }]);
    const result = await purgeExpiredAuditEvents(NOW, conn as never);

    expect(result).toEqual({ deleted: 0 });
    expect(conn.db.execute).toHaveBeenCalledTimes(1);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("uses the configured retention days for the cutoff", async () => {
    process.env.AUDIT_RETENTION_DAYS = "1000";
    const conn = fakeConn([rows(1)]);
    await purgeExpiredAuditEvents(NOW, conn as never);

    expect(recordAuditEvent.mock.calls[0][1].metadata).toMatchObject({
      retentionDays: 1000,
      cutoff: "2023-09-10T00:00:00.000Z",
    });
  });

  it("opens and closes its own privileged connection when none is passed", async () => {
    const conn = fakeConn([rows(2)]);
    createPrivilegedDb.mockReturnValue(conn);

    const result = await purgeExpiredAuditEvents(NOW);

    expect(result).toEqual({ deleted: 2 });
    expect(createPrivilegedDb).toHaveBeenCalledTimes(1);
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("closes its own connection when a DELETE fails", async () => {
    const conn = fakeConn([]);
    conn.db.execute.mockRejectedValueOnce(new Error("permission denied"));
    createPrivilegedDb.mockReturnValue(conn);

    await expect(purgeExpiredAuditEvents(NOW)).rejects.toThrow("permission denied");
    expect(conn.client.end).toHaveBeenCalledTimes(1);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("closes its own connection when the purge event write fails", async () => {
    const conn = fakeConn([rows(1)]);
    createPrivilegedDb.mockReturnValue(conn);
    recordAuditEvent.mockRejectedValueOnce(new Error("audit down"));

    await expect(purgeExpiredAuditEvents(NOW)).rejects.toThrow("audit down");
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("leaves a shared connection open when a DELETE fails", async () => {
    const conn = fakeConn([]);
    conn.db.execute.mockRejectedValueOnce(new Error("boom"));

    await expect(purgeExpiredAuditEvents(NOW, conn as never)).rejects.toThrow("boom");
    expect(conn.client.end).not.toHaveBeenCalled();
  });
});
