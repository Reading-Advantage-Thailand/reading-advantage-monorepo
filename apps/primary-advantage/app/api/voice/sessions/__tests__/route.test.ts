// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: { id: "s1", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" } as Record<string, unknown> | null,
  startVoice: vi.fn(),
  studentVoiceSessions: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: async () => mocks.session }));
vi.mock("@/server/controllers/voiceController", () => ({ startVoice: mocks.startVoice, studentVoiceSessions: mocks.studentVoiceSessions }));

import { GET, POST } from "../route";

const post = (body: unknown) => POST(new NextRequest("http://localhost/api/voice/sessions", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: { id: "s1", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" };
});

describe("POST /api/voice/sessions", () => {
  it("starts a session with the offer and the sign-in strength", async () => {
    mocks.startVoice.mockResolvedValue({ sessionId: "v1", answerSdp: "v=0", expiresAt: "2026-10-05T03:00:45.000Z", reservedSeconds: 180, remainingSeconds: 300 });
    const response = await post({ articleId: "a1", sdp: "v=0\r\noffer" });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ sessionId: "v1", reservedSeconds: 180 });
    expect(mocks.startVoice).toHaveBeenCalledWith(mocks.session!.user, "full", { articleId: "a1", sdp: "v=0\r\noffer" });
  });

  it("maps the use-case refusals to their status", async () => {
    mocks.session = null;
    expect((await post({})).status).toBe(401);
    mocks.session = { user: { id: "s1", role: "STUDENT" }, authStrength: "code_only" };
    mocks.startVoice.mockRejectedValueOnce(Object.assign(new Error("password"), { code: "AUTH_STRENGTH", status: 403 }));
    const forbidden = await post({ sdp: "v=0" });
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "AUTH_STRENGTH", message: "password" });
    mocks.startVoice.mockRejectedValueOnce(Object.assign(new Error("used up"), { code: "QUOTA_EXHAUSTED", status: 409 }));
    expect((await post({ sdp: "v=0" })).status).toBe(409);
    mocks.startVoice.mockRejectedValueOnce(Object.assign(new Error("bad"), { name: "ZodError" }));
    expect((await post({ sdp: "" })).status).toBe(400);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.startVoice.mockRejectedValueOnce(new Error("boom"));
    expect((await post({ sdp: "v=0" })).status).toBe(500);
    error.mockRestore();
  });
});

describe("GET /api/voice/sessions", () => {
  it("lists the student's sessions", async () => {
    mocks.studentVoiceSessions.mockResolvedValue([{ sessionId: "v1" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sessions: [{ sessionId: "v1" }] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
