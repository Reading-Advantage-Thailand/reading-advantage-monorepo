import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  attestDragonFlightHostProofAction,
  createDragonFlightHostProofAttemptDependencies,
} from "@reading-advantage/domain/games";
import type { UserContext } from "@reading-advantage/auth";
import { ZodError } from "zod";

import { isHostProofEnabled } from "@/lib/host-proof-config";
import { getCurrentUser, type SessionUser } from "@/lib/session";

/** Identifies an invalid server-side host-proof signing-secret configuration. */
class HostProofAttemptSecretConfigurationError extends Error {}

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
    throw new HostProofAttemptSecretConfigurationError(
      "HOST_PROOF_ATTEMPT_SECRET must contain at least 32 characters",
    );
  }
  return secret;
}

/**
 * Converts checkpoint validation failures into a stable host-proof API response.
 * @param error Error raised while observing an action transition.
 * @returns A safe JSON error response.
 */
function toAttemptErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Action observation failed validation" } },
      { status: 400 },
    );
  }
  if (error instanceof HostProofAttemptSecretConfigurationError) {
    console.error({ level: "error", event: "host_proof_attempt_action_failed", error });
    return NextResponse.json(
      { error: { code: "HOST_PROOF_INTERNAL", message: "Unable to observe host-proof action" } },
      { status: 500 },
    );
  }
  if (error instanceof Error && /credential|action|checkpoint|attempt|expired|dwell|(?:forged|foreign)\s+opaque\s+receipt/i.test(error.message)) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Action observation was rejected" } },
      { status: 400 },
    );
  }

  console.error({ level: "error", event: "host_proof_attempt_action_failed", error });
  return NextResponse.json(
    { error: { code: "HOST_PROOF_INTERNAL", message: "Unable to observe host-proof action" } },
    { status: 500 },
  );
}

/**
 * Records one authenticated Dragon Flight protocol transition and returns its chained server receipt.
 *
 * The receipt attests to server-observed request sequencing only; it does not establish human play,
 * answer comprehension, bot resistance, or a broader anti-cheat claim.
 * @param request Request containing one action and the prior server checkpoint when applicable.
 * @returns An action-specific receipt required by the later completion request.
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

  try {
    const dependencies = createDragonFlightHostProofAttemptDependencies({
      db: createTenantDB(db, { schoolId }),
      user,
      tenant: { schoolId },
      secret: getHostProofAttemptSecret(),
    });
    const result = await attestDragonFlightHostProofAction(
      { userId: user.id, schoolId },
      body,
      dependencies,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toAttemptErrorResponse(error);
  }
}
