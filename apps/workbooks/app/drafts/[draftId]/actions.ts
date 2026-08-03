"use server";

import { z } from "zod";
import { workbooks } from "@reading-advantage/domain";
import { getWorkbookRepository } from "../../../lib/repository";
import {
  WorkbookAuthorizationError,
  requireWorkbookSession,
  type WorkbookSession,
} from "../../lib/session";

const draftIdSchema = z.string().min(1);
const revisionSchema = z.number().int().nonnegative();

/** Outcome of loading a draft for the editor workspace. */
export type GetDraftResult =
  | { ok: true; draft: workbooks.WorkbookDraft | null }
  | { ok: false; code: string; message: string };

/** Outcome of saving a draft from the editor workspace. */
export type UpdateDraftResult =
  | { ok: true; draft: workbooks.WorkbookDraft }
  | { ok: false; code: string; message: string; retryable: boolean };

/**
 * Loads a workbook draft for the verified session's tenant.
 *
 * The tenant comes from the verified session, never from caller arguments, so
 * a draft identifier can only ever be read inside its owner tenant.
 * @param draftId Draft selected in the workspace.
 * @returns The tenant-scoped draft (or null when missing), or a structured
 * failure when the session is not authorized.
 */
export async function getDraftAction(
  draftId: string,
): Promise<GetDraftResult> {
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

  const draft = await getWorkbookRepository().getDraft(
    session.tenantId,
    parsedId.data,
  );
  return { ok: true, draft };
}

/**
 * Saves normalized draft content on behalf of the verified session.
 *
 * The tenant and actor come from the verified session. The submitted content
 * is validated against the normalized content contract at the boundary before
 * the domain update command applies optimistic concurrency and lifecycle
 * guards. Failures are returned as structured results so the workspace can
 * render them, including REVISION_CONFLICT for stale editors.
 * @param draftId Draft selected in the workspace.
 * @param expectedRevision Revision the editor last saw.
 * @param rawContent Normalized content payload submitted by the editor.
 * @returns The persisted draft, or a structured failure.
 */
export async function updateDraftAction(
  draftId: string,
  expectedRevision: number,
  rawContent: unknown,
): Promise<UpdateDraftResult> {
  let session: WorkbookSession;
  try {
    session = await requireWorkbookSession();
  } catch (error) {
    if (error instanceof WorkbookAuthorizationError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        retryable: false,
      };
    }
    throw error;
  }

  const parsedId = draftIdSchema.safeParse(draftId);
  if (!parsedId.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "invalid draft id",
      retryable: false,
    };
  }
  const parsedRevision = revisionSchema.safeParse(expectedRevision);
  if (!parsedRevision.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "invalid revision",
      retryable: false,
    };
  }
  const parsedContent = workbooks.workbookNormalizedContentSchema.safeParse(
    rawContent,
  );
  if (!parsedContent.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "content does not satisfy the normalized workbook contract",
      retryable: false,
    };
  }

  try {
    const draft = await workbooks.updateWorkbookDraft(
      {
        draftId: parsedId.data,
        tenantId: session.tenantId,
        expectedRevision: parsedRevision.data,
        content: parsedContent.data,
      },
      {
        repository: getWorkbookRepository(),
        clock: { now: () => new Date().toISOString() },
      },
    );
    return { ok: true, draft };
  } catch (error) {
    if (
      error instanceof workbooks.WorkbookPublicationError ||
      error instanceof WorkbookAuthorizationError
    ) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        retryable:
          error instanceof workbooks.WorkbookPublicationError
            ? error.retryable
            : false,
      };
    }
    throw error;
  }
}
