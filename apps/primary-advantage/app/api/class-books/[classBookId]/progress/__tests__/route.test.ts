import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "t1", role: "TEACHER", schoolId: "school-1" } as Record<string, unknown> | null,
  getClassBookProgress: vi.fn(),
  toProgressCsv: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ getClassBookProgress: mocks.getClassBookProgress, toProgressCsv: mocks.toProgressCsv }));

import { GET } from "../route";

const CB = "cbcbcbcb-0000-4000-8000-000000000001";
const get = () => GET(new NextRequest(`http://localhost/api/class-books/${CB}/progress`), { params: Promise.resolve({ classBookId: CB }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "t1", role: "TEACHER", schoolId: "school-1" };
  mocks.getClassBookProgress.mockResolvedValue({ classBook: { bookKey: "o3-2" }, students: [], lessons: [], cells: [] });
  mocks.toProgressCsv.mockReturnValue("student,username\n");
});

describe("GET /api/class-books/[classBookId]/progress (CSV export, FR-6)", () => {
  it("returns the grid as a CSV attachment", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="class-book-o3-2-progress.csv"');
    expect(await response.text()).toBe("student,username\n");
    expect(mocks.getClassBookProgress).toHaveBeenCalledWith({ db: {}, user: mocks.user, classBookId: CB });
  });

  it("refuses a visitor and a teacher of another class", async () => {
    mocks.user = null;
    expect((await get()).status).toBe(401);
    mocks.user = { id: "t2", role: "TEACHER", schoolId: "school-1" };
    mocks.getClassBookProgress.mockRejectedValueOnce(Object.assign(new Error("nope"), { code: "FORBIDDEN" }));
    expect((await get()).status).toBe(403);
  });

  it("answers 500 on an unexpected failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getClassBookProgress.mockRejectedValueOnce(new Error("down"));
    expect((await get()).status).toBe(500);
    error.mockRestore();
  });
});
