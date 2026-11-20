import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Red r3 pins for the Phase 4 browser look defects (track www_features_pricing_20261120).
 * F1 [High]: at 980 px the Storytime card image frame crops through the face.
 * F2 [Medium]: at 980 px the text-only CodeCamp card stretches with empty space.
 * Both cases read the component sources as text and must fail at 38c03ba22.
 *
 * Red r4 pins for F3 [Blocker]: at 980 and 1280 px the portrait Primary picture
 * (375x622) makes its grid row very tall, leaving large gaps below the shorter
 * cards. The orchestrator default fix: at md+ the Primary card spans the full
 * grid width with its picture beside its text (width-limited picture column,
 * ratio kept, no crop); the other cards stay in the two-column grid; card order
 * and the 390 single column stay unchanged. The three F3 cases must fail at
 * 2ffa43f8b.
 */

const PROGRAM_CARD = resolve(
  __dirname,
  "../components/features/program-card.tsx",
);
const FEATURES_PAGE = resolve(
  __dirname,
  "../app/[locale]/(marketing)/features/page.tsx",
);

/** Returns the programs section source of the features page. */
function programsSection(): string {
  const source = readFileSync(FEATURES_PAGE, "utf8");
  const afterId = source.split('data-testid="features-programs"')[1] ?? "";
  return afterId.split("</section>")[0] ?? "";
}

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
  return programsSection().match(/<div className="([^"]*\bgrid\b[^"]*)"/)?.[1] ?? "";
}

/** Returns the card-render block of the programs section (the CARD_KEYS map). */
function cardRenderBlock(): string {
  const section = programsSection();
  const afterMap = section.split("CARD_KEYS.map")[1] ?? "";
  return afterMap;
}

/** Returns the image block of the program card (the conditional image slot). */
function cardImageBlock(): string {
  const source = readFileSync(PROGRAM_CARD, "utf8");
  const afterGuard = source.split("imageSrc && imageAlt &&")[1] ?? "";
  return afterGuard.split("</div>")[0] ?? "";
}

/** True when the map block singles out the primary card for special layout. */
function primaryConditioned(): boolean {
  return /key\s*===\s*["']primary["']/.test(cardRenderBlock());
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

describe("control: F3 scanners resolve the card order and base column", () => {
  it("control: the card order is unchanged", () => {
    const source = readFileSync(FEATURES_PAGE, "utf8");
    const keys = source.match(/const CARD_KEYS = \[([\s\S]*?)\]/)?.[1] ?? "";
    const order = [...keys.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(order, "card order: 5 keys").toHaveLength(5);
    expect(order, "card order: storytime, primary, reading, codecamp, schoolSubjects").toEqual([
      "storytime",
      "primary",
      "reading",
      "codecamp",
      "schoolSubjects",
    ]);
  });

  it("control: the base grid stays one column", () => {
    const gridClass = programsGridClass();
    const baseCols = gridClass.split(" ").filter((token) => /^grid-cols-/.test(token));
    expect(baseCols, "base grid-cols classes: none").toEqual([]);
  });
});

describe("F3: the Primary card spans the full grid width at md+", () => {
  it("gives the primary card an md+ full-span class", () => {
    const combined = `${readFileSync(PROGRAM_CARD, "utf8")}\n${programsSection()}`;
    const hasSpan = /(sm|md|lg):col-span-(2|3|full)/.test(combined);
    expect(
      hasSpan && primaryConditioned(),
      "F3 primary card spans the full grid width at md+",
    ).toBe(true);
  });
});

describe("F3: the Primary card shows its picture beside its text at md+", () => {
  it("lays the primary card out in a row at md+", () => {
    const cardSource = readFileSync(PROGRAM_CARD, "utf8");
    const hasRow = /(sm|md|lg):flex-row/.test(cardSource);
    expect(
      hasRow && primaryConditioned(),
      "F3 primary card uses an md+ row layout",
    ).toBe(true);
  });

  it("limits the picture column width at md+", () => {
    const block = cardImageBlock();
    const capped = /(sm|md|lg):(max-w-|w-|basis-)/.test(block);
    expect(capped, `F3 picture column width-limited at md+ (block: ${block.slice(0, 200)})`).toBe(true);
  });
});
