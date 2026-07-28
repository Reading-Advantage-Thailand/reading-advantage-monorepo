import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  HostProofCompletionError,
  hostProofErrorHttpStatus,
  recordHostProofGameCompletion,
  getHostProofGameCompletions,
  type HostProofCompletionRequest,
} from "@reading-advantage/domain/games";
import type { UserContext } from "@reading-advantage/auth";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import { isHostProofEnabled } from "@/lib/host-proof-config";

/**
 * Maps the reading-advantage session user to the shared auth UserContext shape
 * required by the domain host-proof adapter.
 */
function toUserContext(user: SessionUser): UserContext {
  return {
    id: user.id,
    username: user.username,
    name: user.display_name ?? null,
    role: user.role as UserContext["role"],
    schoolId: user.school_id ?? null,
    xp: user.xp ?? 0,
    level: user.level ?? 1,
    cefrLevel: user.cefr_level ?? "",
  };
}

function toHostProofErrorResponse(error: unknown): NextResponse {
  if (error instanceof HostProofCompletionError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          issues: error.issues,
        },
      },
      { status: hostProofErrorHttpStatus(error.code) },
    );
  }

  console.error({ level: "error", event: "host_proof_completion_unexpected", error });
  return NextResponse.json(
    {
      error: {
        code: "HOST_PROOF_INTERNAL",
        message: "Unable to process host-proof game completion",
      },
    },
    { status: 500 },
  );
}

/**
 * POST /api/host-proof/games/completions
 *
 * Records one host-proof completion for an accepted existing-core cartridge.
 * The server derives the tenant from the authenticated session; the client
 * cannot supply a schoolId or XP value.
 */
export async function POST(request: NextRequest) {
  if (!isHostProofEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_UNAUTHENTICATED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const user = toUserContext(sessionUser);
  const schoolId = user.schoolId;
  if (!schoolId) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_TENANT_REQUIRED", message: "A school assignment is required" } },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const tenantDb = createTenantDB(db, { schoolId });

  try {
    const result = await recordHostProofGameCompletion({
      db: tenantDb,
      user,
      tenant: { schoolId },
      input: body as HostProofCompletionRequest,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toHostProofErrorResponse(error);
  }
}

/**
 * GET /api/host-proof/games/completions?gameType=<id>&limit=<n>
 *
 * Returns the caller's host-proof completion history, limited to the five
 * accepted existing-core cartridges and scoped to the authenticated tenant.
 */
export async function GET(request: NextRequest) {
  if (!isHostProofEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_UNAUTHENTICATED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const user = toUserContext(sessionUser);
  const schoolId = user.schoolId;
  if (!schoolId) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_TENANT_REQUIRED", message: "A school assignment is required" } },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const gameType = searchParams.get("gameType") ?? undefined;
  const limitParam = searchParams.get("limit");

  const tenantDb = createTenantDB(db, { schoolId });

  try {
    const history = await getHostProofGameCompletions({
      db: tenantDb,
      user,
      tenant: { schoolId },
      input: {
        ...(gameType ? { gameType } : {}),
        ...(limitParam !== null ? { limit: Number(limitParam) } : {}),
      },
    });
    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    return toHostProofErrorResponse(error);
  }
}
