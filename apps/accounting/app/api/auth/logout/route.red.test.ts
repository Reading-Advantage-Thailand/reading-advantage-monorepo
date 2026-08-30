// @vitest-environment node
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout (Accounting parity)", () => {
  it("rejects a logout whose origin is not an approved Accounting origin", async () => {
    const response = await POST(
      new Request("https://attacker.example.com/api/auth/logout", {
        method: "POST",
        headers: {
          origin: "https://attacker.example.com",
          "x-forwarded-host": "attacker.example.com",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("accepts the canonical browser origin behind an internal forwarding hop", async () => {
    const response = await POST(
      new Request("http://accounting-internal:8080/api/auth/logout", {
        method: "POST",
        headers: {
          origin: "https://accounting.reading-advantage.com",
          "x-forwarded-host": "accounting.reading-advantage.com",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.status).toBe(200);
  });
});
