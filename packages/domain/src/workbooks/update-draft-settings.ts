import { z } from "zod";
import {
  workbookDraftSettingsSchema,
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

/** Input required to replace the project settings of an editable workbook draft. */
export const workbookDraftSettingsUpdateRequestSchema = z
  .object({
    /** Draft whose settings are being replaced. */
    draftId: z.string().min(1),
    /** Tenant scope that owns the draft; never taken from the frontend. */
    tenantId: z.string().min(1),
    /** Revision the caller last saw; the write succeeds only when it still matches. */
    expectedRevision: z.number().int().nonnegative(),
    /** Project settings replacing the draft's current settings. */
    settings: workbookDraftSettingsSchema,
  })
  .strict();

/** Concrete validated shape of a workbook draft settings update request. */
export type WorkbookDraftSettingsUpdateRequest = z.infer<
  typeof workbookDraftSettingsUpdateRequestSchema
>;

/** Dependencies required to update a workbook draft's settings. */
export interface UpdateWorkbookDraftSettingsDependencies {
  /** Persistence boundary used to read and update the draft. */
  repository: WorkbookEditionRepositoryPort;
  /** Clock supplying the ISO-8601 timestamp recorded on the updated draft. */
  clock: WorkbookClock;
}

/**
 * Replaces the project settings of an editable workbook draft under optimistic
 * concurrency control.
 *
 * The command validates the request, loads the draft, then applies the
 * revision guard and a lifecycle guard before replacing the `settings` field
 * on the draft's source record. Content, source identity, and the content
 * digest are preserved untouched: settings only ride inside the source record,
 * so the persisted record remains publishable without recomputation.
 * @param request The validated update request describing the draft and new settings.
 * @param deps Repository and clock used for the update.
 * @returns The persisted draft with the replaced settings and revision bumped.
 * @throws WorkbookPublicationError with code "VALIDATION_ERROR" for an invalid
 * request, an unknown draft, or invalid settings; "REVISION_CONFLICT" when the
 * draft revision changed since the caller last saw it; "EDITION_IMMUTABLE"
 * when the draft is released; and "ILLEGAL_STATE_TRANSITION" when the draft is
 * under review.
 */
export async function updateWorkbookDraftSettings(
  request: WorkbookDraftSettingsUpdateRequest,
  deps: UpdateWorkbookDraftSettingsDependencies,
): Promise<WorkbookDraft> {
  const parsedRequest = workbookDraftSettingsUpdateRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new WorkbookPublicationError(
      "VALIDATION_ERROR",
      "invalid draft settings update request",
      { detail: "invalid draft settings update request" },
    );
  }
  const { draftId, tenantId, expectedRevision, settings } = parsedRequest.data;

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
    ...existing.sourceRecord,
    settings,
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

  return deps.repository.updateDraftSettings(
    tenantId,
    draftId,
    expectedRevision,
    settings,
    deps.clock.now(),
  );
}
