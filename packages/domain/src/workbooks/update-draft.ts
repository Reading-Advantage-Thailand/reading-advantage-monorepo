import { z } from "zod";
import {
  workbookNormalizedContentSchema,
  workbookSourceRecordSchema,
  type WorkbookSourceRecord,
} from "./contracts.js";
import {
  assertExpectedRevision,
  workbookDraftSchema,
  type WorkbookDraft,
} from "./edition-contracts.js";
import { WorkbookPublicationError } from "./edition-state.js";
import type {
  WorkbookClock,
  WorkbookEditionRepositoryPort,
} from "./edition-repository-port.js";
import { computeWorkbookDigest } from "./digest.js";

/** Input required to replace the content of an editable workbook draft. */
export const workbookDraftUpdateRequestSchema = z
  .object({
    /** Draft whose content is being replaced. */
    draftId: z.string().min(1),
    /** Tenant scope that owns the draft; never taken from the frontend. */
    tenantId: z.string().min(1),
    /** Revision the caller last saw; the write succeeds only when it still matches. */
    expectedRevision: z.number().int().nonnegative(),
    /** Full normalized content replacing the draft's current content. */
    content: workbookNormalizedContentSchema,
  })
  .strict();

/** Concrete validated shape of a workbook draft content update request. */
export type WorkbookDraftUpdateRequest = z.infer<
  typeof workbookDraftUpdateRequestSchema
>;

/** Dependencies required to update a workbook draft's content. */
export interface UpdateWorkbookDraftDependencies {
  /** Persistence boundary used to read and update the draft. */
  repository: WorkbookEditionRepositoryPort;
  /** Clock supplying the ISO-8601 timestamp recorded on the updated draft. */
  clock: WorkbookClock;
}

/**
 * Replaces the content of an editable workbook draft under optimistic
 * concurrency control.
 *
 * The command validates the request, loads the draft, then applies the
 * revision guard and a lifecycle guard before recomputing the content digest,
 * preserving the immutable source identity (sourceApp/sourceId/sourceRevision),
 * and persisting the new content with an incremented revision. The content
 * digest is always derived from the submitted content so the draft remains
 * publishable.
 * @param request The validated update request describing the draft and new content.
 * @param deps Repository and clock used for the update.
 * @returns The persisted draft with the replaced content and revision bumped.
 * @throws WorkbookPublicationError with code "VALIDATION_ERROR" for an invalid
 * request, an unknown draft, or invalid content; "REVISION_CONFLICT" when the
 * draft revision changed since the caller last saw it; "EDITION_IMMUTABLE"
 * when the draft is released; and "ILLEGAL_STATE_TRANSITION" when the draft is
 * under review.
 */
export async function updateWorkbookDraft(
  request: WorkbookDraftUpdateRequest,
  deps: UpdateWorkbookDraftDependencies,
): Promise<WorkbookDraft> {
  const parsedRequest = workbookDraftUpdateRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new WorkbookPublicationError(
      "VALIDATION_ERROR",
      "invalid draft update request",
      { detail: "invalid draft update request" },
    );
  }
  const { draftId, tenantId, expectedRevision, content } = parsedRequest.data;

  const existing: WorkbookDraft | null = await deps.repository.getDraft(
    tenantId,
    draftId,
  );
  if (existing === null) {
    throw new WorkbookPublicationError("VALIDATION_ERROR", "draft not found", {
      detail: "draft not found",
    });
  }

  assertExpectedRevision(existing.revision, expectedRevision);

  if (existing.status !== "draft") {
    const code =
      existing.status === "in_review"
        ? "ILLEGAL_STATE_TRANSITION"
        : "EDITION_IMMUTABLE";
    throw new WorkbookPublicationError(
      code,
      `Cannot edit a draft in status "${existing.status}".`,
      { detail: `draft status is ${existing.status}` },
    );
  }

  const sourceRecord: WorkbookSourceRecord = {
    identity: {
      ...existing.sourceRecord.identity,
      contentHash: computeWorkbookDigest(content),
    },
    content,
  };
  const parsedRecord = workbookSourceRecordSchema.safeParse(sourceRecord);
  if (!parsedRecord.success) {
    throw new WorkbookPublicationError(
      "VALIDATION_ERROR",
      "updated source record is invalid",
      { detail: "updated source record is invalid" },
    );
  }

  const updated: WorkbookDraft = {
    ...existing,
    sourceRecord: parsedRecord.data,
    revision: existing.revision + 1,
    updatedAt: deps.clock.now(),
  };
  const parsedDraft = workbookDraftSchema.safeParse(updated);
  if (!parsedDraft.success) {
    throw new WorkbookPublicationError(
      "VALIDATION_ERROR",
      "constructed draft failed validation",
      { detail: "constructed draft failed validation" },
    );
  }

  return deps.repository.updateDraftContent(
    tenantId,
    draftId,
    parsedRecord.data,
    expectedRevision,
  );
}
