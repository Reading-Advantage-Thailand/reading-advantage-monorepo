import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import FeaturesPage from "@/app/[locale]/(marketing)/features/page";
import enMessages from "@/locales/en";

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
 *
 * Red r6 pins for the r4 F3 remainder [Blocker]: the Primary-only span leaves
 * the first row half empty at 980 and 1280 (Storytime sits alone with a
 * 707-755 px empty cell beside it). New rule, replacing the r4 Primary-only
 * rule: at md+ EVERY pictured card is a full-width horizontal row; text-only
 * cards sit in the two-column grid after them. Default D-R6-1: keep the single
 * programs grid and CARD_KEYS order; extend the featured full-width row to
 * every pictured card. The r4 Primary-only source pins are retargeted below so
 * they do not contradict this rule. The render pins check the real route output
 * (UX r4: recheck the rendered grid, not only the class pins). RA3 (Review A):
 * the F2 guard below also inspects the nonfeatured branch directly. The new
 * F3 and fluid-rows cases must fail at 7fb548e5e.
 */

const hoisted = vi.hoisted(() => {
  const state: { messages: unknown } = { messages: {} };

  function readPath(root: unknown, path: string): unknown {
    let value: unknown = root;
    for (const segment of path.split(".")) {
      if (value === null || typeof value !== "object") return undefined;
      if (!(segment in (value as Record<string, unknown>))) return undefined;
      value = (value as Record<string, unknown>)[segment];
    }
    return value;
  }

  function makeTranslator(scope: string) {
    const prefix = scope ? `${scope}.` : "";
    const translate = (key: string): string => {
      const value = readPath(state.messages, `${prefix}${key}`);
      return typeof value === "string" ? value : `[[missing:${prefix}${key}]]`;
    };
    translate.raw = (key: string): unknown =>
      readPath(state.messages, `${prefix}${key}`);
    return translate;
  }

  return { state, makeTranslator, readPath };
});

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve(hoisted.makeTranslator(""))),
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve(hoisted.makeTranslator(scope)),
  ),
  getStaticParams: vi.fn(() => []),
}));

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn(
    (scope: string) => (key: string) => {
      const value = hoisted.readPath(
        hoisted.state.messages,
        scope ? `${scope}.${key}` : key,
      );
      return typeof value === "string" ? value : `[[missing:${scope}.${key}]]`;
    },
  ),
}));

afterEach(() => {
  cleanup();
});

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

/** Returns every article className in program-card.tsx, in source order. */
function articleClasses(): string[] {
  const source = readFileSync(PROGRAM_CARD, "utf8");
  return [...source.matchAll(/<article[\s\S]*?className="([^"]*)"/g)].map(
    (match) => match[1],
  );
}

/** True when the featured full-width row is driven by image presence. */
function fullWidthDrivenByImage(): boolean {
  const section = programsSection();
  if (/featured=\{[^}]*image/i.test(section)) return true;
  const groupMap = section.match(/(PIC\w*|pictured\w*)\.map\(([\s\S]{0,800})/i);
  if (groupMap && /featured|col-span/i.test(groupMap[2] ?? "")) return true;
  return false;
}

/** True when no card layout is keyed on the primary card alone. */
function noPrimaryOnlyLayout(): boolean {
  const section = programsSection();
  return !/featured=\{\s*key\s*===\s*["']primary["']|key\s*===\s*["']primary["'][\s\S]{0,120}col-span|col-span[\s\S]{0,120}key\s*===\s*["']primary/.test(
    section,
  );
}

/** True when an article class carries an md+ full-width span and row layout. */
function isFullWidthRow(className: string): boolean {
  return (
    /(sm|md|lg):col-span-(2|3|full)/.test(className) &&
    /(sm|md|lg):flex-row/.test(className)
  );
}

/** Pictured program-card hooks, in DOM order. */
const PICTURED_HOOKS = [
  "program-card-storytime",
  "program-card-primary",
  "program-card-reading",
] as const;

/** Text-only program-card hooks, in DOM order. */
const TEXT_HOOKS = ["program-card-codecamp", "program-card-school-subjects"] as const;

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

describe("F2r6: row-scoped text-only coverage (RA3)", () => {
  it("control: the card exposes featured and nonfeatured branches", () => {
    expect(articleClasses().length, "article branches: 2").toBe(2);
  });

  it("the nonfeatured (text-only) branch carries no h-full and keeps automatic height", () => {
    const branches = articleClasses();
    const plain = branches[branches.length - 1] ?? "";
    expect(plain.includes("h-full"), "nonfeatured h-full: absent").toBe(false);
    expect(
      plain.includes("self-start") ||
        programsGridClass().includes("items-start"),
      "nonfeatured automatic height",
    ).toBe(true);
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

describe("F3r6 source: no card layout is keyed on primary alone", () => {
  it("wires the full-width row by image presence, not by the primary key", () => {
    expect(noPrimaryOnlyLayout(), "F3r6 primary-only layout: absent").toBe(true);
  });

  it("drives the full-width row from the pictured cards", () => {
    expect(fullWidthDrivenByImage(), "F3r6 image-driven full width").toBe(true);
  });
});

describe("F3r6 render: every pictured card is a full-width row", () => {
  beforeEach(async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
  });

  it("renders storytime, primary and reading as full-width horizontal rows", () => {
    const missing = PICTURED_HOOKS.filter((hook) => {
      const element = document.querySelector(`[data-testid="${hook}"]`);
      return !isFullWidthRow(element?.getAttribute("class") ?? "");
    });
    expect(missing, "pictured cards without a full-width row").toEqual([]);
  });

  it("control: text-only cards stay out of full-width rows", () => {
    const wide = TEXT_HOOKS.filter((hook) => {
      const element = document.querySelector(`[data-testid="${hook}"]`);
      return isFullWidthRow(element?.getAttribute("class") ?? "");
    });
    expect(wide, "text-only cards in full-width rows").toEqual([]);
  });

  it("control: the picture column stays width-limited at md+", () => {
    const block = cardImageBlock();
    expect(
      /(sm|md|lg):(max-w-|w-|basis-)/.test(block),
      `F3 picture column width-limited at md+ (block: ${block.slice(0, 200)})`,
    ).toBe(true);
  });
});
