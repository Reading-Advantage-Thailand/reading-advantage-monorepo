// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleLogin: vi.fn(),
  legacyMode: vi.fn(),
  logStructuredError: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({ handleLogin: mocks.handleLogin }));
vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@reading-advantage/utils/structured-error", () => ({ logStructuredError: mocks.logStructuredError }));

import { POST } from "./route";

/** Creates a legacy credential request with an optional request id. */
function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://codecamp.reading-advantage.com/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify({ username: "intern", password: "password" }),
  });
}

describe("POST /api/auth/login failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(true);
  });

  it("returns a generic 500 and logs a structured error with the request id", async () => {
    const failure = new Error("db down: password=secret");
    mocks.handleLogin.mockRejectedValue(failure);

    const response = await POST(request({ "x-request-id": "req-1" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: "Internal server error" });
    expect(mocks.logStructuredError).toHaveBeenCalledWith({ event: "codecamp_legacy_login_error", requestId: "req-1", error: failure });
  });

  it("logs a null request id when the header is absent", async () => {
    mocks.handleLogin.mockRejectedValue(new Error("x"));

    await POST(request());

    expect(mocks.logStructuredError).toHaveBeenCalledWith(expect.objectContaining({ requestId: null }));
  });

  it("does not log in company mode", async () => {
    mocks.legacyMode.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ message: "Continue with Accounts.", authorizationUrl: "/api/auth/company/start" });
    expect(mocks.logStructuredError).not.toHaveBeenCalled();
  });
});
