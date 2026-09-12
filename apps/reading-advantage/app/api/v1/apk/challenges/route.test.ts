/** @jest-environment node */
import { NextRequest } from "next/server";

const mockSession = jest.fn();
const mockList = jest.fn();
const mockClasses = jest.fn();
const mockTeacherClasses = jest.fn();
const mockCreate = jest.fn();
const mockStart = jest.fn();
const mockLoader = jest.fn();

jest.mock("@/lib/session", () => ({ getCurrentUser: () => mockSession() }));
jest.mock("@/lib/apk/to-user-context", () => ({ toUserContext: (user: unknown) => user }));
jest.mock("@reading-advantage/db", () => ({ db: {} }));
jest.mock("@reading-advantage/domain", () => ({ createTenantDB: () => ({ tenant: "school-1" }) }));
jest.mock("@reading-advantage/domain/challenges", () => ({
  ...jest.requireActual("@reading-advantage/domain/challenges"),
  createClassChallenge: (...args: unknown[]) => mockCreate(...args),
  listClassChallenges: (...args: unknown[]) => mockList(...args),
  listStudentChallengeClasses: (...args: unknown[]) => mockClasses(...args),
  listOwnedChallengeClasses: (...args: unknown[]) => mockTeacherClasses(...args),
  startClassChallengeRun: (...args: unknown[]) => mockStart(...args),
}));
jest.mock("@reading-advantage/game-cartridges", () => ({
  CARTRIDGE_CHALLENGE_CAPABILITIES: { "dragon-flight": { version: "2026-09-09.1", inputMode: "vocabulary", modalities: ["reading"] } },
  cartridgeLoaders: { "dragon-flight": () => mockLoader() },
}));

import { GET, POST } from "./route";
import { GET as GET_CLASSES } from "./classes/route";
import { POST as START } from "./runs/route";

const schoolId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const challengeId = "33333333-3333-4333-8333-333333333333";
const student = { id: "student-1", role: "STUDENT", schoolId };
const teacher = { id: "teacher-1", role: "TEACHER", schoolId };
const modality = { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true };
const summary = { id: challengeId, classId, title: "River", gameId: "dragon-flight", gameVersion: "2026-09-09.1", contentMode: "vocabulary", contentLocale: "th", contentItemCount: 1, seed: 1, difficulty: "medium", modality, startsAt: "2026-09-09T00:00:00.000Z", expiresAt: "2026-09-10T00:00:00.000Z", target: 2, contributionCount: 0 };
const content = { mode: "vocabulary", items: [{ term: "river", translation: "แม่น้ำ" }] };
const createBody = { classId, title: "River", gameId: "dragon-flight", gameVersion: "2026-09-09.1", contentLocale: "th", content, seed: 1, difficulty: "medium", modality, startsAt: summary.startsAt, expiresAt: summary.expiresAt, target: 2, teacherParticipationEnabled: false };

function request(path: string, method = "GET", body?: unknown, origin = "https://games.example") {
  return new NextRequest(`https://games.example${path}`, { method, headers: { cookie: "session_token=opaque", origin }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

describe("Reading challenge route dependencies", () => {
  beforeEach(() => { jest.clearAllMocks(); mockLoader.mockResolvedValue({ manifest: { inputMode: "vocabulary" } }); });

  it("rejects an absent Reading session", async () => {
    mockSession.mockResolvedValue(null);
    expect((await GET(request(`/api/v1/apk/challenges?classId=${classId}`))).status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("derives the Reading student and school for list and start", async () => {
    mockSession.mockResolvedValue(student);
    mockList.mockResolvedValue([summary]);
    mockStart.mockResolvedValue({ runId: "44444444-4444-4444-8444-444444444444", challengeId, userId: student.id, challenge: summary, content, issuedAt: "2026-09-09T01:00:00.000Z", expiresAt: summary.expiresAt });
    expect((await GET(request(`/api/v1/apk/challenges?classId=${classId}`))).status).toBe(200);
    expect((await START(request("/api/v1/apk/challenges/runs", "POST", { challengeId }))).status).toBe(201);
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ user: student, tenant: { schoolId } }));
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ user: student, tenant: { schoolId } }));
  });

  it("derives the Reading student and school for class discovery", async () => {
    mockSession.mockResolvedValue(student);
    mockClasses.mockResolvedValue({ classes: [{ id: classId, name: "River Class" }], hasMore: false });
    const response = await GET_CLASSES(request("/api/v1/apk/challenges/classes"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ classes: [{ id: classId, name: "River Class" }], hasMore: false });
    expect(mockClasses).toHaveBeenCalledWith(expect.objectContaining({ user: student, tenant: { schoolId }, input: { limit: 25, offset: 0 } }));
  });

  it("rejects a cross-origin Reading mutation", async () => {
    mockSession.mockResolvedValue(teacher);
    expect((await POST(request("/api/v1/apk/challenges", "POST", createBody, "https://evil.example"))).status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects a Reading challenge when installed capability mismatches", async () => {
    mockSession.mockResolvedValue(teacher);
    mockLoader.mockResolvedValue({ manifest: { inputMode: "sentence" } });
    expect((await POST(request("/api/v1/apk/challenges", "POST", createBody))).status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
