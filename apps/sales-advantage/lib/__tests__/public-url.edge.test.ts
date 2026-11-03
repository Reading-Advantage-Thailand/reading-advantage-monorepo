// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublicOrigin, getPublicUrl } from "../public-url";

/**
 * Builds a request with forwarded headers.
 * @param url Request URL.
 * @param headers Request headers.
 * @returns A request.
 */
function request(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("Sales public URL edge cases", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("COMPANY_AUTH_OIDC_REDIRECT_URI", "");
    vi.stubEnv("SALES_PREVIEW_ORIGINS", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a forwarded protocol other than http or https", () => {
    expect(() =>
      getPublicOrigin(
        request("https://sales.reading-advantage.com/x", {
          "x-forwarded-proto": "ftp",
        }),
      ),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("accepts an upper-case forwarded protocol", () => {
    expect(
      getPublicOrigin(
        request("http://internal:8080/x", {
          "x-forwarded-proto": "HTTPS",
          "x-forwarded-host": "sales.reading-advantage.com",
        }),
      ).href,
    ).toBe("https://sales.reading-advantage.com/");
  });

  it("uses only the first forwarded value of each header", () => {
    expect(
      getPublicOrigin(
        request("http://internal:8080/x", {
          "x-forwarded-proto": "https, http",
          "x-forwarded-host": "sales.reading-advantage.com, evil.example",
        }),
      ).origin,
    ).toBe("https://sales.reading-advantage.com");
  });

  it("allows http localhost only outside production", () => {
    expect(getPublicOrigin(request("http://localhost:3005/x")).origin).toBe(
      "http://localhost:3005",
    );
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getPublicOrigin(request("http://localhost:3005/x"))).toThrow(
      "PUBLIC_ORIGIN_INVALID",
    );
  });

  it("accepts the NEXT_PUBLIC_API_URL origin", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://sales.example.test/api");
    expect(getPublicOrigin(request("https://sales.example.test/x")).origin).toBe(
      "https://sales.example.test",
    );
  });

  it("ignores a configured origin that carries credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://u:p@sales.example.test/");
    expect(() => getPublicOrigin(request("https://sales.example.test/x"))).toThrow(
      "PUBLIC_ORIGIN_INVALID",
    );
  });

  it.each([
    ["path", "https://preview.example.test/app"],
    ["query", "https://preview.example.test/?a=1"],
    ["http scheme", "http://preview.example.test"],
    ["credentials", "https://u@preview.example.test"],
    ["empty entry", "https://a.example.test;;https://b.example.test"],
    ["unparseable entry", "not a url"],
  ])("rejects a preview origin with a %s", (_label, value) => {
    vi.stubEnv("SALES_PREVIEW_ORIGINS", value);
    expect(() =>
      getPublicOrigin(request("https://sales.reading-advantage.com/x")),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("accepts each listed preview origin", () => {
    vi.stubEnv(
      "SALES_PREVIEW_ORIGINS",
      " https://a.example.test ; https://b.example.test/ ",
    );
    expect(getPublicOrigin(request("https://b.example.test/x")).origin).toBe(
      "https://b.example.test",
    );
  });

  it("strips path, query and hash from the public origin", () => {
    expect(
      getPublicOrigin(
        request("https://sales.reading-advantage.com/a/b?c=1#d"),
      ).href,
    ).toBe("https://sales.reading-advantage.com/");
  });

  it("builds a public URL for a pathname", () => {
    expect(
      getPublicUrl(request("https://sales.reading-advantage.com/x?y=1"), "/th")
        .href,
    ).toBe("https://sales.reading-advantage.com/th");
  });
});
