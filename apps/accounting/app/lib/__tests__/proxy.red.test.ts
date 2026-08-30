// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "../../../proxy";

function createRequest(
  pathname: string,
  headers?: HeadersInit,
): NextRequest {
  return new NextRequest(
    `https://accounting.reading-advantage.com${pathname}`,
    { headers },
  );
}

describe("Accounting browser proxy (origin approval)", () => {
  it("preserves the protected path and query on the canonical login redirect", async () => {
    const response = await proxy(createRequest("/expenses?tab=open"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounting.reading-advantage.com/login?returnTo=%2Fexpenses%3Ftab%3Dopen",
    );
  });

  it("never redirects an unauthenticated protected request to an unapproved forwarded host", async () => {
    const response = await proxy(
      createRequest("/expenses", {
        "x-forwarded-host": "attacker.example.com",
        "x-forwarded-proto": "https",
      }),
    );

    const location = new URL(response.headers.get("location") ?? "");
    expect(location.host).not.toBe("attacker.example.com");
    expect(location.protocol).toBe("https:");
  });
});
