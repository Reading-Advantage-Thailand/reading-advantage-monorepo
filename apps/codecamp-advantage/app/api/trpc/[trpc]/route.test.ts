// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(),
  legacyMode: vi.fn(),
  introspect: vi.fn(),
  readCookie: vi.fn(),
  resolveUser: vi.fn(),
}));

vi.mock("@trpc/server/adapters/fetch", () => ({
  fetchRequestHandler: vi.fn(
    async (options: { createContext: () => Promise<unknown> | unknown }) => {
      await options.createContext();
      return new Response(null, { status: 204 });
    },
  ),
}));
vi.mock("@reading-advantage/api/codecamp", () => ({ codecampAppRouter: {} }));
vi.mock("@reading-advantage/api/context", () => ({
  createContext: mocks.createContext,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: mocks.legacyMode,
}));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ introspect: mocks.introspect }),
  readCodecampCookie: mocks.readCookie,
  resolveCodecampSessionUser: mocks.resolveUser,
}));

import { POST } from "./route";

describe("Codecamp-only tRPC authentication boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.createContext.mockResolvedValue({ auth: null });
  });

  it("never forwards legacy cookie or bearer evidence in company mode", async () => {
    mocks.readCookie.mockReturnValue(undefined);
    const request = new Request("https://codecamp.reading-advantage.com/api/trpc", {
      method: "POST",
      headers: {
        cookie: "session_token=ignored",
        authorization: "Bearer ignored",
      },
    });

    await POST(request);

    expect(mocks.createContext).toHaveBeenCalledWith({
      mode: "verified-principal",
      principal: null,
      productScope: null,
    });
  });

  it("restores legacy session resolution only in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.readCookie.mockImplementation((_request: Request, name: string) =>
      name === "session_token" ? "legacy-token" : undefined,
    );
    const request = new Request("https://codecamp.reading-advantage.com/api/trpc", {
      method: "POST",
      headers: { cookie: "session_token=legacy-token" },
    });

    await POST(request);

    expect(mocks.createContext).toHaveBeenCalledWith({
      mode: "legacy",
      authorization: "Bearer legacy-token",
    });
    expect(mocks.introspect).not.toHaveBeenCalled();
  });
});
