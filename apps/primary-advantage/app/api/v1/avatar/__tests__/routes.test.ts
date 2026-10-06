// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { user: { id: "s1", role: "STUDENT", schoolId: "school-1", level: 1 } } as Record<string, unknown> | null,
  avatarState: vi.fn(),
  avatarShop: vi.fn(),
  buyAvatarItem: vi.fn(),
  wearAvatarItem: vi.fn(),
  classAvatars: vi.fn(),
  resetClassAvatar: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentSession: async () => mocks.session }));
vi.mock("@/server/controllers/avatarController", () => ({
  avatarState: mocks.avatarState,
  avatarShop: mocks.avatarShop,
  buyAvatarItem: mocks.buyAvatarItem,
  wearAvatarItem: mocks.wearAvatarItem,
  classAvatars: mocks.classAvatars,
  resetClassAvatar: mocks.resetClassAvatar,
  avatarCatalog: () => ({ catalogVersion: "1.0.0", items: [] }),
}));

import { GET as getState } from "../route";
import { GET as getCatalog } from "../catalog/route";
import { POST as purchase } from "../purchase/route";
import { POST as loadout } from "../loadout/route";
import { GET as getClass } from "../../classroom/[classroomId]/avatars/route";
import { POST as reset } from "../../classroom/[classroomId]/avatars/[userId]/reset/route";

const post = (handler: (r: NextRequest) => Promise<Response>, path: string, body: unknown) =>
  handler(new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: { id: "s1", role: "STUDENT", schoolId: "school-1", level: 1 } };
});

describe("student avatar routes", () => {
  it("answers the state, the catalog, a purchase, and a loadout change", async () => {
    mocks.avatarState.mockResolvedValue({ gp: 100, loadout: {} });
    const state = await getState();
    expect(state.status).toBe(200);
    expect(state.headers.get("cache-control")).toBe("no-store");
    expect(await state.json()).toEqual({ gp: 100, loadout: {} });
    const catalog = getCatalog();
    expect(catalog.headers.get("cache-control")).toContain("max-age");
    mocks.buyAvatarItem.mockResolvedValue({ item: { itemId: "wizard-hat" }, gp: 30 });
    const bought = await post(purchase, "/api/v1/avatar/purchase", { itemId: "wizard-hat" });
    expect(bought.status).toBe(201);
    expect(mocks.buyAvatarItem).toHaveBeenCalledWith(mocks.session!.user, { itemId: "wizard-hat" });
    mocks.wearAvatarItem.mockResolvedValue({ head: { itemId: "wizard-hat", dye: null } });
    const worn = await post(loadout, "/api/v1/avatar/loadout", { slot: "head", itemId: "wizard-hat" });
    expect(await worn.json()).toEqual({ loadout: { head: { itemId: "wizard-hat", dye: null } } });
  });

  it("maps the refusals to their status", async () => {
    mocks.session = null;
    expect((await getState()).status).toBe(401);
    expect((await post(purchase, "/api/v1/avatar/purchase", {})).status).toBe(401);
    mocks.session = { user: { id: "s1", role: "STUDENT", schoolId: "school-1" } };
    mocks.buyAvatarItem.mockRejectedValueOnce(Object.assign(new Error("short"), { code: "INSUFFICIENT_GP", status: 409 }));
    const short = await post(purchase, "/api/v1/avatar/purchase", { itemId: "x" });
    expect(short.status).toBe(409);
    expect(await short.json()).toEqual({ error: "INSUFFICIENT_GP", message: "short" });
    mocks.wearAvatarItem.mockRejectedValueOnce(Object.assign(new Error("bad"), { name: "ZodError" }));
    expect((await post(loadout, "/api/v1/avatar/loadout", { slot: "ring" })).status).toBe(400);
    mocks.wearAvatarItem.mockRejectedValueOnce(Object.assign(new Error("no school"), { code: "FORBIDDEN" }));
    expect((await post(loadout, "/api/v1/avatar/loadout", { slot: "head", itemId: null })).status).toBe(403);
  });
});

describe("teacher class avatar routes", () => {
  const params = Promise.resolve({ classroomId: "c1", userId: "s2" });

  it("lists the class and resets a student", async () => {
    mocks.classAvatars.mockResolvedValue([{ userId: "s2", name: "Bee", profile: null, loadout: {} }]);
    const list = await getClass(new Request("http://localhost/api/v1/classroom/c1/avatars"), { params });
    expect(await list.json()).toEqual({ students: [{ userId: "s2", name: "Bee", profile: null, loadout: {} }] });
    expect(mocks.classAvatars).toHaveBeenCalledWith(mocks.session!.user, "c1");
    mocks.resetClassAvatar.mockResolvedValue(undefined);
    const done = await reset(new Request("http://localhost/api/v1/classroom/c1/avatars/s2/reset", { method: "POST" }), { params });
    expect(await done.json()).toEqual({ ok: true });
    expect(mocks.resetClassAvatar).toHaveBeenCalledWith(mocks.session!.user, "c1", "s2");
    mocks.resetClassAvatar.mockRejectedValueOnce(Object.assign(new Error("not here"), { code: "NOT_IN_CLASS", status: 404 }));
    expect((await reset(new Request("http://localhost/x", { method: "POST" }), { params })).status).toBe(404);
  });
});
