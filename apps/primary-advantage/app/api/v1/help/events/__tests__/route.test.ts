// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: { id: "t1", role: "TEACHER", schoolId: "school-1" } } as Record<string, unknown> | null,
  recordHelpEvent: vi.fn(),
}));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@/lib/session", () => ({ getCurrentSession: async () => mocks.session }));
vi.mock("@reading-advantage/domain/primary-help", () => ({ recordHelpEvent: mocks.recordHelpEvent }));

import { POST } from "../route";

const post = (body: unknown, origin = "http://localhost") =>
  POST(new NextRequest("http://localhost/api/v1/help/events", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", origin } }));
const play = { event: "play", routePattern: "/teacher/class-roster/[id]", videoId: "B4", source: "youtube" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: { id: "t1", role: "TEACHER", schoolId: "school-1" } };
  mocks.recordHelpEvent.mockResolvedValue({ recorded: true });
});

describe("POST /api/v1/help/events (FR-11)", () => {
  it("records a play of a registry video for the session user", async () => {
    const res = await post(play);
    expect(res.status).toBe(204);
    expect(mocks.recordHelpEvent).toHaveBeenCalledWith({ db: {}, user: mocks.session?.user, input: play });
  });

  it("refuses another origin", async () => {
    expect((await post(play, "https://evil.example")).status).toBe(403);
    expect(mocks.recordHelpEvent).not.toHaveBeenCalled();
  });

  it("refuses a signed-out request", async () => {
    mocks.session = null;
    expect((await post(play)).status).toBe(401);
  });

  it("refuses a video id that is not in the registry", async () => {
    expect((await post({ ...play, videoId: "J9" })).status).toBe(400);
    expect(mocks.recordHelpEvent).not.toHaveBeenCalled();
  });

  it("maps a bad body to 400 and a role with no help button to 403", async () => {
    mocks.recordHelpEvent.mockRejectedValueOnce(Object.assign(new Error("bad"), { name: "ZodError" }));
    expect((await post({ event: "open" })).status).toBe(400);
    mocks.recordHelpEvent.mockRejectedValueOnce(Object.assign(new Error("no"), { code: "FORBIDDEN" }));
    expect((await post({ event: "open", routePattern: "/system/dashboard", matched: 0 })).status).toBe(403);
  });
});
