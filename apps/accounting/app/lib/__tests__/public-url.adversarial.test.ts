// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicOrigin } from "../public-url";

const CANONICAL_HOST = "accounting.reading-advantage.com";
const CANDIDATE_ORIGIN =
  "https://candidate---accounting-123456789012.asia-southeast1.run.app";

/** Creates a request with the supplied forwarding values. */
function forwardedRequest(input: {
  readonly host?: string;
  readonly protocol?: string;
  readonly requestUrl?: string;
}): Request {
  const headers = new Headers();
  if (input.host !== undefined) {
    headers.set("x-forwarded-host", input.host);
  }
  if (input.protocol !== undefined) {
    headers.set("x-forwarded-proto", input.protocol);
  }
  return new Request(input.requestUrl ?? "http://accounting-internal:8080/", {
    headers,
  });
}

describe("Accounting public origin adversarial approval", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCOUNTING_PREVIEW_ORIGINS", "");
    vi.stubEnv("COMPANY_AUTH_OIDC_REDIRECT_URI", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    "accounting.reading-advantage.com.evil.com",
    "accounting.reading-advantage.com:444",
    "accounting.reading-advantage.com.",
    "evil.example.com@accounting.reading-advantage.com",
    "accounting.reading-advantage.com@evil.example.com",
  ])("rejects a forged forwarded host: %s", (host) => {
    expect(() =>
      getPublicOrigin(
        forwardedRequest({ host, protocol: "https" }),
      ),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("normalizes case and the default HTTPS port only for the same origin", () => {
    for (const host of [CANONICAL_HOST.toUpperCase(), `${CANONICAL_HOST}:443`]) {
      expect(
        getPublicOrigin(forwardedRequest({ host, protocol: "https" })).origin,
      ).toBe(`https://${CANONICAL_HOST}`);
    }
  });

  it.each([
    ["downgrade", "http"],
    ["non-HTTP protocol", "ftp"],
    ["URL-shaped protocol", "https://evil.example.com"],
  ])("rejects a %s forwarded protocol", (_name, protocol) => {
    expect(() =>
      getPublicOrigin(
        forwardedRequest({ host: CANONICAL_HOST, protocol }),
      ),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("fails closed when a forwarded host lacks an HTTPS protocol", () => {
    expect(() =>
      getPublicOrigin(forwardedRequest({ host: CANONICAL_HOST })),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("uses only the first forwarded values", () => {
    expect(() =>
      getPublicOrigin(
        forwardedRequest({
          host: `evil.example.com, ${CANONICAL_HOST}`,
          protocol: "https, http",
        }),
      ),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it.each([
    `${CANDIDATE_ORIGIN}/preview`,
    `${CANDIDATE_ORIGIN}?source=attacker`,
    `${CANDIDATE_ORIGIN}#fragment`,
    " ",
    `${CANDIDATE_ORIGIN};;${CANDIDATE_ORIGIN}`,
  ])("rejects an invalid preview-origin configuration: %j", (previewOrigins) => {
    vi.stubEnv("ACCOUNTING_PREVIEW_ORIGINS", previewOrigins);

    expect(() =>
      getPublicOrigin(
        forwardedRequest({ host: CANONICAL_HOST, protocol: "https" }),
      ),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });
});
