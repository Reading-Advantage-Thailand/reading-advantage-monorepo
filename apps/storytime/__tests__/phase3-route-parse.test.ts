// @vitest-environment node
import { routing } from "../i18n/routing";
import { parseCanonicalNumber, parseStorytimeRoute } from "../lib/route-parse";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Phase 3 route segment parsing (finding F127)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Reads the one blocked-route log line of a parse call.
   * @param locales The accepted locales.
   * @param locale The locale segment.
   * @param level The level segment.
   * @param week The week segment.
   * @returns The logged text, or `null` when nothing was logged.
   */
  function blockedLog(
    locales: readonly string[],
    locale: string,
    level: string,
    week: string,
  ): string | null {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const route = parseStorytimeRoute(locales, locale, level, week);
    expect(route).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    return (warn.mock.calls[0][0] as string) ?? null;
  }

  it("accepts only canonical positive numbers inside the bound", () => {
    expect(parseCanonicalNumber("5", 32)).toBe(5);
    expect(parseCanonicalNumber("01", 32)).toBeNull();
    expect(parseCanonicalNumber("0", 32)).toBeNull();
    expect(parseCanonicalNumber("1e1", 32)).toBeNull();
    expect(parseCanonicalNumber(" 1", 32)).toBeNull();
    expect(parseCanonicalNumber("5", 4)).toBeNull();
    expect(parseCanonicalNumber("33", 32)).toBeNull();
    expect(parseCanonicalNumber("4", 4)).toBe(4);
  });

  it("parses a canonical at-home route inside the contract bounds", () => {
    expect(parseStorytimeRoute(routing.locales, "th", "2", "3")).toEqual({ level: 2, week: 3 });
    expect(parseStorytimeRoute(routing.locales, "en", "4", "32")).toEqual({ level: 4, week: 32 });
  });

  it("answers null for a level or a week outside the contract bounds", () => {
    expect(parseStorytimeRoute(routing.locales, "th", "5", "1")).toBeNull();
    expect(parseStorytimeRoute(routing.locales, "th", "1", "33")).toBeNull();
  });

  it("answers null for a locale outside the routing config", () => {
    expect(parseStorytimeRoute(routing.locales, "fr", "1", "1")).toBeNull();
  });

  it("logs one line with the escaped segments for a blocked route", () => {
    const text = blockedLog(routing.locales, "th%0a", "1\r2", "3\n4");
    expect(text).not.toBeNull();
    expect(text!.split("\n")).toHaveLength(1);
    expect(text!).not.toMatch(/[\r\n]/);
    expect(text!).toContain(String.raw`\n`);
    expect(text!).toContain(String.raw`\r`);
    expect(text!).toContain("%0a");
  });

  it("cuts a long blocked segment to a bounded log line", () => {
    const long = "x".repeat(500);
    const text = blockedLog(routing.locales, long, "1", "1");
    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThan(300);
  });
});
