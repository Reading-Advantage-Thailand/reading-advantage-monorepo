import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HeroSection from "@/components/marketing/hero-section";

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
    const gradient = rendered.container.querySelector("div.absolute.inset-0");

    expect(gradient).toHaveClass(
      "bg-gradient-to-br",
      "from-amber-50",
      "via-orange-50",
      "to-sky-50",
    );
  });

  it("replaces the default gradient with a custom gradient", () => {
    const rendered = render(
      <HeroSection
        title="Test Title"
        description="Test description"
        customGradient="bg-gradient-to-r from-violet-500 to-fuchsia-500"
      />,
    );
    const gradient = rendered.container.querySelector("div.absolute.inset-0");

    expect(gradient).toHaveClass(
      "bg-gradient-to-r",
      "from-violet-500",
      "to-fuchsia-500",
    );
    expect(gradient).not.toHaveClass("bg-gradient-to-br");
    expect(gradient).not.toHaveClass("from-amber-50");
    expect(gradient).not.toHaveClass("via-orange-50");
    expect(gradient).not.toHaveClass("to-sky-50");
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
});
