// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveBrowserSafeAreaInsets } from "./browser-safe-area.js";

describe("resolveBrowserSafeAreaInsets", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("returns the unsafe overlap with a full viewport container", () => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    const container = document.createElement("div");
    document.body.append(container);
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 390, bottom: 844, left: 0, width: 390, height: 844,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      paddingTop: "20px", paddingRight: "8px", paddingBottom: "16px", paddingLeft: "6px",
    } as CSSStyleDeclaration);

    expect(resolveBrowserSafeAreaInsets(container)).toEqual({
      top: 20, right: 8, bottom: 16, left: 6,
    });
  });

  it("does not subtract a CSS inset that already moved the container", () => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    const container = document.createElement("div");
    document.body.append(container);
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 20, top: 20, right: 390, bottom: 828, left: 0, width: 390, height: 808,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      paddingTop: "20px", paddingRight: "0px", paddingBottom: "16px", paddingLeft: "0px",
    } as CSSStyleDeclaration);

    expect(resolveBrowserSafeAreaInsets(container)).toEqual({
      top: 0, right: 0, bottom: 0, left: 0,
    });
  });

  it("uses visual viewport offsets and rejects invalid measured values", () => {
    const container = document.createElement("div");
    document.body.append(container);
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: 12, y: 24, top: 24, right: 402, bottom: 824, left: 12, width: 390, height: 800,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      paddingTop: "NaN", paddingRight: "-8px", paddingBottom: "18px", paddingLeft: "10px",
    } as CSSStyleDeclaration);
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: { offsetLeft: 12, offsetTop: 24, width: 390, height: 818 },
    });

    expect(resolveBrowserSafeAreaInsets(container)).toEqual({
      top: 0, right: 0, bottom: 0, left: 10,
    });
  });

  it("keeps signed geometry when a container extends past the viewport", () => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    const container = document.createElement("div");
    document.body.append(container);
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: -30, y: 0, top: 0, right: 360, bottom: 844, left: -30, width: 390, height: 844,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      paddingTop: "0px", paddingRight: "20px", paddingBottom: "0px", paddingLeft: "10px",
    } as CSSStyleDeclaration);

    expect(resolveBrowserSafeAreaInsets(container)).toEqual({
      top: 0, right: 0, bottom: 0, left: 10,
    });
  });

  it("converts CSS overlap into local pixels for a scaled container", () => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    const container = document.createElement("div");
    document.body.append(container);
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 844 },
    });
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 195, bottom: 422, left: 0, width: 195, height: 422,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      paddingTop: "10px", paddingRight: "0px", paddingBottom: "0px", paddingLeft: "6px",
    } as CSSStyleDeclaration);

    expect(resolveBrowserSafeAreaInsets(container)).toEqual({
      top: 20, right: 0, bottom: 0, left: 12,
    });
  });
});
