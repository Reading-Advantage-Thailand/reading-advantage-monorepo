import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";
import { db } from "@reading-advantage/db";
import { SESSION_COOKIE_NAME, createPostgresRateLimitStore, type UserContext } from "@reading-advantage/auth";
import { getClientIp } from "@reading-advantage/api/routes/auth";
import { studentLogin } from "@reading-advantage/domain";
import { canUseFullAuthFeature } from "@/lib/auth-strength";
import { getCurrentSession } from "@/lib/session";

const STATUS: Record<studentLogin.StudentLoginErrorCode, number> = {
  invalid_code: 401,
  invalid_credentials: 401,
  locked: 423,
  rate_limited: 429,
  forbidden: 403,
  not_found: 404,
  unavailable: 503,
};

/** Shared rate-limit store for student login (Postgres, durable across instances). */
export const studentLoginStore = createPostgresRateLimitStore(db);

/**
 * Reads the client IP and user agent of a request.
 * @param request The incoming request.
 * @returns The IP (null when unknown) and the user agent (null when absent).
 */
export function requestMeta(request: NextRequest): studentLogin.RequestMeta {
  return { ip: getClientIp(request) ?? null, userAgent: request.headers.get("user-agent") };
}

/**
 * Maps a thrown error to an HTTP response. A student-login error keeps its status and
 * `Retry-After`. Any other error is logged and becomes a plain 500.
 * @param error The thrown value.
 * @returns The JSON error response.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof studentLogin.StudentLoginError) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      {
        status: STATUS[error.code],
        ...(error.retryAfterSeconds ? { headers: { "Retry-After": String(error.retryAfterSeconds) } } : {}),
      },
    );
  }
  console.error("Student login error:", error instanceof Error ? error.message : "Unknown");
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}

/**
 * Parses a JSON body with a Zod contract.
 * @param request The incoming request.
 * @param schema The contract.
 * @returns The parsed input, or a 400 response when the body is not valid.
 */
export async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T | NextResponse> {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  return parsed.success ? parsed.data : NextResponse.json({ message: "Invalid input" }, { status: 400 });
}

// Bodies can carry one-time secrets (class codes, initial passwords, card tokens).
const NO_STORE = { headers: { "Cache-Control": "no-store" } };

/**
 * Builds a handler for a teacher action. `/api/*` is outside the proxy matcher, so the
 * handler checks the session itself: signed in, and a `full` session.
 * @param schema Contract of the request body.
 * @param run The use-case call. It gets the user, the request meta, and the parsed input.
 * @returns A route handler.
 */
export function teacherHandler<T>(
  schema: ZodType<T>,
  run: (args: { user: UserContext; meta: studentLogin.RequestMeta; input: T }) => Promise<unknown>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const session = await getCurrentSession();
      if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      if (!canUseFullAuthFeature(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      const input = await parseBody(request, schema);
      if (input instanceof NextResponse) return input;
      return NextResponse.json(await run({ user: session.user, meta: requestMeta(request), input }), NO_STORE);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Builds a handler for an unauthenticated student request (code entry, sign-in).
 * @param schema Contract of the request body.
 * @param run The use-case call. It returns the JSON body and, for a sign-in, the session cookie.
 * @returns A route handler.
 */
export function studentHandler<T>(
  schema: ZodType<T>,
  run: (args: { meta: studentLogin.RequestMeta; input: T }) => Promise<{ body: unknown; session?: { token: string; expiresAt: Date } }>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const input = await parseBody(request, schema);
      if (input instanceof NextResponse) return input;
      const { body, session } = await run({ meta: requestMeta(request), input });
      const response = NextResponse.json(body, NO_STORE);
      if (session) {
        response.cookies.set(SESSION_COOKIE_NAME, session.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: session.expiresAt,
        });
      }
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Splits a sign-in result into the public contract output and the cookie data.
 * @param result The sign-in result from the domain.
 * @returns The response body (validated by the contract) and the session cookie data.
 */
export function signInResponse(result: studentLogin.StudentSignInResult) {
  const { token, expiresAt, ...rest } = result;
  return { body: studentLogin.studentSignInOutput.parse(rest), session: { token, expiresAt } };
}
