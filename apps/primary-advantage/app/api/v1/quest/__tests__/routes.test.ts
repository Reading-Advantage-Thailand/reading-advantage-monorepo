// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: { id: "t1", role: "TEACHER", schoolId: "school-1" } } as Record<string, unknown> | null,
  assignQuest: vi.fn(),
  cancelQuest: vi.fn(),
  battleState: vi.fn(),
  postQuestHeartbeat: vi.fn(),
  questDashboard: vi.fn(),
  moveQuest: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: async () => mocks.session }));
vi.mock("@/server/controllers/questController", () => ({
  assignQuest: mocks.assignQuest,
  cancelQuest: mocks.cancelQuest,
  battleState: mocks.battleState,
  postQuestHeartbeat: mocks.postQuestHeartbeat,
  questDashboard: mocks.questDashboard,
  moveQuest: mocks.moveQuest,
}));

import { POST as assign } from "../route";
import { DELETE as cancel } from "../[questId]/route";
import { GET as battle } from "../battle/route";
import { POST as heartbeat } from "../heartbeat/route";
import { GET as state } from "../[questId]/state/route";
import { POST as status } from "../[questId]/status/route";

const QUEST = "40000000-0000-4000-8000-000000000004";
const post = (body: unknown) => assign(new NextRequest("http://localhost/api/v1/quest", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
const del = () => cancel(new NextRequest(`http://localhost/api/v1/quest/${QUEST}`, { method: "DELETE" }), { params: Promise.resolve({ questId: QUEST }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: { id: "t1", role: "TEACHER", schoolId: "school-1" } };
});

describe("quest routes", () => {
  it("assigns a quest and cancels one", async () => {
    mocks.assignQuest.mockResolvedValue({ id: QUEST, status: "open" });
    const created = await post({ templateId: "goblin-raid", classId: "c1", battleAt: "2026-10-09T14:30:00+07:00" });
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toBe("no-store");
    expect(await created.json()).toEqual({ id: QUEST, status: "open" });
    expect(mocks.assignQuest).toHaveBeenCalledWith(mocks.session!.user, { templateId: "goblin-raid", classId: "c1", battleAt: "2026-10-09T14:30:00+07:00" });
    mocks.cancelQuest.mockResolvedValue(undefined);
    expect((await del()).status).toBe(204);
    expect(mocks.cancelQuest).toHaveBeenCalledWith(mocks.session!.user, QUEST);
  });

  it("maps the refusals to their status", async () => {
    mocks.session = null;
    expect((await post({})).status).toBe(401);
    expect((await del()).status).toBe(401);
    mocks.session = { user: { id: "t1", role: "TEACHER", schoolId: "school-1" } };
    mocks.assignQuest.mockRejectedValue(Object.assign(new Error("busy"), { code: "ALREADY_OPEN", status: 409 }));
    const busy = await post({ templateId: "goblin-raid", classId: "c1", battleAt: "2026-10-09T14:30:00+07:00" });
    expect(busy.status).toBe(409);
    expect(await busy.json()).toEqual({ error: "ALREADY_OPEN", message: "busy" });
    mocks.assignQuest.mockRejectedValue(Object.assign(new Error("bad"), { name: "ZodError" }));
    expect((await post({})).status).toBe(400);
    mocks.cancelQuest.mockRejectedValue(Object.assign(new Error("no"), { code: "FORBIDDEN" }));
    expect((await del()).status).toBe(403);
  });

  it("serves the battle state, stores a heartbeat, serves the dashboard, and moves the battle on", async () => {
    mocks.battleState.mockResolvedValue(null);
    const none = await battle();
    expect(none.status).toBe(200);
    expect(await none.json()).toEqual({ state: null });
    mocks.postQuestHeartbeat.mockResolvedValue(undefined);
    const beat = { questId: QUEST, runId: null, answered: 0, correct: 0, hp: 5, damage: 0, powerUpsUsed: [] };
    const stored = await heartbeat(new NextRequest("http://localhost/api/v1/quest/heartbeat", { method: "POST", body: JSON.stringify(beat), headers: { "content-type": "application/json" } }));
    expect(stored.status).toBe(204);
    expect(mocks.postQuestHeartbeat).toHaveBeenCalledWith(mocks.session!.user, beat);
    mocks.questDashboard.mockResolvedValue({ committed: 10 });
    const dash = await state(new NextRequest(`http://localhost/api/v1/quest/${QUEST}/state`), { params: Promise.resolve({ questId: QUEST }) });
    expect(await dash.json()).toEqual({ committed: 10 });
    expect(dash.headers.get("cache-control")).toBe("no-store");
    mocks.moveQuest.mockResolvedValue({ id: QUEST, status: "rally" });
    const moved = await status(new NextRequest(`http://localhost/api/v1/quest/${QUEST}/status`, { method: "POST", body: JSON.stringify({ status: "rally" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ questId: QUEST }) });
    expect(await moved.json()).toEqual({ id: QUEST, status: "rally" });
    expect(mocks.moveQuest).toHaveBeenCalledWith(mocks.session!.user, QUEST, { status: "rally" });
    mocks.moveQuest.mockRejectedValue(Object.assign(new Error("skip"), { code: "BAD_STATE", status: 409 }));
    expect((await status(new NextRequest(`http://localhost/api/v1/quest/${QUEST}/status`, { method: "POST", body: JSON.stringify({ status: "done" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ questId: QUEST }) })).status).toBe(409);
  });
});
