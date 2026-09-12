import type { NextRequest } from "next/server";

const mockValidateSession = jest.fn();
const mockCreateTenantDB = jest.fn();
const mockGetMyRpgState = jest.fn();
const mockEquipMyRpgCosmetic = jest.fn();
const tenantDb = { tenant: "school-a" };

jest.mock("@reading-advantage/auth", () => ({
  SESSION_COOKIE_NAME: "ra_session",
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

jest.mock("@reading-advantage/db", () => ({ db: { connection: "games" } }));

jest.mock("@reading-advantage/domain/db-contract", () => ({
  createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args),
}));

jest.mock("@reading-advantage/domain/rpg", () => ({
  getMyRpgState: (...args: unknown[]) => mockGetMyRpgState(...args),
  equipMyRpgCosmetic: (...args: unknown[]) => mockEquipMyRpgCosmetic(...args),
}));

import { GET, PATCH } from "./route";

const student = {
  id: "student-a",
  username: "student-a",
  name: "Student A",
  role: "STUDENT",
  schoolId: "school-a",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

const state = {
  schemaVersion: 1,
  equippedEmblemId: null,
  cosmetics: [
    { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: null, equipped: false },
    { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: null, equipped: false },
    { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: null, equipped: false },
  ],
  quests: [
    { id: "first-ward", completed: false, completedAt: null, rewardId: "apprentice-wand" },
    { id: "complete-the-ward", completed: false, completedAt: null, rewardId: "graveyard-staff" },
    { id: "perfect-english-audio", completed: false, completedAt: null, rewardId: "echo-staff" },
  ],
};

function request(body?: unknown, token = "session-token"): NextRequest {
  return {
    url: "https://games.example/api/v1/apk/rpg",
    headers: new Headers({ origin: "https://games.example" }),
    cookies: { get: () => token ? { value: token } : undefined },
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("Advantage Games RPG route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateSession.mockResolvedValue({ user: student });
    mockCreateTenantDB.mockReturnValue(tenantDb);
    mockGetMyRpgState.mockResolvedValue(state);
    mockEquipMyRpgCosmetic.mockResolvedValue({ equippedEmblemId: "apprentice-wand" });
  });

  it("rejects an unauthenticated request", async () => {
    const response = await GET(request(undefined, ""));
    expect(response.status).toBe(401);
    expect(mockGetMyRpgState).not.toHaveBeenCalled();
  });

  it("rejects a nonstudent session", async () => {
    mockValidateSession.mockResolvedValue({ user: { ...student, role: "TEACHER" } });
    expect((await GET(request())).status).toBe(403);
  });

  it("rejects a session without a school tenant", async () => {
    mockValidateSession.mockResolvedValue({ user: { ...student, schoolId: null } });
    expect((await GET(request())).status).toBe(403);
  });

  it("returns the tenant-scoped RPG state", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(state);
    expect(mockGetMyRpgState).toHaveBeenCalledWith({
      db: tenantDb,
      user: student,
      tenant: { schoolId: "school-a" },
    });
  });

  it("rejects extra equip authority fields", async () => {
    const response = await PATCH(request({
      cosmeticId: "apprentice-wand",
      userId: "other-user",
      schoolId: "other-school",
      questId: "first-ward",
      xp: 500,
      unlocked: true,
    }));
    expect(response.status).toBe(400);
    expect(mockEquipMyRpgCosmetic).not.toHaveBeenCalled();
  });

  it("returns a locked error from the domain command", async () => {
    mockEquipMyRpgCosmetic.mockRejectedValue({ code: "COSMETIC_LOCKED" });
    const response = await PATCH(request({ cosmeticId: "apprentice-wand" }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COSMETIC_LOCKED" },
    });
  });

  it("equips an unlocked cosmetic through the tenant-scoped command", async () => {
    const response = await PATCH(request({ cosmeticId: "apprentice-wand" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ equippedEmblemId: "apprentice-wand" });
    expect(mockEquipMyRpgCosmetic).toHaveBeenCalledWith({
      db: tenantDb,
      user: student,
      tenant: { schoolId: "school-a" },
      input: { cosmeticId: "apprentice-wand" },
    });
  });
});
