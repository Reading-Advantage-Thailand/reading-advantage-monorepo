"use server";

import { z } from "zod";
import { workbooks } from "@reading-advantage/domain";
import { randomUUID } from "node:crypto";
import {
  WorkbookAuthorizationError,
  requireWorkbookSession,
  type WorkbookSession,
} from "../lib/session";
import { runInWorkbookTransaction } from "../../lib/workbook-transaction";

const draftIdSchema = z.string().uuid();

/** Outcome of attempting to publish a draft from the editor workspace. */
export type PublishDraftResult =
  | { ok: true; editionId: string; version: number }
  | { ok: false; code: string; message: string };

/**
 * Publishes a draft as an immutable edition on behalf of the verified session.
 *
 * The tenant and actor are taken from the verified Workbooks session, never
 * from caller arguments, and the whole publication (edition append, draft
 * status update and audit event) runs in one transaction. The draft id is
 * validated at the boundary so a non-UUID value returns a structured
 * VALIDATION_ERROR instead of reaching the repository. Domain guards do the
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

  const parsedId = draftIdSchema.safeParse(draftId);
  if (!parsedId.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "invalid draft id" };
  }

  try {
    const edition = await runInWorkbookTransaction((repository) =>
      workbooks.publishWorkbookEdition(
        {
          draftId: parsedId.data,
          tenantId: session.tenantId,
          expectedRevision,
          idempotencyKey: `${session.tenantId}:${parsedId.data}:${expectedRevision}`,
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
