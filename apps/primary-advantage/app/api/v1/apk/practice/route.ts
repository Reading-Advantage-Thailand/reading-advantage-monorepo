import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  gamePracticeInputRequestSchema,
  listPrimaryPracticeInput,
} from "@reading-advantage/domain/games";

import { getCurrentUser } from "@/lib/session";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = "no-store, private";

/** Returns a private structured route error. */
function errorResponse(status: 400 | 401 | 403 | 500, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message }, status },
    { status, headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
}

/**
 * Reads the practice input of the signed-in student: the saved words and sentences that the 3D
 * games use, in FSRS order. The games read this state and never change it.
 * @param request Request with an optional `locale` query (the translation language).
 * @returns A private practice input or a structured error response.
 */
export async function GET(request: NextRequest) {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return errorResponse(400, "INVALID_QUERY", "Practice selection is invalid");
  }
  if (
    [...url.searchParams.keys()].some((key) => key !== "locale")
    || url.searchParams.getAll("locale").length > 1
  ) {
    return errorResponse(400, "INVALID_QUERY", "Practice selection is invalid");
  }
  const parsedInput = gamePracticeInputRequestSchema.safeParse({
    locale: url.searchParams.get("locale") ?? undefined,
  });
  if (!parsedInput.success) {
    return errorResponse(400, "INVALID_QUERY", "Practice selection is invalid");
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
    // The words and sentences the student saved in the reader's flashcard list.
    const result = await listPrimaryPracticeInput({
      db: createTenantDB(db, tenant),
      user,
      tenant,
      input: parsedInput.data,
    });
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": PRIVATE_NO_STORE },
    });
  } catch {
    logger.error("apk_practice_failed");
    return errorResponse(500, "INTERNAL_ERROR", "Unable to load practice items");
  }
}
