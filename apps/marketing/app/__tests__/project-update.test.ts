import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  update: vi.fn(),
  requirePermission: vi.fn(async () => ({
    ok: true as const,
    session: { user: { id: "admin", role: "ADMIN" as const } },
  })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: routeMocks.update,
  },
}));

vi.mock("@/lib/auth", () => ({
  requireMarketingPermission: routeMocks.requirePermission,
}));

import { PATCH } from "@/api/video/projects/route";

const campaignId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const script = Array.from({ length: 5 }, (_, index) => ({
  narration: `คำบรรยาย ${index + 1}`,
  imagePrompt: `Image prompt ${index + 1}`,
  motionDirection: `Motion ${index + 1}`,
}));

function makeUpdateChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const whereMock = vi.fn(() => ({ returning: returningMock }));
  const setMock = vi.fn(() => ({ where: whereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));
  return { updateMock, setMock, whereMock, returningMock };
}

function request(body: string): Request {
  return new Request("http://localhost/api/video/projects", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("PATCH /api/video/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a project only within the supplied campaign and returns the row", async () => {
    const updatedProject = {
      id: projectId,
      campaignId,
      topic: "หัวข้อที่แก้ไข",
      script,
      status: "draft",
    };
    const { updateMock, setMock, whereMock } = makeUpdateChainMock([
      updatedProject,
    ]);
    routeMocks.update.mockImplementation(updateMock);

    const response = await PATCH(
      request(
        JSON.stringify({
          id: projectId,
          campaignId,
          topic: updatedProject.topic,
          script,
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(updatedProject);
    expect(setMock).toHaveBeenCalledWith({
      topic: updatedProject.topic,
      script,
    });
    expect(whereMock).toHaveBeenCalled();
    expect(routeMocks.requirePermission).toHaveBeenCalledWith(
      expect.any(Request),
      "video:projects:update",
    );
  });

  it("returns 404 when the project does not belong to the campaign", async () => {
    const { updateMock } = makeUpdateChainMock([]);
    routeMocks.update.mockImplementation(updateMock);

    const response = await PATCH(
      request(
        JSON.stringify({
          id: projectId,
          campaignId,
          topic: "Missing",
          script,
        }),
      ),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Video project not found",
    });
  });

  it("rejects invalid JSON and invalid script payloads before updating", async () => {
    const invalidJsonResponse = await PATCH(request("{"));
    expect(invalidJsonResponse.status).toBe(400);

    const invalidScriptResponse = await PATCH(
      request(
        JSON.stringify({
          id: projectId,
          campaignId,
          topic: "Invalid",
          script: [{ narration: "incomplete" }],
        }),
      ),
    );
    expect(invalidScriptResponse.status).toBe(400);
    expect(routeMocks.update).not.toHaveBeenCalled();
  });
});
