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

/** Posts from a page of the app (Sec-Fetch-Site: same-origin) unless other headers are given. */
const post = (body: unknown, headers: Record<string, string> = { "sec-fetch-site": "same-origin" }, url = "http://localhost/api/v1/help/events") =>
  POST(new NextRequest(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }));
let user = 0;
const play = { event: "play", routePattern: "/teacher/class-roster/[id]", videoId: "B4", source: "youtube" };

beforeEach(() => {
  vi.clearAllMocks();
  // A new user id for each test, so the rate limit of one test does not reach the next.
  user += 1;
  mocks.session = { user: { id: `t${user}`, role: "TEACHER", schoolId: "school-1" } };
  mocks.recordHelpEvent.mockResolvedValue({ recorded: true });
});

describe("POST /api/v1/help/events (FR-11)", () => {
  it("records a play of a registry video for the session user", async () => {
    const res = await post(play);
    expect(res.status).toBe(204);
    expect(mocks.recordHelpEvent).toHaveBeenCalledWith({ db: {}, user: mocks.session?.user, input: play });
  });

  it("refuses another origin", async () => {
    expect((await post(play, { "sec-fetch-site": "cross-site", origin: "https://evil.example" })).status).toBe(403);
    expect((await post(play, { origin: "https://evil.example", host: "primary.reading-advantage.com" })).status).toBe(403);
    expect((await post(play, {})).status).toBe(403);
    expect(mocks.recordHelpEvent).not.toHaveBeenCalled();
  });

  it("accepts an older browser on Cloud Run by the forwarded host, not the container URL", async () => {
    const headers = { origin: "https://primary.reading-advantage.com", host: "0.0.0.0:8080", "x-forwarded-host": "primary.reading-advantage.com" };
    expect((await post(play, headers, "http://0.0.0.0:8080/api/v1/help/events")).status).toBe(204);
  });

  it("stops one user after 30 events in a minute", async () => {
    for (let i = 0; i < 30; i += 1) expect((await post(play)).status).toBe(204);
    expect((await post(play)).status).toBe(429);
    expect(mocks.recordHelpEvent).toHaveBeenCalledTimes(30);
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
