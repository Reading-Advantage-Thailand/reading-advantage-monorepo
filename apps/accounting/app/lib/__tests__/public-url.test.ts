// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAccountingCallbackOrigin,
  getPublicOrigin,
  getPublicUrl,
} from "../public-url";

const candidateOrigin =
  "https://candidate---accounting-123456789012.asia-southeast1.run.app";

describe("Accounting public URL helpers", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses forwarded protocol and host", () => {
    const request = new Request(
      "http://accounting-internal:8080/en/admin?ignored=true",
      {
        headers: {
          "x-forwarded-host": "accounting.reading-advantage.com",
          "x-forwarded-proto": "https",
        },
      },
    );

    expect(getPublicOrigin(request).href).toBe(
      "https://accounting.reading-advantage.com/",
    );
    expect(getPublicUrl(request, "/en/admin").href).toBe(
      "https://accounting.reading-advantage.com/en/admin",
    );
  });

  it("falls back to the request URL", () => {
    const request = new Request("http://localhost:3000/en/admin?ignored=true");

    expect(getPublicOrigin(request).href).toBe("http://localhost:3000/");
    expect(getPublicUrl(request, "/th/").href).toBe(
      "http://localhost:3000/th/",
    );
  });

  it("rejects an unknown forwarded host", () => {
    const request = new Request("http://accounting-internal:8080/", {
      headers: {
        "x-forwarded-host": "attacker.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("accepts only the exact configured candidate origin", () => {
    vi.stubEnv("ACCOUNTING_PREVIEW_ORIGINS", candidateOrigin);

    const request = new Request("http://accounting-internal:8080/", {
      headers: {
        "x-forwarded-host": new URL(candidateOrigin).host,
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicOrigin(request).origin).toBe(candidateOrigin);
  });

  it("rejects a sibling project origin", () => {
    vi.stubEnv("ACCOUNTING_PREVIEW_ORIGINS", candidateOrigin);
    const request = new Request("http://accounting-internal:8080/", {
      headers: {
        "x-forwarded-host":
          "candidate---accounting-999999999999.asia-southeast1.run.app",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("never produces an http target when the forwarded protocol is https", () => {
    const request = new Request("http://accounting-internal:8080/", {
      headers: {
        "x-forwarded-host": "accounting.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicOrigin(request).protocol).toBe("https:");
  });

  it("reads the configured callback origin", () => {
    vi.stubEnv(
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
      "https://accounting.reading-advantage.com/api/auth/callback",
    );

    expect(getAccountingCallbackOrigin().origin).toBe(
      "https://accounting.reading-advantage.com",
    );
  });

  it("rejects a malformed callback origin", () => {
    vi.stubEnv("COMPANY_AUTH_OIDC_REDIRECT_URI", "not-a-url");

    expect(() => getAccountingCallbackOrigin()).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("rejects a non-HTTPS callback origin", () => {
    vi.stubEnv(
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
      "http://accounting.reading-advantage.com/api/auth/callback",
    );

    expect(() => getAccountingCallbackOrigin()).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it.each([
    "http://candidate---accounting-123456789012.asia-southeast1.run.app",
    `${candidateOrigin}/path`,
    `${candidateOrigin}?source=test`,
    `${candidateOrigin};`,
  ])("rejects an invalid preview-origin entry: %s", (previewOrigins) => {
    vi.stubEnv("ACCOUNTING_PREVIEW_ORIGINS", previewOrigins);
    const request = new Request(
      "https://accounting.reading-advantage.com/expenses",
    );

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });
});
