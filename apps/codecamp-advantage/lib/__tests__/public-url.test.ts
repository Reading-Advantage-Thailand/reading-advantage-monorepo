import { describe, expect, it } from "vitest";

import { getPublicOrigin, getPublicUrl } from "../public-url";

describe("public URL helpers", () => {
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
    const request = new Request("http://codecamp-internal:8080/", {
      headers: {
        "x-forwarded-host":
          "sso-candidate---codecamp-advantage-codecamp-advantage.as.a.run.app:8443",
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
