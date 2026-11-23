/**
 * Unit checks for the WCAG contrast fixture. These pin the arithmetic and the
 * backdrop composition that the R2 contrast tests rely on.
 */
import { describe, expect, it } from "vitest";
import {
  contrastOf,
  contrastRatio,
  parseColor,
  readBackgroundLayer,
  resolveBackdrop,
  type BackgroundLayer,
} from "./fixtures/contrast";

/**
 * Builds a parent-to-child chain of elements with injected background layers.
 * @param layers The layers ordered from the outermost element to the leaf.
 * @returns The leaf element and a reader that maps each node to its layer.
 */
function chain(
  ...layers: readonly BackgroundLayer[]
): { leaf: Element; read: (element: Element) => BackgroundLayer } {
  const nodes: Element[] = [];
  let parent: Element | null = null;
  for (let index = 0; index < layers.length; index += 1) {
    const node = document.createElement("div");
    if (parent) parent.appendChild(node);
    nodes.push(node);
    parent = node;
  }
  const map = new Map<Element, BackgroundLayer>(
    nodes.map((node, index) => [node, layers[index]]),
  );
  return {
    leaf: nodes[nodes.length - 1],
    read: (element) => map.get(element) ?? { color: null, hasImage: false },
  };
}

describe("WCAG contrast fixture", () => {
  it("puts rgb(120,120,120) on #faf9f7 below the AA floor", () => {
    const ratio = contrastRatio(
      parseColor("rgb(120, 120, 120)"),
      parseColor("#faf9f7"),
    );
    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeGreaterThan(4.1);
  });

  it("gives black on white a ratio of 21", () => {
    expect(
      contrastRatio(parseColor("#000000"), parseColor("#ffffff")),
    ).toBeCloseTo(21, 1);
  });

  it("throws on an unresolved colour", () => {
    expect(() => parseColor("var(--color-slate-400)")).toThrow(/Unresolved/);
  });

  it("composes translucent layers over an opaque ancestor", () => {
    const setup = chain(
      { color: parseColor("#faf9f7"), hasImage: false },
      { color: parseColor("rgba(0, 0, 0, 0.5)"), hasImage: false },
      { color: parseColor("rgba(255, 255, 255, 0.5)"), hasImage: false },
    );
    const backdrop = resolveBackdrop(setup.leaf, setup.read);
    expect(backdrop).toEqual({ r: 190, g: 190, b: 190, a: 1 });
    expect(
      contrastRatio(parseColor("rgb(120, 120, 120)"), backdrop),
    ).toBeCloseTo(2.3754, 3);
  });

  it("composes a translucent layer over the page background", () => {
    const setup = chain({
      color: parseColor("rgba(0, 0, 0, 0.5)"),
      hasImage: false,
    });
    expect(resolveBackdrop(setup.leaf, setup.read)).toEqual({
      r: 128,
      g: 128,
      b: 128,
      a: 1,
    });
  });

  it("throws when a background image would paint behind text", () => {
    const element = document.createElement("div");
    element.className = "bg-gradient-to-br";
    expect(() => readBackgroundLayer(element)).toThrow(
      /background image.*<div>/i,
    );
  });

  it("throws when an unsupported background colour would paint", () => {
    const element = document.createElement("div");
    element.className = "bg-white/50";
    expect(() => readBackgroundLayer(element)).toThrow(
      /background colour.*<div>/i,
    );
  });

  it("skips a fully transparent background", () => {
    const bare = document.createElement("div");
    expect(readBackgroundLayer(bare).color).toBeNull();
    const red = parseColor("#ff0000");
    const setup = chain(
      { color: red, hasImage: false },
      { color: null, hasImage: false },
    );
    expect(resolveBackdrop(setup.leaf, setup.read)).toEqual(red);
  });

  it("stops the walk at an opaque background", () => {
    const blue = parseColor("#0000ff");
    const { leaf } = chain({ color: blue, hasImage: false });
    const read = (element: Element): BackgroundLayer => {
      if (element === leaf) return { color: blue, hasImage: false };
      throw new Error("the walk reached an ancestor");
    };
    expect(resolveBackdrop(leaf, read)).toEqual(blue);
  });

  it("finds backgrounds from type and descendant selectors", () => {
    const style = document.createElement("style");
    style.textContent = [
      "body { background-color: rgb(248, 250, 252); }",
      "#f21-root span { background-color: rgba(255, 0, 0, 0.5); }",
    ].join("\n");
    document.head.appendChild(style);
    try {
      const root = document.createElement("div");
      root.id = "f21-root";
      const leaf = document.createElement("span");
      root.appendChild(leaf);
      document.body.appendChild(root);
      const backdrop = resolveBackdrop(leaf);
      expect(backdrop).toEqual({ r: 252, g: 125, b: 126, a: 1 });
      expect(
        contrastRatio(parseColor("rgb(118, 118, 118)"), backdrop),
      ).toBeCloseTo(1.8112, 3);
      root.remove();
    } finally {
      style.remove();
    }
  });

  it("uses the painted body rule instead of the white fallback", () => {
    const leaf = document.createElement("span");
    document.body.appendChild(leaf);
    try {
      const backdrop = resolveBackdrop(leaf);
      expect(backdrop).toEqual(parseColor("#f8fafc"));
      expect(
        contrastRatio(parseColor("rgb(118, 118, 118)"), backdrop),
      ).toBeLessThan(4.5);
    } finally {
      leaf.remove();
    }
  });

  it("uses an inline custom property override on the element", () => {
    const leaf = document.createElement("span");
    leaf.style.setProperty("--color-slate-900", "#faf9f7");
    leaf.style.color = "var(--color-slate-900)";
    leaf.style.backgroundColor = "rgb(250, 249, 247)";
    document.body.appendChild(leaf);
    try {
      expect(contrastOf(leaf)).toBeCloseTo(1, 1);
    } finally {
      leaf.remove();
    }
  });

  it("uses a custom property override set on an ancestor", () => {
    const parent = document.createElement("div");
    parent.style.setProperty("--color-slate-900", "#faf9f7");
    parent.style.backgroundColor = "rgb(250, 249, 247)";
    const leaf = document.createElement("span");
    leaf.style.color = "var(--color-slate-900)";
    parent.appendChild(leaf);
    document.body.appendChild(parent);
    try {
      expect(contrastOf(leaf)).toBeCloseTo(1, 1);
    } finally {
      parent.remove();
    }
  });

  it("throws when a custom property override cannot be resolved", () => {
    const leaf = document.createElement("span");
    leaf.style.setProperty("--probe-chain", "var(--probe-missing)");
    leaf.style.color = "var(--probe-chain)";
    leaf.style.backgroundColor = "rgb(255, 255, 255)";
    document.body.appendChild(leaf);
    try {
      expect(() => contrastOf(leaf)).toThrow(/Unresolved custom property/);
    } finally {
      leaf.remove();
    }
  });
});
