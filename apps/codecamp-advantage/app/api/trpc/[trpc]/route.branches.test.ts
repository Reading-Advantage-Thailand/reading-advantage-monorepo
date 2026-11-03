// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(),
  legacyMode: vi.fn(),
  introspect: vi.fn(),
  readCookie: vi.fn(),
  resolveUser: vi.fn(),
  handlerOptions: [] as Array<Record<string, unknown>>,
}));

vi.mock("@trpc/server/adapters/fetch", () => ({
  fetchRequestHandler: vi.fn(async (options: Record<string, unknown> & { createContext: () => unknown }) => {
    mocks.handlerOptions.push(options);
    await options.createContext();
    return new Response(null, { status: 204 });
  }),
}));
vi.mock("@reading-advantage/api/codecamp", () => ({ codecampAppRouter: { name: "codecamp" } }));
vi.mock("@reading-advantage/api/context", () => ({ createContext: mocks.createContext }));
vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ introspect: mocks.introspect }),
  readCodecampCookie: mocks.readCookie,
  resolveCodecampSessionUser: mocks.resolveUser,
}));

import { GET, POST } from "./route";

const url = "https://codecamp.reading-advantage.com/api/trpc/x";

describe("Codecamp tRPC context branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handlerOptions.length = 0;
    mocks.legacyMode.mockReturnValue(false);
    mocks.createContext.mockResolvedValue({});
  });

  it("exports the same handler for GET and POST on the codecamp router", async () => {
    expect(GET).toBe(POST);
    mocks.readCookie.mockReturnValue(undefined);

    const response = await GET(new Request(url));

    expect(response.status).toBe(204);
    expect(mocks.handlerOptions[0]).toMatchObject({ endpoint: "/api/trpc", router: { name: "codecamp" } });
  });

  it("scopes a verified principal to the company organization from the Accounts session", async () => {
    const identity = { sub: "acct", organizationId: "org-1", organizationKey: "acme" };
    const principal = { id: "user-1", role: "INTERN" };
    mocks.readCookie.mockReturnValue("company-token");
    mocks.introspect.mockResolvedValue({ identity });
    mocks.resolveUser.mockResolvedValue(principal);

    await POST(new Request(url, { method: "POST" }));

    expect(mocks.introspect).toHaveBeenCalledWith("company-token");
    expect(mocks.createContext).toHaveBeenCalledWith({
      mode: "verified-principal",
      principal,
      productScope: { kind: "company", applicationKey: "codecamp", organizationId: "org-1", organizationKey: "acme" },
    });
  });

  it("drops product scope when the Accounts identity has no local user", async () => {
    mocks.readCookie.mockReturnValue("company-token");
    mocks.introspect.mockResolvedValue({ identity: { organizationId: "org-1", organizationKey: "acme" } });
    mocks.resolveUser.mockResolvedValue(null);

    await POST(new Request(url, { method: "POST" }));

    expect(mocks.createContext).toHaveBeenCalledWith({ mode: "verified-principal", principal: null, productScope: null });
  });

  it("drops the principal when Accounts revokes the session token", async () => {
    mocks.readCookie.mockReturnValue("revoked");
    mocks.introspect.mockResolvedValue(null);

    await POST(new Request(url, { method: "POST" }));

    expect(mocks.resolveUser).not.toHaveBeenCalled();
    expect(mocks.createContext).toHaveBeenCalledWith({ mode: "verified-principal", principal: null, productScope: null });
  });

  it("falls back to a legacy bearer header when no legacy cookie exists", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.readCookie.mockReturnValue(undefined);

    await POST(new Request(url, { method: "POST", headers: { authorization: "Bearer header-token" } }));

    expect(mocks.createContext).toHaveBeenCalledWith({ mode: "legacy", authorization: "Bearer header-token" });
  });

  it("passes a null authorization in legacy mode for a non-bearer header", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.readCookie.mockReturnValue(undefined);

    await POST(new Request(url, { method: "POST", headers: { authorization: "Basic abc" } }));

    expect(mocks.createContext).toHaveBeenCalledWith({ mode: "legacy", authorization: null });
  });

  it("passes a null authorization in legacy mode with no credential", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.readCookie.mockReturnValue(undefined);

    await POST(new Request(url, { method: "POST" }));

    expect(mocks.createContext).toHaveBeenCalledWith({ mode: "legacy", authorization: null });
  });
});
