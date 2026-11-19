/**
 * Follow-up adversarial pins for the tutor locale draft and the narrowed
 * Storytime guard (track www_tutor_followups_20261118).
 *
 * This file does not repeat the deep-equal of
 * www-tutor-calculator.locale.test.ts. It pins the property the deep-equal
 * cannot name: the zh needsOwnStudents line is a Chinese draft that differs
 * from en, while every other new zh value of this track equals en.
 */
import { describe, expect, it } from "vitest";
import { en, zh } from "@/locales/pages/products/tutor-advantage";
import { productPictures } from "@/lib/product-pictures";

describe("followups: the zh draft stands apart while every other new zh value equals en", () => {
  it("zh needsOwnStudents is a non-empty Chinese draft that differs from en", () => {
    const enLine = en.calculator.explain.needsOwnStudents;
    const zhLine = (
      zh.calculator as unknown as { explain: Record<string, string> }
    ).explain.needsOwnStudents;
    expect(typeof zhLine).toBe("string");
    expect(zhLine.length).toBeGreaterThan(10);
    expect(zhLine).not.toBe(enLine);
    expect(zhLine).toMatch(/[\u4e00-\u9fff]/);
  });

  it("every other new zh value of this track equals en", () => {
    expect(zh.calculator.graph.caption).toBe(en.calculator.graph.caption);
    expect(zh.calculator.graph.legCommissionBar).toBe(
      en.calculator.graph.legCommissionBar,
    );
    expect(zh.heroExtra.imageAlt).toBe(en.heroExtra.imageAlt);
    expect(zh.tutorRole.alt).toBe(en.tutorRole.alt);
  });
});

describe("followups: the narrowed Storytime guard still rejects a directory path", () => {
  const directorySegment = /2026-11-06\//;
  const storytimeStamp = /storytime.*2026-11-06|cover-options-2026-11-06/;

  /** True when the narrowed guard rejects the file reference. */
  function rejected(src: string): boolean {
    return directorySegment.test(src) || storytimeStamp.test(src);
  }

  it("rejects a 2026-11-06 directory path and the retired Storytime set", () => {
    expect(
      rejected("/images/storytime-cover-options-2026-11-06/cover.webp"),
    ).toBe(true);
    expect(rejected("/images/2026-11-06/hero.webp")).toBe(true);
  });

  it("allows the tutor hero file suffix of this track", () => {
    expect(rejected("/images/tutor-advantage-hero-2026-11-06.webp")).toBe(
      false,
    );
  });

  it("no current manifest entry trips the narrowed guard", () => {
    for (const picture of Object.values(productPictures)) {
      expect(rejected(picture.src), picture.src).toBe(false);
    }
  });
});
