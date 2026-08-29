// @vitest-environment node
import { describe, expect, it } from "vitest";

import { resolveRequestLocale } from "../locale-resolution";

describe("resolveRequestLocale", () => {
  it("uses a valid English locale cookie", () => {
    const request = new Request("https://sales.reading-advantage.com/", {
      headers: { cookie: "NEXT_LOCALE=en" },
    });

    expect(resolveRequestLocale(request)).toEqual({
      locale: "en",
      fromCookie: true,
    });
  });

  it("uses a valid Thai locale cookie", () => {
    const request = new Request("https://sales.reading-advantage.com/", {
      headers: { cookie: "NEXT_LOCALE=th" },
    });

    expect(resolveRequestLocale(request)).toEqual({
      locale: "th",
      fromCookie: true,
    });
  });

  it("defaults a missing cookie", () => {
    const request = new Request("https://sales.reading-advantage.com/");

    expect(resolveRequestLocale(request)).toEqual({
      locale: "th",
      fromCookie: false,
    });
  });

  it("defaults an unknown cookie", () => {
    const request = new Request("https://sales.reading-advantage.com/", {
      headers: { cookie: "NEXT_LOCALE=ja" },
    });

    expect(resolveRequestLocale(request)).toEqual({
      locale: "th",
      fromCookie: false,
    });
  });
});
