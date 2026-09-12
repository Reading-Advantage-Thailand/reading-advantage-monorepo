import { z } from "zod";
import { workbookSourceRecordSchema, type WorkbookSourceRecord } from "./contracts.js";
import {
  workbookDraftStatusSchema,
  WorkbookPublicationError,
} from "./edition-state.js";
import { computeWorkbookDigest } from "./digest.js";

/** Persisted shape of a mutable workbook draft. */
export const workbookDraftSchema = z
  .object({
    draftId: z.string().min(1),
    tenantId: z.string().min(1),
    status: workbookDraftStatusSchema,
    sourceRecord: workbookSourceRecordSchema,
    revision: z.number().int().nonnegative(),
    createdBy: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

/** Concrete persisted shape of a mutable workbook draft. */
export type WorkbookDraft = z.infer<typeof workbookDraftSchema>;

/** Persisted shape of an immutable published workbook edition snapshot. */
export const workbookEditionSchema = z
  .object({
    editionId: z.string().min(1),
    draftId: z.string().min(1),
    tenantId: z.string().min(1),
    version: z.number().int().min(1),
    snapshot: workbookSourceRecordSchema,
    contentHash: z.string().min(1),
    publishedAt: z.string().datetime(),
    publishedBy: z.string().min(1),
    idempotencyKey: z.string().min(1),
    supersededByEditionId: z.string().min(1).nullable(),
    revokedAt: z.string().datetime().nullable(),
  })
  .strict();

/** Concrete persisted shape of an immutable published workbook edition snapshot. */
export type WorkbookEdition = z.infer<typeof workbookEditionSchema>;

/** Persisted shape of a workbook publication request. */
export const workbookPublicationRequestSchema = z
  .object({
    draftId: z.string().min(1),
    tenantId: z.string().min(1),
    expectedRevision: z.number().int().nonnegative(),
    idempotencyKey: z.string().min(1),
    publishedBy: z.string().min(1),
  })
  .strict();

/** Concrete persisted shape of a workbook publication request. */
export type WorkbookPublicationRequest = z.infer<
  typeof workbookPublicationRequestSchema
>;

/**
 * Asserts that a workbook source record is complete enough to be published.
 * @param record Workbook source record whose snapshot completeness requires verification.
 * @throws WorkbookPublicationError with code "INCOMPLETE_SNAPSHOT" when the record
 * has no paragraphs, has a blank title, or its content hash does not match its content;
 * the first failing check is reported.
 * @returns Nothing when the snapshot is complete.
 */
export function assertSnapshotComplete(record: WorkbookSourceRecord): void {
  if (record.content.paragraphs.length === 0) {
    throw new WorkbookPublicationError(
      "INCOMPLETE_SNAPSHOT",
      "Snapshot is missing content: content.paragraphs is empty.",
      { detail: "content.paragraphs is empty" },
    );
  }
  if (record.content.title.trim().length === 0) {
    throw new WorkbookPublicationError(
      "INCOMPLETE_SNAPSHOT",
      "Snapshot is missing content: content.title is empty.",
      { detail: "content.title is empty" },
    );
  }
  if (record.identity.contentHash !== computeWorkbookDigest(record.content)) {
    throw new WorkbookPublicationError(
      "INCOMPLETE_SNAPSHOT",
      "Snapshot content is inconsistent: contentHash does not match content.",
      { detail: "contentHash does not match content" },
    );
  }
}

/**
 * Asserts that an expected revision matches the actual revision of a draft.
 * @param actualRevision Revision currently held by the draft.
 * @param expectedRevision Revision the caller expected at request time.
 * @throws WorkbookPublicationError with code "REVISION_CONFLICT" when the revisions differ.
 * @returns Nothing when the revisions are equal.
 */
export function assertExpectedRevision(
  actualRevision: number,
  expectedRevision: number,
): void {
  if (actualRevision !== expectedRevision) {
    throw new WorkbookPublicationError(
      "REVISION_CONFLICT",
      `Revision conflict: actual revision ${actualRevision} does not match expected revision ${expectedRevision}.`,
    );
  }
}
