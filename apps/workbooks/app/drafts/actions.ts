"use server";

import { workbooks } from "@reading-advantage/domain";
import { randomUUID } from "node:crypto";
import { db } from "@reading-advantage/db";
import {
  WorkbookAuthorizationError,
  requireWorkbookSession,
  type WorkbookSession,
} from "../lib/session";

/** Outcome of attempting to publish a draft from the editor workspace. */
export type PublishDraftResult =
  | { ok: true; editionId: string; version: number }
  | { ok: false; code: string; message: string };

/**
 * Runs a workbook publication inside a single database transaction.
 *
 * The domain repository port has no transaction boundary of its own, so the
 * publication (edition append, draft status update and audit event) is bound to
 * a repository built on the transaction handle to keep the writes atomic.
 * @param fn Callback receiving a transaction-bound repository.
 * @returns Whatever the callback returns.
 */
async function runInWorkbookTransaction<T>(
  fn: (repository: workbooks.WorkbookEditionRepositoryPort) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) =>
    fn(
      workbooks.createDrizzleEditionRepository(
        tx as unknown as workbooks.WorkbookDrizzleDatabase,
      ),
    ),
  );
}

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
