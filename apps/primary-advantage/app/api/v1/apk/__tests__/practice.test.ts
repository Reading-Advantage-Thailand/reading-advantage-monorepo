// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateTenantDB, mockGetCurrentUser, mockListGamePracticeInput } = vi.hoisted(() => ({
  mockCreateTenantDB: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockListGamePracticeInput: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

vi.mock("@reading-advantage/db", () => ({ db: { connection: "primary" } }));

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args),
}));

vi.mock("@reading-advantage/domain/games", async () => ({
  ...(await vi.importActual<typeof import("@reading-advantage/domain/games")>(
    "@reading-advantage/domain/games",
  )),
  listGamePracticeInput: (...args: unknown[]) => mockListGamePracticeInput(...args),
}));

import { GET } from "../practice/route";

const student = {
  id: "student-1",
  username: "student",
  name: "Student One",
  role: "STUDENT",
  schoolId: "school-1",
  xp: 120,
  level: 3,
  cefrLevel: "A2",
};

const practice = {
  schemaVersion: 1,
  id: "saved",
  level: "A2",
  vocabulary: [{ id: "w1", term: "river", translation: "แม่น้ำ" }],
  sentences: [],
};

const request = (query = "") => new NextRequest(`http://localhost/api/v1/apk/practice${query}`);

describe("GET /api/v1/apk/practice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(student);
    mockCreateTenantDB.mockReturnValue({ tenant: "db" });
    mockListGamePracticeInput.mockResolvedValue(practice);
  });

  it("returns the student's practice input, private and uncached", async () => {
    const response = await GET(request("?locale=th"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    await expect(response.json()).resolves.toEqual(practice);
    expect(mockCreateTenantDB).toHaveBeenCalledWith({ connection: "primary" }, { schoolId: "school-1" });
    expect(mockListGamePracticeInput).toHaveBeenCalledWith({
      db: { tenant: "db" },
      user: student,
      tenant: { schoolId: "school-1" },
      input: { locale: "th" },
    });
  });

  it("uses Thai translations when the request names no locale", async () => {
    await GET(request());
    expect(mockListGamePracticeInput).toHaveBeenCalledWith(expect.objectContaining({ input: { locale: "th" } }));
  });

  it.each([
    ["an unknown locale", "?locale=fr"],
    ["an unknown parameter", "?locale=th&limit=5"],
    ["a repeated locale", "?locale=th&locale=vi"],
  ])("rejects %s", async (_label, query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(400);
    expect(mockListGamePracticeInput).not.toHaveBeenCalled();
  });

  it.each([
    ["no session", null, 401],
    ["a teacher", { ...student, role: "TEACHER" }, 403],
    ["a student without a school", { ...student, schoolId: null }, 403],
  ])("refuses %s", async (_label, user, status) => {
    mockGetCurrentUser.mockResolvedValue(user);
    const response = await GET(request());
    expect(response.status).toBe(status);
    expect(mockListGamePracticeInput).not.toHaveBeenCalled();
  });

  it("returns a structured error when the query fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockListGamePracticeInput.mockRejectedValue(new Error("db down"));
    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INTERNAL_ERROR" } });
    consoleError.mockRestore();
  });
});
