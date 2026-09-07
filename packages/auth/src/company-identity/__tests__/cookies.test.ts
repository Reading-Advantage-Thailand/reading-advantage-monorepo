import { describe, expect, it } from "vitest";

import { readRequestCookie } from "../cookies.js";

/**
 * Creates a request with standard and NextRequest-compatible cookie access.
 * @param cookieHeader The optional standard Cookie header.
 * @param nextValue The optional NextRequest cookie value.
 * @returns A request with both supported cookie access forms.
 */
function requestWithCookies(
  cookieHeader: string | undefined,
  nextValue?: string,
): Request {
  const request = new Request("https://product.example.test", {
    headers: cookieHeader === undefined ? undefined : { cookie: cookieHeader },
  });
  Object.defineProperty(request, "cookies", {
    value: { get: () => nextValue === undefined ? undefined : { value: nextValue } },
  });
  return request;
}

describe("readRequestCookie", () => {
  it("prefers a nonempty NextRequest cookie value", () => {
    const request = requestWithCookies("session=header", "next");

    expect(readRequestCookie(request, "session")).toBe("next");
  });

  it("falls back to the Cookie header for an empty NextRequest value", () => {
    const request = requestWithCookies("session=header", "");

    expect(readRequestCookie(request, "session")).toBe("header");
  });

  it("matches the exact cookie name and returns the first match", () => {
    const request = new Request("https://product.example.test", {
      headers: { cookie: "other=value; session=first; session=second" },
    });

    expect(readRequestCookie(request, "session")).toBe("first");
  });

  it("preserves embedded equals signs and encoded values", () => {
    const request = new Request("https://product.example.test", {
      headers: { cookie: "session=a%2Fb=c==" },
    });

    expect(readRequestCookie(request, "session")).toBe("a%2Fb=c==");
  });

  it("returns an empty string for an empty header cookie", () => {
    const request = new Request("https://product.example.test", {
      headers: { cookie: "session=" },
    });

    expect(readRequestCookie(request, "session")).toBe("");
  });

  it("returns undefined when the exact cookie is missing", () => {
    const request = new Request("https://product.example.test", {
      headers: { cookie: "session_extra=value" },
    });

    expect(readRequestCookie(request, "session")).toBeUndefined();
  });
});
