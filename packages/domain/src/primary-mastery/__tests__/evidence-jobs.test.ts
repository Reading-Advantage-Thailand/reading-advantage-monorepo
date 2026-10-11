import { describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createInMemoryMasteryPersistence } from "../../mastery/in-memory-mastery-persistence.js";
import { PRIMARY_EVIDENCE_JOB_NAME, PRIMARY_EVIDENCE_QUEUE_NAME } from "../evidence-contracts.js";
import { definePrimaryEvidenceJobHandler, enqueuePrimaryEvidence, primaryEvidenceEnqueueRequest, runPrimaryEvidenceJob } from "../evidence-jobs.js";
import { NOW, ROW, SCHOOL, questionEvent, sampleResolver } from "./evidence-fixtures.js";

const payload = { sourceTable: "user_activity" as const, rowId: ROW };
const noDb = {} as DB;

describe("evidence jobs (FR-5)", () => {
  it("builds one tenant-scoped enqueue request per source row with a stable idempotency key", () => {
    const request = primaryEvidenceEnqueueRequest({ payload, schoolId: SCHOOL, now: NOW });
    expect(request).toEqual({
      jobName: PRIMARY_EVIDENCE_JOB_NAME,
      queueName: PRIMARY_EVIDENCE_QUEUE_NAME,
      tenant: { mode: "tenant", tenantId: SCHOOL },
      idempotencyKey: `${PRIMARY_EVIDENCE_JOB_NAME}:user_activity:${ROW}`,
      payload,
      maxAttempts: 5,
      availableAt: NOW,
    });
    expect(primaryEvidenceEnqueueRequest({ payload, schoolId: SCHOOL, now: NOW })).toEqual(request);
  });

  it("enqueues through the port once and returns its outcome", async () => {
    const enqueue = vi.fn().mockResolvedValue({ outcome: "created", jobId: "job-1" });
    const result = await enqueuePrimaryEvidence({ port: { enqueue }, payload, schoolId: SCHOOL, now: NOW });
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][0]).toMatchObject({ jobName: PRIMARY_EVIDENCE_JOB_NAME, tenant: { mode: "tenant", tenantId: SCHOOL } });
    expect(result).toEqual({ outcome: "created", jobId: "job-1" });
  });

  it("runs a job: loads the row, records the evidence, and settles with the counts", async () => {
    const persistence = createInMemoryMasteryPersistence();
    const load = vi.fn().mockResolvedValue({ schoolId: SCHOOL, event: questionEvent() });
    const result = await runPrimaryEvidenceJob({ db: noDb, payload, tenant: { schoolId: SCHOOL }, persistence, resolver: sampleResolver(), load });
    expect(load).toHaveBeenCalledWith({ db: noDb, payload });
    expect(result).toEqual({ status: "recorded", committed: 2, skipped: 0 });
    expect((await persistence.readSnapshot({ schoolId: SCHOOL })).evidence).toHaveLength(2);
  });

  it("settles row-missing when the source row is gone, and writes nothing", async () => {
    const persistence = createInMemoryMasteryPersistence();
    const result = await runPrimaryEvidenceJob({ db: noDb, payload, tenant: { schoolId: SCHOOL }, persistence, resolver: sampleResolver(), load: async () => null });
    expect(result).toEqual({ status: "row-missing", committed: 0, skipped: 0 });
    expect((await persistence.readSnapshot({ schoolId: SCHOOL })).evidence).toEqual([]);
  });

  it("refuses a row of another school before any write (FR-6)", async () => {
    const persistence = createInMemoryMasteryPersistence();
    const result = await runPrimaryEvidenceJob({ db: noDb, payload, tenant: { schoolId: SCHOOL }, persistence, resolver: sampleResolver(), load: async () => ({ schoolId: "66666666-6666-4666-8666-666666666666", event: questionEvent() }) });
    expect(result).toEqual({ status: "tenant-mismatch", committed: 0, skipped: 0 });
    expect((await persistence.readSnapshot({ schoolId: SCHOOL })).evidence).toEqual([]);
  });

  it("defines a tenant-scoped durable job handler with the payload and result contracts", async () => {
    const persistence = createInMemoryMasteryPersistence();
    const handler = definePrimaryEvidenceJobHandler({ db: noDb, persistenceFor: () => persistence, resolver: sampleResolver(), load: async () => ({ schoolId: SCHOOL, event: questionEvent() }) });
    expect(handler).toMatchObject({ jobName: PRIMARY_EVIDENCE_JOB_NAME, tenantMode: "tenant" });
    expect(handler.payload.safeParse(payload).success).toBe(true);
    expect(handler.payload.safeParse({ sourceTable: "users", rowId: ROW }).success).toBe(false);
    const result = await handler.handle({ jobId: "job-1", attempt: 1, maxAttempts: 5, tenant: { mode: "tenant", tenantId: SCHOOL }, signal: new AbortController().signal }, payload);
    expect(handler.result.safeParse(result).success).toBe(true);
    expect(result).toEqual({ status: "recorded", committed: 2, skipped: 0 });
  });

  it("refuses a global-scope execution context", async () => {
    const handler = definePrimaryEvidenceJobHandler({ db: noDb, persistenceFor: () => createInMemoryMasteryPersistence(), resolver: sampleResolver(), load: async () => null });
    await expect(handler.handle({ jobId: "job-1", attempt: 1, maxAttempts: 5, tenant: { mode: "global" }, signal: new AbortController().signal }, payload)).rejects.toThrow(/tenant/);
  });
});
