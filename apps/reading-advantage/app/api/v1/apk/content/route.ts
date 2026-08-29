import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  gameLearningContentInputSchema,
  gameLearningContentResultSchema,
  listGameLearningContent,
} from "@reading-advantage/domain/games";

import { toUserContext } from "@/lib/apk/to-user-context";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = "no-store, private";

/**
 * Reads student-owned flashcards for the live APK student game route.
 * @param request Request with the content mode and locale query.
 * @returns A private content response or a structured error response.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsedInput = gameLearningContentInputSchema.safeParse({
    mode: url.searchParams.get("mode"),
    locale: url.searchParams.get("locale") ?? undefined,
  });
  if (!parsedInput.success) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "Content selection is invalid" } },
      { status: 400, headers: { "Cache-Control": PRIVATE_NO_STORE } },
    );
  }

  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401, headers: { "Cache-Control": PRIVATE_NO_STORE } },
    );
  }

  const user = toUserContext(sessionUser);
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "A student account is required" } },
      { status: 403, headers: { "Cache-Control": PRIVATE_NO_STORE } },
    );
  }
  if (!user.schoolId) {
    return NextResponse.json(
      { error: { code: "TENANT_REQUIRED", message: "A school assignment is required" } },
      { status: 403, headers: { "Cache-Control": PRIVATE_NO_STORE } },
    );
  }

  const result = await listGameLearningContent({
    db: createTenantDB(db, { schoolId: user.schoolId }),
    user,
    tenant: { schoolId: user.schoolId },
    input: parsedInput.data,
  });
  const validated = gameLearningContentResultSchema.safeParse(result);
  if (!validated.success) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load learning content" } },
      { status: 500, headers: { "Cache-Control": PRIVATE_NO_STORE } },
    );
  }
  return NextResponse.json(validated.data, {
    status: 200,
    headers: { "Cache-Control": PRIVATE_NO_STORE },
  });
}
