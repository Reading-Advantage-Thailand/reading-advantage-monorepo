import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  equipMyRpgCosmetic,
  getMyRpgState,
} from "@reading-advantage/domain/rpg";
import {
  equipRpgCosmeticInputSchema,
  equipRpgCosmeticResultSchema,
  studentRpgStateSchema,
} from "@reading-advantage/game-contracts";

import { toUserContext } from "@/lib/apk/to-user-context";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function getStudentContext() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { error: errorResponse(401, "UNAUTHORIZED", "Authentication required") };
  const user = toUserContext(sessionUser);
  if (user.role !== "STUDENT") {
    return { error: errorResponse(403, "FORBIDDEN", "A student account is required") };
  }
  if (!user.schoolId) {
    return { error: errorResponse(403, "TENANT_REQUIRED", "A school assignment is required") };
  }
  return { user, tenant: { schoolId: user.schoolId } };
}

/** Returns the authenticated student's RPG state. */
export async function GET() {
  const context = await getStudentContext();
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
 * @param request Request with a strict cosmetic selection.
 * @returns The equipped cosmetic identifier or a structured error.
 */
export async function PATCH(request: NextRequest) {
  const context = await getStudentContext();
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

