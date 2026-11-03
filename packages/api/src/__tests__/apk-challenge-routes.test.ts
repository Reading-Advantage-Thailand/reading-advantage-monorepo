import { describe, expect, it, vi } from "vitest";
import {
  createApkChallengeClassesRoute,
  createApkChallengeRoute,
  createApkChallengeRunRoute,
  createApkChallengeTeacherClassesRoute,
  type ApkChallengeRouteDependencies,
} from "../routes/apk-challenges/index.js";

const origin = "https://games.example";
const schoolId = "10000000-0000-4000-8000-000000000001";
const classId = "20000000-0000-4000-8000-000000000002";
const challengeId = "30000000-0000-4000-8000-000000000003";
const runId = "40000000-0000-4000-8000-000000000004";
const student = { id: "student-1", role: "STUDENT" as const, schoolId };
const teacher = { id: "teacher-1", role: "TEACHER" as const, schoolId };
const admin = { id: "admin-1", role: "ADMIN" as const, schoolId };
const system = { id: "system-1", role: "SYSTEM" as const, schoolId };
const modality = { modality: "reading" as const, promptLocale: "th-TH" as const, answerLocale: "en-US" as const, promptField: "translation" as const, answerField: "term" as const, scored: true as const };
const summary = { id: challengeId, classId, title: "River flight", gameId: "dragon-flight", gameVersion: "2026-09-09.1", contentMode: "vocabulary" as const, contentLocale: "th" as const, contentItemCount: 1, seed: 42, difficulty: "medium" as const, modality, startsAt: "2026-09-09T08:00:00.000Z", expiresAt: "2026-09-10T08:00:00.000Z", target: 20, contributionCount: 0 };
const content = { mode: "vocabulary" as const, items: [{ term: "river", translation: "แม่น้ำ" }] };
const createInput = { classId, title: summary.title, gameId: "dragon-flight" as const, gameVersion: summary.gameVersion, contentLocale: "th" as const, content, seed: 42, difficulty: "medium" as const, modality, startsAt: summary.startsAt, expiresAt: summary.expiresAt, target: 20, teacherParticipationEnabled: false };
const classPage = { classes: [{ id: classId, name: "River Class" }], hasMore: false };

type User = typeof student | typeof teacher | typeof admin | typeof system;

function request(path: string, options: { body?: unknown; cookie?: string | null; origin?: string | null; jsonError?: boolean } = {}) {
  const headers = new Headers();
  const cookie = options.cookie === undefined ? "session_token=opaque" : options.cookie;
  if (cookie !== null) headers.set("cookie", cookie);
  const requestOrigin = options.origin === undefined ? origin : options.origin;
  if (requestOrigin !== null) headers.set("origin", requestOrigin);
  const json = options.jsonError ? vi.fn().mockRejectedValue(new SyntaxError("bad json")) : vi.fn().mockResolvedValue(options.body);
  return { url: path.startsWith("http") || path.startsWith("not") ? path : `${origin}${path}`, headers, json };
}

function dependencies(user: User | null = student) {
  return {
    sessionCookieName: "session_token",
    validateSession: vi.fn().mockResolvedValue(user ? { user } : null),
    createTenantDb: vi.fn().mockReturnValue({ tenant: schoolId }),
    createChallenge: vi.fn().mockResolvedValue(summary),
    listChallenges: vi.fn().mockResolvedValue([summary]),
    listStudentClasses: vi.fn().mockResolvedValue(classPage),
    listTeacherClasses: vi.fn().mockResolvedValue(classPage),
    startRun: vi.fn().mockResolvedValue({ runId, challengeId, userId: user?.id ?? "x", challenge: summary, content, issuedAt: "2026-09-09T09:00:00.000Z", expiresAt: summary.expiresAt }),
    resolveGameCapability: vi.fn().mockResolvedValue({ version: summary.gameVersion, inputMode: "vocabulary" as const, modalities: ["reading" as const] }),
  };
}

function asDeps(deps: ReturnType<typeof dependencies>): ApkChallengeRouteDependencies {
  return deps as unknown as ApkChallengeRouteDependencies;
}

async function errorCode(response: Response) {
  return { status: response.status, code: ((await response.json()) as { error: { code: string } }).error.code };
}

describe("APK challenge cookie authentication", () => {
  it("rejects a request without a cookie header before session lookup", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges?classId=${classId}`, { cookie: null }));

    expect(await errorCode(response)).toEqual({ status: 401, code: "UNAUTHORIZED" });
    expect(deps.validateSession).not.toHaveBeenCalled();
  });

  it("reads only the named cookie among several cookies", async () => {
    const deps = dependencies();
    await createApkChallengeRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges?classId=${classId}`, { cookie: "theme=dark; xsession_token=wrong;  session_token=a%20b ; other=1" }));

    expect(deps.validateSession).toHaveBeenCalledWith("a b");
  });

  it("rejects an empty cookie value and a cookie with a similar name", async () => {
    const deps = dependencies();
    const route = createApkChallengeRoute(asDeps(deps));

    expect((await route.GET(request(`/api/v1/apk/challenges?classId=${classId}`, { cookie: "session_token=" }))).status).toBe(401);
    expect((await route.GET(request(`/api/v1/apk/challenges?classId=${classId}`, { cookie: "session_token_old=abc" }))).status).toBe(401);
    expect(deps.validateSession).not.toHaveBeenCalled();
  });

  it("rejects a cookie value with malformed percent encoding", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges?classId=${classId}`, { cookie: "session_token=%E0%A4%A" }));

    expect(response.status).toBe(401);
    expect(deps.validateSession).not.toHaveBeenCalled();
  });

  it("rejects an unknown session token", async () => {
    const deps = dependencies(null);
    const response = await createApkChallengeClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/classes"));

    expect(await errorCode(response)).toEqual({ status: 401, code: "UNAUTHORIZED" });
    expect(deps.listStudentClasses).not.toHaveBeenCalled();
  });

  it("rejects a session whose user has no school tenant", async () => {
    const deps = dependencies();
    deps.validateSession.mockResolvedValue({ user: { ...student, schoolId: null } });
    const response = await createApkChallengeClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/classes"));

    expect(response.status).toBe(401);
    expect(deps.createTenantDb).not.toHaveBeenCalled();
  });

  it("treats a session store failure as unauthenticated", async () => {
    const deps = dependencies();
    deps.validateSession.mockRejectedValue(new Error("store down"));
    const response = await createApkChallengeTeacherClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/teacher-classes"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" }, status: 401 });
  });
});

describe("student class discovery route", () => {
  it("applies default paging when no query is given and scopes to the session tenant", async () => {
    const deps = dependencies();
    const response = await createApkChallengeClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/classes"));

    expect(response.status).toBe(200);
    expect(deps.createTenantDb).toHaveBeenCalledWith(schoolId);
    expect(deps.listStudentClasses).toHaveBeenCalledWith({ db: { tenant: schoolId }, user: student, tenant: { schoolId }, input: { limit: 25, offset: 0 } });
  });

  it.each([
    ["an unknown key", "?schoolId=other"],
    ["a non-numeric limit", "?limit=abc"],
    ["a zero limit", "?limit=0"],
    ["a fractional offset", "?offset=1.5"],
    ["a negative offset", "?offset=-1"],
    ["an offset above the cap", "?offset=10001"],
  ])("rejects %s with 400", async (_name, query) => {
    const deps = dependencies();
    const response = await createApkChallengeClassesRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges/classes${query}`));

    expect(await errorCode(response)).toEqual({ status: 400, code: "INVALID_QUERY" });
    expect(deps.listStudentClasses).not.toHaveBeenCalled();
  });

  it.each([teacher, admin, system])("forbids role %s", async (user) => {
    const deps = dependencies(user);
    const response = await createApkChallengeClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/classes"));

    expect(await errorCode(response)).toEqual({ status: 403, code: "FORBIDDEN" });
    expect(deps.listStudentClasses).not.toHaveBeenCalled();
  });

  it("maps a domain failure to a safe 500 without leaking its message", async () => {
    const deps = dependencies();
    deps.listStudentClasses.mockRejectedValue(new Error("SELECT failed on host db-1"));
    const response = await createApkChallengeClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/classes"));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("db-1");
  });

  it("returns 500 when the domain result breaks the public page contract", async () => {
    const deps = dependencies();
    deps.listStudentClasses.mockResolvedValue({ classes: [{ id: classId, name: "River", teacherId: "leak" }], hasMore: false });
    const response = await createApkChallengeClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/classes"));

    expect(await errorCode(response)).toEqual({ status: 500, code: "INTERNAL_ERROR" });
  });
});

describe("teacher class discovery route", () => {
  it.each([teacher, admin])("allows role $role with the requested page", async (user) => {
    const deps = dependencies(user);
    const response = await createApkChallengeTeacherClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/teacher-classes?limit=10&offset=20"));

    expect(response.status).toBe(200);
    expect(deps.listTeacherClasses).toHaveBeenCalledWith(expect.objectContaining({ user, tenant: { schoolId }, input: { limit: 10, offset: 20 } }));
  });

  it.each([student, system])("forbids role $role", async (user) => {
    const deps = dependencies(user);
    const response = await createApkChallengeTeacherClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/teacher-classes"));

    expect(await errorCode(response)).toEqual({ status: 403, code: "FORBIDDEN" });
  });

  it("rejects a limit above the cap with 400", async () => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeTeacherClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/teacher-classes?limit=51"));

    expect(response.status).toBe(400);
    expect(deps.listTeacherClasses).not.toHaveBeenCalled();
  });

  it("maps a domain FORBIDDEN code to 403", async () => {
    const deps = dependencies(teacher);
    deps.listTeacherClasses.mockRejectedValue(Object.assign(new Error("nope"), { code: "FORBIDDEN" }));
    const response = await createApkChallengeTeacherClassesRoute(asDeps(deps)).GET(request("/api/v1/apk/challenges/teacher-classes"));

    expect(await errorCode(response)).toEqual({ status: 403, code: "FORBIDDEN" });
  });
});

describe("class challenge list route", () => {
  it("passes classId and paging to the domain and returns public summaries", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges?classId=${classId}&limit=5&offset=1`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ challenges: [summary] });
    expect(deps.listChallenges).toHaveBeenCalledWith({ db: { tenant: schoolId }, user: student, tenant: { schoolId }, input: { classId, limit: 5, offset: 1 } });
  });

  it.each([
    ["a missing classId", ""],
    ["a non-uuid classId", "?classId=abc"],
    ["an unknown key", `?classId=${classId}&schoolId=${schoolId}`],
    ["a limit above the cap", `?classId=${classId}&limit=101`],
  ])("rejects %s with 400", async (_name, query) => {
    const deps = dependencies();
    const response = await createApkChallengeRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges${query}`));

    expect(await errorCode(response)).toEqual({ status: 400, code: "INVALID_QUERY" });
    expect(deps.listChallenges).not.toHaveBeenCalled();
  });

  it("returns 500 when a summary carries stored learning content", async () => {
    const deps = dependencies();
    deps.listChallenges.mockResolvedValue([{ ...summary, content }]);
    const response = await createApkChallengeRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges?classId=${classId}`));

    expect(response.status).toBe(500);
  });

  it.each([
    ["code UNAUTHORIZED", Object.assign(new Error("x"), { code: "UNAUTHORIZED" }), 401, "UNAUTHORIZED"],
    ["message Forbidden", new Error("Forbidden"), 403, "FORBIDDEN"],
    ["a participation message", new Error("Teacher participation is disabled"), 403, "FORBIDDEN"],
    ["a not found message", new Error("Class not found"), 404, "NOT_FOUND"],
    ["a plain object with a code", { code: "CONFLICT" }, 409, "CONFLICT"],
    ["a thrown string", "boom", 500, "INTERNAL_ERROR"],
    ["a null value", null, 500, "INTERNAL_ERROR"],
  ])("maps a domain error with %s", async (_name, cause, status, code) => {
    const deps = dependencies();
    deps.listChallenges.mockRejectedValue(cause);
    const response = await createApkChallengeRoute(asDeps(deps)).GET(request(`/api/v1/apk/challenges?classId=${classId}`));

    expect(await errorCode(response)).toEqual({ status, code });
  });
});

describe("class challenge create route", () => {
  const path = "/api/v1/apk/challenges";

  it.each([
    ["a missing origin", null],
    ["a different scheme", "http://games.example"],
    ["a different port", "https://games.example:8443"],
    ["the literal null origin", "null"],
  ])("rejects %s with 403 before authentication", async (_name, requestOrigin) => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { body: createInput, origin: requestOrigin }));

    expect(await errorCode(response)).toEqual({ status: 403, code: "ORIGIN_FORBIDDEN" });
    expect(deps.validateSession).not.toHaveBeenCalled();
    expect(deps.createChallenge).not.toHaveBeenCalled();
  });

  it("rejects a request whose URL cannot be parsed as cross-origin", async () => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request("not a url", { body: createInput }));

    expect(response.status).toBe(403);
    expect(deps.createChallenge).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated same-origin request with 401", async () => {
    const deps = dependencies(null);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { body: createInput }));

    expect(response.status).toBe(401);
    expect(deps.createChallenge).not.toHaveBeenCalled();
  });

  it.each([student, system])("forbids role $role", async (user) => {
    const deps = dependencies(user);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { body: createInput }));

    expect(await errorCode(response)).toEqual({ status: 403, code: "FORBIDDEN" });
    expect(deps.createChallenge).not.toHaveBeenCalled();
  });

  it("allows an administrator and returns 201 with the public summary", async () => {
    const deps = dependencies(admin);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { body: createInput }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(summary);
    expect(deps.createChallenge).toHaveBeenCalledWith({ db: { tenant: schoolId }, user: admin, tenant: { schoolId }, input: createInput });
  });

  it("rejects an unreadable JSON body with 400", async () => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { jsonError: true }));

    expect(await errorCode(response)).toEqual({ status: 400, code: "INVALID_JSON" });
  });

  it.each([
    ["an extra schoolId field", { ...createInput, schoolId }],
    ["an expiry before the start", { ...createInput, expiresAt: "2026-09-08T08:00:00.000Z" }],
    ["an unknown game", { ...createInput, gameId: "not-a-game" }],
    ["a zero target", { ...createInput, target: 0 }],
  ])("rejects %s with 400 before the capability lookup", async (_name, body) => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { body }));

    expect(await errorCode(response)).toEqual({ status: 400, code: "INVALID_PAYLOAD" });
    expect(deps.resolveGameCapability).not.toHaveBeenCalled();
  });

  it.each([
    ["a version mismatch", { version: "old", inputMode: "vocabulary", modalities: ["reading"] }],
    ["an input mode mismatch", { version: summary.gameVersion, inputMode: "sentence", modalities: ["reading"] }],
    ["an unsupported modality", { version: summary.gameVersion, inputMode: "vocabulary", modalities: ["listening"] }],
  ])("rejects %s with 400 and writes nothing", async (_name, capability) => {
    const deps = dependencies(teacher);
    deps.resolveGameCapability.mockResolvedValue(capability);
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { body: createInput }));

    expect(await errorCode(response)).toEqual({ status: 400, code: "UNSUPPORTED_GAME" });
    expect(deps.createChallenge).not.toHaveBeenCalled();
  });

  it("maps a domain not found error on create to 404", async () => {
    const deps = dependencies(teacher);
    deps.createChallenge.mockRejectedValue(new Error("Class not found"));
    const response = await createApkChallengeRoute(asDeps(deps)).POST(request(path, { body: createInput }));

    expect(await errorCode(response)).toEqual({ status: 404, code: "NOT_FOUND" });
  });
});

describe("challenge run route", () => {
  const path = "/api/v1/apk/challenges/runs";

  it("starts a run with the capability resolver and returns 201", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRunRoute(asDeps(deps)).POST(request(path, { body: { challengeId } }));

    expect(response.status).toBe(201);
    expect(deps.startRun).toHaveBeenCalledWith({ db: { tenant: schoolId }, user: student, tenant: { schoolId }, input: { challengeId }, resolveGameCapability: deps.resolveGameCapability });
  });

  it("rejects a cross-origin run before authentication", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRunRoute(asDeps(deps)).POST(request(path, { body: { challengeId }, origin: "https://evil.example" }));

    expect(await errorCode(response)).toEqual({ status: 403, code: "ORIGIN_FORBIDDEN" });
    expect(deps.validateSession).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated run with 401", async () => {
    const deps = dependencies(null);
    const response = await createApkChallengeRunRoute(asDeps(deps)).POST(request(path, { body: { challengeId } }));

    expect(response.status).toBe(401);
    expect(deps.startRun).not.toHaveBeenCalled();
  });

  it("rejects an unreadable JSON body with 400", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRunRoute(asDeps(deps)).POST(request(path, { jsonError: true }));

    expect(await errorCode(response)).toEqual({ status: 400, code: "INVALID_JSON" });
  });

  it("rejects a client-chosen seed or score with 400", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRunRoute(asDeps(deps)).POST(request(path, { body: { challengeId, score: 999 } }));

    expect(await errorCode(response)).toEqual({ status: 400, code: "INVALID_PAYLOAD" });
    expect(deps.startRun).not.toHaveBeenCalled();
  });

  it("maps a participation refusal to 403", async () => {
    const deps = dependencies(teacher);
    deps.startRun.mockRejectedValue(new Error("Teacher participation is disabled"));
    const response = await createApkChallengeRunRoute(asDeps(deps)).POST(request(path, { body: { challengeId } }));

    expect(await errorCode(response)).toEqual({ status: 403, code: "FORBIDDEN" });
  });

  it("returns 500 when the launch result breaks the public contract", async () => {
    const deps = dependencies();
    deps.startRun.mockResolvedValue({ runId });
    const response = await createApkChallengeRunRoute(asDeps(deps)).POST(request(path, { body: { challengeId } }));

    expect(await errorCode(response)).toEqual({ status: 500, code: "INTERNAL_ERROR" });
  });
});
