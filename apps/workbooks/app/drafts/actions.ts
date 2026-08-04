"use server";

import { workbooks } from "@reading-advantage/domain";
import { randomUUID } from "node:crypto";
import {
  WorkbookAuthorizationError,
  requireWorkbookSession,
  type WorkbookSession,
} from "../lib/session";
import { runInWorkbookTransaction } from "../../lib/workbook-transaction";

/** Outcome of attempting to publish a draft from the editor workspace. */
export type PublishDraftResult =
  | { ok: true; editionId: string; version: number }
  | { ok: false; code: string; message: string };

/**
 * Publishes a draft as an immutable edition on behalf of the verified session.
 *
 * The tenant and actor are taken from the verified Workbooks session, never
 * from caller arguments, and the whole publication (edition append, draft
 * status update and audit event) runs in one transaction. Domain guards do the
 * real work: optimistic concurrency, lifecycle legality, snapshot completeness
 * and idempotency. Failures are returned as structured results rather than
 * thrown, so the workspace can render them.
 * @param draftId Draft selected in the workspace.
 * @param expectedRevision Revision the editor last saw.
 * @returns The published edition summary, or a structured failure.
 */
export async function publishDraftAction(
  draftId: string,
  expectedRevision: number,
): Promise<PublishDraftResult> {
  let session: WorkbookSession;
  try {
    session = await requireWorkbookSession();
  } catch (error) {
    if (error instanceof WorkbookAuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }

  try {
    const edition = await runInWorkbookTransaction((repository) =>
      workbooks.publishWorkbookEdition(
        {
          draftId,
          tenantId: session.tenantId,
          expectedRevision,
          idempotencyKey: `${session.tenantId}:${draftId}:${expectedRevision}`,
          publishedBy: session.actorId,
        },
        {
          repository,
          clock: { now: () => new Date().toISOString() },
          newId: () => randomUUID(),
        },
      ),
    );
    return { ok: true, editionId: edition.editionId, version: edition.version };
  } catch (error) {
    if (
      error instanceof workbooks.WorkbookPublicationError ||
      error instanceof WorkbookAuthorizationError
    ) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}
