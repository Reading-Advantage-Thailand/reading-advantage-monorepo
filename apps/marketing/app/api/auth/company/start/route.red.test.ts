// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  publicOrigin: vi.fn(),
  callbackOrigin: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => ({
  MARKETING_TRANSACTION_COOKIE: "__Host-ra_marketing_oidc_tx",
  getMarketingOidcClient: () => ({ start: mocks.start }),
}));
vi.mock("@/lib/public-url", () => ({
  getPublicOrigin: mocks.publicOrigin,
  getMarketingCallbackOrigin: mocks.callbackOrigin,
}));

import { GET } from "./route";

const callbackOrigin = "https://marketing.reading-advantage.com";
const previewOrigin =
  "https://sso-candidate---marketing-123456789012.asia-southeast1.run.app";

/** Creates a representative company authorization request. */
function request(): Request {
  return new Request(
    "https://marketing.reading-advantage.com/api/auth/company/start?returnTo=%2Fcampaigns%2F123",
  );
}

function forwardedRequest(returnTo = "/campaigns/123"): Request {
  return new Request(
    `http://marketing-internal:8080/api/auth/company/start?returnTo=${encodeURIComponent(returnTo)}`,
    {
      headers: {
        "x-forwarded-host": "marketing.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    },
  );
}

describe("GET /api/auth/company/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("reaches the OIDC client with an unchanged valid returnTo", async () => {
    const response = await GET(request());

    expect(response.headers.get("location")).toBe(
      "https://accounts.reading-advantage.com/authorize",
    );
    expect(mocks.start).toHaveBeenCalledWith("/campaigns/123");
  });

  it("restarts the handoff with returnTo=/ for a malformed returnTo", async () => {
    const unsafeReturnTo = "https://attacker.example/private";
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const response = await GET(forwardedRequest(unsafeReturnTo));

    expect(response.status).toBe(307);
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.start).toHaveBeenCalledWith("/");
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it("hands a preview-origin start to the callback origin with returnTo preserved", async () => {
    mocks.publicOrigin.mockReturnValue(new URL(previewOrigin));
    const response = await GET(
      new Request(
        `${previewOrigin}/api/auth/company/start?returnTo=%2Fcampaigns%2F123%3Ftab%3Dvideo`,
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.origin).toBe(callbackOrigin);
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.get("returnTo")).toBe("/campaigns/123?tab=video");
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

  it("secures the transaction cookie for forwarded https", async () => {
    const response = await GET(forwardedRequest());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
});
