// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listSaved: vi.fn(),
  listSample: vi.fn(),
  createTenantDB: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: (...a: unknown[]) => mocks.getCurrentUser(...a) }));
vi.mock("@reading-advantage/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  db: { connection: "primary" },
}));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (...a: unknown[]) => mocks.createTenantDB(...a) }));
vi.mock("@reading-advantage/domain/games", async () => ({
  ...(await vi.importActual<typeof import("@reading-advantage/domain/games")>("@reading-advantage/domain/games")),
  listPrimaryPracticeInput: (...a: unknown[]) => mocks.listSaved(...a),
  listPrimarySamplePracticeInput: (...a: unknown[]) => mocks.listSample(...a),
}));

import { GET } from "../practice/route";

const staff = (role: string, schoolId: string | null = "school-1") => ({ id: "t1", username: "t", name: "T", role, schoolId, xp: 0, level: 1, cefrLevel: "A1" });
const sample = { schemaVersion: 1, id: "sample", level: "A1", vocabulary: [{ id: "sample-word-1", term: "river", translation: "แม่น้ำ" }], sentences: [] };
const request = (query = "") => new NextRequest(`http://localhost/api/v1/apk/practice${query}`);

describe("GET /api/v1/apk/practice in Preview mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSample.mockResolvedValue(sample);
  });

  it.each(["TEACHER", "ADMIN", "SYSTEM"])("gives %s the sample word set, private and uncached, and reads no saved words", async (role) => {
    mocks.getCurrentUser.mockResolvedValue(staff(role));
    const response = await GET(request("?locale=th"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    await expect(response.json()).resolves.toEqual(sample);
    expect(mocks.listSample).toHaveBeenCalledWith({ db: { connection: "primary" }, input: { locale: "th" } });
    expect(mocks.listSaved).not.toHaveBeenCalled();
    expect(mocks.createTenantDB).not.toHaveBeenCalled();
  });

  it("gives a SYSTEM user with no school the sample set too", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff("SYSTEM", null));
    expect((await GET(request())).status).toBe(200);
  });

  it("keeps the saved words for a student", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff("STUDENT"));
    mocks.createTenantDB.mockReturnValue({});
    mocks.listSaved.mockResolvedValue({ ...sample, id: "saved" });
    const body = await (await GET(request())).json();
    expect(body.id).toBe("saved");
    expect(mocks.listSample).not.toHaveBeenCalled();
  });

  it("refuses an intern and an unknown role", async () => {
    for (const role of ["INTERN", "nobody"]) {
      mocks.getCurrentUser.mockResolvedValue(staff(role));
      expect((await GET(request())).status).toBe(403);
    }
    expect(mocks.listSample).not.toHaveBeenCalled();
  });
});
