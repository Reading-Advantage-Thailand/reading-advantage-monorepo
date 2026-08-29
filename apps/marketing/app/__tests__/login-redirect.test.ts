// @vitest-environment node
import { describe, expect, it } from "vitest";

import { redirectToLogin } from "@/lib/login-redirect";

describe("redirectToLogin", () => {
  it("appends the original path and query as returnTo", () => {
    const href = redirectToLogin("/campaigns/123?tab=video");
    const url = new URL(href, "https://marketing.reading-advantage.com");

    expect(href).toBe("/login?returnTo=%2Fcampaigns%2F123%3Ftab%3Dvideo");
    expect(url.searchParams.getAll("returnTo")).toEqual([
      "/campaigns/123?tab=video",
    ]);
  });

  it("preserves a campaign detail path", () => {
    expect(redirectToLogin("/campaigns/abc")).toBe(
      "/login?returnTo=%2Fcampaigns%2Fabc",
    );
  });

  it("preserves a settings path", () => {
    expect(redirectToLogin("/settings")).toBe(
      "/login?returnTo=%2Fsettings",
    );
  });

  it("falls back to root for a host-bearing value", () => {
    expect(redirectToLogin("https://attacker.example/campaigns")).toBe(
      "/login?returnTo=%2F",
    );
  });
});
