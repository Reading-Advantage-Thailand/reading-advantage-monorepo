/**
 * A-63 Phase 2, task 2.1: the three used Tutor Advantage screens enter the repo.
 * Spec 6.2: each screen becomes a webp at its delivered size, in the set's two
 * folder names, and the manifest holds the real pixel size and portrait false.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tutorScreens } from "../product-pictures";

const publicPath = (url: string) => join(process.cwd(), "public", url);

const EXPECTED = {
  studentHome: {
    src: "/images/products/tutor-advantage/student-mobile/070-screen.webp",
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
  classList: {
    src: "/images/products/tutor-advantage/tutor-desktop/062-screen.webp",
    width: 1440,
    height: 900,
    portrait: false,
  },
} as const;

describe("tutor screens manifest", () => {
  it("holds the three slots in gallery order", () => {
    expect(Object.keys(tutorScreens)).toEqual(["studentHome", "shortAnswer", "classList"]);
  });

  for (const [slot, expected] of Object.entries(EXPECTED)) {
    it(`${slot} holds the delivered path and size`, () => {
      expect(tutorScreens[slot as keyof typeof EXPECTED]).toEqual(expected);
      expect(expected.src.startsWith("/images/products/tutor-advantage/")).toBe(true);
    });

    it(`${slot} exists in public and is 1 MB or less`, () => {
      const file = publicPath(expected.src);
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(1_000_000);
    });
  }
});
