import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Home from "@/app/[locale]/(marketing)/(home)/page";

afterEach(() => {
  cleanup();
});

describe("Home", () => {
  it("renders main heading with i18n key", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it("renders hero section", () => {
    render(<Home />);
    const heroText = screen.getByText(/pages\.home\.hero\.description/i);
    expect(heroText).toBeInTheDocument();
  });

  it("renders mission section heading", () => {
    render(<Home />);
    const missionHeading = screen.getByText(/pages\.home\.mission\.title/i);
    expect(missionHeading).toBeInTheDocument();
  });

  it("renders flagship product section", () => {
    render(<Home />);
    const flagshipTitle = screen.getByText(/pages\.home\.flagship\.title/i);
    expect(flagshipTitle).toBeInTheDocument();
  });

  it("renders innovation section heading", () => {
    render(<Home />);
    const innovationHeading = screen.getByText(
      /pages\.home\.innovation\.title/i,
    );
    expect(innovationHeading).toBeInTheDocument();
  });

  it("renders contact CTA link", () => {
    render(<Home />);
    const contactLink = screen.getByRole("link", {
      name: /pages\.home\.overview\.partnerCta/i,
    });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute("href", "/contact");
  });
});
