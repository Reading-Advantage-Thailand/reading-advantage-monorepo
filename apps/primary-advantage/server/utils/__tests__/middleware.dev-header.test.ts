// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ validateUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ currentUser: vi.fn() }));
vi.mock("@/server/utils/auth", () => ({ validateUser: mocks.validateUser }));

import { withAuth } from "../middleware";

afterEach(() => vi.unstubAllEnvs());

describe("withAuth dev header for a migrated user", () => {
  it("uses users.role when the user has no legacy role rows", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ACCESS_KEY", "k");
    mocks.validateUser.mockResolvedValue({ id: "u1", role: "TEACHER", roles: [], SchoolAdmins: [] });
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const req = new NextRequest("http://localhost/x", { headers: { "x-api-key": "k", "x-dev-user-id": "u1" } });

    const response = await withAuth(handler)(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(req, expect.anything(), expect.objectContaining({ role: "teacher" }));
  });
});
