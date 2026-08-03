import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  completeDragonFlightHostProofAttempt,
  completeDragonFlightHostProofAttemptSchema,
  createDragonFlightHostProofAttemptDependencies,
  getHostProofGameCompletions,
  HostProofCompletionError,
  hostProofErrorHttpStatus,
} from "@reading-advantage/domain/games";
import type { UserContext } from "@reading-advantage/auth";
import { ZodError } from "zod";

import { isHostProofEnabled } from "@/lib/host-proof-config";
import { getCurrentUser, type SessionUser } from "@/lib/session";

/**
 * Maps a Reading Advantage session user into the portable domain auth shape.
 * @param user Authenticated Reading Advantage session user.
 * @returns Shared user context for the domain command.
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

/**
 * Reads the server-only credential secret for the host-proof boundary.
 * @returns A sufficiently long HMAC signing secret.
 * @throws When the host has not configured a usable signing secret.
 */
function getHostProofAttemptSecret(): string {
  const secret = process.env.HOST_PROOF_ATTEMPT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("HOST_PROOF_ATTEMPT_SECRET must contain at least 32 characters");
  }
  return secret;
}

/**
 * Converts a legacy host-proof history error into a stable JSON response.
 * @param error Error raised by the legacy history query.
 * @returns A stable JSON error response.
 */
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

  console.error({ level: "error", event: "host_proof_history_failed", error });
  return NextResponse.json(
    { error: { code: "HOST_PROOF_INTERNAL", message: "Unable to load host-proof game history" } },
    { status: 500 },
  );
}

/**
 * Converts untrusted signed-attempt errors into a safe public response.
 * @param error Error raised while validating the signed completion transcript.
 * @returns A stable JSON error response.
 */
function toAttemptErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Completion request failed validation" } },
      { status: 400 },
    );
  }
  if (
    error instanceof Error
    && /credential|action transcript|checkpoint|dwell|attempt identity|attempt actor|attempt tenant|expired|Dragon Flight launch|Dragon Flight cannot choose a gate|Host-proof actions must use contiguous sequence numbers|Host-proof action timestamps must be nondecreasing|Dragon Flight completion requires a launch action|Host-proof attempt has already been claimed with a different transcript|(?:forged|foreign)\s+opaque\s+receipt/i.test(error.message)
  ) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" } },
      { status: 400 },
    );
  }

  console.error({ level: "error", event: "host_proof_attempt_complete_failed", error });
  return NextResponse.json(
    { error: { code: "HOST_PROOF_INTERNAL", message: "Unable to complete host-proof attempt" } },
    { status: 500 },
  );
}

/**
 * POST /api/host-proof/games/completions
 *
 * Completes one signed Dragon Flight transcript using server-replayed facts.
 * The payload contains only its issued credential and actual ordered runtime
 * actions; score, XP, victory, and tenant are never client supplied.
 * @param request Request containing a signed attempt transcript.
 * @returns The server-derived fire-once completion outcome.
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

  const parsedBody = completeDragonFlightHostProofAttemptSchema.safeParse(body);
  if (!parsedBody.success) return toAttemptErrorResponse(parsedBody.error);

  try {
    const dependencies = createDragonFlightHostProofAttemptDependencies({
      db: createTenantDB(db, { schoolId }),
      user,
      tenant: { schoolId },
      secret: getHostProofAttemptSecret(),
    });
    const result = await completeDragonFlightHostProofAttempt(
      { userId: user.id, schoolId },
      parsedBody.data,
      dependencies,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toAttemptErrorResponse(error);
  }
}

/**
 * GET /api/host-proof/games/completions?limit=<n>
 *
 * Returns the caller's Dragon Flight proof history under the authenticated
 * tenant. The former multi-title candidate remains intentionally unavailable.
 * @param request Request containing an optional bounded history limit.
 * @returns Tenant-scoped Dragon Flight completion history.
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
  const limitParam = searchParams.get("limit");
  const gameType = searchParams.get("gameType");
  const allowedHistoryTypes = new Set(["dragon-flight", "magic-defense", "dungeon-liberator", "castle-defense", "wizard-vs-zombie", "village-guardian", "enchanted-library", "rune-match", "alchemists-synthesis", "potion-rush", "rune-forge-chamber", "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king", "griffin-riders-escape"]);
  if (gameType && !allowedHistoryTypes.has(gameType)) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_UNKNOWN_CARTRIDGE", message: "Unsupported host-proof cartridge" } },
      { status: 404 },
    );
  }

  const tenantDb = createTenantDB(db, { schoolId });
  try {
    const history = await getHostProofGameCompletions({
      db: tenantDb,
      user,
      tenant: { schoolId },
      input: {
        gameType: (gameType && allowedHistoryTypes.has(gameType) ? gameType : "dragon-flight") as
          | "dragon-flight"
          | "magic-defense"
          | "dungeon-liberator"
          | "castle-defense"
          | "wizard-vs-zombie"
          | "village-guardian"
          | "enchanted-library"
          | "rune-match"
          | "alchemists-synthesis"
          | "potion-rush"
          | "rune-forge-chamber" | "spellweavers-run" | "shadow-gate-dungeon" | "labyrinth-goblin-king" | "griffin-riders-escape",
        ...(limitParam !== null ? { limit: Number(limitParam) } : {}),
      },
    });
    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    return toHostProofErrorResponse(error);
  }
}
