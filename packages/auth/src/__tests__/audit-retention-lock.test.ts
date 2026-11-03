import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const { createPrivilegedDb, purgeExpiredAuditEvents } = vi.hoisted(() => ({
  createPrivilegedDb: vi.fn(),
  purgeExpiredAuditEvents: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ createPrivilegedDb }));
vi.mock("../audit-retention.js", () => ({ purgeExpiredAuditEvents }));

import {
  AUDIT_RETENTION_LOCK_KEY,
  createAuditRetentionJob,
  releaseAdvisoryLock,
  runPurgeWithLock,
  tryAcquireAdvisoryLock,
} from "../audit-retention-job.js";

const dialect = new PgDialect();

/** Builds a fake privileged connection with mock execute and end. */
function fakeConn() {
  return {
    db: { execute: vi.fn() },
    client: { end: vi.fn().mockResolvedValue(undefined) },
  };
}

/** Renders the SQL passed to the nth execute call. */
function renderedSql(conn: ReturnType<typeof fakeConn>, n: number) {
  return dialect.sqlToQuery(conn.db.execute.mock.calls[n][0] as SQL);
}

beforeEach(() => {
  createPrivilegedDb.mockReset();
  purgeExpiredAuditEvents.mockReset();
});

describe("tryAcquireAdvisoryLock", () => {
  it("returns true when a shared connection gets the lock", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([{ acquired: true }]);

    await expect(tryAcquireAdvisoryLock(conn as never)).resolves.toBe(true);
    const q = renderedSql(conn, 0);
    expect(q.sql).toMatch(/pg_try_advisory_lock/);
    expect(q.params).toEqual([AUDIT_RETENTION_LOCK_KEY]);
    expect(createPrivilegedDb).not.toHaveBeenCalled();
    expect(conn.client.end).not.toHaveBeenCalled();
  });

  it("returns false when another holder has the lock", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([{ acquired: false }]);
    await expect(tryAcquireAdvisoryLock(conn as never)).resolves.toBe(false);
  });

  it("returns false when the query returns no row", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([]);
    await expect(tryAcquireAdvisoryLock(conn as never)).resolves.toBe(false);
  });

  it("returns false for a truthy non-boolean acquired value", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([{ acquired: "t" }]);
    await expect(tryAcquireAdvisoryLock(conn as never)).resolves.toBe(false);
  });

  it("opens and closes its own connection when none is passed", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([{ acquired: true }]);
    createPrivilegedDb.mockReturnValue(conn);

    await expect(tryAcquireAdvisoryLock()).resolves.toBe(true);
    expect(createPrivilegedDb).toHaveBeenCalledTimes(1);
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("returns false on its own connection when the lock is held", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([]);
    createPrivilegedDb.mockReturnValue(conn);

    await expect(tryAcquireAdvisoryLock()).resolves.toBe(false);
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("closes its own connection when the lock query fails", async () => {
    const conn = fakeConn();
    conn.db.execute.mockRejectedValue(new Error("db down"));
    createPrivilegedDb.mockReturnValue(conn);

    await expect(tryAcquireAdvisoryLock()).rejects.toThrow("db down");
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });
});

describe("releaseAdvisoryLock", () => {
  it("unlocks on the shared connection and leaves it open", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([]);

    await releaseAdvisoryLock(conn as never);

    const q = renderedSql(conn, 0);
    expect(q.sql).toMatch(/pg_advisory_unlock/);
    expect(q.params).toEqual([AUDIT_RETENTION_LOCK_KEY]);
    expect(conn.client.end).not.toHaveBeenCalled();
    expect(createPrivilegedDb).not.toHaveBeenCalled();
  });

  it("opens and closes its own connection when none is passed", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValue([]);
    createPrivilegedDb.mockReturnValue(conn);

    await releaseAdvisoryLock();

    expect(conn.db.execute).toHaveBeenCalledTimes(1);
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("closes its own connection when the unlock fails", async () => {
    const conn = fakeConn();
    conn.db.execute.mockRejectedValue(new Error("unlock failed"));
    createPrivilegedDb.mockReturnValue(conn);

    await expect(releaseAdvisoryLock()).rejects.toThrow("unlock failed");
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });
});

describe("runPurgeWithLock", () => {
  it("skips the purge and closes the connection when the lock is held", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValueOnce([{ acquired: false }]);
    createPrivilegedDb.mockReturnValue(conn);

    await expect(runPurgeWithLock()).resolves.toEqual({ deleted: 0 });
    expect(purgeExpiredAuditEvents).not.toHaveBeenCalled();
    expect(conn.db.execute).toHaveBeenCalledTimes(1);
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("locks, purges, unlocks, and closes on one connection", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValueOnce([{ acquired: true }]).mockResolvedValueOnce([]);
    createPrivilegedDb.mockReturnValue(conn);
    purgeExpiredAuditEvents.mockResolvedValue({ deleted: 42 });

    await expect(runPurgeWithLock()).resolves.toEqual({ deleted: 42 });

    expect(createPrivilegedDb).toHaveBeenCalledTimes(1);
    expect(purgeExpiredAuditEvents).toHaveBeenCalledWith(undefined, {
      db: conn.db,
      client: conn.client,
    });
    expect(renderedSql(conn, 0).sql).toMatch(/pg_try_advisory_lock/);
    expect(renderedSql(conn, 1).sql).toMatch(/pg_advisory_unlock/);
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("unlocks and closes when the purge fails", async () => {
    const conn = fakeConn();
    conn.db.execute.mockResolvedValueOnce([{ acquired: true }]).mockResolvedValueOnce([]);
    createPrivilegedDb.mockReturnValue(conn);
    purgeExpiredAuditEvents.mockRejectedValue(new Error("purge failed"));

    await expect(runPurgeWithLock()).rejects.toThrow("purge failed");
    expect(renderedSql(conn, 1).sql).toMatch(/pg_advisory_unlock/);
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });

  it("closes the connection when the lock query fails", async () => {
    const conn = fakeConn();
    conn.db.execute.mockRejectedValueOnce(new Error("lock failed"));
    createPrivilegedDb.mockReturnValue(conn);

    await expect(runPurgeWithLock()).rejects.toThrow("lock failed");
    expect(purgeExpiredAuditEvents).not.toHaveBeenCalled();
    expect(conn.client.end).toHaveBeenCalledTimes(1);
  });
});

describe("createAuditRetentionJob scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Sets up one connection that grants the lock on every call. */
  function grantLock() {
    const conn = fakeConn();
    conn.db.execute.mockImplementation(async () => [{ acquired: true }]);
    createPrivilegedDb.mockReturnValue(conn);
    return conn;
  }

  it("run returns the purge result while the job is active", async () => {
    grantLock();
    purgeExpiredAuditEvents.mockResolvedValue({ deleted: 5 });

    await expect(createAuditRetentionJob().run()).resolves.toEqual({ deleted: 5 });
  });

  it("start runs the purge once per interval", async () => {
    grantLock();
    purgeExpiredAuditEvents.mockResolvedValue({ deleted: 1 });
    const job = createAuditRetentionJob(1000);

    job.start();
    await vi.advanceTimersByTimeAsync(999);
    expect(purgeExpiredAuditEvents).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(purgeExpiredAuditEvents).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(purgeExpiredAuditEvents).toHaveBeenCalledTimes(3);
    job.stop();
  });

  it("double start schedules only one interval", async () => {
    grantLock();
    purgeExpiredAuditEvents.mockResolvedValue({ deleted: 0 });
    const job = createAuditRetentionJob(1000);

    job.start();
    job.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(purgeExpiredAuditEvents).toHaveBeenCalledTimes(1);
    job.stop();
  });

  it("swallows a failed scheduled run and keeps the schedule", async () => {
    grantLock();
    purgeExpiredAuditEvents
      .mockRejectedValueOnce(new Error("first run failed"))
      .mockResolvedValue({ deleted: 0 });
    const job = createAuditRetentionJob(1000);

    job.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(purgeExpiredAuditEvents).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it("stop ends the schedule", async () => {
    grantLock();
    purgeExpiredAuditEvents.mockResolvedValue({ deleted: 0 });
    const job = createAuditRetentionJob(1000);

    job.start();
    job.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(purgeExpiredAuditEvents).not.toHaveBeenCalled();
    expect(createPrivilegedDb).not.toHaveBeenCalled();
  });

  it("start after stop resumes runs", async () => {
    grantLock();
    purgeExpiredAuditEvents.mockResolvedValue({ deleted: 3 });
    const job = createAuditRetentionJob(1000);

    job.stop();
    job.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(purgeExpiredAuditEvents).toHaveBeenCalledTimes(1);
    await expect(job.run()).resolves.toEqual({ deleted: 3 });
    job.stop();
  });

  it("uses a 24 hour default interval", async () => {
    grantLock();
    purgeExpiredAuditEvents.mockResolvedValue({ deleted: 0 });
    const job = createAuditRetentionJob();

    job.start();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000 - 1);
    expect(purgeExpiredAuditEvents).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(purgeExpiredAuditEvents).toHaveBeenCalledTimes(1);
    job.stop();
  });
});
