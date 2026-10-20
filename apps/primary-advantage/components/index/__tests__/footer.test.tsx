// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Footer } from "../footer";
import { CONTACT_CHANNELS } from "@/configs/contact-channels";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

afterEach(cleanup);

describe("Footer", () => {
  it("links Support to the contact page and not to a form", () => {
    const { container } = render(<Footer />);
    expect(screen.getByRole("link", { name: "support" })).toHaveAttribute("href", "/contact");
    expect(container.innerHTML).not.toContain("docs.google.com");
  });

  it("links the email to the support address", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: CONTACT_CHANNELS.email.text })).toHaveAttribute("href", "mailto:support@reading-advantage.com");
  });
});
