// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("GET /api/auth/company/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.start.mockResolvedValue({
      authorizationUrl: "https://accounts.reading-advantage.com/authorize",
      sealedTransaction: "sealed-transaction",
    });
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
});
