// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleResetPassword: vi.fn(),
  legacyMode: vi.fn(),
  logStructuredError: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({ handleResetPassword: mocks.handleResetPassword }));
vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@reading-advantage/utils/structured-error", () => ({ logStructuredError: mocks.logStructuredError }));

import { POST } from "./route";

/** Creates a legacy password reset request with an optional request id. */
function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://codecamp.reading-advantage.com/api/auth/reset-password", {
    method: "POST",
    headers,
    body: JSON.stringify({ userId: "legacy-user" }),
  });
}

describe("POST /api/auth/reset-password failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(true);
  });

  it("returns a generic 500 and logs a structured error with the request id", async () => {
    const failure = new Error("hash failure");
    mocks.handleResetPassword.mockRejectedValue(failure);

    const response = await POST(request({ "x-request-id": "req-9" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: "Internal server error" });
    expect(mocks.logStructuredError).toHaveBeenCalledWith({ event: "reset_password_error", requestId: "req-9", error: failure });
  });

  it("logs a null request id when the header is absent", async () => {
    mocks.handleResetPassword.mockRejectedValue(new Error("x"));

    await POST(request());

    expect(mocks.logStructuredError).toHaveBeenCalledWith(expect.objectContaining({ requestId: null }));
  });

  it("points company-mode callers at Accounts without logging", async () => {
    mocks.legacyMode.mockReturnValue(false);

    const response = await POST(request());

    await expect(response.json()).resolves.toEqual({ message: "Manage credentials through Accounts.", accountsUrl: "https://accounts.reading-advantage.com" });
    expect(mocks.logStructuredError).not.toHaveBeenCalled();
  });
});
