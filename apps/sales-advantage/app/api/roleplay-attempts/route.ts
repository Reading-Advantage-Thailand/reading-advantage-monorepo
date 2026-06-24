import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import {
  submitRoleplayAttempt,
  aiClientToEvaluateRoleplay,
  getRoleplayEvaluationContext,
} from "@reading-advantage/domain/sales";
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

    if (!scenarioId || !audioFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const arrayBuf = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const mimeType = audioFile.type || "audio/webm";

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