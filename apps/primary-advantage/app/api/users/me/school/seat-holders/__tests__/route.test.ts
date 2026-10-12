// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const SCHOOL = "5c5c5c5c-0000-4000-8000-000000000001";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listSeatHolders: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@reading-advantage/domain", () => ({ licenses: { listSeatHolders: mocks.listSeatHolders } }));
vi.mock("@reading-advantage/auth", () => ({
  AuthError: class AuthError extends Error {
    code = "FORBIDDEN";
  },
}));

import { GET } from "../route";
import { AuthError } from "@reading-advantage/auth";

const get = (query = "") => GET(new Request(`http://localhost/api/users/me/school/seat-holders${query}`) as NextRequest);
const page = (n: number) => ({ page: n, pageSize: 50, total: 60, holders: [] });

describe("GET /api/users/me/school/seat-holders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "a1", role: "ADMIN", schoolId: SCHOOL });
    mocks.listSeatHolders.mockImplementation(async ({ page: n }: { page: number }) => page(n));
  });

  it("returns page 1 by default for the session school", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect((await response.json()).page).toBe(1);
    expect(mocks.listSeatHolders.mock.calls[0][0]).toMatchObject({ schoolId: SCHOOL, page: 1 });
  });

  it("returns page 2", async () => {
    const response = await get("?page=2");
    expect((await response.json()).page).toBe(2);
    expect(mocks.listSeatHolders.mock.calls[0][0].page).toBe(2);
  });

  it("returns 400 for a bad page", async () => {
    for (const query of ["?page=0", "?page=abc", "?page=1.5"]) expect((await get(query)).status).toBe(400);
    expect(mocks.listSeatHolders).not.toHaveBeenCalled();
  });

  it("returns 403 when the domain refuses a STUDENT", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "s1", role: "STUDENT", schoolId: SCHOOL });
    mocks.listSeatHolders.mockRejectedValue(new AuthError("no"));
    expect((await get()).status).toBe(403);
  });

  it("returns 401 without a session and 400 for a caller without a school", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: null });
    expect((await get()).status).toBe(400);
    expect(mocks.listSeatHolders).not.toHaveBeenCalled();
  });

  it("returns 500 and logs for an unknown error", async () => {
    mocks.listSeatHolders.mockRejectedValue(new Error("boom"));
    expect((await get()).status).toBe(500);
  });
});
