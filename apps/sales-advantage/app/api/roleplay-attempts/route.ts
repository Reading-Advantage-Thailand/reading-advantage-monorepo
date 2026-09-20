import { NextRequest, NextResponse } from "next/server";
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
import { checkRoleplayRateLimit } from "@/lib/rate-limit";
import { logStructuredError } from "@reading-advantage/utils/structured-error";
import type { StorageClient } from "@reading-advantage/storage";
import { randomUUID } from "node:crypto";
import {
  authenticateSalesRequest,
  type ResolvedSalesRequestPrincipal,
} from "@/lib/company-oidc";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Server-defined retention window for a roleplay audio upload. Matches
 * the consent copy in `messages/{en,th}.json` under `roleplay.consentText`.
 * The client must not authoritatively select this value.
 */
const ROLEPLAY_RETENTION_DAYS = 30;

export async function POST(request: NextRequest) {
  let uploadedObject: { storage: StorageClient; key: string } | undefined;
  try {
    const authResult = await authenticateSalesRequest(request);
    const principal =
      authResult && "user" in authResult
        ? (authResult as unknown as ResolvedSalesRequestPrincipal)
        : authResult?.kind === "authenticated"
          ? authResult.principal
          : null;
    if (!principal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user, scope } = principal;
    const tenant = { schoolId: user.schoolId };

    // Rate limit: 10 attempts per user per hour
    const rateLimit = await checkRoleplayRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "ROLEPLAY_RATE_LIMITED",
          message: "Too many roleplay submissions. Please try again later.",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfter ?? 3600) },
        },
      );
    }

    const formData = await request.formData();
    const scenarioIdRaw = formData.get("scenarioId");
    const audioFileRaw = formData.get("audio");
    const durationMsRaw = formData.get("durationMs");
    const consentGivenRaw = formData.get("consentGiven");

    if (typeof scenarioIdRaw !== "string" || scenarioIdRaw.trim() === "") {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: "scenarioId",
          message: "scenarioId is required",
        },
        { status: 400 },
      );
    }
    if (!(audioFileRaw instanceof File)) {
      return NextResponse.json(
        {
          error: "INVALID_AUDIO",
          field: "audio",
          message: "audio file is required",
        },
        { status: 400 },
      );
    }
    const scenarioId = scenarioIdRaw;
    const audioFile = audioFileRaw;
    const durationMs =
      typeof durationMsRaw === "string" && /^[1-9]\d*$/u.test(durationMsRaw)
        ? Number(durationMsRaw)
        : NaN;

    const mimeType = audioFile.type || "audio/webm";

    // Phase 4 audio boundary gate: size, MIME type, and declared duration
    // are checked BEFORE the audio buffer is read or any provider/storage
    // adapter is invoked. Rejected media returns a structured 400 envelope
    // and never reaches `getStorageClient`, `getAIClient`,
    // `getRoleplayEvaluationContext`, or `submitRoleplayAttempt`.
    if (
      !ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES.includes(
        mimeType as (typeof ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES)[number],
      )
    ) {
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
      !Number.isInteger(durationMs) ||
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

    const arrayBuf = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Look up the scenario + rubric + canonical source excerpts FIRST so the
    // evaluator receives the grounding material (FR-4 closes the empty-excerpts
    // bug — the previous code passed `excerpts: []`).
    const evaluationContext = await getRoleplayEvaluationContext(
      { db, user, tenant, scope },
      { scenarioId },
    );
    if (!evaluationContext.scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    // FR-4: upload audio to storage and only persist the key on success. The
    // previous catch block swallowed the error but kept the key — the attempt
    // row would then reference a non-existent object.
    const storageKey = `sales-advantage/attempts/${user.id}/${randomUUID()}.webm`;
    let audioUploadSucceeded = false;
    try {
      const storage = getStorageClient();
      await storage.put(storageKey, buffer, {
        contentType: mimeType,
        public: false,
      });
      audioUploadSucceeded = true;
      uploadedObject = { storage, key: storageKey };
    } catch (storageErr) {
      logStructuredError({
        event: "sales_roleplay_storage_failed",
        error: storageErr,
        fields: {
          detail:
            storageErr instanceof Error
              ? storageErr.message
              : String(storageErr),
        },
      });
    }

    // Build the AI evaluator with scenario/rubric/canonical-excerpts closure.
    const aiClient = getAIClient();
    const evaluateRaw = aiClientToEvaluateRoleplay(aiClient);
    const wrappedEvaluate = async (audio: {
      buffer: Buffer;
      mimeType: string;
    }) => {
      return evaluateRaw(
        audio,
        {
          ...evaluationContext.scenario,
          prospectContextJson:
            (evaluationContext.scenario?.prospectContextJson as Record<
              string,
              unknown
            > | null) ?? {},
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
      { db, user, tenant, scope },
      {
        scenarioId,
        audioStorageKey: audioUploadSucceeded ? storageKey : null,
        durationMs,
        audio: { buffer, mimeType },
        consentGiven: true,
        retentionDays: ROLEPLAY_RETENTION_DAYS,
        evaluate: wrappedEvaluate,
      },
    );
    uploadedObject = undefined;

    return NextResponse.json({
      attemptId: result.attempt?.id ?? null,
      evaluation: result.evaluation ?? null,
      ...(audioUploadSucceeded ? {} : { audioUploadFailed: true }),
    });
  } catch (error) {
    if (uploadedObject) {
      try {
        await uploadedObject.storage.delete(uploadedObject.key);
      } catch (cleanupError) {
        logStructuredError({
          event: "sales_roleplay_audio_cleanup_failed",
          error: cleanupError,
          fields: {
            detail:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          },
        });
      }
    }
    logStructuredError({
      event: "sales_roleplay_submit_failed",
      error,
      fields: {
        detail: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      {
        error: "ROLEPLAY_EVALUATION_FAILED",
        message: "Roleplay evaluation is temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}
