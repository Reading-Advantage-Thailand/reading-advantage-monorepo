// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const mocks = vi.hoisted(() => ({
  legacyMode: vi.fn(),
  start: vi.fn(),
}));

vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: mocks.legacyMode,
}));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_TRANSACTION_COOKIE: "__Host-ra_codecamp_oidc_tx",
  getCodecampOidcClient: () => ({ start: mocks.start }),
}));

import { GET } from "./route";

/** Creates a representative company authorization request. */
function request(): Request {
  return new Request(
    "https://codecamp.reading-advantage.com/api/auth/company/start?returnTo=%2Fen%2Fmodule%2Fintro",
  );
}

function forwardedRequest(returnTo = "/en/module/intro"): Request {
  return new Request(
    `http://codecamp-internal:8080/api/auth/company/start?returnTo=${encodeURIComponent(returnTo)}`,
    {
      headers: {
        "x-forwarded-host": "codecamp.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    },
  );
}

function loopbackRequest(): Request {
  return new Request(
    "http://localhost:3000/api/auth/company/start?returnTo=%2Fen%2Fmodule%2Fintro",
  );
}

describe("GET /api/auth/company/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.start.mockResolvedValue({
      authorizationUrl: "https://accounts.reading-advantage.com/authorize",
      sealedTransaction: "sealed-transaction",
    });
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv(
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
      "https://codecamp.reading-advantage.com/api/auth/callback",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never starts an Accounts transaction in explicit legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);

    const response = await GET(request());

    expect(response.status).toBe(409);
    expect(mocks.start).not.toHaveBeenCalled();
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
    vi.stubEnv(
      "CODECAMP_PREVIEW_ORIGINS",
      "https://sso-candidate---codecamp-advantage-codecamp-advantage.as.a.run.app",
    );
    const response = await GET(
      new Request(
        "https://sso-candidate---codecamp-advantage-codecamp-advantage.as.a.run.app/api/auth/company/start?returnTo=%2Fen%2Fadmin%3Ftab%3Dusers",
      ),
    );
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.origin).toBe("https://codecamp.reading-advantage.com");
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.get("returnTo")).toBe("/en/admin?tab=users");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("secures the transaction cookie for HTTP loopback development", async () => {
    vi.stubEnv(
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
      "http://localhost:3000/api/auth/callback",
    );

    const response = await GET(loopbackRequest());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("falls back to root when returnTo validation fails", async () => {
    const unsafeReturnTo = "https://attacker.example/private";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.start
      .mockRejectedValueOnce(new ZodError([]))
      .mockResolvedValueOnce({
        authorizationUrl: "https://accounts.reading-advantage.com/authorize",
        sealedTransaction: "sealed-transaction",
      });

    const response = await GET(forwardedRequest(unsafeReturnTo));

    expect(response.status).toBe(307);
    expect(mocks.start).toHaveBeenNthCalledWith(1, unsafeReturnTo);
    expect(mocks.start).toHaveBeenNthCalledWith(2, "/");
    expect(warning).toHaveBeenCalledTimes(1);
    const structuredWarning = warning.mock.calls[0]?.[0];
    expect(JSON.parse(String(structuredWarning))).toMatchObject({
      event: "codecamp_sso_unsafe_return_to",
      level: "warn",
    });
    expect(String(structuredWarning)).not.toContain(unsafeReturnTo);
  });
});
