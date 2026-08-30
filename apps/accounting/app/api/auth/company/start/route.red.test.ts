// @vitest-environment node
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { GET } from "@/app/api/auth/company/start/route";
import {
  installIdpFetchDouble,
  cookieValue,
  decodeTransaction,
  findCookie,
  PUBLIC_ORIGIN,
  setCompanyAuthEnv,
  uninstallIdpFetchDouble,
  TRANSACTION_COOKIE,
} from "@/app/lib/__tests__/company-oidc-idp-double";

const CANDIDATE_ORIGIN =
  "https://candidate---accounting-123456789012.asia-southeast1.run.app";

describe("GET /api/auth/company/start (Accounting parity)", () => {
  beforeAll(() => {
    setCompanyAuthEnv();
    installIdpFetchDouble();
  });

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv(
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
      "https://accounting.reading-advantage.com/api/auth/callback",
    );
    vi.stubEnv("ACCOUNTING_PREVIEW_ORIGINS", CANDIDATE_ORIGIN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    uninstallIdpFetchDouble();
    vi.unstubAllEnvs();
  });

  it("hands off a start request on an approved preview origin to the callback origin", async () => {
    const response = await GET(
      new Request(
        `${CANDIDATE_ORIGIN}/api/auth/company/start?returnTo=%2Fexpenses`,
        {
          headers: {
            "x-forwarded-host": new URL(CANDIDATE_ORIGIN).host,
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin).toBe("https://accounting.reading-advantage.com");
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.get("returnTo")).toBe("/expenses");
  });

  it("restarts the handoff with returnTo=/ when the return path is unsafe, never returning 500", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    try {
      const response = await GET(
        new Request(
          `${PUBLIC_ORIGIN}/api/auth/company/start?returnTo=${encodeURIComponent("https://evil.example.com")}`,
        ),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain(
        "https://accounts.reading-advantage.test/api/oidc/authorize",
      );
      const transactionCookie = findCookie(response, TRANSACTION_COOKIE);
      expect(transactionCookie).toBeDefined();
      expect(
        decodeTransaction(cookieValue(transactionCookie as string)).returnTo,
      ).toBe("/");
      expect(consoleWarn).toHaveBeenCalledTimes(1);
      const warning = JSON.parse(String(consoleWarn.mock.calls[0]?.[0])) as {
        event?: string;
        level?: string;
      };
      expect(warning).toEqual({
        event: "accounting_sso_unsafe_return_to",
        level: "warn",
      });
    } finally {
      consoleWarn.mockRestore();
    }
  });
});
