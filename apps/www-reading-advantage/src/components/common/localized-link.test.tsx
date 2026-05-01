import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockUseCurrentLocale = vi.fn(() => "en");

vi.mock("@/locales/client", () => ({
  useCurrentLocale: () => mockUseCurrentLocale(),
}));

vi.mock("@/config/locale-config", () => ({
  localeConfig: { locales: ["en", "th", "zh"], defaultLocale: "en" },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

describe("LocalizedLink", () => {
  beforeEach(() => {
    mockUseCurrentLocale.mockReturnValue("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("prepends locale to a plain path", async () => {
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="/blog">Blog</LocalizedLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/blog");
  });

  it("prepends locale to root path", async () => {
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="/">Home</LocalizedLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en");
  });

  it("does not double-prepend when href already starts with the locale", async () => {
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="/en/blog">Blog</LocalizedLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/blog");
  });

  it("does not double-prepend for any supported locale", async () => {
    mockUseCurrentLocale.mockReturnValue("th");
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="/th/blog">Blog</LocalizedLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/th/blog");
  });

  it("does not modify absolute URLs", async () => {
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="https://example.com">External</LocalizedLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com");
  });

  it("does not modify mailto links", async () => {
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="mailto:hello@example.com">Email</LocalizedLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "mailto:hello@example.com");
  });

  it("uses the current locale from useCurrentLocale", async () => {
    mockUseCurrentLocale.mockReturnValue("th");
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="/blog">Blog</LocalizedLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/th/blog");
  });

  it("renders children correctly", async () => {
    const { LocalizedLink } = await import("@/components/common/localized-link");
    render(<LocalizedLink href="/about">About Us</LocalizedLink>);
    expect(screen.getByText("About Us")).toBeDefined();
  });
});
