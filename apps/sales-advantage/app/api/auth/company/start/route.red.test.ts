// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  legacyMode: vi.fn(),
  authMode: vi.fn(),
  start: vi.fn(),
  publicOrigin: vi.fn(),
  callbackOrigin: vi.fn(),
}));

vi.mock("@/lib/auth-mode", () => ({
  isLegacySalesAuthEnabled: mocks.legacyMode,
  getSalesAuthMode: mocks.authMode,
}));
vi.mock("@/lib/company-oidc", () => ({
  SALES_TRANSACTION_COOKIE: "__Host-ra_sales_oidc_tx",
  getSalesOidcClient: () => ({ start: mocks.start }),
}));
vi.mock("@/lib/public-url", () => ({
  getPublicOrigin: mocks.publicOrigin,
  getSalesCallbackOrigin: mocks.callbackOrigin,
}));

import { GET } from "./route";

const callbackOrigin = "https://sales.reading-advantage.com";
const previewOrigin =
  "https://sso-candidate---sales-advantage-123456789012.asia-southeast1.run.app";

/** Creates a representative company authorization request. */
function request(): Request {
  return new Request(
    "https://sales.reading-advantage.com/api/auth/company/start?returnTo=%2Fen%2Fmodule%2Fintro",
  );
}

function forwardedRequest(returnTo = "/en/module/intro"): Request {
  return new Request(
    `http://sales-internal:8080/api/auth/company/start?returnTo=${encodeURIComponent(returnTo)}`,
    {
      headers: {
        "x-forwarded-host": "sales.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    },
  );
}

describe("GET /api/auth/company/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.authMode.mockReturnValue("company");
    mocks.start.mockResolvedValue({
      authorizationUrl: "https://accounts.reading-advantage.com/authorize",
      sealedTransaction: "sealed-transaction",
    });
    mocks.publicOrigin.mockReturnValue(new URL(callbackOrigin));
    mocks.callbackOrigin.mockReturnValue(new URL(callbackOrigin));
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("starts Accounts only in company mode", async () => {
    const response = await GET(request());

    expect(response.headers.get("location")).toBe(
      "https://accounts.reading-advantage.com/authorize",
    );
    expect(mocks.start).toHaveBeenCalledWith("/en/module/intro");
  });

  it("secures the transaction cookie for forwarded https", async () => {
    const response = await GET(forwardedRequest());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("hands tagged starts to the canonical callback origin without starting a transaction", async () => {
    mocks.publicOrigin.mockReturnValue(new URL(previewOrigin));
    const response = await GET(
      new Request(
        `${previewOrigin}/api/auth/company/start?returnTo=%2Fen%2Fadmin%3Ftab%3Dusers`,
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.origin).toBe(callbackOrigin);
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.get("returnTo")).toBe("/en/admin?tab=users");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("sanitizes an unsafe returnTo before the callback-origin handoff", async () => {
    const unsafeReturnTo = "https://attacker.example/private";
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mocks.publicOrigin.mockReturnValue(new URL(previewOrigin));

    const response = await GET(
      new Request(
        `${previewOrigin}/api/auth/company/start?returnTo=${encodeURIComponent(unsafeReturnTo)}`,
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.origin).toBe(callbackOrigin);
    expect(location.searchParams.get("returnTo")).toBe("/");
    expect(warning).toHaveBeenCalledTimes(1);
    expect(String(warning.mock.calls[0]?.[0])).not.toContain(unsafeReturnTo);
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("redirects to the locale-prefixed landing page in legacy-school mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.authMode.mockReturnValue("legacy-school");

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/th/");
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("falls back to root when returnTo validation fails", async () => {
    const unsafeReturnTo = "https://attacker.example/private";
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const response = await GET(forwardedRequest(unsafeReturnTo));

    expect(response.status).toBe(307);
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.start).toHaveBeenCalledWith("/");
    expect(warning).toHaveBeenCalledTimes(1);
    const structuredWarning = warning.mock.calls[0]?.[0];
    expect(JSON.parse(String(structuredWarning))).toMatchObject({
      event: "sales_sso_unsafe_return_to",
      level: "warn",
    });
    expect(String(structuredWarning)).not.toContain(unsafeReturnTo);
  });
});
