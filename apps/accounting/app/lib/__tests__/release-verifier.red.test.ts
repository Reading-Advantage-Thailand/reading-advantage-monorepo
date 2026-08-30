// @vitest-environment node
import { describe, expect, it } from "vitest";

import { verifyAccountingRelease } from "../../../scripts/verify-accounting-release";

const BASE_URL = "https://accounting.reading-advantage.test";

interface StubResponse {
  readonly body?: BodyInit | null;
  readonly status: number;
}

/** Builds a fetch stub with one fixed response per request path. */
function stubFetch(responses: Record<string, StubResponse>): typeof fetch {
  return async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const response = responses[new URL(url).pathname];
    return new Response(response?.body, { status: response?.status ?? 404 });
  };
}

function contractResponses(
  overrides: Partial<Record<"login" | "session" | "start", number>> = {},
): Record<string, StubResponse> {
  return {
    "/login": { body: "<html>Accounting sign in</html>", status: overrides.login ?? 200 },
    "/api/auth/session": { body: "{}", status: overrides.session ?? 401 },
    "/api/auth/company/start": { status: overrides.start ?? 307 },
  };
}

describe("Accounting release verifier contract", () => {
  it("passes against the required release statuses", async () => {
    await expect(
      verifyAccountingRelease(
        { baseUrl: BASE_URL },
        stubFetch(contractResponses()),
      ),
    ).resolves.toMatchObject({
      checks: ["login-page", "unauthenticated-api", "safe-return-to"],
    });
  });

  it.each([
    ["a missing login page", { login: 404 }],
    ["a login-page server error", { login: 500 }],
    ["the wrong unauthenticated status", { session: 200 }],
    ["a malformed-return server error", { start: 500 }],
  ] as const)("fails for %s", async (_caseName, overrides) => {
    await expect(
      verifyAccountingRelease(
        { baseUrl: BASE_URL },
        stubFetch(contractResponses(overrides)),
      ),
    ).rejects.toThrow();
  });
});
