"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
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

/** Outcome of rendering a draft preview for the editor workspace. */
export type PreviewDraftResult =
  | { ok: true; html: string }
  | { ok: false; code: string; message: string };

/** Outcome of saving a draft from the editor workspace. */
export type UpdateDraftResult =
  | { ok: true; draft: workbooks.WorkbookDraft }
  | { ok: false; code: string; message: string; retryable: boolean };

/** Outcome of saving a draft's project settings from the editor workspace. */
export type UpdateDraftSettingsResult =
  | { ok: true; draft: workbooks.WorkbookDraft }
  | { ok: false; code: string; message: string; retryable: boolean };

/** Outcome of transitioning a draft's lifecycle status from the editor workspace. */
export type TransitionDraftResult =
  | { ok: true; draft: workbooks.WorkbookDraft }
  | { ok: false; code: string; message: string; retryable: boolean };

/**
 * Transitions a draft's lifecycle status on behalf of the verified session.
 *
 * The tenant and actor come from the verified session, never from caller
 * arguments. The draft is loaded tenant-scoped (a missing draft maps to
 * NOT_FOUND without revealing whether it exists in another tenant), the
 * transition is asserted against the domain state machine, the status update
 * runs under optimistic concurrency, and a matching audit event is recorded.
 * Failures are returned as structured results so the workspace can render them.
 * @param draftId Draft selected in the workspace.
 * @param expectedRevision Revision the editor last saw.
 * @param targetStatus Desired next lifecycle status for the draft.
 * @param eventType Audit event type recorded when the transition succeeds.
 * @returns The persisted draft after the transition, or a structured failure.
 */
async function transitionDraftStatus(
  draftId: string,
  expectedRevision: number,
  targetStatus: workbooks.WorkbookDraftStatus,
  eventType: workbooks.WorkbookPublicationEventType,
): Promise<TransitionDraftResult> {
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

  try {
    const repository = getWorkbookRepository();
    const existing = await repository.getDraft(
      session.tenantId,
      parsedId.data,
    );
    if (existing === null) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "draft not found",
        retryable: false,
      };
    }

    workbooks.assertWorkbookDraftTransition(existing.status, targetStatus);

    const updated = await repository.updateDraftStatus(
      session.tenantId,
      parsedId.data,
      targetStatus,
      parsedRevision.data,
    );

    await repository.recordEvent({
      eventId: randomUUID(),
      tenantId: session.tenantId,
      draftId: parsedId.data,
      editionId: null,
      eventType,
      actorId: session.actorId,
      occurredAt: new Date().toISOString(),
    });

    return { ok: true, draft: updated };
  } catch (error) {
    if (error instanceof workbooks.WorkbookPublicationError) {
      if (error.code === "REVISION_CONFLICT") {
        return {
          ok: false,
          code: "REVISION_CONFLICT",
          message: error.message,
          retryable: true,
        };
      }
      return {
        ok: false,
        code: error.code,
        message: error.message,
        retryable: false,
      };
    }
    throw error;
  }
}

/**
 * Submits a draft for review on behalf of the verified session, transitioning
 * it from "draft" to "in_review" and recording a "submitted_for_review" audit
 * event. A draft that is not in "draft" status is rejected by the domain state
 * machine before any write happens.
 * @param draftId Draft selected in the workspace.
 * @param expectedRevision Revision the editor last saw.
 * @returns The persisted draft in "in_review", or a structured failure.
 */
export async function submitDraftForReviewAction(
  draftId: string,
  expectedRevision: number,
): Promise<TransitionDraftResult> {
  return transitionDraftStatus(
    draftId,
    expectedRevision,
    "in_review",
    "submitted_for_review",
  );
}

/**
 * Returns a draft to "draft" status on behalf of the verified session,
 * transitioning it from "in_review" and recording a "returned_to_draft" audit
 * event. A draft that is not in "in_review" status is rejected by the domain
 * state machine before any write happens.
 * @param draftId Draft selected in the workspace.
 * @param expectedRevision Revision the editor last saw.
 * @returns The persisted draft in "draft", or a structured failure.
 */
export async function returnDraftToDraftAction(
  draftId: string,
  expectedRevision: number,
): Promise<TransitionDraftResult> {
  return transitionDraftStatus(
    draftId,
    expectedRevision,
    "draft",
    "returned_to_draft",
  );
}

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
 * Renders a draft's normalized content as self-contained preview html for the
 * verified session.
 *
 * The tenant comes from the verified session, never from caller arguments. A
 * missing draft returns a structured NOT_FOUND failure so the caller can
 * surface it without treating it as a render error.
 * @param draftId Draft selected in the workspace.
 * @returns The preview html, or a structured failure.
 */
export async function previewDraftAction(
  draftId: string,
): Promise<PreviewDraftResult> {
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
  if (draft === null) {
    return { ok: false, code: "NOT_FOUND", message: "draft not found" };
  }

  return {
    ok: true,
    html: workbooks.renderWorkbookContentHtml(draft.sourceRecord.content),
  };
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

/**
 * Saves a draft's project settings on behalf of the verified session.
 *
 * The tenant comes from the verified session, never from caller arguments, and
 * the submitted settings are validated against the draft settings contract at
 * the boundary before the domain command replaces the draft's source-record
 * settings under optimistic concurrency. A stale revision surfaces as a
 * retryable REVISION_CONFLICT so the workspace can offer to reload; every other
 * publication failure is non-retryable.
 * @param draftId Draft selected in the workspace.
 * @param expectedRevision Revision the editor last saw.
 * @param settings Project settings submitted by the editor.
 * @returns The persisted draft with the replaced settings, or a structured
 * failure.
 */
export async function updateDraftSettingsAction(
  draftId: string,
  expectedRevision: number,
  settings: unknown,
): Promise<UpdateDraftSettingsResult> {
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
  const parsedSettings = workbooks.workbookDraftSettingsSchema.safeParse(
    settings,
  );
  if (!parsedSettings.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "settings do not satisfy the workbook draft settings contract",
      retryable: false,
    };
  }

  try {
    const draft = await workbooks.updateWorkbookDraftSettings(
      {
        draftId: parsedId.data,
        tenantId: session.tenantId,
        expectedRevision: parsedRevision.data,
        settings: parsedSettings.data,
      },
      {
        repository: getWorkbookRepository(),
        clock: { now: () => new Date().toISOString() },
      },
    );
    return { ok: true, draft };
  } catch (error) {
    if (error instanceof workbooks.WorkbookPublicationError) {
      if (error.code === "REVISION_CONFLICT") {
        return {
          ok: false,
          code: "REVISION_CONFLICT",
          message: error.message,
          retryable: true,
        };
      }
      return {
        ok: false,
        code: error.code,
        message: error.message,
        retryable: false,
      };
    }
    throw error;
  }
}
