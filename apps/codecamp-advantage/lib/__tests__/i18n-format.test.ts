import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatNumber, formatDate } from "../i18n-format";

describe("formatRelativeTime", () => {
  it("returns 'just now' for very recent dates", () => {
    const result = formatRelativeTime(new Date(), "en");
    expect(result).toBe("just now");
  });

  it("returns Thai 'just now' for very recent dates", () => {
    const result = formatRelativeTime(new Date(), "th");
    expect(result).toBe("เมื่อสักครู่");
  });

  it("returns minutes ago for a recent date in English", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinutesAgo, "en");
    expect(result).toMatch(/minutes? ago/);
  });

  it("returns Thai relative time for th locale", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinutesAgo, "th");
    expect(result).toMatch(/นาที/);
  });

  it("returns hours ago for dates a few hours back", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const result = formatRelativeTime(threeHoursAgo, "en");
    expect(result).toMatch(/hours? ago/);
  });

  it("returns days ago for dates a few days back", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoDaysAgo, "en");
    expect(result).toMatch(/days? ago/);
  });

  it("returns months ago for old dates", () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(sixtyDaysAgo, "en");
    expect(result).toMatch(/months? ago/);
  });

  it("returns fallback for null date", () => {
    expect(formatRelativeTime(null, "en")).toBe("unknown");
    expect(formatRelativeTime(null, "th")).toBe("ไม่ทราบ");
  });

  it("returns fallback for undefined date", () => {
    expect(formatRelativeTime(undefined, "en")).toBe("unknown");
  });

  it("returns fallback for invalid date", () => {
    expect(formatRelativeTime(new Date("invalid"), "en")).toBe("unknown");
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

  it("formats decimals", () => {
    expect(formatNumber(85.5, "en")).toBe("85.5");
  });

  it("returns fallback for null", () => {
    expect(formatNumber(null, "en")).toBe("unknown");
    expect(formatNumber(null, "th")).toBe("ไม่ทราบ");
  });

  it("returns fallback for undefined", () => {
    expect(formatNumber(undefined, "en")).toBe("unknown");
  });

  it("returns fallback for NaN", () => {
    expect(formatNumber(NaN, "en")).toBe("unknown");
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

  it("returns fallback for null date", () => {
    expect(formatDate(null, "en")).toBe("unknown");
    expect(formatDate(null, "th")).toBe("ไม่ทราบ");
  });

  it("returns fallback for invalid date", () => {
    expect(formatDate(new Date("invalid"), "en")).toBe("unknown");
  });
});
