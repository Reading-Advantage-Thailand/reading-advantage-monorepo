"use server";

import { z } from "zod";
import { workbooks } from "@reading-advantage/domain";
import { getWorkbookRepository } from "../lib/repository";
import {
  WorkbookAuthorizationError,
  requireWorkbookSession,
  type WorkbookSession,
} from "./lib/session";

const draftIdSchema = z.string().uuid();
const draftIdsSchema = z.array(draftIdSchema).min(1).max(50);
const teacherManualLangSchema = z.enum(["en", "th"]);

/** Language codes the teacher manual compiler accepts. */
export type TeacherManualLang = "en" | "th";

/** Outcome of compiling selected drafts into a teacher's manual. */
export type CompileTeacherManualResult =
  | {
      ok: true;
      html: string;
      lessonCount: number;
      lang: TeacherManualLang;
    }
  | { ok: false; code: string; message: string };

/**
 * Compares two drafts for teacher-manual ordering: lesson number first
 * (numeric-aware; lessons without a parseable lesson number sort last), then
 * title.
 * @param a First draft to compare.
 * @param b Second draft to compare.
 * @returns A negative, zero, or positive comparison value.
 */
function compareDraftsForManual(
  a: workbooks.WorkbookDraft,
  b: workbooks.WorkbookDraft,
): number {
  const aNumber = parseLessonNumber(a.sourceRecord.content.lessonNumber);
  const bNumber = parseLessonNumber(b.sourceRecord.content.lessonNumber);
  if (aNumber !== null && bNumber !== null) {
    if (aNumber !== bNumber) return aNumber - bNumber;
  } else if (aNumber !== bNumber) {
    return aNumber === null ? 1 : -1;
  }
  return a.sourceRecord.content.title.localeCompare(
    b.sourceRecord.content.title,
  );
}

/**
 * Parses a legacy lesson number carrier into a comparable value.
 * @param lessonNumber Raw lesson number carrier, or undefined when absent.
 * @returns The numeric lesson number, or null when it cannot be parsed.
 */
function parseLessonNumber(
  lessonNumber: string | undefined,
): number | null {
  if (lessonNumber === undefined || lessonNumber === "") return null;
  const parsed = Number.parseInt(lessonNumber, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Compiles the selected drafts into one teacher's manual on behalf of the
 * verified session.
 *
 * The tenant and actor come from the verified session, never from caller
 * arguments. Every requested draft is read inside the session tenant and the
 * whole request fails closed when any requested draft is missing, so a manual
 * is never compiled from a partial set and a cross-tenant id cannot be probed
 * through the error. Drafts are ordered by lesson number (numeric-aware,
 * missing last) then title, and the series metadata comes from the FIRST
 * ordered draft's settings with legacy defaults.
 *
 * Asset-key to URL resolution is intentionally NOT built here: lessons carry
 * legacyUrl provenance which the teacher-manual adapter already renders, and
 * key-only images render without a URL for now (S5 concern).
 * @param draftIds Drafts selected in the workspace, in selection order.
 * @param lang Language code for the manual; unknown codes fall back to "en".
 * @returns The compiled manual html, lesson count, and resolved language, or a
 * structured failure.
 */
export async function compileTeacherManualAction(
  draftIds: string[],
  lang: string,
): Promise<CompileTeacherManualResult> {
  let session: WorkbookSession;
  try {
    session = await requireWorkbookSession();
  } catch (error) {
    if (error instanceof WorkbookAuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }

  if (session.role !== "WORKBOOK_ADMIN") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "workbooks access requires the WORKBOOK_ADMIN role",
    };
  }

  const parsedIds = draftIdsSchema.safeParse(draftIds);
  if (!parsedIds.success) {
    const message =
      parsedIds.error.issues[0]?.code === "too_big"
        ? "no more than 50 draft ids are allowed"
        : "at least one draft id is required";
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message,
    };
  }

  const parsedLang = teacherManualLangSchema.safeParse(lang);
  const targetLang: TeacherManualLang = parsedLang.success
    ? parsedLang.data
    : "en";

  const repository = getWorkbookRepository();
  const uniqueIds = [...new Set(parsedIds.data)];
  const drafts = await Promise.all(
    uniqueIds.map((draftId) => repository.getDraft(session.tenantId, draftId)),
  );
  if (drafts.some((draft) => draft === null)) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "one or more selected drafts are unavailable",
    };
  }

  const orderedDrafts = (drafts as workbooks.WorkbookDraft[]).sort(
    compareDraftsForManual,
  );
  const firstDraft = orderedDrafts[0];
  const settings = firstDraft.sourceRecord.settings;

  const seriesName = settings?.seriesName ?? "Reading Advantage";
  const seriesLevel = settings?.levelNumber ?? "";
  const cefrLevel = settings?.cefrLevel ?? "A1";
  const type = settings?.type ?? "primary";

  try {
    const { html, lessonCount } = workbooks.compileTeacherManual(
      orderedDrafts.map((draft) => draft.sourceRecord.content),
      seriesName,
      seriesLevel,
      cefrLevel,
      type,
      targetLang,
    );
    return { ok: true, html, lessonCount, lang: targetLang };
  } catch {
    return {
      ok: false,
      code: "COMPILE_ERROR",
      message: "the teacher manual could not be compiled",
    };
  }
}
