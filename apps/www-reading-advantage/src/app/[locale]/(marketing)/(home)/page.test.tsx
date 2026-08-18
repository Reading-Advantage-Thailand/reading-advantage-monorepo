import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Home from "@/app/[locale]/(marketing)/(home)/page";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}

      disconnect() {}

      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("renders main heading with i18n key", async () => {
    const element = await Home({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it("renders hero section", async () => {
    const element = await Home({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const heroText = screen.getByText(/pages\.home\.hero\.description/i);
    expect(heroText).toBeInTheDocument();
  });

  it("renders engine section heading", async () => {
    const element = await Home({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const engineHeading = screen.getByText(/pages\.home\.engine\.title/i);
    expect(engineHeading).toBeInTheDocument();
  });

  it("renders suite section heading", async () => {
    const element = await Home({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const suiteTitle = screen.getByText(/pages\.home\.suite\.title/i);
    expect(suiteTitle).toBeInTheDocument();
  });

  it("renders Thai private schools section heading", async () => {
    const element = await Home({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const thaiSchoolsHeading = screen.getByText(
      /pages\.home\.thaiSchools\.title/i,
    );
    expect(thaiSchoolsHeading).toBeInTheDocument();
  });

  it("renders impact CTA link", async () => {
    const element = await Home({
      params: Promise.resolve({ locale: "en" }),
    });
    render(element);
    const contactLink = screen.getByRole("link", {
      name: /pages\.home\.impact\.cta/i,
    });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute("href", "/contact");
  });
});
