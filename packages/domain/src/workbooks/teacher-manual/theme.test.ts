import { describe, expect, it } from "vitest";

import { escapeHtml, getThemeColors } from "./theme.js";

describe("getThemeColors", () => {
  it("matches the origins series palette", () => {
    const theme = getThemeColors("Reading Advantage Origins");
    expect(theme.primary).toBe("#228b22");
    expect(theme.secondary).toBe("#8b4513");
    expect(theme.gradient).toBe("linear-gradient(135deg, #228b22, #8b4513)");
  });

  it("matches the quest series palette", () => {
    const theme = getThemeColors("Reading Advantage Quest");
    expect(theme.primary).toBe("#0284c7");
    expect(theme.secondary).toBe("#eab308");
  });

  it("matches the adventure series palette", () => {
    const theme = getThemeColors("Adventure");
    expect(theme.primary).toBe("#4c1d95");
    expect(theme.secondary).toBe("#475569");
  });

  it("matches the hero series palette", () => {
    const theme = getThemeColors("Hero");
    expect(theme.primary).toBe("#be123c");
    expect(theme.secondary).toBe("#b45309");
  });

  it("matches the legend series palette", () => {
    const theme = getThemeColors("Legend");
    expect(theme.primary).toBe("#1e3a8a");
    expect(theme.secondary).toBe("#ca8a04");
  });

  it("matches series keywords case-insensitively", () => {
    expect(getThemeColors("READING ADVANTAGE QUEST").primary).toBe("#0284c7");
    expect(getThemeColors("Origins Level 1").primary).toBe("#228b22");
  });

  it("uses the primary fallback for unknown series when type is primary", () => {
    const theme = getThemeColors("Unknown Series", "primary");
    expect(theme.primary).toBe("#0284c7");
    expect(theme.secondary).toBe("#334155");
  });

  it("uses the secondary fallback for unknown series otherwise", () => {
    const theme = getThemeColors("Unknown Series", "secondary");
    expect(theme.primary).toBe("#1e40af");
    expect(getThemeColors("Unknown Series").primary).toBe("#1e40af");
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML entities", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#039;");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("plain text")).toBe("plain text");
  });

  it("does not double-escape already escaped entities", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });
});
