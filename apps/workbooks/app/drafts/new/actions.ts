"use server";

import { randomUUID } from "node:crypto";
import { workbooks } from "@reading-advantage/domain";
import { getWorkbookRepository } from "../../../lib/repository";

/** Outcome of creating a draft from selected source content. */
export type CreateDraftResult =
  | { ok: true; draftId: string }
  | { ok: false; code: string; message: string };

/**
 * Creates a workbook draft from a Reading Advantage source payload.
 *
 * Normalization and draft construction are domain concerns; this action only
 * supplies identifiers, the clock and the repository. Domain failures are returned
 * as structured results so the workspace can render them.
 * @param rawSource Raw Reading Advantage payload selected by the editor.
 * @param tenantId Tenant the draft belongs to.
 * @param createdBy Editor creating the draft.
 * @returns The new draft identifier, or a structured failure.
 */
export async function createDraftAction(
  rawSource: unknown,
  tenantId: string,
  createdBy: string,
): Promise<CreateDraftResult> {
  try {
    const sourceRecord = workbooks.normalizeReadingAdvantageSource(rawSource);
    const draft = workbooks.createWorkbookDraft({
      tenantId,
      draftId: randomUUID(),
      createdBy,
      createdAt: new Date().toISOString(),
      sourceRecord,
    });
    await getWorkbookRepository().createDraft(draft);
    return { ok: true, draftId: draft.draftId };
  } catch (error) {
    if (
      error instanceof workbooks.WorkbookCatalogError ||
      error instanceof workbooks.WorkbookPublicationError
    ) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}
