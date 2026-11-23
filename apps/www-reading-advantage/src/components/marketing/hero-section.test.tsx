import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HeroSection from "@/components/marketing/hero-section";
import {
  computedForElement,
  computedFromClasses,
} from "@/__tests__/fixtures/real-css";

/** Every declaration that a shipped gradient writes. */
const GRADIENT_PROPERTIES = [
  "--tw-gradient-position",
  "--tw-gradient-from",
  "--tw-gradient-via",
  "--tw-gradient-to",
  "background-image",
] as const;

/** The gradient classes of the default hero overlay. */
const DEFAULT_GRADIENT_CLASSES = [
  "bg-gradient-to-br",
  "from-amber-50",
  "via-orange-50",
  "to-sky-50",
] as const;

/** The gradient classes of the custom hero overlay. */
const CUSTOM_GRADIENT_CLASSES = [
  "bg-gradient-to-r",
  "from-violet-500",
  "to-fuchsia-500",
] as const;

/** The computed gradient stops of the hero overlay. */
function gradientOverlay(root: HTMLElement): Record<string, string> {
  const overlay = root.querySelector("section")?.firstElementChild;
  if (!(overlay instanceof HTMLElement)) return {};
  return computedForElement(overlay, GRADIENT_PROPERTIES);
}

/**
 * Resolves the expected stops from the compiled stylesheet.
 * @param classes The gradient classes the component is meant to use.
 * @returns One computed value per gradient property.
 */
function expectedGradient(classes: readonly string[]): Record<string, string> {
  return computedFromClasses(classes, GRADIENT_PROPERTIES);
}

afterEach(() => {
  cleanup();
});

describe("HeroSection", () => {
  it("renders title prop as a heading element", () => {
    render(
      <HeroSection
        title="Test Title"
        description="Test description"
        ctaButton={{ text: "Click me", href: "/test" }}
      />,
    );
    const heading = screen.getByRole("heading", { name: /test title/i });
    expect(heading).toBeInTheDocument();
  });

  it("renders description prop text", () => {
    render(
      <HeroSection
        title="Test Title"
        description="Test description"
        ctaButton={{ text: "Click me", href: "/test" }}
      />,
    );
    const description = screen.getByText(/test description/i);
    expect(description).toBeInTheDocument();
  });

  it("applies the specified default background gradient", () => {
    const rendered = render(
      <HeroSection title="Test Title" description="Test description" />,
    );
    const gradient = gradientOverlay(rendered.container);
    const expected = expectedGradient(DEFAULT_GRADIENT_CLASSES);

    for (const property of GRADIENT_PROPERTIES) {
      expect(gradient[property], property).toBe(expected[property]);
    }
  });

  it("replaces the default gradient with a custom gradient", () => {
    const rendered = render(
      <HeroSection
        title="Test Title"
        description="Test description"
        customGradient="bg-gradient-to-r from-violet-500 to-fuchsia-500"
      />,
    );
    const gradient = gradientOverlay(rendered.container);
    const expected = expectedGradient(CUSTOM_GRADIENT_CLASSES);

    for (const property of GRADIENT_PROPERTIES) {
      expect(gradient[property], property).toBe(expected[property]);
    }
  });

  it("renders the CTA button with correct href when ctaButton prop is provided", () => {
    render(
      <HeroSection
        title="Test Title"
        description="Test description"
        ctaButton={{ text: "Click me", href: "/test" }}
      />,
    );
    const button = screen.getByRole("link", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/test");
  });

  it("does not render CTA button when ctaButton prop is omitted", () => {
    render(<HeroSection title="Test Title" description="Test description" />);
    const button = screen.queryByRole("link");
    expect(button).not.toBeInTheDocument();
  });

  it("renders the floating image without a hidden container at any breakpoint", () => {
    render(
      <HeroSection
        title="Test Title"
        description="Test description"
        alignment="left"
        floatingImage={{ src: "/images/small-group.png", alt: "Floating hero photo" }}
      />,
    );

    const image = screen.getByAltText("Floating hero photo");
    expect(image).toBeInTheDocument();
    expect(image).not.toHaveAttribute("hidden");

    // A `hidden` token, bare or with a breakpoint prefix (for example
    // `xl:block` next to `hidden`), hides the photo below that breakpoint.
    const hiddenTokens: string[] = [];
    for (
      let node: HTMLElement | null = image;
      node !== null && node !== document.body;
      node = node.parentElement
    ) {
      const classes = (node.getAttribute("class") ?? "").split(/\s+/);
      for (const token of classes) {
        if (token === "hidden" || /^(sm|md|lg|xl|2xl):hidden$/.test(token)) {
          hiddenTokens.push(`${node.tagName.toLowerCase()}.${token}`);
        }
      }
    }

    expect(hiddenTokens).toEqual([]);
  });
});
