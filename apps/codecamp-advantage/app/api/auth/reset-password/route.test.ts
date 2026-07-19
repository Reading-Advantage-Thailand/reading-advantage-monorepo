// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleResetPassword: vi.fn(),
  legacyMode: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({
  handleResetPassword: mocks.handleResetPassword,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: mocks.legacyMode,
}));

import { POST } from "./route";

/** Creates a representative product-local password reset request. */
function request(): NextRequest {
  return new NextRequest(
    "https://codecamp.reading-advantage.com/api/auth/reset-password",
    { method: "POST", body: JSON.stringify({ userId: "legacy-user" }) },
  );
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.handleResetPassword.mockResolvedValue(NextResponse.json({ success: true }));
  });

  it("keeps Accounts as the only credential writer in company mode", async () => {
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.handleResetPassword).not.toHaveBeenCalled();
  });

  it("restores the bounded local writer only in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    const legacyRequest = request();

    const response = await POST(legacyRequest);

    expect(response.status).toBe(200);
    expect(mocks.handleResetPassword).toHaveBeenCalledWith(legacyRequest);
  });
});
