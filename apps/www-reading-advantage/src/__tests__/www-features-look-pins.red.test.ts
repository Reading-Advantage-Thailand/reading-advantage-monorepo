import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FeaturesPage from "@/app/[locale]/(marketing)/features/page";
import enMessages from "@/locales/en";
import { computedForElement, computedFromClasses } from "./fixtures/real-css";

/*
 * Behavior tests for the Phase 4 look defects. Each case renders the real
 * FeaturesPage and reads computed values from the stylesheet the app ships.
 * The class-to-rule mapping comes from the real compiled Tailwind output of
 * globals.css. No source module text and no hand-written class map is used.
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

/** Returns an element by its rendered program-card test id. */
function card(id: string): HTMLElement {
  const element = document.querySelector(`[data-testid="program-card-${id}"]`);
  expect(element, `program card ${id} must render`).not.toBeNull();
  return element as HTMLElement;
}

/** Returns the rendered programs grid container. */
function programsGrid(): HTMLElement {
  const section = document.querySelector('[data-testid="features-programs"]');
  expect(section, "programs section").not.toBeNull();
  const grid = section?.querySelector(".grid");
  expect(grid, "programs grid container").not.toBeNull();
  return grid as HTMLElement;
}

/** Returns the rendered picture wrapper of a program card. */
function pictureWrapper(id: string): HTMLElement {
  const wrapper = card(id).querySelector("img")?.parentElement;
  expect(wrapper, `${id} picture wrapper`).not.toBeNull();
  return wrapper as HTMLElement;
}

/** True when the rendered card uses the shipped full-width row rules. */
function isFullWidthRow(element: HTMLElement): boolean {
  const style = computedForElement(element, [
    "grid-column",
    "flex-direction",
  ]);
  return (
    style["grid-column"] === "span 2 / span 2" &&
    style["flex-direction"] === "row"
  );
}

const PICTURED = ["storytime", "primary", "reading"] as const;
const TEXT_ONLY = ["codecamp", "school-subjects"] as const;
const ORDER = ["storytime", "primary", "reading", "codecamp", "school-subjects"];

afterEach(() => {
  cleanup();
});

describe("look-pin scanners resolve the rendered cards", () => {
  beforeEach(async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
  });

  it("renders every pictured card with an image", () => {
    for (const id of PICTURED) {
      expect(card(id).querySelector("img"), `${id} picture`).not.toBeNull();
    }
  });

  it("renders the program cards in the approved order", () => {
    const rendered = Array.from(
      document.querySelectorAll("[data-testid^='program-card-']"),
    ).map((node) => (node.getAttribute("data-testid") ?? "").replace("program-card-", ""));
    expect(rendered).toEqual(ORDER);
  });

  it("renders a single-column grid at the base width", () => {
    const grid = programsGrid();
    const base = computedForElement(
      grid,
      ["display", "grid-template-columns"],
      true,
    );
    expect(base.display, "programs grid displays as a grid").toBe("grid");
    expect(
      base["grid-template-columns"].trim(),
      "base width keeps the implicit single column",
    ).toBe("none");
    const all = computedForElement(grid, ["grid-template-columns"]);
    expect(
      all["grid-template-columns"],
      "a shipped breakpoint rule supplies two columns",
    ).toContain("repeat(2");
    const shipped = computedFromClasses(["sm:grid-cols-2"], [
      "grid-template-columns",
    ]);
    expect(shipped["grid-template-columns"]).toContain("repeat(2");
  });

  it("exposes a rendered image source on each pictured card", () => {
    for (const id of PICTURED) {
      const image = card(id).querySelector("img");
      expect(image?.getAttribute("src"), `${id} image src`).toBeTruthy();
    }
  });

  it("renders each card as an article with a heading", () => {
    for (const id of [...PICTURED, ...TEXT_ONLY]) {
      const element = card(id);
      expect(element.tagName.toLowerCase(), `${id} article`).toBe("article");
      expect(
        element.querySelector("h3"),
        `${id} heading`,
      ).not.toBeNull();
    }
  });
});

describe("F1: feature card images keep their intrinsic aspect ratio", () => {
  beforeEach(async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
  });

  it("does not crop a pictured card image without an explicit ratio", () => {
    for (const id of PICTURED) {
      const image = card(id).querySelector("img") as HTMLElement;
      const style = computedForElement(image, ["height"]);
      expect(
        style.height,
        `${id} image keeps automatic height`,
      ).toBe("auto");
    }
  });
});

describe("F2: text-only cards use automatic height", () => {
  beforeEach(async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
  });

  it("does not stretch imageless cards to the row height", () => {
    for (const id of TEXT_ONLY) {
      const style = computedForElement(card(id), ["height", "align-self"]);
      expect(style.height, `${id} automatic height`).not.toBe("100%");
      expect(
        style["align-self"],
        `${id} top anchored`,
      ).toBe("flex-start");
    }
  });
});

describe("F2r6: row-scoped text-only coverage", () => {
  beforeEach(async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
  });

  it("renders five cards with two distinct layout branches", () => {
    const wide = PICTURED.filter((id) => isFullWidthRow(card(id)));
    const plain = TEXT_ONLY.filter((id) => !isFullWidthRow(card(id)));
    expect(wide, "pictured full-width cards").toHaveLength(PICTURED.length);
    expect(plain, "text-only plain cards").toHaveLength(TEXT_ONLY.length);
  });

  it("keeps the text-only branch on automatic height", () => {
    for (const id of TEXT_ONLY) {
      const style = computedForElement(card(id), ["height"]);
      expect(style.height, `${id} no h-full`).not.toBe("100%");
    }
  });
});

describe("F3r6: full-width rows are driven by image presence", () => {
  beforeEach(async () => {
    hoisted.state.messages = enMessages;
    render(await FeaturesPage());
  });

  it("does not key the full-width layout on the primary card alone", () => {
    const wide = PICTURED.filter((id) => isFullWidthRow(card(id)));
    expect(wide, "more than one card uses the full-width row").toHaveLength(
      PICTURED.length,
    );
  });

  it("uses full-width rows for every pictured card", () => {
    expect(PICTURED.filter((id) => !isFullWidthRow(card(id)))).toEqual([]);
  });

  it("renders storytime, primary and reading as full-width horizontal rows", () => {
    for (const id of PICTURED) {
      const style = computedForElement(card(id), [
        "grid-column",
        "flex-direction",
      ]);
      expect(style["grid-column"], `${id} full width`).toBe("span 2 / span 2");
      expect(style["flex-direction"], `${id} horizontal`).toBe("row");
    }
  });

  it("keeps text-only cards out of full-width rows", () => {
    expect(TEXT_ONLY.filter((id) => isFullWidthRow(card(id)))).toEqual([]);
  });

  it("keeps the picture wrapper width-limited", () => {
    const shipped = computedFromClasses(["md:w-48"], ["width"]);
    expect(shipped.width, "the stylesheet ships a width limit").toContain("calc");
    for (const id of PICTURED) {
      const style = computedForElement(pictureWrapper(id), ["width"]);
      expect(style.width, `${id} picture wrapper width limit`).toBe(shipped.width);
    }
  });
});
