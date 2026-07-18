// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  legacyMode: vi.fn(),
  handleLogin: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({
  handleLogin: mocks.handleLogin,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacySalesAuthEnabled: mocks.legacyMode,
}));

import { POST } from "./route";

const request = new NextRequest(
  "https://sales.reading-advantage.com/api/auth/login",
  { method: "POST", body: JSON.stringify({ username: "rep", password: "pw" }) },
);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.handleLogin.mockResolvedValue(
      NextResponse.json({ success: true, user: { id: "legacy-rep" } }),
    );
  });

  it("keeps credential login retired in company mode", async () => {
    const response = await POST(request);

    expect(response.status).toBe(409);
    expect(mocks.handleLogin).not.toHaveBeenCalled();
  });

  it("returns a structured failure when the legacy adapter throws", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.handleLogin.mockRejectedValue(new Error("database unavailable"));
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("sales_legacy_login_error"),
    );
    error.mockRestore();
  });

  it("uses the established first-party login adapter only in legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.handleLogin).toHaveBeenCalledWith(request);
  });
});
