import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, insertMock, requirePermissionMock, logStructuredErrorMock } =
  vi.hoisted(() => ({
    selectMock: vi.fn(),
    insertMock: vi.fn(),
    requirePermissionMock: vi.fn(),
    logStructuredErrorMock: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock("@/lib/auth", () => ({
  requireMarketingPermission: requirePermissionMock,
}));

vi.mock("@reading-advantage/utils/structured-error", () => ({
  logStructuredError: logStructuredErrorMock,
}));

import { GET, POST } from "@/api/settings/route";

function request(method: "GET" | "POST", body?: unknown): Request {
  return new Request("http://localhost/api/settings", {
    method,
    headers: { "x-request-id": "request-123" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({
    ok: true,
    session: { user: { role: "ADMIN" } },
  });
});

describe("settings route structured failures", () => {
  it("logs settings load failures", async () => {
    const error = new Error("database unavailable");
    selectMock.mockReturnValue({
      from: vi.fn().mockRejectedValue(error),
    });

    const response = await GET(request("GET"));

    expect(response.status).toBe(500);
    expect(logStructuredErrorMock).toHaveBeenCalledWith({
      event: "marketing_settings_load_failed",
      requestId: "request-123",
      error,
      fields: { method: "GET", route: "/api/settings" },
    });
  });

  it("logs settings save failures", async () => {
    const error = new Error("database unavailable");
    insertMock.mockImplementation(() => {
      throw error;
    });

    const response = await POST(
      request("POST", { "llm.provider": "google" }),
    );

    expect(response.status).toBe(500);
    expect(logStructuredErrorMock).toHaveBeenCalledWith({
      event: "marketing_settings_save_failed",
      requestId: "request-123",
      error,
      fields: { method: "POST", route: "/api/settings" },
    });
  });
});
