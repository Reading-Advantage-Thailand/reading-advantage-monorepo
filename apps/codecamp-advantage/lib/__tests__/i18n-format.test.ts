import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatNumber, formatDate } from "../i18n-format";

describe("formatRelativeTime", () => {
  it("returns 'just now' for very recent dates", () => {
    const result = formatRelativeTime(new Date(), "en");
    expect(result).toBe("just now");
  });

  it("returns Thai relative time for th locale", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinutesAgo, "th");
    expect(result).toMatch(/นาที/);
  });

  it("returns minutes ago for a recent date in English", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinutesAgo, "en");
    expect(result).toMatch(/minutes? ago/);
  });
});

describe("formatNumber", () => {
  it("formats number with en locale", () => {
    expect(formatNumber(1234, "en")).toBe("1,234");
  });

  it("formats number with th locale", () => {
    const result = formatNumber(1234, "th");
    expect(result).toBe("1,234");
  });

  it("formats percentage", () => {
    expect(formatNumber(85, "en")).toBe("85");
  });
});

describe("formatDate", () => {
  it("formats date with en locale", () => {
    const date = new Date("2026-05-15");
    const result = formatDate(date, "en");
    expect(result).toContain("2026");
  });

  it("formats date with th locale using Buddhist year", () => {
    const date = new Date("2026-05-15");
    const result = formatDate(date, "th");
    expect(result).toMatch(/พ\.ศ\.|2569/);
  });
});
