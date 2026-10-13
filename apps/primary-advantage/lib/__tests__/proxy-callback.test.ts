import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const currentUser = vi.fn();
vi.mock("../session", () => ({ currentUser: () => currentUser() }));
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null) }));

import middleware from "../../proxy";

/** Runs the proxy for a sign-in page request and returns the redirect target. */
async function signinRedirect(callbackUrl: string, locale = "th") {
  const url = `http://localhost:3000/${locale}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const response = await middleware(new NextRequest(url));
  return new URL(response.headers.get("location") ?? "http://missing/");
}

describe("proxy sign-in callback (M-8)", () => {
  beforeEach(() => currentUser.mockResolvedValue({ id: "t1", role: "TEACHER" }));

  it("follows a local callback that the role may open", async () => {
    const target = await signinRedirect("/th/teacher/my-classes");
    expect(target.host).toBe("localhost:3000");
    expect(target.pathname).toBe("/th/teacher/my-classes");
  });

  it.each([
    ["//thteacher.evil.com", "th"],
    ["//enstudent.x", "en"],
    ["https://evil.com", "th"],
    ["/th//evil.com", "th"],
    ["/\\evil.com", "th"],
  ])("never redirects to another host for %s", async (callbackUrl, locale) => {
    const target = await signinRedirect(callbackUrl, locale);
    expect(target.host).toBe("localhost:3000");
    expect(target.pathname).not.toContain("evil");
    expect(target.pathname).toMatch(new RegExp(`^/${locale}/teacher`));
  });
});
