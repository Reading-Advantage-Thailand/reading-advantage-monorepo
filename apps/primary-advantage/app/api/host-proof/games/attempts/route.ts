import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import {
  createDragonFlightHostProofAttemptDependencies,
  issueDragonFlightHostProofAttempt,
} from "@reading-advantage/domain/games";
import type { UserContext } from "@reading-advantage/auth";
import { ZodError } from "zod";

import { isHostProofEnabled } from "@/lib/host-proof-config";
import { getCurrentUser } from "@/lib/session";

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
 * Converts safe validation failures into a host-proof API response.
 * @param error Error raised by the domain attempt command.
 * @returns A stable JSON error response.
 */
function toAttemptErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Attempt request failed validation" } },
      { status: 400 },
    );
  }

  console.error({ level: "error", event: "host_proof_attempt_issue_failed", error });
  return NextResponse.json(
    { error: { code: "HOST_PROOF_INTERNAL", message: "Unable to issue host-proof attempt" } },
    { status: 500 },
  );
}

/**
 * Issues one short-lived, actor-bound Dragon Flight attempt to an authenticated learner.
 * @param request Request containing only the selected game and difficulty.
 * @returns The server-owned vocabulary input and tamper-evident credential.
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

  const user = sessionUser as UserContext;
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
    const attempt = await issueDragonFlightHostProofAttempt(
      { userId: user.id, schoolId },
      body,
      dependencies,
    );
    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    return toAttemptErrorResponse(error);
  }
}
