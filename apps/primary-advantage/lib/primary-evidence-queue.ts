import "server-only";
import type { DurableJobQueuePort } from "@reading-advantage/backend/jobs";
import { createDurableJobQueuePort } from "@reading-advantage/backend/jobs/adapters/postgres";
import { enqueuePrimaryEvidence, type PrimaryEvidenceJobPayload } from "@reading-advantage/domain/primary-mastery";
import { createPrimaryEvidenceSql } from "@/lib/primary-evidence-sql";

let port: DurableJobQueuePort | undefined;

/**
 * The durable job queue of this app, built once over its own postgres client.
 * @returns The enqueue port.
 */
function queuePort(): DurableJobQueuePort {
  port ??= createDurableJobQueuePort({ sql: createPrimaryEvidenceSql() });
  return port;
}

/**
 * Enqueues the mastery evidence job of one source row after the request path's own write
 * (track primary_mastery_evidence_20261006, FR-5). A queue failure never fails the request:
 * the one-time backfill script and a later enqueue of the same row replay it.
 * @param payload The source table and row id.
 * @param schoolId The student's school; the job runs in that tenant scope.
 * @returns True when the job was created or refreshed, false when the queue refused it.
 */
export async function enqueuePrimaryEvidenceJob(payload: PrimaryEvidenceJobPayload, schoolId: string | null | undefined): Promise<boolean> {
  if (!schoolId) return false;
  try {
    const result = await enqueuePrimaryEvidence({ port: queuePort(), payload, schoolId });
    return result.outcome !== "conflict";
  } catch (error) {
    console.error(JSON.stringify({ event: "primary.mastery.evidence.enqueue_failed", sourceTable: payload.sourceTable, rowId: payload.rowId, message: error instanceof Error ? error.message : String(error) }));
    return false;
  }
}
