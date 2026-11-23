import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HeroSection from "@/components/marketing/hero-section";
import { computedForElement } from "@/__tests__/fixtures/real-css";

/** The computed gradient stops of the hero overlay. */
function gradientOverlay(root: HTMLElement): Record<string, string> {
  const overlay = root.querySelector("section")?.firstElementChild;
  if (!(overlay instanceof HTMLElement)) return {};
  return computedForElement(overlay, [
    "--tw-gradient-position",
    "--tw-gradient-from",
    "--tw-gradient-via",
    "--tw-gradient-to",
    "background-image",
  ]);
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

    expect(gradient["--tw-gradient-position"]).toBe("to bottom right in oklab");
    expect(gradient["--tw-gradient-from"]).toBe("oklch(98.7%0.022 95.277)");
    expect(gradient["--tw-gradient-via"]).not.toBe("");
    expect(gradient["--tw-gradient-to"]).not.toBe("");
    expect(gradient["background-image"]).toContain("linear-gradient");
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

    expect(gradient["--tw-gradient-position"]).toBe("to right in oklab");
    expect(gradient["--tw-gradient-from"]).toContain("violet");
    expect(gradient["--tw-gradient-via"]).toBe("");
    expect(gradient["--tw-gradient-to"]).toContain("fuchsia");
    expect(gradient["background-image"]).toContain("linear-gradient");
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
