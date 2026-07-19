// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleLogin: vi.fn(),
  legacyMode: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({
  handleLogin: mocks.handleLogin,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: mocks.legacyMode,
}));

import { POST } from "./route";

/** Creates a representative Codecamp credential request. */
function request(): NextRequest {
  return new NextRequest("https://codecamp.reading-advantage.com/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "intern", password: "password" }),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.handleLogin.mockResolvedValue(NextResponse.json({ success: true }));
  });

  it("never invokes the local credential writer in company mode", async () => {
    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      authorizationUrl: "/api/auth/company/start",
    });
    expect(mocks.handleLogin).not.toHaveBeenCalled();
  });

  it("delegates to the last-known-working login only in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    const legacyRequest = request();

    const response = await POST(legacyRequest);

    expect(response.status).toBe(200);
    expect(mocks.handleLogin).toHaveBeenCalledWith(legacyRequest);
  });
});
