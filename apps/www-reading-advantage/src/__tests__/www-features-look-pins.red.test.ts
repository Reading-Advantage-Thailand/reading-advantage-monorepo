import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Red r3 pins for the Phase 4 browser look defects (track www_features_pricing_20261120).
 * F1 [High]: at 980 px the Storytime card image frame crops through the face.
 * F2 [Medium]: at 980 px the text-only CodeCamp card stretches with empty space.
 * Both cases read the component sources as text and must fail at 38c03ba22.
 */

const PROGRAM_CARD = resolve(
  __dirname,
  "../components/features/program-card.tsx",
);
const FEATURES_PAGE = resolve(
  __dirname,
  "../app/[locale]/(marketing)/features/page.tsx",
);

/** Returns the className of the card screenshot Image in program-card.tsx. */
function cardImageClass(): string {
  const source = readFileSync(PROGRAM_CARD, "utf8");
  const match = source.match(/<Image[\s\S]*?className="([^"]*)"/);
  return match?.[1] ?? "";
}

/** Returns the article className of the program card. */
function cardArticleClass(): string {
  const source = readFileSync(PROGRAM_CARD, "utf8");
  const match = source.match(/<article[\s\S]*?className="([^"]*)"/);
  return match?.[1] ?? "";
}

/** Returns the className of the programs grid in the features page. */
function programsGridClass(): string {
  const source = readFileSync(FEATURES_PAGE, "utf8");
  const section = source.split('data-testid="features-programs"')[1] ?? "";
  const scoped = section.split("</section>")[0] ?? "";
  const grid = scoped.match(/<div className="([^"]*\bgrid\b[^"]*)"/);
  return grid?.[1] ?? "";
}

describe("control: look-pin scanners resolve the card sources", () => {
  it("control: the card image class is found", () => {
    const imageClass = cardImageClass();
    expect(imageClass.length, "card image class length: more than 0").toBeGreaterThan(0);
  });

  it("control: the card article class is found", () => {
    const articleClass = cardArticleClass();
    expect(articleClass.length, "card article class length: more than 0").toBeGreaterThan(0);
  });

  it("control: the programs grid class is found", () => {
    const gridClass = programsGridClass();
    expect(gridClass.includes("grid"), "programs grid uses grid: true").toBe(true);
  });
});

describe("F1: feature card images keep their intrinsic aspect ratio", () => {
  it("uses no object-fit crop without a matching explicit aspect ratio", () => {
    const imageClass = cardImageClass();
    const crops =
      imageClass.includes("object-cover") || imageClass.includes("object-fill");
    const keepsRatio =
      imageClass.includes("h-auto") || /aspect-\[/.test(imageClass);
    expect(
      crops && !keepsRatio,
      `F1 card image crops the face (class: ${imageClass})`,
    ).toBe(false);
  });
});

describe("F2: text-only cards use automatic height", () => {
  it("does not stretch imageless cards to the row height", () => {
    const articleClass = cardArticleClass();
    const gridClass = programsGridClass();
    const stretches =
      articleClass.includes("h-full") && !articleClass.includes("self-start");
    const gridStarts = gridClass.includes("items-start");
    expect(
      stretches && !gridStarts,
      `F2 text-only card stretches (article: ${articleClass}; grid: ${gridClass})`,
    ).toBe(false);
  });
});
