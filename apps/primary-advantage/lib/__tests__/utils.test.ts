import { describe, it, expect, vi } from "vitest";
import {
  cleanGenre,
  sanitizeTranslationKey,
  generateSecureCode,
  generateRandomClassCode,
  calculateLevelAndCefrLevel,
  convertCefrLevel,
  convertLocaleFull,
  generateLicenseKey,
} from "../utils";

describe("cleanGenre", () => {
  it("removes parenthetical suffixes", () => {
    expect(cleanGenre("Fiction (Modern)")).toBe("Fiction");
  });

  it("removes nested parenthetical suffixes", () => {
    expect(cleanGenre("Science Fiction (Hard Sci-Fi)")).toBe("Science Fiction");
  });

  it("returns unchanged string when no parentheses", () => {
    expect(cleanGenre("Fantasy")).toBe("Fantasy");
  });

  it("handles empty string", () => {
    expect(cleanGenre("")).toBe("");
  });

  it("removes only trailing parenthetical content", () => {
    expect(cleanGenre("A (B) C")).toBe("A (B) C");
  });

  it("handles multiple parenthetical groups at end", () => {
    expect(cleanGenre("Text (tag1) (tag2)")).toBe("Text");
  });
});

describe("sanitizeTranslationKey", () => {
  it("converts genre to lowercase underscored key", () => {
    expect(sanitizeTranslationKey("Science Fiction (Modern)")).toBe(
      "science_fiction"
    );
  });

  it("replaces spaces with underscores", () => {
    expect(sanitizeTranslationKey("Historical Fiction")).toBe(
      "historical_fiction"
    );
  });

  it("removes special characters", () => {
    expect(sanitizeTranslationKey("Children's Books")).toBe("childrens_books");
  });

  it("collapses multiple underscores", () => {
    expect(sanitizeTranslationKey("Test   Multiple   Spaces")).toBe(
      "test_multiple_spaces"
    );
  });

  it("trims leading and trailing underscores", () => {
    expect(sanitizeTranslationKey("_Test_")).toBe("test");
  });

  it("handles empty string", () => {
    expect(sanitizeTranslationKey("")).toBe("");
  });
});

describe("generateSecureCode", () => {
  it("generates a code with the specified length", () => {
    const code = generateSecureCode(12);
    expect(code).toHaveLength(12);
  });

  it("generates a code with default length of 8", () => {
    const code = generateSecureCode();
    expect(code).toHaveLength(8);
  });

  it("generates only alphanumeric characters", () => {
    const code = generateSecureCode(100);
    expect(code).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it("generates unique codes on subsequent calls", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateSecureCode(16)));
    expect(codes.size).toBe(10);
  });
});

describe("generateRandomClassCode", () => {
  it("generates a 6-character code", () => {
    const code = generateRandomClassCode();
    expect(code).toHaveLength(6);
  });

  it("generates lowercase alphanumeric codes", () => {
    const code = generateRandomClassCode();
    expect(code).toMatch(/^[a-z0-9]+$/);
  });
});

describe("calculateLevelAndCefrLevel", () => {
  it("calculates level for XP in range", () => {
    const result = calculateLevelAndCefrLevel(100, 5000);
    expect(result.newXp).toBe(5100);
    expect(result.cefrLevel).toBe("A0-");
  });

  it("returns default values when XP is out of range", () => {
    const result = calculateLevelAndCefrLevel(0, 0);
    expect(result.newXp).toBe(0);
    expect(result.cefrLevel).toBe("A0-");
    expect(result.raLevel).toBe(1);
  });

  it("identifies B1 level correctly", () => {
    const result = calculateLevelAndCefrLevel(95000, 0);
    expect(result.cefrLevel).toBe("B1");
    expect(result.raLevel).toBe(11);
  });

  it("calculates new XP correctly", () => {
    const result = calculateLevelAndCefrLevel(500, 10000);
    expect(result.newXp).toBe(10500);
  });
});

describe("convertCefrLevel", () => {
  it("converts A1 to RA level 5", () => {
    expect(convertCefrLevel("A1")).toBe(5);
  });

  it("converts B2 to RA level 14", () => {
    expect(convertCefrLevel("B2")).toBe(14);
  });

  it("returns 1 for unknown CEFR level", () => {
    expect(convertCefrLevel("C2+")).toBe(1);
  });

  it("returns 1 for empty string", () => {
    expect(convertCefrLevel("")).toBe(1);
  });

  it("converts A0- to RA level 1", () => {
    expect(convertCefrLevel("A0-")).toBe(1);
  });

  it("converts B2+ to RA level 15", () => {
    expect(convertCefrLevel("B2+")).toBe(15);
  });
});

describe("convertLocaleFull", () => {
  it("converts en to English", () => {
    expect(convertLocaleFull("en")).toBe("English");
  });

  it("converts th to Thai", () => {
    expect(convertLocaleFull("th")).toBe("Thai");
  });

  it("returns original locale for unknown value", () => {
    expect(convertLocaleFull("fr")).toBe("fr");
  });

  it("converts all known locales", () => {
    expect(convertLocaleFull("en")).toBe("English");
    expect(convertLocaleFull("th")).toBe("Thai");
    expect(convertLocaleFull("cn")).toBe("Chinese");
    expect(convertLocaleFull("tw")).toBe("Taiwan");
    expect(convertLocaleFull("vi")).toBe("Vietnamese");
  });
});

describe("generateLicenseKey", () => {
  it("generates a key with three segments separated by hyphens", () => {
    const key = generateLicenseKey();
    const segments = key.split("-");
    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveLength(6);
    expect(segments[1]).toHaveLength(6);
    expect(segments[2]).toHaveLength(6);
  });

  it("generates a key matching the expected format", () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^[a-zA-Z0-9]{6}-[a-zA-Z0-9]{6}-[a-zA-Z0-9]{6}$/);
  });

  it("generates unique keys on subsequent calls", () => {
    const keys = new Set(Array.from({ length: 10 }, () => generateLicenseKey()));
    expect(keys.size).toBe(10);
  });
});
