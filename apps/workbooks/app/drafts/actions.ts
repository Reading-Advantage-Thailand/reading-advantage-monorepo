"use server";

import { workbooks } from "@reading-advantage/domain";
import { randomUUID } from "node:crypto";
import { getWorkbookRepository } from "../../lib/repository";

/** Outcome of attempting to publish a draft from the editor workspace. */
export type PublishDraftResult =
  | { ok: true; editionId: string; version: number }
  | { ok: false; code: string; message: string };

/**
 * Publishes a draft as an immutable edition on behalf of the signed-in publisher.
 *
 * Domain guards do the real work: optimistic concurrency, lifecycle legality,
 * snapshot completeness and idempotency. Failures are returned as structured
 * results rather than thrown, so the workspace can render them.
 * @param draftId Draft selected in the workspace.
 * @param tenantId Tenant the draft belongs to.
 * @param expectedRevision Revision the editor last saw.
 * @param publishedBy Actor performing the publication.
 * @returns The published edition summary, or a structured failure.
 */
export async function publishDraftAction(
  draftId: string,
  tenantId: string,
  expectedRevision: number,
  publishedBy: string,
): Promise<PublishDraftResult> {
  const repository = getWorkbookRepository();

  try {
    const edition = await workbooks.publishWorkbookEdition(
      {
        draftId,
        tenantId,
        expectedRevision,
        idempotencyKey: `${tenantId}:${draftId}:${expectedRevision}`,
        publishedBy,
      },
      {
        repository,
        clock: { now: () => new Date().toISOString() },
        newId: () => randomUUID(),
      },
    );
    return { ok: true, editionId: edition.editionId, version: edition.version };
  } catch (error) {
    if (error instanceof workbooks.WorkbookPublicationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}
