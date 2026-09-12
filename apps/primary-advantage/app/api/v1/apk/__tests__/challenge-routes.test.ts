// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSession, mockList, mockClasses, mockTeacherClasses, mockCreate, mockStart, mockLoader } = vi.hoisted(() => ({
  mockSession: vi.fn(),
  mockList: vi.fn(),
  mockClasses: vi.fn(),
  mockTeacherClasses: vi.fn(),
  mockCreate: vi.fn(),
  mockStart: vi.fn(),
  mockLoader: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: () => mockSession() }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: () => ({ tenant: "school-1" }) }));
vi.mock("@reading-advantage/domain/challenges", async () => ({
  ...(await vi.importActual<typeof import("@reading-advantage/domain/challenges")>("@reading-advantage/domain/challenges")),
  createClassChallenge: (...args: unknown[]) => mockCreate(...args),
  listClassChallenges: (...args: unknown[]) => mockList(...args),
  listStudentChallengeClasses: (...args: unknown[]) => mockClasses(...args),
  listOwnedChallengeClasses: (...args: unknown[]) => mockTeacherClasses(...args),
  startClassChallengeRun: (...args: unknown[]) => mockStart(...args),
}));
vi.mock("@reading-advantage/game-cartridges", () => ({
  CARTRIDGE_CHALLENGE_CAPABILITIES: { "dragon-flight": { version: "2026-09-09.1", inputMode: "vocabulary", modalities: ["reading"] } },
  cartridgeLoaders: { "dragon-flight": () => mockLoader() },
}));

import { GET, POST } from "../challenges/route";
import { POST as START } from "../challenges/runs/route";

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

describe("Primary challenge route dependencies", () => {
  beforeEach(() => { vi.clearAllMocks(); mockLoader.mockResolvedValue({ manifest: { inputMode: "vocabulary" } }); });

  it("rejects an absent Primary session", async () => {
    mockSession.mockResolvedValue(null);
    expect((await GET(request(`/api/v1/apk/challenges?classId=${classId}`))).status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("derives the Primary student and school for list and start", async () => {
    mockSession.mockResolvedValue(student);
    mockList.mockResolvedValue([summary]);
    mockStart.mockResolvedValue({ runId: "44444444-4444-4444-8444-444444444444", challengeId, userId: student.id, challenge: summary, content, issuedAt: "2026-09-09T01:00:00.000Z", expiresAt: summary.expiresAt });
    expect((await GET(request(`/api/v1/apk/challenges?classId=${classId}`))).status).toBe(200);
    expect((await START(request("/api/v1/apk/challenges/runs", "POST", { challengeId }))).status).toBe(201);
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ user: student, tenant: { schoolId } }));
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ user: student, tenant: { schoolId } }));
  });

  it("rejects a cross-origin Primary mutation", async () => {
    mockSession.mockResolvedValue(teacher);
    expect((await POST(request("/api/v1/apk/challenges", "POST", createBody, "https://evil.example"))).status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects a Primary challenge when installed capability mismatches", async () => {
    mockSession.mockResolvedValue(teacher);
    mockLoader.mockResolvedValue({ manifest: { inputMode: "sentence" } });
    expect((await POST(request("/api/v1/apk/challenges", "POST", createBody))).status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
