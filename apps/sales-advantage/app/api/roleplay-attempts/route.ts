import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import {
  submitRoleplayAttempt,
  aiClientToEvaluateRoleplay,
  getScenario,
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

    // Upload audio to storage
    const storageKey = `sales-advantage/attempts/${user.id}/${Date.now()}.webm`;
    try {
      const storage = getStorageClient();
      await storage.put(storageKey, buffer, {
        contentType: mimeType,
        public: false,
      });
    } catch (storageErr) {
      console.error("Storage error:", storageErr);
      // Continue with in-memory eval — storage is non-critical for the eval flow
    }

    // Look up scenario + rubric for the evaluator prompt
    const scenarioData = await getScenario(
      { db: db as never, user, tenant },
      { scenarioId },
    );
    if (!scenarioData) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    type ScenarioBundle = {
      scenario?: Parameters<ReturnType<typeof aiClientToEvaluateRoleplay>>[1];
      rubric?: Parameters<ReturnType<typeof aiClientToEvaluateRoleplay>>[2];
    };

    // Build the AI evaluator with scenario/rubric closure
    const aiClient = getAIClient();
    const evaluateRaw = aiClientToEvaluateRoleplay(aiClient);
    const sd = scenarioData as ScenarioBundle;
    const wrappedEvaluate = async (audio: { buffer: Buffer; mimeType: string }) => {
      return evaluateRaw(
        audio,
        sd.scenario ?? (scenarioData as unknown as Parameters<ReturnType<typeof aiClientToEvaluateRoleplay>>[1]),
        sd.rubric ?? ({ name: "Default", criteriaJson: [] } as unknown as Parameters<ReturnType<typeof aiClientToEvaluateRoleplay>>[2]),
        [],
      );
    };

    const result = await submitRoleplayAttempt(
      { db: db as never, user, tenant },
      {
        scenarioId,
        audioStorageKey: storageKey,
        durationMs,
        audio: { buffer, mimeType },
        evaluate: wrappedEvaluate,
      },
    );

    const r = result as { attempt?: { id: string }; evaluation?: unknown };
    return NextResponse.json({
      attemptId: r.attempt?.id ?? null,
      evaluation: r.evaluation ?? result,
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