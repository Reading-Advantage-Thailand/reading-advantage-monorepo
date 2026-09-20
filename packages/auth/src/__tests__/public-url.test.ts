import { describe, expect, it } from "vitest";
import {
  createPublicOriginGuard,
  hasControlCharacter,
  hasMalformedPercentEncoding,
  type PublicOriginGuardConfig,
} from "../public-url";

const marketingConfig: PublicOriginGuardConfig = {
  defaultOrigin: "https://marketing.reading-advantage.com",
  previewOriginsEnv: "MARKETING_PREVIEW_ORIGINS",
};

function requestAt(url: string, headers?: Record<string, string>): Request {
  return new Request(url, { headers });
}

describe("return-path validator primitives", () => {
  it("detects control characters", () => {
    expect(hasControlCharacter("/campaigns")).toBe(false);
    expect(hasControlCharacter("/campaigns\n")).toBe(true);
    expect(hasControlCharacter("/campaigns\u0000")).toBe(true);
    expect(hasControlCharacter("/campaigns\u007f")).toBe(true);
  });

  it("detects malformed percent encoding", () => {
    expect(hasMalformedPercentEncoding("/campaigns%20one")).toBe(false);
    expect(hasMalformedPercentEncoding("/campaigns%zz")).toBe(true);
  });
});

describe("createPublicOriginGuard", () => {
  it("approves the canonical product origin", () => {
    const guard = createPublicOriginGuard(marketingConfig);
    const origin = guard.getPublicOrigin(
      requestAt("https://marketing.reading-advantage.com/campaigns?x=1"),
    );
    expect(origin.origin).toBe("https://marketing.reading-advantage.com");
    expect(origin.pathname).toBe("/");
    expect(origin.search).toBe("");
  });

  it("rejects unknown HTTPS origins", () => {
    const guard = createPublicOriginGuard(marketingConfig);
    expect(() =>
      guard.getPublicOrigin(requestAt("https://evil.example/campaigns")),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("approves local development HTTP origins outside production", () => {
    const guard = createPublicOriginGuard({
      ...marketingConfig,
      environment: { NODE_ENV: "development" },
    });
    const origin = guard.getPublicOrigin(requestAt("http://localhost:3000/login"));
    expect(origin.origin).toBe("http://localhost:3000");
  });

  it("rejects local HTTP origins in production", () => {
    const guard = createPublicOriginGuard({
      ...marketingConfig,
      environment: { NODE_ENV: "production" },
    });
    expect(() =>
      guard.getPublicOrigin(requestAt("http://localhost:3000/login")),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("honors forwarded proto and host headers", () => {
    const guard = createPublicOriginGuard(marketingConfig);
    const origin = guard.getPublicOrigin(
      requestAt("http://127.0.0.1:3000/campaigns", {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "marketing.reading-advantage.com",
      }),
    );
    expect(origin.origin).toBe("https://marketing.reading-advantage.com");
  });

  it("approves exact configured preview origins and rejects dirty entries", () => {
    const guard = createPublicOriginGuard({
      ...marketingConfig,
      environment: {
        NODE_ENV: "production",
        MARKETING_PREVIEW_ORIGINS: "https://pr-12.preview.example",
      },
    });
    expect(
      guard.getPublicOrigin(requestAt("https://pr-12.preview.example/campaigns"))
        .origin,
    ).toBe("https://pr-12.preview.example");

    const dirty = createPublicOriginGuard({
      ...marketingConfig,
      environment: {
        NODE_ENV: "production",
        MARKETING_PREVIEW_ORIGINS: "https://pr-12.preview.example/path",
      },
    });
    expect(() =>
      dirty.getPublicOrigin(requestAt("https://pr-12.preview.example/")),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("falls back to the default callback origin without configuration", () => {
    const guard = createPublicOriginGuard({
      ...marketingConfig,
      environment: {},
    });
    expect(guard.getCallbackOrigin().origin).toBe(
      "https://marketing.reading-advantage.com",
    );
  });

  it("uses the configured callback URL when it is a bare origin", () => {
    const guard = createPublicOriginGuard({
      ...marketingConfig,
      environment: {
        COMPANY_AUTH_OIDC_REDIRECT_URI:
          "https://marketing.reading-advantage.com/api/auth/callback",
      },
    });
    expect(guard.getCallbackOrigin().origin).toBe(
      "https://marketing.reading-advantage.com",
    );
  });

  it("rejects a callback URL that is not a bare origin", () => {
    const guard = createPublicOriginGuard({
      ...marketingConfig,
      environment: {
        COMPANY_AUTH_OIDC_REDIRECT_URI: "https://callback.example/?next=1",
      },
    });
    expect(() => guard.getCallbackOrigin()).toThrow("PUBLIC_ORIGIN_INVALID");
  });
});
