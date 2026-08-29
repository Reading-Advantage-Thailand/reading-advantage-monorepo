// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPublicOrigin,
  getPublicUrl,
  getSalesCallbackOrigin,
} from "../public-url";

const candidateOrigin =
  "https://sso-candidate---sales-advantage-123456789012.asia-southeast1.run.app";
const rollbackOrigin =
  "https://legacy-rollback---sales-advantage-123456789012.asia-southeast1.run.app";

describe("Sales public URL helpers", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses forwarded protocol and host", () => {
    const request = new Request(
      "http://sales-internal:8080/en/admin?ignored=true",
      {
        headers: {
          "x-forwarded-host": "sales.reading-advantage.com",
          "x-forwarded-proto": "https",
        },
      },
    );

    expect(getPublicOrigin(request).href).toBe(
      "https://sales.reading-advantage.com/",
    );
    expect(getPublicUrl(request, "/en/admin").href).toBe(
      "https://sales.reading-advantage.com/en/admin",
    );
  });

  it("falls back to the request URL", () => {
    const request = new Request("http://localhost:3000/en/admin?ignored=true");

    expect(getPublicOrigin(request).href).toBe("http://localhost:3000/");
    expect(getPublicUrl(request, "/th/").href).toBe(
      "http://localhost:3000/th/",
    );
  });

  it("drops an inherited port when the forwarded host has none", () => {
    const request = new Request("http://sales-internal:8080/", {
      headers: {
        "x-forwarded-host": "sales.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicUrl(request, "/en/admin").href).toBe(
      "https://sales.reading-advantage.com/en/admin",
    );
  });

  it("keeps a forwarded port", () => {
    vi.stubEnv("SALES_PREVIEW_ORIGINS", `${candidateOrigin}:8443`);
    const request = new Request("http://sales-internal:8080/", {
      headers: {
        "x-forwarded-host": `${candidateOrigin.slice("https://".length)}:8443`,
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicUrl(request, "/en/admin").href).toBe(
      "https://sso-candidate---sales-advantage-123456789012.asia-southeast1.run.app:8443/en/admin",
    );
  });

  it("rejects an unknown forwarded host", () => {
    const request = new Request("http://sales-internal:8080/", {
      headers: {
        "x-forwarded-host": "attacker.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("accepts only the exact configured candidate and rollback origins", () => {
    vi.stubEnv(
      "SALES_PREVIEW_ORIGINS",
      `${candidateOrigin};${rollbackOrigin}`,
    );

    for (const origin of [candidateOrigin, rollbackOrigin]) {
      const request = new Request("http://sales-internal:8080/", {
        headers: {
          "x-forwarded-host": new URL(origin).host,
          "x-forwarded-proto": "https",
        },
      });

      expect(getPublicOrigin(request).origin).toBe(origin);
    }
  });

  it("rejects a sibling project origin", () => {
    vi.stubEnv(
      "SALES_PREVIEW_ORIGINS",
      `${candidateOrigin};${rollbackOrigin}`,
    );
    const request = new Request("http://sales-internal:8080/", {
      headers: {
        "x-forwarded-host":
          "sso-candidate---sales-advantage-999999999999.asia-southeast1.run.app",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("rejects malformed configured preview origins", () => {
    vi.stubEnv("SALES_PREVIEW_ORIGINS", `${candidateOrigin};not-a-url`);
    const request = new Request("https://sales.reading-advantage.com/");

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("rejects an HTTP forwarded origin outside local development", () => {
    const request = new Request("http://sales-internal:8080/", {
      headers: {
        "x-forwarded-host": "sales.reading-advantage.com",
        "x-forwarded-proto": "http",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("falls back to the default Sales callback origin", () => {
    expect(getSalesCallbackOrigin().origin).toBe(
      "https://sales.reading-advantage.com",
    );
  });

  it("reads the configured callback origin", () => {
    vi.stubEnv(
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
      "https://sales.reading-advantage.com/api/auth/callback",
    );

    expect(getSalesCallbackOrigin().origin).toBe(
      "https://sales.reading-advantage.com",
    );
  });

  it("rejects a malformed callback origin", () => {
    vi.stubEnv("COMPANY_AUTH_OIDC_REDIRECT_URI", "not-a-url");

    expect(() => getSalesCallbackOrigin()).toThrow("PUBLIC_ORIGIN_INVALID");
  });
});
