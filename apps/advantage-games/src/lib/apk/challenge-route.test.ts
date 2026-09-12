/** @jest-environment node */
import { createApkChallengeClassesRoute, createApkChallengeRoute, createApkChallengeRunRoute, createApkChallengeTeacherClassesRoute } from "./challenge-route";

const schoolId = "10000000-0000-4000-8000-000000000001";
const classId = "20000000-0000-4000-8000-000000000002";
const challengeId = "30000000-0000-4000-8000-000000000003";
const runId = "40000000-0000-4000-8000-000000000004";
const teacher = { id: "teacher-1", role: "TEACHER" as const, schoolId };
const student = { id: "student-1", role: "STUDENT" as const, schoolId };
const modality = { modality: "reading" as const, promptLocale: "th-TH" as const, answerLocale: "en-US" as const, promptField: "translation" as const, answerField: "term" as const, scored: true as const };
const summary = { id: challengeId, classId, title: "River flight", gameId: "dragon-flight", gameVersion: "2026-09-09.1", contentMode: "vocabulary" as const, contentLocale: "th" as const, contentItemCount: 1, seed: 42, difficulty: "medium" as const, modality, startsAt: "2026-09-09T08:00:00.000Z", expiresAt: "2026-09-10T08:00:00.000Z", target: 20, contributionCount: 0 };
const content = { mode: "vocabulary" as const, items: [{ term: "river", translation: "แม่น้ำ" }] };
const createInput = { classId, title: summary.title, gameId: "dragon-flight" as const, gameVersion: summary.gameVersion, contentLocale: "th" as const, content, seed: 42, difficulty: "medium" as const, modality, startsAt: summary.startsAt, expiresAt: summary.expiresAt, target: 20, teacherParticipationEnabled: false };

function request(url: string, body?: unknown, origin = "https://games.example") {
  return { url, headers: new Headers({ cookie: "session_token=opaque", origin }), json: jest.fn().mockResolvedValue(body) };
}

function dependencies(user: typeof student | typeof teacher = student) {
  return {
    sessionCookieName: "session_token",
    validateSession: jest.fn().mockResolvedValue({ user }),
    createTenantDb: jest.fn().mockReturnValue({ tenant: schoolId }),
    createChallenge: jest.fn().mockResolvedValue(summary),
    listChallenges: jest.fn().mockResolvedValue([summary]),
    listStudentClasses: jest.fn().mockResolvedValue({ classes: [{ id: classId, name: "River Class" }], hasMore: false }),
    listTeacherClasses: jest.fn().mockResolvedValue({ classes: [{ id: classId, name: "River Class" }], hasMore: false }),
    startRun: jest.fn().mockResolvedValue({ runId, challengeId, userId: user.id, challenge: summary, content, issuedAt: "2026-09-09T09:00:00.000Z", expiresAt: summary.expiresAt }),
    resolveGameCapability: jest.fn().mockResolvedValue({ version: summary.gameVersion, inputMode: "vocabulary" as const, modalities: ["reading" as const] }),
  };
}

describe("authenticated APK challenge routes", () => {
  it("lists student classes with strict bounded paging", async () => {
    const deps = dependencies();
    const response = await createApkChallengeClassesRoute(deps).GET(request("https://games.example/api/v1/apk/challenges/classes?limit=25&offset=0"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ classes: [{ id: classId, name: "River Class" }], hasMore: false });
    expect(deps.listStudentClasses).toHaveBeenCalledWith(expect.objectContaining({
      user: student,
      tenant: { schoolId },
      input: { limit: 25, offset: 0 },
    }));
    expect((await createApkChallengeClassesRoute(deps).GET(request("https://games.example/api/v1/apk/challenges/classes?limit=51"))).status).toBe(400);
    const teacherDeps = dependencies(teacher);
    expect((await createApkChallengeClassesRoute(teacherDeps).GET(request("https://games.example/api/v1/apk/challenges/classes"))).status).toBe(403);
    expect(teacherDeps.listStudentClasses).not.toHaveBeenCalled();
  });

  it("lists teacher classes with strict role and paging checks", async () => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeTeacherClassesRoute(deps).GET(request("https://games.example/api/v1/apk/challenges/teacher-classes?limit=25&offset=0"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ classes: [{ id: classId, name: "River Class" }], hasMore: false });
    expect(deps.listTeacherClasses).toHaveBeenCalledWith(expect.objectContaining({
      user: teacher,
      tenant: { schoolId },
      input: { limit: 25, offset: 0 },
    }));
    expect((await createApkChallengeTeacherClassesRoute(deps).GET(request("https://games.example/api/v1/apk/challenges/teacher-classes?code=secret"))).status).toBe(400);
    const studentDeps = dependencies(student);
    expect((await createApkChallengeTeacherClassesRoute(studentDeps).GET(request("https://games.example/api/v1/apk/challenges/teacher-classes"))).status).toBe(403);
  });
  it("lists safe class challenges through the authenticated tenant", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRoute(deps).GET(request(`https://games.example/api/v1/apk/challenges?classId=${classId}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ challenges: [summary] });
    expect(deps.listChallenges).toHaveBeenCalledWith(expect.objectContaining({ user: student, tenant: { schoolId } }));
  });

  it("creates only an installed comparable challenge with same-origin teacher access", async () => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeRoute(deps).POST(request("https://games.example/api/v1/apk/challenges", createInput));
    expect(response.status).toBe(201);
    expect(deps.resolveGameCapability).toHaveBeenCalledWith("dragon-flight");
    expect(deps.createChallenge).toHaveBeenCalledWith(expect.objectContaining({ input: createInput, user: teacher }));
  });

  it("rejects cross-origin creation before domain access", async () => {
    const deps = dependencies(teacher);
    const response = await createApkChallengeRoute(deps).POST(request("https://games.example/api/v1/apk/challenges", createInput, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(deps.createChallenge).not.toHaveBeenCalled();
  });

  it("starts an eligible run with only an opaque challenge input", async () => {
    const deps = dependencies();
    const response = await createApkChallengeRunRoute(deps).POST(request("https://games.example/api/v1/apk/challenges/runs", { challengeId }));
    expect(response.status).toBe(201);
    expect(deps.startRun).toHaveBeenCalledWith(expect.objectContaining({ input: { challengeId }, user: student }));
    expect(await response.json()).toEqual(expect.objectContaining({ runId, content }));
  });

  it("rejects malformed or unsupported create and run requests", async () => {
    const deps = dependencies(teacher);
    deps.resolveGameCapability.mockResolvedValueOnce(undefined);
    expect((await createApkChallengeRoute(deps).POST(request("https://games.example/api/v1/apk/challenges", createInput))).status).toBe(400);
    expect((await createApkChallengeRunRoute(deps).POST(request("https://games.example/api/v1/apk/challenges/runs", { challengeId: "bad", seed: 42 }))).status).toBe(400);
    expect(deps.startRun).not.toHaveBeenCalled();
  });

  it("maps a creation-key conflict to HTTP 409", async () => {
    const deps = dependencies(teacher);
    deps.createChallenge.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "CONFLICT" }));
    const response = await createApkChallengeRoute(deps).POST(request(
      "https://games.example/api/v1/apk/challenges",
      { ...createInput, creationKey: "70000000-0000-4000-8000-000000000007" },
    ));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "CONFLICT" }, status: 409 });
  });
});
