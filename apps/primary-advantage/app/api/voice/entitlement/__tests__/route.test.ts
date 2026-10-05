// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: { id: "s1", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" } as Record<string, unknown> | null,
  voiceEntitlement: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: async () => mocks.session }));
vi.mock("@/server/controllers/voiceController", () => ({ voiceEntitlement: mocks.voiceEntitlement }));

import { GET } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: { id: "s1", role: "STUDENT", schoolId: "school-1" }, authStrength: "full" };
});

describe("GET /api/voice/entitlement", () => {
  it("returns the month's entitlement for the signed-in student", async () => {
    mocks.voiceEntitlement.mockResolvedValue({ remainingSeconds: 480, blockedBy: null });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ remainingSeconds: 480, blockedBy: null });
    expect(mocks.voiceEntitlement).toHaveBeenCalledWith(mocks.session!.user, "full");
  });

  it("refuses a visitor and a teacher", async () => {
    mocks.session = null;
    expect((await GET()).status).toBe(401);
    mocks.session = { user: { id: "t1", role: "TEACHER" }, authStrength: "full" };
    mocks.voiceEntitlement.mockRejectedValueOnce(Object.assign(new Error("students only"), { code: "FORBIDDEN" }));
    expect((await GET()).status).toBe(403);
  });
});
