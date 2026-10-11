import { describe, expect, it } from "vitest";
import {
  generateStudentUsername,
  isStudentUsername,
  STUDENT_USERNAME_ADJECTIVES,
  STUDENT_USERNAME_NOUNS,
  STUDENT_USERNAME_NUMBERS,
} from "../student-usernames.js";

// Parts of words that must never show up in a child's username, also across the word boundary.
const BLOCKED = ["ass", "sex", "fuck", "shit", "cum", "tit", "nig", "fag", "cock", "dick", "porn", "anal", "rape", "piss",
  "poo", "pee", "butt", "boob", "slut", "kill", "dead", "hell", "damn", "nazi", "fat", "ugly", "dumb", "stupid", "fart",
  "cunt", "twat", "wank", "hoe", "gay", "sexy", "nude", "drug", "gun", "die"];

describe("student usernames", () => {
  it("has 100 different lower-case words in each list", () => {
    for (const list of [STUDENT_USERNAME_ADJECTIVES, STUDENT_USERNAME_NOUNS]) {
      expect(list).toHaveLength(100);
      expect(new Set(list).size).toBe(100);
      for (const word of list) expect(word).toMatch(/^[a-z]{3,8}$/);
    }
  });

  it("ends with two digits other than 69 and 88", () => {
    expect(STUDENT_USERNAME_NUMBERS).toHaveLength(88);
    expect(STUDENT_USERNAME_NUMBERS).not.toContain(69);
    expect(STUDENT_USERNAME_NUMBERS).not.toContain(88);
    expect(Math.min(...STUDENT_USERNAME_NUMBERS)).toBe(10);
    expect(Math.max(...STUDENT_USERNAME_NUMBERS)).toBe(99);
  });

  it("makes no blocked word from any pair of words", () => {
    const hits = STUDENT_USERNAME_ADJECTIVES.flatMap((a) =>
      STUDENT_USERNAME_NOUNS.flatMap((n) => BLOCKED.filter((b) => `${a}${n}`.includes(b)).map((b) => `${a}${n}: ${b}`)),
    );
    expect(hits).toEqual([]);
  });

  it("makes two words and two digits", () => {
    expect(generateStudentUsername(() => 1)).toBe("bluepanda11");
    for (let i = 0; i < 200; i++) {
      const name = generateStudentUsername();
      expect(name).toMatch(/^[a-z]+[1-9][0-9]$/);
      expect(isStudentUsername(name)).toBe(true);
    }
  });

  it("refuses an email, a class-based name, and a wrong number", () => {
    expect(isStudentUsername("name.123@gmail.com")).toBe(false);
    expect(isStudentUsername("p3a12")).toBe(false);
    expect(isStudentUsername("student1")).toBe(false);
    expect(isStudentUsername("bluetiger69")).toBe(false);
    expect(isStudentUsername("bluetiger7")).toBe(false);
    expect(isStudentUsername("BlueTiger47")).toBe(false);
    expect(isStudentUsername("bluetiger47")).toBe(true);
  });
});
