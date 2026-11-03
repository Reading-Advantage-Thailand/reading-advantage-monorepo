import { describe, expect, it } from "vitest";

import { buildSignInHref } from "../sign-in-href";

/**
 * Extracts the returnTo value from a sign-in href.
 * @param href Sign-in href.
 * @returns The decoded returnTo value.
 */
function returnTo(href: string): string | null {
  return new URL(href, "https://sales.example.test").searchParams.get(
    "returnTo",
  );
}

describe("buildSignInHref rejection rules", () => {
  it.each([
    ["relative path", "en/lesson", ""],
    ["protocol-relative path", "//evil.example/x", ""],
    ["backslash path", "/\\evil.example", ""],
    ["query inside path", "/en?x=1", ""],
    ["fragment inside path", "/en#top", ""],
    ["control character in path", "/en\nSet-Cookie", ""],
    ["DEL in path", "/en\u007f", ""],
    ["search without leading ?", "/en", "x=1"],
    ["double ? search", "/en", "??x=1"],
    ["fragment in search", "/en", "?x=1#y"],
    ["control character in search", "/en", "?x=\t"],
    ["malformed percent encoding", "/en", "?x=%E0%A4%A"],
    ["backslash in search", "/en", "?x=\\y"],
  ])("falls back to root for a %s", (_label, pathname, search) => {
    expect(returnTo(buildSignInHref(pathname, search))).toBe("/");
  });

  it("accepts a returnTo of exactly 2048 characters", () => {
    const pathname = `/${"a".repeat(2_047)}`;
    expect(returnTo(buildSignInHref(pathname, ""))).toBe(pathname);
  });

  it("falls back to root above 2048 characters", () => {
    const pathname = `/${"a".repeat(2_047)}`;
    expect(returnTo(buildSignInHref(pathname, "?"))).toBe("/");
  });

  it("keeps a valid percent-encoded query", () => {
    expect(returnTo(buildSignInHref("/th/lesson/1", "?q=%E0%B8%81"))).toBe(
      "/th/lesson/1?q=%E0%B8%81",
    );
  });

  it("always targets the company start route", () => {
    expect(buildSignInHref("/", "")).toBe(
      "/api/auth/company/start?returnTo=%2F",
    );
  });
});
