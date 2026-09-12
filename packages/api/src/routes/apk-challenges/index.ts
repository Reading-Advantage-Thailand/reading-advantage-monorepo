import {
  createClassChallenge,
  createClassChallengeInputSchema,
  listClassChallenges,
  listClassChallengesInputSchema,
  listOwnedChallengeClasses,
  listStudentChallengeClasses,
  listStudentClassesInputSchema,
  studentChallengeClassPageSchema,
  startClassChallengeRun,
  startClassChallengeRunInputSchema,
  type ChallengeGameCapability,
} from "@reading-advantage/domain/challenges";
import {
  classChallengePublicSummarySchema,
  studentChallengeRunLaunchSchema,
} from "@reading-advantage/game-contracts";

type User = Parameters<typeof createClassChallenge>[0]["user"];
type Db = Parameters<typeof createClassChallenge>[0]["db"];
type Session = { user: User };

/** Dependencies for authenticated APK challenge routes. */
export interface ApkChallengeRouteDependencies {
  sessionCookieName: string;
  validateSession: (token: string) => Promise<Session | null>;
  createTenantDb: (schoolId: string) => Db;
  createChallenge: typeof createClassChallenge;
  listChallenges: typeof listClassChallenges;
  listStudentClasses: typeof listStudentChallengeClasses;
  listTeacherClasses: typeof listOwnedChallengeClasses;
  startRun: typeof startClassChallengeRun;
  resolveGameCapability: (gameId: string) => Promise<ChallengeGameCapability | undefined>;
}

/**
 * Builds the student class discovery endpoint.
 * @param dependencies Auth, tenant, and challenge domain adapters.
 * @returns An authenticated student GET handler.
 */
export function createApkChallengeClassesRoute(dependencies: ApkChallengeRouteDependencies) {
  return { GET: async (request: ApkChallengeRequest) => {
    const session = await authenticate(request, dependencies);
    if (!session) return error(401, "UNAUTHORIZED", "Authentication required");
    if (session.user.role !== "STUDENT") return error(403, "FORBIDDEN", "Student access is required");
    const url = new URL(request.url);
    if ([...url.searchParams.keys()].some((key) => !["limit", "offset"].includes(key))) {
      return error(400, "INVALID_QUERY", "Class selection is invalid");
    }
    const parsed = listStudentClassesInputSchema.safeParse({
      ...(url.searchParams.has("limit") ? { limit: Number(url.searchParams.get("limit")) } : {}),
      ...(url.searchParams.has("offset") ? { offset: Number(url.searchParams.get("offset")) } : {}),
    });
    if (!parsed.success) return error(400, "INVALID_QUERY", "Class selection is invalid");
    try {
      const schoolId = session.user.schoolId!;
      const result = await dependencies.listStudentClasses({
        db: dependencies.createTenantDb(schoolId),
        user: session.user,
        tenant: { schoolId },
        input: parsed.data,
      });
      return Response.json(studentChallengeClassPageSchema.parse(result));
    } catch (cause) {
      return domainError(cause);
    }
  } };
}

/**
 * Builds the teacher class discovery endpoint.
 * @param dependencies Auth, tenant, and challenge domain adapters.
 * @returns An authenticated teacher or administrator GET handler.
 */
export function createApkChallengeTeacherClassesRoute(dependencies: ApkChallengeRouteDependencies) {
  return { GET: async (request: ApkChallengeRequest) => {
    const session = await authenticate(request, dependencies);
    if (!session) return error(401, "UNAUTHORIZED", "Authentication required");
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return error(403, "FORBIDDEN", "Teacher access is required");
    }
    const url = new URL(request.url);
    if ([...url.searchParams.keys()].some((key) => !["limit", "offset"].includes(key))) {
      return error(400, "INVALID_QUERY", "Class selection is invalid");
    }
    const parsed = listStudentClassesInputSchema.safeParse({
      ...(url.searchParams.has("limit") ? { limit: Number(url.searchParams.get("limit")) } : {}),
      ...(url.searchParams.has("offset") ? { offset: Number(url.searchParams.get("offset")) } : {}),
    });
    if (!parsed.success) return error(400, "INVALID_QUERY", "Class selection is invalid");
    try {
      const schoolId = session.user.schoolId!;
      const result = await dependencies.listTeacherClasses({
        db: dependencies.createTenantDb(schoolId),
        user: session.user,
        tenant: { schoolId },
        input: parsed.data,
      });
      return Response.json(studentChallengeClassPageSchema.parse(result));
    } catch (cause) {
      return domainError(cause);
    }
  } };
}

/** Minimal request accepted by the route factory. */
export interface ApkChallengeRequest {
  url: string;
  headers: Headers;
  json: () => Promise<unknown>;
}

function readCookie(header: string | null, name: string): string | undefined {
  const entry = header?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  if (!entry) return undefined;
  try { return decodeURIComponent(entry.slice(name.length + 1)) || undefined; } catch { return undefined; }
}

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message }, status }, { status });
}

async function authenticate(request: ApkChallengeRequest, dependencies: ApkChallengeRouteDependencies) {
  const token = readCookie(request.headers.get("cookie"), dependencies.sessionCookieName);
  if (!token) return null;
  try {
    const session = await dependencies.validateSession(token);
    return session?.user.schoolId ? session : null;
  } catch {
    return null;
  }
}

function sameOrigin(request: ApkChallengeRequest): boolean {
  try { return request.headers.get("origin") === new URL(request.url).origin; } catch { return false; }
}

/**
 * Builds the class challenge list and create endpoint.
 * @param dependencies Auth, tenant, domain, and installed cartridge adapters.
 * @returns Authenticated GET and same-origin POST handlers.
 */
export function createApkChallengeRoute(dependencies: ApkChallengeRouteDependencies) {
  return {
    GET: async (request: ApkChallengeRequest) => {
      const session = await authenticate(request, dependencies);
      if (!session) return error(401, "UNAUTHORIZED", "Authentication required");
      const url = new URL(request.url);
      if ([...url.searchParams.keys()].some((key) => !["classId", "limit", "offset"].includes(key))) {
        return error(400, "INVALID_QUERY", "Challenge selection is invalid");
      }
      const parsed = listClassChallengesInputSchema.safeParse({
        classId: url.searchParams.get("classId"),
        ...(url.searchParams.has("limit") ? { limit: Number(url.searchParams.get("limit")) } : {}),
        ...(url.searchParams.has("offset") ? { offset: Number(url.searchParams.get("offset")) } : {}),
      });
      if (!parsed.success) return error(400, "INVALID_QUERY", "Challenge selection is invalid");
      try {
        const schoolId = session.user.schoolId!;
        const result = await dependencies.listChallenges({ db: dependencies.createTenantDb(schoolId), user: session.user, tenant: { schoolId }, input: parsed.data });
        return Response.json({ challenges: classChallengePublicSummarySchema.array().parse(result) });
      } catch (cause) {
        return domainError(cause);
      }
    },
    POST: async (request: ApkChallengeRequest) => {
      if (!sameOrigin(request)) return error(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed");
      const session = await authenticate(request, dependencies);
      if (!session) return error(401, "UNAUTHORIZED", "Authentication required");
      if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") return error(403, "FORBIDDEN", "Teacher access is required");
      let body: unknown;
      try { body = await request.json(); } catch { return error(400, "INVALID_JSON", "Request body must be valid JSON"); }
      const parsed = createClassChallengeInputSchema.safeParse(body);
      if (!parsed.success) return error(400, "INVALID_PAYLOAD", "Challenge definition is invalid");
      const capability = await dependencies.resolveGameCapability(parsed.data.gameId);
      if (!capability || capability.version !== parsed.data.gameVersion || capability.inputMode !== parsed.data.content.mode || !capability.modalities.includes(parsed.data.modality.modality)) {
        return error(400, "UNSUPPORTED_GAME", "Challenge game configuration is unavailable");
      }
      try {
        const schoolId = session.user.schoolId!;
        const result = await dependencies.createChallenge({ db: dependencies.createTenantDb(schoolId), user: session.user, tenant: { schoolId }, input: parsed.data });
        return Response.json(classChallengePublicSummarySchema.parse(result), { status: 201 });
      } catch (cause) { return domainError(cause); }
    },
  };
}

/**
 * Builds the server-issued challenge run endpoint.
 * @param dependencies Auth, tenant, domain, and installed cartridge adapters.
 * @returns A same-origin authenticated POST handler.
 */
export function createApkChallengeRunRoute(dependencies: ApkChallengeRouteDependencies) {
  return { POST: async (request: ApkChallengeRequest) => {
    if (!sameOrigin(request)) return error(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed");
    const session = await authenticate(request, dependencies);
    if (!session) return error(401, "UNAUTHORIZED", "Authentication required");
    let body: unknown;
    try { body = await request.json(); } catch { return error(400, "INVALID_JSON", "Request body must be valid JSON"); }
    const parsed = startClassChallengeRunInputSchema.safeParse(body);
    if (!parsed.success) return error(400, "INVALID_PAYLOAD", "Challenge run request is invalid");
    try {
      const schoolId = session.user.schoolId!;
      const result = await dependencies.startRun({ db: dependencies.createTenantDb(schoolId), user: session.user, tenant: { schoolId }, input: parsed.data, resolveGameCapability: dependencies.resolveGameCapability });
      return Response.json(studentChallengeRunLaunchSchema.parse(result), { status: 201 });
    } catch (cause) { return domainError(cause); }
  } };
}

function domainError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  const code = typeof cause === "object" && cause !== null && "code" in cause ? (cause as { code?: unknown }).code : undefined;
  if (code === "UNAUTHORIZED") return error(401, "UNAUTHORIZED", "Authentication required");
  if (code === "CONFLICT") return error(409, "CONFLICT", "Challenge creation key conflicts with another request");
  if (code === "FORBIDDEN" || message === "Forbidden" || message.includes("participation")) return error(403, "FORBIDDEN", "Challenge access is not permitted");
  if (message.includes("not found")) return error(404, "NOT_FOUND", "Challenge was not found");
  return error(500, "INTERNAL_ERROR", "Unable to process challenge");
}
