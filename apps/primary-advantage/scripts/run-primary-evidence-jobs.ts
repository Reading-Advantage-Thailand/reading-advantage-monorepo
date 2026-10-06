/**
 * Local runner of the `primary.mastery.evidence` jobs (track primary_mastery_evidence_20261006, AC-6).
 * The shared worker (`services/worker`) wires no handlers yet; until it registers
 * `definePrimaryEvidenceJobHandler`, this script claims, runs, and settles the due jobs of every
 * school with pending jobs, with the same port calls the worker makes. It stops when every queue
 * is empty.
 *
 * Usage (from the app folder):
 *   pnpm evidence:run                    # every school with pending jobs
 *   pnpm evidence:run -- --school <id>   # one school
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { createDurableJobQueuePort } from "@reading-advantage/backend/jobs/adapters/postgres";
import { db } from "@reading-advantage/db";
import { client } from "@reading-advantage/db/client";
import { durableJobs } from "@reading-advantage/db/schema";
import { definePrimaryEvidenceJobHandler, PRIMARY_EVIDENCE_JOB_NAME, PRIMARY_EVIDENCE_QUEUE_NAME } from "@reading-advantage/domain/primary-mastery";

const WORKER_ID = `primary-evidence-local:${process.pid}`;
const LEASE_SECONDS = 60;
const BATCH = 20;

/**
 * Lists the schools that have evidence jobs without a completion.
 * @param schoolId Limits the list to one school when set.
 * @returns The distinct tenant ids.
 */
async function tenantsWithWork(schoolId: string | null): Promise<string[]> {
  const rows = await db
    .selectDistinct({ tenantId: durableJobs.tenantId })
    .from(durableJobs)
    .where(and(eq(durableJobs.jobName, PRIMARY_EVIDENCE_JOB_NAME), isNull(durableJobs.completedAt), schoolId ? eq(durableJobs.tenantId, schoolId) : undefined));
  return rows.map((row) => row.tenantId).filter((id): id is string => Boolean(id));
}

async function main(): Promise<void> {
  const schoolIndex = process.argv.indexOf("--school");
  const schoolId = schoolIndex >= 0 ? (process.argv[schoolIndex + 1] ?? null) : null;
  const port = createDurableJobQueuePort({ sql: client });
  const handler = definePrimaryEvidenceJobHandler({ db });
  const totals = { settled: 0, failed: 0, committed: 0, skipped: 0 };
  for (const tenantId of await tenantsWithWork(schoolId)) {
    const tenant = { mode: "tenant" as const, tenantId };
    for (;;) {
      const now = new Date().toISOString();
      await port.reclaimExpired({ queueName: PRIMARY_EVIDENCE_QUEUE_NAME, tenant, limit: BATCH, now });
      const claimed = await port.claim({ queueName: PRIMARY_EVIDENCE_QUEUE_NAME, tenant, workerId: WORKER_ID, limit: BATCH, leaseSeconds: LEASE_SECONDS, now });
      if (claimed.outcome === "empty") break;
      for (const job of claimed.jobs) {
        const lease = { jobId: job.id, tenant: job.tenant, leaseToken: job.lease.token };
        try {
          const payload = handler.payload.parse(job.payload);
          const result = handler.result.parse(await handler.handle({ jobId: job.id, attempt: job.attempt, maxAttempts: job.maxAttempts, tenant: job.tenant, signal: new AbortController().signal }, payload));
          await port.settle({ ...lease, result, now: new Date().toISOString() });
          totals.settled += 1;
          totals.committed += result.committed;
          totals.skipped += result.skipped;
          console.log(JSON.stringify({ event: "primary.mastery.evidence.job", jobId: job.id, ...payload, ...result }));
        } catch (error) {
          totals.failed += 1;
          const safeSummary = (error instanceof Error ? error.message : String(error)).slice(0, 1_000) || "unknown";
          await port.fail({ ...lease, error: { code: "PRIMARY_EVIDENCE_FAILED", safeSummary }, now: new Date().toISOString() });
          console.error(JSON.stringify({ event: "primary.mastery.evidence.job_failed", jobId: job.id, attempt: job.attempt, safeSummary }));
        }
      }
    }
  }
  console.log(JSON.stringify({ event: "primary.mastery.evidence.run.done", ...totals }));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
