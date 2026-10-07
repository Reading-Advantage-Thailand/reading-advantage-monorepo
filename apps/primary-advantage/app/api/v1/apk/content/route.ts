import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  gameLearningContentInputSchema,
  gameLearningContentResultSchema,
  listGameLearningContent,
  listPrimaryAnswerAudioContent,
} from "@reading-advantage/domain/games";

import { getCurrentUser } from "@/lib/session";
import { getAudioUrl } from "@/lib/storage-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = "no-store, private";
/** Returns a private structured route error. */
function errorResponse(status: 400 | 401 | 403 | 500 | 503, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message }, status },
    { status, headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
}

/**
 * Reads student-owned flashcards for the live APK student game route.
 * @param request Request with the content mode and locale query.
 * @returns A private content response or a structured error response.
 */
export async function GET(request: NextRequest) {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
  }
  const allowedParameters = new Set([
    "mode", "locale", "limit", "learningMode", "cartridgeId",
  ]);
  if (
    [...url.searchParams.keys()].some((key) => !allowedParameters.has(key))
    || [...allowedParameters].some((key) => url.searchParams.getAll(key).length > 1)
  ) {
    return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
  }
  const learningMode = url.searchParams.get("learningMode") ?? "reading";
  const cartridgeId = url.searchParams.get("cartridgeId");
  const supportsAnswerAudio = cartridgeId !== null
    && ["wizard-vs-zombie", "hero-vs-zombie", "dragon-flight", "dragon-rider"].includes(cartridgeId);
  const wantsAnswerAudio = learningMode === "answer-audio";
  const requestedLocale = url.searchParams.get("locale") ?? "th";
  if (
    wantsAnswerAudio
    && supportsAnswerAudio
    && url.searchParams.get("mode") === "vocabulary"
    && ["en", "cn", "tw", "vi"].includes(requestedLocale)
  ) {
    return errorResponse(503, "LISTENING_UNAVAILABLE", "Prepared audio is unavailable");
  }
  if (
    (learningMode !== "reading" && learningMode !== "answer-audio")
    || (wantsAnswerAudio && (
      !supportsAnswerAudio
      || url.searchParams.get("mode") !== "vocabulary"
      || requestedLocale !== "th"
    ))
    || (!wantsAnswerAudio && cartridgeId !== null)
  ) {
    return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
  }
  const answerAudioSession = wantsAnswerAudio ? {
    modality: "read-to-select-audio" as const,
    promptLocale: "th-TH" as const,
    answerLocale: "en-US" as const,
    promptField: "translation" as const,
    answerField: "term" as const,
    scored: true,
  } : undefined;
  const rawLimit = url.searchParams.get("limit");
  const parsedInput = gameLearningContentInputSchema.safeParse({
    mode: url.searchParams.get("mode"),
    locale: url.searchParams.get("locale") ?? undefined,
    ...(rawLimit === null ? {} : { limit: Number(rawLimit) }),
    ...(answerAudioSession ? { answerAudioSession } : {}),
  });
  if (!parsedInput.success) {
    return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
  }

  const user = await getCurrentUser();
  if (!user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required");
  }
  if (user.role !== "STUDENT") {
    return errorResponse(403, "FORBIDDEN", "A student account is required");
  }
  if (!user.schoolId) {
    return errorResponse(403, "TENANT_REQUIRED", "A school assignment is required");
  }

  try {
    const tenant = { schoolId: user.schoolId };
    if (wantsAnswerAudio) {
      // The saved words of the reader's flashcard list, each with its segment of the article's word audio.
      const prepared = await listPrimaryAnswerAudioContent({
        db: createTenantDB(db, tenant),
        user,
        tenant,
        audioUrlOf: getAudioUrl,
      });
      if (!prepared) {
        return errorResponse(503, "LISTENING_UNAVAILABLE", "No saved word has English audio");
      }
      return NextResponse.json(prepared, {
        status: 200,
        headers: { "Cache-Control": PRIVATE_NO_STORE },
      });
    }
    const result = await listGameLearningContent({
      db: createTenantDB(db, tenant),
      user,
      tenant,
      input: parsedInput.data,
    });
    const validated = gameLearningContentResultSchema.safeParse(result);
    if (!validated.success) {
      return errorResponse(500, "INTERNAL_ERROR", "Unable to load learning content");
    }
    return NextResponse.json(validated.data, {
      status: 200,
      headers: { "Cache-Control": PRIVATE_NO_STORE },
    });
  } catch {
    console.error({ level: "error", event: "apk_content_failed" });
    return errorResponse(500, "INTERNAL_ERROR", "Unable to load learning content");
  }
}
