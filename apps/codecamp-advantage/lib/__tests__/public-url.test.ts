import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicOrigin, getPublicUrl } from "../public-url";

const candidateOrigin =
  "https://sso-candidate---codecamp-advantage-codecamp-advantage.as.a.run.app";
const rollbackOrigin =
  "https://legacy-rollback---codecamp-advantage-codecamp-advantage.as.a.run.app";

describe("public URL helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses forwarded protocol and host", () => {
    const request = new Request("http://codecamp-internal:8080/en/admin?ignored=true", {
      headers: {
        "x-forwarded-host": "codecamp.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicOrigin(request).href).toBe("https://codecamp.reading-advantage.com/");
    expect(getPublicUrl(request, "/en/admin").href).toBe(
      "https://codecamp.reading-advantage.com/en/admin",
    );
  });

  it("falls back to the request URL", () => {
    const request = new Request("http://localhost:3000/en/admin?ignored=true");

    expect(getPublicOrigin(request).href).toBe("http://localhost:3000/");
    expect(getPublicUrl(request, "/th/").href).toBe("http://localhost:3000/th/");
  });

  it("drops an inherited port when the forwarded host has none", () => {
    const request = new Request("http://codecamp-internal:8080/", {
      headers: {
        "x-forwarded-host": "codecamp.reading-advantage.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicUrl(request, "/en/admin").href).toBe(
      "https://codecamp.reading-advantage.com/en/admin",
    );
  });

  it("keeps a forwarded port", () => {
    vi.stubEnv("CODECAMP_PREVIEW_ORIGINS", `${candidateOrigin}:8443`);
    const request = new Request("http://codecamp-internal:8080/", {
      headers: {
        "x-forwarded-host":
          `${candidateOrigin.slice("https://".length)}:8443`,
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicUrl(request, "/en/admin").href).toBe(
      "https://sso-candidate---codecamp-advantage-codecamp-advantage.as.a.run.app:8443/en/admin",
    );
  });

  it("rejects an unknown forwarded host", () => {
    const request = new Request("http://codecamp-internal:8080/", {
      headers: {
        "x-forwarded-host": "attacker.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("accepts only the exact configured candidate and rollback origins", () => {
    vi.stubEnv("CODECAMP_PREVIEW_ORIGINS", `${candidateOrigin};${rollbackOrigin}`);

    for (const origin of [candidateOrigin, rollbackOrigin]) {
      const request = new Request("http://codecamp-internal:8080/", {
        headers: {
          "x-forwarded-host": new URL(origin).host,
          "x-forwarded-proto": "https",
        },
      });

      expect(getPublicOrigin(request).origin).toBe(origin);
    }
  });

  it("rejects a sibling project origin", () => {
    vi.stubEnv("CODECAMP_PREVIEW_ORIGINS", `${candidateOrigin};${rollbackOrigin}`);
    const request = new Request("http://codecamp-internal:8080/", {
      headers: {
        "x-forwarded-host":
          "sso-candidate---codecamp-advantage-other-project.as.a.run.app",
        "x-forwarded-proto": "https",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("rejects malformed configured preview origins", () => {
    vi.stubEnv("CODECAMP_PREVIEW_ORIGINS", `${candidateOrigin};not-a-url`);
    const request = new Request("https://codecamp.reading-advantage.com/");

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("rejects an HTTP forwarded origin outside local development", () => {
    const request = new Request("http://codecamp-internal:8080/", {
      headers: {
        "x-forwarded-host": "codecamp.reading-advantage.com",
        "x-forwarded-proto": "http",
      },
    });

    expect(() => getPublicOrigin(request)).toThrow("PUBLIC_ORIGIN_INVALID");
  });
});
