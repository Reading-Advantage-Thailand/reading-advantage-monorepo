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
