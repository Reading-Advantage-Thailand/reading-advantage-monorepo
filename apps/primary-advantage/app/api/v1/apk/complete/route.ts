import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  gameCompletionInputSchema,
  gameCompletionResultSchema,
  recordGameCompletion,
} from "@reading-advantage/domain/games";

import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records one server-authoritative completion for the live APK student game route.
 * @param request Request with the validated completion body.
 * @returns The saved completion result or a structured error response.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "A student account is required" } },
      { status: 403 },
    );
  }
  if (!user.schoolId) {
    return NextResponse.json(
      { error: { code: "TENANT_REQUIRED", message: "A school assignment is required" } },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const parsed = gameCompletionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_PAYLOAD", message: "Game completion payload is invalid" } },
      { status: 400 },
    );
  }

  const result = await recordGameCompletion({
    db: createTenantDB(db, { schoolId: user.schoolId }),
    user,
    tenant: { schoolId: user.schoolId },
    input: parsed.data,
  });
  const validated = gameCompletionResultSchema.safeParse(result);
  if (!validated.success) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to save game completion" } },
      { status: 500 },
    );
  }
  return NextResponse.json(validated.data, { status: 200 });
}
