import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain/db-contract";
import {
  equipMyRpgCosmetic,
  getMyRpgState,
} from "@reading-advantage/domain/rpg";
import {
  equipRpgCosmeticInputSchema,
  equipRpgCosmeticResultSchema,
  studentRpgStateSchema,
} from "@reading-advantage/game-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function getStudentContext(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { error: errorResponse(401, "UNAUTHORIZED", "Authentication required") };
  const session = await validateSession(db, token);
  if (!session) return { error: errorResponse(401, "UNAUTHORIZED", "Authentication required") };
  if (session.user.role !== "STUDENT") {
    return { error: errorResponse(403, "FORBIDDEN", "A student account is required") };
  }
  if (!session.user.schoolId) {
    return { error: errorResponse(403, "TENANT_REQUIRED", "A school assignment is required") };
  }
  return { user: session.user, tenant: { schoolId: session.user.schoolId } };
}

/**
 * Returns the authenticated student's RPG state.
 * @param request Request with the shared session cookie.
 * @returns The current RPG state or a structured error.
 */
export async function GET(request: NextRequest) {
  const context = await getStudentContext(request);
  if ("error" in context) return context.error;
  const state = await getMyRpgState({
    db: createTenantDB(db, context.tenant),
    user: context.user,
    tenant: context.tenant,
  });
  const parsed = studentRpgStateSchema.safeParse(state);
  if (!parsed.success) return errorResponse(500, "INTERNAL_ERROR", "Unable to load RPG state");
  return NextResponse.json(parsed.data, { status: 200 });
}

/**
 * Equips one unlocked cosmetic for the authenticated student.
 * @param request Request with the session and strict cosmetic selection.
 * @returns The equipped cosmetic identifier or a structured error.
 */
export async function PATCH(request: NextRequest) {
  const suppliedOrigin = request.headers.get("origin");
  if (!suppliedOrigin || suppliedOrigin !== new URL(request.url).origin) {
    return errorResponse(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed");
  }
  const context = await getStudentContext(request);
  if ("error" in context) return context.error;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }
  const input = equipRpgCosmeticInputSchema.safeParse(body);
  if (!input.success) return errorResponse(400, "INVALID_PAYLOAD", "RPG cosmetic payload is invalid");
  try {
    const result = await equipMyRpgCosmetic({
      db: createTenantDB(db, context.tenant),
      user: context.user,
      tenant: context.tenant,
      input: input.data,
    });
    const parsed = equipRpgCosmeticResultSchema.safeParse(result);
    if (!parsed.success) return errorResponse(500, "INTERNAL_ERROR", "Unable to equip RPG cosmetic");
    return NextResponse.json(parsed.data, { status: 200 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error
      && error.code === "COSMETIC_LOCKED") {
      return errorResponse(403, "COSMETIC_LOCKED", "The selected cosmetic is locked");
    }
    throw error;
  }
}

