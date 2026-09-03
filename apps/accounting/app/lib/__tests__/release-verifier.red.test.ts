// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { verifyAccountingRelease } from "../../../scripts/verify-accounting-release";

const BASE_URL = "https://accounting.reading-advantage.test";
const captureScript = readFileSync(
  new URL("../../../scripts/capture-accounting-cloud-run-tag.sh", import.meta.url),
  "utf8",
);
const cloudbuild = readFileSync(new URL("../../../cloudbuild.yaml", import.meta.url), "utf8");

interface StubResponse {
  readonly body?: BodyInit | null;
  readonly status: number;
}

/** Builds a fetch stub with one fixed response per request path. */
function stubFetch(
  responses: Record<string, StubResponse>,
  requests: RequestInit[] = [],
): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    requests.push(init ?? {});
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
    const requests: RequestInit[] = [];
    await expect(
      verifyAccountingRelease(
        { baseUrl: BASE_URL },
        stubFetch(contractResponses(), requests),
      ),
    ).resolves.toMatchObject({
      checks: ["login-page", "unauthenticated-api", "safe-return-to"],
    });
    expect(requests).toHaveLength(3);
    expect(
      requests.every(
        ({ headers }) => new Headers(headers).get("Authorization") === null,
      ),
    ).toBe(true);
  });

  it("adds an identity token to every request without adding an app session cookie", async () => {
    const requests: RequestInit[] = [];
    await expect(
      verifyAccountingRelease(
        { baseUrl: BASE_URL, identityToken: "candidate-identity-token" },
        stubFetch(contractResponses(), requests),
      ),
    ).resolves.toMatchObject({
      checks: ["login-page", "unauthenticated-api", "safe-return-to"],
    });
    expect(requests).toHaveLength(3);
    for (const { headers } of requests) {
      expect(new Headers(headers).get("Authorization")).toBe(
        "Bearer candidate-identity-token",
      );
      expect(new Headers(headers).get("Cookie")).toBeNull();
    }
  });

  it("treats an empty identity-token environment value as unset", async () => {
    const requests: RequestInit[] = [];
    await expect(
      verifyAccountingRelease(
        { baseUrl: BASE_URL, identityToken: " \r\n" },
        stubFetch(contractResponses(), requests),
      ),
    ).resolves.toMatchObject({
      checks: ["login-page", "unauthenticated-api", "safe-return-to"],
    });
    expect(
      requests.every(
        ({ headers }) => new Headers(headers).get("Authorization") === null,
      ),
    ).toBe(true);
  });

  it("keeps enforcing app response contracts in identity-token mode", async () => {
    await expect(
      verifyAccountingRelease(
        { baseUrl: BASE_URL, identityToken: "candidate-identity-token" },
        stubFetch(contractResponses({ session: 200 })),
      ),
    ).rejects.toThrow("expected 401");
  });

  it.each([
    ["login", { login: 403 }, "/login"],
    ["session", { session: 403 }, "/api/auth/session"],
    ["start", { start: 401 }, "/api/auth/company/start"],
  ] as const)("reports %s IAM rejection as infrastructure failure", async (_name, overrides, path) => {
    await expect(
      verifyAccountingRelease(
        { baseUrl: BASE_URL, identityToken: "candidate-identity-token" },
        stubFetch(contractResponses(overrides)),
      ),
    ).rejects.toThrow(
      `Cloud Run IAM rejected ACCOUNTING_VERIFY_IDENTITY_TOKEN for ${path}`,
    );
  });

  it("grants candidate access and fails fast around gcloud token minting", () => {
    const mintStep = cloudbuild.indexOf('id: "mint-company-candidate-token"');
    const mintFailure = cloudbuild.indexOf(
      "Accounting identity token minting failed; verifier was not started.",
    );
    const emptyTokenGuard = cloudbuild.indexOf(
      "Accounting identity token minting returned an empty token; verifier was not started.",
    );
    const verifyStep = cloudbuild.indexOf('id: "verify-company-candidate"');
    const verifierCall = cloudbuild.indexOf(
      "pnpm --filter accounting exec tsx scripts/verify-accounting-release.ts",
      verifyStep,
    );

    expect(captureScript).toContain('--format="value(status.url)"');
    expect(captureScript).toContain('"${output_prefix}.audience"');
    expect(cloudbuild).toContain('id: "allow-build-invoker"');
    expect(cloudbuild).toContain(
      "--member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com",
    );
    expect(cloudbuild).toContain("gcloud auth print-identity-token");
    expect(cloudbuild).toContain(
      "--impersonate-service-account=accounting-build-verifier@$PROJECT_ID.iam.gserviceaccount.com",
    );
    expect(cloudbuild).toContain('--audiences="$${audience}"');
    expect(cloudbuild).toContain("ACCOUNTING_VERIFY_IDENTITY_TOKEN");
    expect(cloudbuild.indexOf('id: "allow-build-invoker"')).toBeLessThan(
      mintStep,
    );
    expect(mintFailure).toBeGreaterThan(mintStep);
    expect(emptyTokenGuard).toBeGreaterThan(mintFailure);
    expect(verifyStep).toBeGreaterThan(emptyTokenGuard);
    expect(verifierCall).toBeGreaterThan(verifyStep);
    expect(cloudbuild).not.toContain("/service-accounts/default/identity");
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
