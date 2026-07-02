import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import {
  submitRoleplayAttempt,
  aiClientToEvaluateRoleplay,
  getRoleplayEvaluationContext,
} from "@reading-advantage/domain/sales";
import {
  ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES,
  ROLEPLAY_MAX_AUDIO_BYTES,
  ROLEPLAY_MAX_AUDIO_DURATION_MS,
} from "@reading-advantage/types";
import { getStorageClient } from "@reading-advantage/storage";
import { getAIClient } from "@reading-advantage/ai";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await validateSession(db, sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;
    const tenant = { schoolId: user.schoolId };

    // Rate limit: 10 attempts per user per hour
    const rateLimit = checkRateLimit(`sales:roleplay:${user.id}`, 10, 60 * 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: rateLimit.retryAfter },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const scenarioId = formData.get("scenarioId") as string;
    const audioFile = formData.get("audio") as File;
    const durationMs = parseInt((formData.get("durationMs") as string) ?? "0", 10);
    const consentGivenRaw = formData.get("consentGiven");
    const retentionDaysRaw = formData.get("retentionDays");

    if (!scenarioId || !audioFile) {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: !scenarioId ? "scenarioId" : "audio",
          message: !scenarioId ? "scenarioId is required" : "audio file is required",
        },
        { status: 400 },
      );
    }

    const mimeType = audioFile.type || "audio/webm";

    // Phase 4 audio boundary gate: size, MIME type, and declared duration
    // are checked BEFORE the audio buffer is read or any provider/storage
    // adapter is invoked. Rejected media returns a structured 400 envelope
    // and never reaches `getStorageClient`, `getAIClient`,
    // `getRoleplayEvaluationContext`, or `submitRoleplayAttempt`.
    if (!ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES.includes(
      mimeType as (typeof ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES)[number],
    )) {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: "audio.type",
          message: `unsupported MIME type '${mimeType}'`,
        },
        { status: 400 },
      );
    }
    if (
      typeof audioFile.size === "number" &&
      audioFile.size > ROLEPLAY_MAX_AUDIO_BYTES
    ) {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: "audio.size",
          message: `audio size ${audioFile.size} exceeds maximum ${ROLEPLAY_MAX_AUDIO_BYTES}`,
        },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(durationMs) ||
      durationMs <= 0 ||
      durationMs > ROLEPLAY_MAX_AUDIO_DURATION_MS
    ) {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: "durationMs",
          message: `duration ${durationMs}ms exceeds maximum ${ROLEPLAY_MAX_AUDIO_DURATION_MS}ms`,
        },
        { status: 400 },
      );
    }
    const consentGiven =
      typeof consentGivenRaw === "string" && consentGivenRaw === "true";
    if (!consentGiven) {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: "consentGiven",
          message: "explicit consent is required before audio evaluation",
        },
        { status: 400 },
      );
    }
    const retentionDays =
      typeof retentionDaysRaw === "string" ? parseInt(retentionDaysRaw, 10) : NaN;
    if (
      !Number.isFinite(retentionDays) ||
      retentionDays < 1 ||
      retentionDays > 365
    ) {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: "retentionDays",
          message: "retentionDays must be an integer in [1,365]",
        },
        { status: 400 },
      );
    }

    const arrayBuf = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Look up the scenario + rubric + canonical source excerpts FIRST so the
    // evaluator receives the grounding material (FR-4 closes the empty-excerpts
    // bug — the previous code passed `excerpts: []`).
    const evaluationContext = await getRoleplayEvaluationContext(
      { db, user, tenant },
      { scenarioId },
    );
    if (!evaluationContext.scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    // FR-4: upload audio to storage and only persist the key on success. The
    // previous catch block swallowed the error but kept the key — the attempt
    // row would then reference a non-existent object.
    const storageKey = `sales-advantage/attempts/${user.id}/${Date.now()}.webm`;
    let audioUploadSucceeded = false;
    try {
      const storage = getStorageClient();
      await storage.put(storageKey, buffer, {
        contentType: mimeType,
        public: false,
      });
      audioUploadSucceeded = true;
    } catch (storageErr) {
      console.error("Storage error (FR-4): proceeding without audio storage key:", storageErr);
    }

    // Build the AI evaluator with scenario/rubric/canonical-excerpts closure.
    const aiClient = getAIClient();
    const evaluateRaw = aiClientToEvaluateRoleplay(aiClient);
    const wrappedEvaluate = async (audio: { buffer: Buffer; mimeType: string }) => {
      return evaluateRaw(
        audio,
        {
          ...evaluationContext.scenario,
          prospectContextJson:
            (evaluationContext.scenario?.prospectContextJson as Record<string, unknown> | null) ??
            {},
        },
        evaluationContext.rubric
          ? {
              ...evaluationContext.rubric,
              criteriaJson: Array.isArray(evaluationContext.rubric.criteriaJson)
                ? (evaluationContext.rubric.criteriaJson as Array<{
                    criterion: string;
                    weight: number;
                    passingScore: number;
                    sourceRef: string;
                  }>)
                : [],
            }
          : {
              id: "default",
              name: "Default",
              criteriaJson: [],
              reviewStatus: "approved",
          createdAt: new Date(),
        },
        evaluationContext.canonicalSourceExcerpts,
      );
    };

    const result = await submitRoleplayAttempt(
      { db, user, tenant },
      {
        scenarioId,
        audioStorageKey: audioUploadSucceeded ? storageKey : null,
        durationMs,
        audio: { buffer, mimeType },
        consentGiven: true,
        retentionDays,
        evaluate: wrappedEvaluate,
      },
    );

    return NextResponse.json({
      attemptId: result.attempt?.id ?? null,
      evaluation: result.evaluation ?? null,
    });
  } catch (error) {
    console.error("Roleplay submit error:", error);
    return NextResponse.json(
      {
        error: "Evaluation failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}