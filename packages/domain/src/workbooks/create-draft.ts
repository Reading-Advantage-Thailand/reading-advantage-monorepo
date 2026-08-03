import {
  workbookSourceRecordSchema,
  type WorkbookSourceRecord,
} from "./contracts.js";
import {
  workbookDraftSchema,
  type WorkbookDraft,
} from "./edition-contracts.js";
import { WorkbookPublicationError } from "./edition-state.js";

/** Input required to turn a normalized source record into a new editable draft. */
export interface CreateWorkbookDraftInput {
  /** Tenant scope that owns the new draft. */
  tenantId: string;
  /** Unique identifier for the new draft. */
  draftId: string;
  /** Identifier of the user creating the draft. */
  createdBy: string;
  /** ISO-8601 timestamp of draft creation. */
  createdAt: string;
  /** Normalized source record the draft will be built from. */
  sourceRecord: WorkbookSourceRecord;
}

/**
 * Turns a normalized source record into a new editable draft.
 * @param input Tenant scope, identifiers, creation metadata, and the source record.
 * @throws WorkbookPublicationError with code "VALIDATION_ERROR" when a required
 * field is empty, the source record fails validation, or the constructed draft
 * fails validation.
 * @returns The validated draft, always starting at status "draft" with revision 0.
 */
export function createWorkbookDraft(
  input: CreateWorkbookDraftInput,
): WorkbookDraft {
  const requiredFields = [
    ["tenantId", input.tenantId],
    ["draftId", input.draftId],
    ["createdBy", input.createdBy],
    ["createdAt", input.createdAt],
  ] as const;
  const offendingField = requiredFields.find(
    ([, value]) => value.trim().length === 0,
  );
  if (offendingField) {
    const [fieldName] = offendingField;
    throw new WorkbookPublicationError(
      "VALIDATION_ERROR",
      `${fieldName} is required.`,
      { detail: `${fieldName} is required` },
    );
  }

  const sourceRecordResult = workbookSourceRecordSchema.safeParse(
    input.sourceRecord,
  );
  if (!sourceRecordResult.success) {
    throw new WorkbookPublicationError(
      "VALIDATION_ERROR",
      "sourceRecord is invalid.",
      { detail: "sourceRecord is invalid" },
    );
  }

  const draft: WorkbookDraft = {
    draftId: input.draftId,
    tenantId: input.tenantId,
    status: "draft",
    sourceRecord: sourceRecordResult.data,
    revision: 0,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };

  const draftResult = workbookDraftSchema.safeParse(draft);
  if (!draftResult.success) {
    throw new WorkbookPublicationError(
      "VALIDATION_ERROR",
      "constructed draft failed validation.",
      { detail: "constructed draft failed validation" },
    );
  }

  return draftResult.data;
}
