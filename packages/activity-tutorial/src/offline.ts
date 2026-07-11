import { tutorialCredentialClaimsSchema } from "./credential-contracts.js";
import { tutorialReportRequestSchema, uploadTutorialReport, type VerifiedTutorialReport } from "./reporting.js";
import { z } from "zod";

/** Minimal synchronous storage surface implemented by browser localStorage. */
export interface TutorialQueueStorage {
  /** Reads one serialized queue value. */
  getItem(key: string): string | null;
  /** Writes one serialized queue value. */
  setItem(key: string, value: string): void;
}

/** Durable queued tutorial report awaiting an authenticated upload retry. */
export type QueuedTutorialReport = {
  queueId: string;
  endpoint: string;
  request: unknown;
  credentialExpiresAt: string;
  attempts: number;
  nextAttemptAt: string;
};

const queuedTutorialReportSchema = z.object({
  queueId: z.string().min(1), endpoint: z.string().min(1), request: tutorialReportRequestSchema,
  credentialExpiresAt: z.string().datetime({ offset: true }), attempts: z.number().int().nonnegative(), nextAttemptAt: z.string().datetime({ offset: true }),
}).strict();

function decodeCredentialExpiry(token: string): string {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("Malformed tutorial credential");
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const json = decodeURIComponent(Array.from(globalThis.atob(base64), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  return tutorialCredentialClaimsSchema.parse(JSON.parse(json)).expiresAt;
}

/** Durable offline queue used by tutorial upload clients. */
export interface TutorialReportQueue {
  /** Adds or replaces one deduplicated queued report. */
  enqueue(entry: QueuedTutorialReport): Promise<void>;
  /** Returns due reports in deterministic queue order. */
  due(now: string): Promise<QueuedTutorialReport[]>;
  /** Removes a successfully uploaded report. */
  remove(queueId: string): Promise<void>;
  /** Updates retry metadata after a failed upload. */
  retry(queueId: string, attempts: number, nextAttemptAt: string): Promise<void>;
}

/**
 * Creates a durable browser-storage queue for offline tutorial reports.
 * @param storage Browser-compatible persistent key-value storage.
 * @param storageKey Namespaced storage key for this application.
 * @returns Queue with deduplication and bounded retry metadata.
 */
export function createStorageTutorialReportQueue(storage: TutorialQueueStorage, storageKey = "activity-tutorial-report-queue.v1"): TutorialReportQueue {
  const read = (): QueuedTutorialReport[] => {
    try {
      const parsed: unknown = JSON.parse(storage.getItem(storageKey) ?? "[]");
      return Array.isArray(parsed) ? parsed.flatMap((entry) => {
        const result = queuedTutorialReportSchema.safeParse(entry);
        return result.success ? [result.data] : [];
      }) : [];
    } catch {
      return [];
    }
  };
  const write = (entries: QueuedTutorialReport[]) => storage.setItem(storageKey, JSON.stringify(entries));
  return {
    async enqueue(entry) {
      queuedTutorialReportSchema.parse(entry);
      const entries = read().filter(({ queueId }) => queueId !== entry.queueId);
      entries.push(entry);
      write(entries.sort((left, right) => left.queueId.localeCompare(right.queueId)));
    },
    async due(now) { return read().filter(({ nextAttemptAt }) => Date.parse(nextAttemptAt) <= Date.parse(now)); },
    async remove(queueId) { write(read().filter((entry) => entry.queueId !== queueId)); },
    async retry(queueId, attempts, nextAttemptAt) { write(read().map((entry) => entry.queueId === queueId ? { ...entry, attempts, nextAttemptAt } : entry)); },
  };
}

/**
 * Enqueues one validated report before attempting network delivery.
 * @param queue Durable offline queue.
 * @param endpoint Authenticated server report endpoint.
 * @param request Secret-free local report and short-lived credential.
 * @param now Current client time.
 * @returns Stable queue identifier used to deduplicate retries.
 */
export async function enqueueTutorialReport(queue: TutorialReportQueue, endpoint: string, request: unknown, now: string): Promise<string> {
  const parsed = tutorialReportRequestSchema.parse(request);
  const credentialExpiresAt = decodeCredentialExpiry(parsed.credential);
  const queueId = `${endpoint}\u0000${parsed.submissionId}\u0000${parsed.credential.slice(-16)}`;
  await queue.enqueue({ queueId, endpoint, request: parsed, credentialExpiresAt, attempts: 0, nextAttemptAt: now });
  return queueId;
}

/**
 * Flushes due offline reports with bounded exponential retry metadata.
 * @param queue Durable offline queue.
 * @param now Current client time.
 * @param send Injected authenticated network adapter.
 * @param refreshCredential Optional authenticated refresh adapter for expired queued reports.
 * @returns Successfully verified responses plus retryable and terminal expiry counts.
 */
export async function flushTutorialReportQueue(queue: TutorialReportQueue, now: string, send: (endpoint: string, body: unknown) => Promise<unknown>, refreshCredential?: (entry: QueuedTutorialReport) => Promise<unknown | null>): Promise<{ uploaded: VerifiedTutorialReport[]; failed: number; expired: number }> {
  const uploaded: VerifiedTutorialReport[] = [];
  let failed = 0;
  let expired = 0;
  for (const entry of await queue.due(now)) {
    if (Date.parse(now) >= Date.parse(entry.credentialExpiresAt)) {
      const refreshed = refreshCredential ? await refreshCredential(entry) : null;
      await queue.remove(entry.queueId);
      if (refreshed) {
        await enqueueTutorialReport(queue, entry.endpoint, refreshed, now);
      } else {
        expired += 1;
      }
      continue;
    }
    try {
      uploaded.push(await uploadTutorialReport(entry.endpoint, tutorialReportRequestSchema.parse(entry.request), send));
      await queue.remove(entry.queueId);
    } catch {
      failed += 1;
      const attempts = entry.attempts + 1;
      const delayMs = Math.min(5 * 60_000, 1000 * 2 ** Math.min(attempts, 8));
      await queue.retry(entry.queueId, attempts, new Date(Date.parse(now) + delayMs).toISOString());
    }
  }
  return { uploaded, failed, expired };
}
