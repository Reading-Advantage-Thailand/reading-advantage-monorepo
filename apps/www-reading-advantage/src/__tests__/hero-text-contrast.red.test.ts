import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import HeroSection from "@/components/marketing/hero-section";
import AboutPage from "@/app/[locale]/(marketing)/about/page";

/*
 * Behavior tests for A-59: a left-aligned hero with a plain string description
 * on the default light gradient must render dark, readable subtitle text. These
 * cases render the real HeroSection and the real About page and read the
 * computed text color. No page source text and no rendered class names are
 * asserted.
 */

/** Installs the real Tailwind text colors used by the hero description. */
function installTextColors(): void {
  const style = document.createElement("style");
  style.setAttribute("data-testid", "hero-text-colors");
  style.textContent =
    ".text-slate-700{color:rgb(51,65,85)}.text-white\\/90{color:rgba(255,255,255,0.9)}";
  document.head.appendChild(style);
}

/** Finds the description paragraph by its text and returns its computed color. */
function descriptionColor(
  container: HTMLElement,
  description: string,
): string {
  const paragraph = Array.from(container.querySelectorAll("p")).find(
    (node) => node.textContent === description,
  );
  expect(paragraph, "hero description must render").not.toBeNull();
  return window.getComputedStyle(paragraph as HTMLElement).color;
}

afterEach(() => {
  cleanup();
  document
    .querySelectorAll('[data-testid="hero-text-colors"]')
    .forEach((node) => node.remove());
});

describe("left-aligned hero description contrast (A-59, rendered behavior)", () => {
  it("renders a readable dark subtitle on a left-aligned hero with a string description", () => {
    installTextColors();
    const rendered = render(
      createElement(HeroSection, {
        title: "Products",
        description: "A plain string description",
        alignment: "left",
        textColor: "dark",
      }),
    );
    expect(
      descriptionColor(rendered.container, "A plain string description"),
    ).toBe("rgb(51, 65, 85)");
  });

  it("keeps the About page hero subtitle dark on the default light gradient", async () => {
    installTextColors();
    const rendered = render(await AboutPage());
    expect(
      descriptionColor(rendered.container, "pages.about.hero.description"),
    ).toBe("rgb(51, 65, 85)");
  });
});
