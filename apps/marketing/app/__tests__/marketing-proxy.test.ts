import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { MARKETING_SESSION_COOKIE } from "../lib/company-oidc";
import { config, proxy } from "../../proxy";

describe("Marketing protected page gate", () => {
  it("redirects visitors without a Marketing session cookie", () => {
    const response = proxy(
      new NextRequest("https://marketing.example/settings?tab=llm"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://marketing.example/login?returnTo=%2Fsettings%3Ftab%3Dllm",
    );
  });

  it("continues visitors with a Marketing session cookie", () => {
    const response = proxy(
      new NextRequest("https://marketing.example/campaigns", {
        headers: { cookie: `${MARKETING_SESSION_COOKIE}=token` },
      }),
    );

    expect(response.status).toBe(200);
  });

  it("matches the protected Marketing page paths", () => {
    expect(config.matcher).toEqual(["/settings/:path*", "/campaigns/:path*"]);
  });
});
