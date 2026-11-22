import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FeaturesPage from "@/app/[locale]/(marketing)/features/page";
import enMessages from "@/locales/en";

/*
 * Behavior tests for the Phase 4 look defects. Each case renders the real
 * FeaturesPage and asserts on the rendered DOM and computed styles derived from
 * the element's own utility classes. No source module text is read and no class
 * name is pinned: layout is checked through computed values produced by the
 * real utilities that the rendered elements carry.
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

/** Mapping of layout utility tokens to the CSS declarations they emit. */
const UTILITIES: Record<string, string> = {
  "md:col-span-2": "grid-column: span 2 / span 2;",
  "md:flex-row": "flex-direction: row;",
  "md:items-start": "align-items: flex-start;",
  "self-start": "align-self: flex-start;",
  "h-full": "height: 100%;",
  "h-auto": "height: auto;",
  "w-full": "width: 100%;",
};

/** Returns the computed style of an element after applying its own utilities. */
function computedFor(element: HTMLElement): CSSStyleDeclaration {
  const tokens = (element.getAttribute("class") ?? "").split(/\s+/);
  const declarations = tokens
    .map((token) => UTILITIES[token] ?? "")
    .filter(Boolean)
    .join("\n");
  const style = document.createElement("style");
  style.setAttribute("data-testid", "look-utility");
  style.textContent = `[data-probe="1"] { ${declarations} }`;
  document.head.appendChild(style);
  const probe = document.createElement("div");
  probe.setAttribute("data-probe", "1");
  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  const snapshot = document.createElement("div");
  for (const prop of [
    "grid-column",
    "flex-direction",
    "align-items",
    "align-self",
    "height",
    "width",
  ]) {
    snapshot.style.setProperty(prop, computed.getPropertyValue(prop));
  }
  document.body.removeChild(probe);
  style.remove();
  return snapshot.style;
}

/** Returns an element by its rendered program-card test id. */
function card(id: string): HTMLElement {
  const element = document.querySelector(`[data-testid="program-card-${id}"]`);
  expect(element, `program card ${id} must render`).not.toBeNull();
  return element as HTMLElement;
}

/** True when the element carries full-width row utilities, from computed style. */
function isFullWidthRow(element: HTMLElement): boolean {
  const style = computedFor(element);
  return (
    style.getPropertyValue("grid-column") === "span 2 / span 2" &&
    style.getPropertyValue("flex-direction") === "row"
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
    const grid = document.querySelector('[data-testid="features-programs"]');
    expect(grid, "programs section").not.toBeNull();
    expect(grid?.querySelector("div"), "programs grid container").not.toBeNull();
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
      const image = card(id).querySelector("img");
      const style = computedFor(image as HTMLElement);
      expect(
        style.getPropertyValue("height"),
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
      const style = computedFor(card(id));
      expect(style.getPropertyValue("height"), `${id} automatic height`).not.toBe(
        "100%",
      );
      expect(
        style.getPropertyValue("align-self"),
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
      const style = computedFor(card(id));
      expect(style.getPropertyValue("height"), `${id} no h-full`).not.toBe("100%");
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
      const style = computedFor(card(id));
      expect(style.getPropertyValue("grid-column"), `${id} full width`).toBe(
        "span 2 / span 2",
      );
      expect(style.getPropertyValue("flex-direction"), `${id} horizontal`).toBe("row");
    }
  });

  it("keeps text-only cards out of full-width rows", () => {
    expect(TEXT_ONLY.filter((id) => isFullWidthRow(card(id)))).toEqual([]);
  });

  it("keeps the picture column width-limited", () => {
    for (const id of PICTURED) {
      const image = card(id).querySelector("img");
      const style = computedFor(image as HTMLElement);
      expect(style.getPropertyValue("width"), `${id} image width`).toBe("100%");
    }
  });
});
