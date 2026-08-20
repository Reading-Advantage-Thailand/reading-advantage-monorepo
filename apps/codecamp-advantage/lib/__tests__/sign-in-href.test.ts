import { describe, expect, it } from "vitest";

import { buildSignInHref } from "../sign-in-href";

describe("buildSignInHref", () => {
  it("encodes the locale path and query in one returnTo", () => {
    const href = buildSignInHref("/en/lesson/42", "?tab=notes");
    const url = new URL(href, "https://codecamp.reading-advantage.com");

    expect(href).toBe("/api/auth/company/start?returnTo=%2Fen%2Flesson%2F42%3Ftab%3Dnotes");
    expect(url.searchParams.getAll("returnTo")).toEqual(["/en/lesson/42?tab=notes"]);
    expect(url.searchParams.get("redirectTo")).toBeNull();
  });

  it("preserves a Thai lesson path", () => {
    expect(buildSignInHref("/th/lesson/42", "")).toBe(
      "/api/auth/company/start?returnTo=%2Fth%2Flesson%2F42",
    );
  });

  it("falls back to root for a host-bearing path", () => {
    expect(buildSignInHref("https://attacker.example/lesson/42", "")).toBe(
      "/api/auth/company/start?returnTo=%2F",
    );
  });
});
