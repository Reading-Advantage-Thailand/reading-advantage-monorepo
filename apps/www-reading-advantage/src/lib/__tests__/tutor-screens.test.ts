/**
 * A-63 Phase 3, task 3.4: the five PR section 2 student screens enter the repo.
 * PR handoff v0.4 section 2 and spec 6.2 are the authority. Every slot is a
 * student-mobile webp at 520 by 1125. No tutor screen ships.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tutorScreens } from "../product-pictures";

const publicPath = (url: string) => join(process.cwd(), "public", url);

const EXPECTED = {
  guidedWriting: {
    src: "/images/products/tutor-advantage/student-mobile/040-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  shortAnswer: {
    src: "/images/products/tutor-advantage/student-mobile/002-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  feedback: {
    src: "/images/products/tutor-advantage/student-mobile/004-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  selfReflection: {
    src: "/images/products/tutor-advantage/student-mobile/052-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  classRecord: {
    src: "/images/products/tutor-advantage/student-mobile/064-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
} as const;

describe("tutor screens manifest", () => {
  it("holds the five PR section 2 slots in gallery order", () => {
    expect(Object.keys(tutorScreens)).toEqual([
      "guidedWriting",
      "shortAnswer",
      "feedback",
      "selfReflection",
      "classRecord",
    ]);
  });

  for (const [slot, expected] of Object.entries(EXPECTED)) {
    it(`${slot} holds the delivered path and size`, () => {
      expect(tutorScreens[slot as keyof typeof EXPECTED]).toEqual(expected);
      expect(expected.src.startsWith("/images/products/tutor-advantage/student-mobile/")).toBe(
        true,
      );
    });

    it(`${slot} exists in public and is 1 MB or less`, () => {
      const file = publicPath(expected.src);
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(1_000_000);
    });
  }

  it("carries no tutor-desktop screen", () => {
    for (const picture of Object.values(tutorScreens)) {
      expect(picture.src).not.toContain("tutor-desktop");
    }
  });
});
