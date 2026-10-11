/**
 * The evidence summary for calibration (track primary_mastery_evidence_20261006, FR-8): how
 * much evidence each surface produced, per day and per confidence step, and what the jobs
 * settled with. T3's internal admin page and the shadow-mode tuning read it.
 */
import type { DB } from "@reading-advantage/db";
import { durableJobs, masteryEvidence } from "@reading-advantage/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { createTenantDB } from "../db-contract.js";
import { PRIMARY_EVIDENCE_JOB_NAME, primaryEvidenceJobResultSchema } from "./evidence-contracts.js";

/** The summary. */
export interface PrimaryEvidenceSummary {
  since: string;
  total: number;
  /** `game:<id>` variants fold into `game`. */
  bySurface: Record<string, number>;
  byDay: Record<string, number>;
  byConfidence: Record<string, number>;
  jobs: { recorded: number; "row-missing": number; "tenant-mismatch": number; pending: number; committed: number; skipped: number };
}

const surfaceOf = (variantKey: string): string => (variantKey.startsWith("game:") ? "game" : variantKey);
const count = (record: Record<string, number>, key: string): void => {
  record[key] = (record[key] ?? 0) + 1;
};

/**
 * Summarizes the school's Primary evidence since a date.
 * @param params The database, the tenant, and the start of the window.
 * @returns The counts.
 */
export async function summarizePrimaryEvidence(params: { db: DB; tenant: { schoolId: string }; since: Date }): Promise<PrimaryEvidenceSummary> {
  const tenantDb = createTenantDB(params.db, params.tenant);
  const rows = await tenantDb.select({ variantKey: masteryEvidence.variantKey, evidenceConfidence: masteryEvidence.evidenceConfidence, observedAt: masteryEvidence.observedAt }).from(masteryEvidence).where(gte(masteryEvidence.observedAt, params.since));
  const jobRows = await tenantDb
    .unscoped("durable_jobs is global infrastructure (EXEMPT); filtered by job name and tenant id here")
    .select({ resultJson: durableJobs.resultJson })
    .from(durableJobs)
    .where(and(eq(durableJobs.jobName, PRIMARY_EVIDENCE_JOB_NAME), eq(durableJobs.tenantId, params.tenant.schoolId), gte(durableJobs.createdAt, params.since)));

  const summary: PrimaryEvidenceSummary = { since: params.since.toISOString(), total: rows.length, bySurface: {}, byDay: {}, byConfidence: {}, jobs: { recorded: 0, "row-missing": 0, "tenant-mismatch": 0, pending: 0, committed: 0, skipped: 0 } };
  for (const row of rows) {
    count(summary.bySurface, surfaceOf(row.variantKey));
    count(summary.byDay, new Date(row.observedAt).toISOString().slice(0, 10));
    count(summary.byConfidence, String(row.evidenceConfidence));
  }
  for (const job of jobRows) {
    const result = primaryEvidenceJobResultSchema.safeParse(job.resultJson);
    if (!result.success) {
      summary.jobs.pending += 1;
      continue;
    }
    summary.jobs[result.data.status] += 1;
    summary.jobs.committed += result.data.committed;
    summary.jobs.skipped += result.data.skipped;
  }
  return summary;
}
