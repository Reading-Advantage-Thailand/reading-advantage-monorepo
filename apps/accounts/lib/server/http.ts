import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { CompanyIdentityError, type Employee } from "@reading-advantage/backend";
import type { AuthenticationEvidence } from "@reading-advantage/backend";

import { getIdentityComposition } from "./identity";

/** Verifies that a state-changing browser request came from the Accounts origin. */
export async function requireSameOrigin(request: Request): Promise<void> {
  const origin = request.headers.get("origin");
  const expected = new URL((await getIdentityComposition()).issuerUrl).origin;
  if (origin !== expected) throw new CompanyIdentityError("FORBIDDEN", "Request origin is invalid.");
}

/** Returns the currently signed-in employee, or null for an anonymous request. */
export async function currentEmployee(): Promise<Employee | null> {
  const composition = await getIdentityComposition();
  const token = await currentSessionToken();
  return token ? composition.service.currentEmployee(token) : null;
}

/**
 * Returns the opaque Accounts session evidence for server-side kernel invocation.
 * @returns Host-only session token or undefined for an anonymous request.
 */
export async function currentSessionToken(): Promise<string | undefined> {
  const composition = await getIdentityComposition();
  return (await cookies()).get(composition.cookie.name)?.value;
}

/**
 * Creates transport-neutral authentication evidence from the host-only session.
 * @returns Session evidence or anonymous evidence for fail-closed authentication.
 */
export async function identityAuthenticationEvidence(): Promise<AuthenticationEvidence> {
  const token = await currentSessionToken();
  return token
    ? { kind: "session", opaqueSessionRef: token }
    : { kind: "anonymous" };
}

/** Requires a current company administrator without granting product roles. */
export async function requireCompanyAdmin(): Promise<Employee> {
  const employee = await currentEmployee();
  if (!employee?.companyRoles.includes("COMPANY_ADMIN")) {
    throw new CompanyIdentityError("FORBIDDEN", "Company administrator access is required.");
  }
  return employee;
}

/** Requires a live signed-in employee while leaving authorization to the backend policy. */
export async function requireEmployee(): Promise<Employee> {
  const employee = await currentEmployee();
  if (!employee) {
    throw new CompanyIdentityError("SESSION_INVALID", "Sign-in is required.");
  }
  return employee;
}

/** Extracts the first trusted request IP value supplied by Cloud Run. */
export async function requestIpAddress(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Maps a boundary-safe identity error to a stable JSON response. */
export function identityErrorResponse(error: unknown): NextResponse {
  if (error instanceof CompanyIdentityError) {
    const status = error.code === "FORBIDDEN" ? 403
      : error.code === "RATE_LIMITED" ? 429
        : error.code === "EMPLOYEE_NOT_FOUND" ? 404
          : error.code === "USERNAME_CONFLICT" || error.code === "LAST_COMPANY_ADMIN_REQUIRED" ? 409
            : error.code === "SESSION_INVALID" || error.code === "AUTHENTICATION_FAILED" ? 401
              : 400;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  if (typeof error === "object" && error !== null && "code" in error &&
      typeof error.code === "string") {
    const code = error.code;
    const status = code === "FORBIDDEN" ? 403
      : code === "EMPLOYEE_NOT_FOUND" ? 404
        : code === "USERNAME_CONFLICT" || code === "LAST_COMPANY_ADMIN_REQUIRED" ||
            code.startsWith("IDEMPOTENCY_") ? 409
          : code === "UNAUTHENTICATED" ? 401
            : code === "INVALID_INPUT" || code === "INVALID_IDEMPOTENCY_KEY" ? 400
              : 500;
    const message = "message" in error && typeof error.message === "string"
      ? error.message
      : "The identity operation could not be completed.";
    return NextResponse.json({ error: code, message }, { status });
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "The identity operation could not be completed." },
    { status: 500 },
  );
}
