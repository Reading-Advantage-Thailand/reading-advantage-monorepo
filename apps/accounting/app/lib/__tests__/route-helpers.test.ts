// @vitest-environment node
import { describe, expect, it } from "vitest";

import { requireSameOrigin } from "@/app/lib/route-helpers";

describe("requireSameOrigin", () => {
  it("accepts a request whose origin matches the approved browser origin", () => {
    const request = new Request("http://localhost:3000/api/submissions", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    const result = requireSameOrigin(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.publicOrigin.origin).toBe("http://localhost:3000");
    }
  });

  it("accepts the canonical browser origin behind an internal forwarding hop", () => {
    const request = new Request(
      "http://accounting-internal:8080/api/submissions",
      {
        method: "POST",
        headers: {
          origin: "https://accounting.reading-advantage.com",
          "x-forwarded-host": "accounting.reading-advantage.com",
          "x-forwarded-proto": "https",
        },
      },
    );

    expect(requireSameOrigin(request).ok).toBe(true);
  });

  it("returns a 403 response when the origin header does not match", async () => {
    const request = new Request("http://localhost:3000/api/submissions", {
      method: "POST",
      headers: { origin: "https://phishing.example" },
    });

    const result = requireSameOrigin(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({
        message: "Invalid request origin",
      });
    }
  });

  it("returns a 403 response when the origin header is missing", async () => {
    const request = new Request("http://localhost:3000/api/submissions", {
      method: "POST",
    });

    const result = requireSameOrigin(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({
        message: "Invalid request origin",
      });
    }
  });

  it("returns a 403 response when the request host is not an approved origin", () => {
    const request = new Request("https://attacker.example.com/api/submissions", {
      method: "POST",
      headers: { origin: "https://attacker.example.com" },
    });

    expect(requireSameOrigin(request).ok).toBe(false);
  });
});
