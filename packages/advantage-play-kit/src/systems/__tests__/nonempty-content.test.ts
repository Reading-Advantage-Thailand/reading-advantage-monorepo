import { describe, expect, it } from "vitest";

import {
  assertNonEmptyContent,
  isBlank,
  validateNonEmptyContent,
  type NonEmptyContent,
} from "../nonempty-content.js";

describe("nonempty content precondition guard", () => {
  it("accepts a vocabulary array with at least one term and translation", () => {
    const content: NonEmptyContent = validateNonEmptyContent([
      { term: "cat", translation: "แมว" },
      { term: "dog", translation: "หมา" },
    ]);

    expect(content.items).toHaveLength(2);
    expect(content.kind).toBe("vocabulary");
  });

  it("accepts a sentence array with at least one term and translation", () => {
    const content = validateNonEmptyContent(
      [
        { term: "the", translation: "บท" },
        { term: "cat", translation: "แมว" },
      ],
      "sentence",
    );

    expect(content.kind).toBe("sentence");
  });

  it("rejects an empty array before any game-specific setup runs", () => {
    expect(() => validateNonEmptyContent([])).toThrow(/empty/i);
  });

  it("rejects an array whose every entry is blank", () => {
    expect(() =>
      validateNonEmptyContent([
        { term: "   ", translation: "" },
        { term: "", translation: "\t" },
      ]),
    ).toThrow(/blank/i);
  });

  it("rejects entries with a blank term even when the translation is present", () => {
    expect(() =>
      validateNonEmptyContent([
        { term: "cat", translation: "แมว" },
        { term: "", translation: "หมา" },
      ]),
    ).toThrow(/blank term/i);
  });

  it("rejects entries with a blank translation even when the term is present", () => {
    expect(() =>
      validateNonEmptyContent([
        { term: "cat", translation: "" },
      ]),
    ).toThrow(/blank translation/i);
  });

  it("rejects non-array input", () => {
    expect(() => validateNonEmptyContent(null)).toThrow(/array/i);
    expect(() => validateNonEmptyContent("cat")).toThrow(/array/i);
  });

  it("asserts nonempty content without returning a copy when only the guard is needed", () => {
    expect(() => assertNonEmptyContent([])).toThrow(/empty/i);
    expect(() =>
      assertNonEmptyContent([{ term: "cat", translation: "แมว" }]),
    ).not.toThrow();
  });

  it("isBlank detects whitespace-only and empty strings", () => {
    expect(isBlank("")).toBe(true);
    expect(isBlank("   ")).toBe(true);
    expect(isBlank("\t\n")).toBe(true);
    expect(isBlank("cat")).toBe(false);
    expect(isBlank(" แมว ")).toBe(false);
  });
});
