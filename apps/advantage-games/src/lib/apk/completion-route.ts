import { NextResponse } from "next/server";
import {
  gameCompletionInputSchema,
  gameCompletionResultSchema,
  recordGameCompletion,
} from "@reading-advantage/domain/games";

type CompletionArguments = Parameters<typeof recordGameCompletion>[0];
type SessionUser = CompletionArguments["user"];

interface AuthenticatedSession {
  user: SessionUser;
}

/** Dependencies that connect the HTTP adapter to shared auth, tenancy, and domain code. */
export interface ApkCompletionRouteDependencies {
  /** Name of the shared first-party session cookie. */
  sessionCookieName: string;
  /** Resolves an opaque cookie token to its database-backed session. */
  validateSession: (token: string) => Promise<AuthenticatedSession | null>;
  /** Creates a school-scoped TenantDB for the authenticated user's school. */
  createTenantDb: (schoolId: string) => CompletionArguments["db"];
  /** Persists the validated completion through the shared domain command. */
  recordCompletion: typeof recordGameCompletion;
}

/** Generic request shape needed by the framework-neutral completion adapter. */
export interface ApkCompletionRequest {
  /** Absolute request URL used by the same-origin guard. */
  url: string;
  /** Request headers containing Origin and Cookie. */
  headers: Headers;
  /** Parses the untrusted JSON request body. */
  json: () => Promise<unknown>;
}

const serverOwnedMetadataKeys = new Set([
  "account",
  "accountid",
  "identity",
  "permission",
  "permissions",
  "role",
  "school",
  "schoolid",
  "tenant",
  "tenantid",
  "user",
  "userid",
  "xp",
  "xpearned",
]);

/**
 * Normalizes a metadata key so casing and punctuation cannot bypass the
 * server-owned field denylist.
 * @param key Untrusted metadata key.
 * @returns Lowercase alphanumeric key used for comparison.
 */
function normalizeMetadataKey(key: string): string {
  return key.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Detects attempts to smuggle XP, identity, tenant, or permission data inside
 * otherwise open game metadata.
 * @param value Untrusted metadata subtree.
 * @param seen Previously inspected objects, protecting against non-JSON test doubles.
 * @returns True when a server-owned key occurs at any depth.
 */
function containsServerOwnedMetadata(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): boolean {
  if (value === null || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((entry) => containsServerOwnedMetadata(entry, seen));
  }

  return Object.entries(value).some(
    ([key, child]) =>
      serverOwnedMetadataKeys.has(normalizeMetadataKey(key)) ||
      containsServerOwnedMetadata(child, seen),
  );
}

/**
 * Reads one cookie value without coupling the adapter to Next.js cookie APIs.
 * @param cookieHeader Raw Cookie request header.
 * @param cookieName Exact shared cookie name to resolve.
 * @returns Decoded cookie value, or undefined when absent or malformed.
 */
function readCookie(
  cookieHeader: string | null,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) return undefined;

  for (const segment of cookieHeader.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0) continue;
    const name = segment.slice(0, separator).trim();
    if (name !== cookieName) continue;
    const rawValue = segment.slice(separator + 1).trim();
    if (!rawValue) return undefined;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Creates a consistent JSON error response without exposing internal details.
 * @param status HTTP status code.
 * @param code Stable machine-readable error code.
 * @param message Safe user-facing message.
 * @param issues Optional validation issues safe to return to the caller.
 * @returns Structured JSON response.
 */
function errorResponse(
  status: 400 | 401 | 403 | 500,
  code: string,
  message: string,
  issues?: Array<{ code: string; path: PropertyKey[]; message: string }>,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(issues === undefined ? {} : { issues }),
      },
      status,
    },
    { status },
  );
}

/**
 * Checks whether an unknown thrown value carries an auth error code.
 * @param error Unknown thrown value.
 * @param code Auth error code to match.
 * @returns True when the value exposes the requested code.
 */
function hasErrorCode(
  error: unknown,
  code: "UNAUTHORIZED" | "FORBIDDEN",
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

/**
 * Builds the generic authenticated APK completion endpoint.
 * @param dependencies Shared auth, tenant database, and domain command adapters.
 * @returns A POST handler that validates origin, session, tenant, and payload before persistence.
 */
export function createApkCompletionRoute(
  dependencies: ApkCompletionRouteDependencies,
): { POST: (request: ApkCompletionRequest) => Promise<NextResponse> } {
  return {
    POST: async (request) => {
      let requestOrigin: string;
      try {
        requestOrigin = new URL(request.url).origin;
      } catch {
        return errorResponse(
          403,
          "ORIGIN_FORBIDDEN",
          "Request origin is not allowed",
        );
      }

      const suppliedOrigin = request.headers.get("origin");
      if (!suppliedOrigin || suppliedOrigin !== requestOrigin) {
        return errorResponse(
          403,
          "ORIGIN_FORBIDDEN",
          "Request origin is not allowed",
        );
      }

      const sessionToken = readCookie(
        request.headers.get("cookie"),
        dependencies.sessionCookieName,
      );
      if (!sessionToken) {
        return errorResponse(401, "UNAUTHORIZED", "Authentication required");
      }

      try {
        const session = await dependencies.validateSession(sessionToken);
        if (!session) {
          return errorResponse(401, "UNAUTHORIZED", "Authentication required");
        }
        if (session.user.role !== "STUDENT") {
          return errorResponse(
            403,
            "FORBIDDEN",
            "A student account is required",
          );
        }

        const schoolId = session.user.schoolId;
        if (!schoolId) {
          return errorResponse(
            403,
            "TENANT_REQUIRED",
            "A school assignment is required",
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse(
            400,
            "INVALID_JSON",
            "Request body must be valid JSON",
          );
        }

        const parsed = gameCompletionInputSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            400,
            "INVALID_PAYLOAD",
            "Game completion payload is invalid",
            parsed.error.issues.map(({ code, path, message }) => ({
              code,
              path,
              message,
            })),
          );
        }
        if (containsServerOwnedMetadata(parsed.data.metadata)) {
          return errorResponse(
            400,
            "INVALID_PAYLOAD",
            "Game completion metadata contains server-owned fields",
          );
        }

        const tenant = { schoolId };
        const result = await dependencies.recordCompletion({
          db: dependencies.createTenantDb(schoolId),
          user: session.user,
          tenant,
          input: parsed.data,
        });
        const validatedResult = gameCompletionResultSchema.safeParse(result);
        if (!validatedResult.success) {
          console.error({
            level: "error",
            event: "apk_completion_invalid_domain_result",
          });
          return errorResponse(
            500,
            "INTERNAL_ERROR",
            "Unable to save game completion",
          );
        }

        return NextResponse.json(validatedResult.data, { status: 200 });
      } catch (error) {
        if (hasErrorCode(error, "UNAUTHORIZED")) {
          return errorResponse(401, "UNAUTHORIZED", "Authentication required");
        }
        if (hasErrorCode(error, "FORBIDDEN")) {
          return errorResponse(
            403,
            "FORBIDDEN",
            "Game completion is not permitted",
          );
        }
        console.error({
          level: "error",
          event: "apk_completion_failed",
        });
        return errorResponse(
          500,
          "INTERNAL_ERROR",
          "Unable to save game completion",
        );
      }
    },
  };
}
