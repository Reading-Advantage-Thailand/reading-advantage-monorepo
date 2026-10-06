// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: { id: "s1", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" } as Record<string, unknown> | null,
  endVoice: vi.fn(),
  voiceConnected: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: async () => mocks.session }));
vi.mock("@/server/controllers/voiceController", () => ({ endVoice: mocks.endVoice, voiceConnected: mocks.voiceConnected }));

import { POST as END } from "../route";
import { POST as CONNECTED } from "../../connected/route";

const params = { params: Promise.resolve({ sessionId: "v1" }) };
const end = (body?: unknown) => END(new NextRequest("http://localhost/api/voice/sessions/v1/end", { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }), params);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: { id: "s1", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" };
});

describe("POST /api/voice/sessions/[sessionId]/end and /connected", () => {
  it("ends the session with the client's reason and returns the summary", async () => {
    mocks.endVoice.mockResolvedValue({ sessionId: "v1", status: "ENDED", scores: { fluency: 3 } });
    const response = await end({ reason: "CONNECTION_LOST" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ENDED" });
    expect(mocks.endVoice).toHaveBeenCalledWith(mocks.session!.user, "v1", "CONNECTION_LOST");
    await end();
    expect(mocks.endVoice).toHaveBeenLastCalledWith(mocks.session!.user, "v1", undefined);
  });

  it("marks the session connected", async () => {
    mocks.voiceConnected.mockResolvedValue({ sessionId: "v1", expiresAt: "2026-10-05T03:03:00.000Z" });
    const response = await CONNECTED(new NextRequest("http://localhost/api/voice/sessions/v1/connected", { method: "POST" }), params);
    expect(await response.json()).toEqual({ sessionId: "v1", expiresAt: "2026-10-05T03:03:00.000Z" });
    expect(mocks.voiceConnected).toHaveBeenCalledWith(mocks.session!.user, "v1");
  });

  it("maps not found, another student's session, and no user", async () => {
    mocks.endVoice.mockRejectedValueOnce(Object.assign(new Error("gone"), { code: "NOT_FOUND", status: 404 }));
    expect((await end({})).status).toBe(404);
    mocks.voiceConnected.mockRejectedValueOnce(Object.assign(new Error("other"), { code: "FORBIDDEN", status: 403 }));
    expect((await CONNECTED(new NextRequest("http://localhost/x", { method: "POST" }), params)).status).toBe(403);
    mocks.session = null;
    expect((await end({})).status).toBe(401);
  });
});
