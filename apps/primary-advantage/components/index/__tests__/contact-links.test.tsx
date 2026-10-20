// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactLinks } from "../contact-links";
import { CONTACT_CHANNELS } from "@/configs/contact-channels";

afterEach(cleanup);

const labels = { line: "LINE Official Account", lineQrAlt: "LINE QR code", facebook: "Facebook", phone: "Phone", email: "Email" };

describe("ContactLinks", () => {
  it("links each channel with its scheme and has no form", () => {
    const { container } = render(<ContactLinks labels={labels} />);
    expect(container.querySelector("form")).toBeNull();
    expect(screen.getByRole("link", { name: /LINE Official Account/ })).toHaveAttribute("href", "https://line.me/ti/p/Pf7_EF98Pv");
    expect(screen.getByRole("link", { name: /Facebook/ })).toHaveAttribute("href", "https://www.facebook.com/readingadvantage");
    expect(screen.getByRole("link", { name: /Phone/ })).toHaveAttribute("href", "tel:+66990058038");
    expect(screen.getByRole("link", { name: /Email/ })).toHaveAttribute("href", "mailto:support@reading-advantage.com");
  });

  it("opens the web channels in a new tab and keeps tel and mailto in place", () => {
    render(<ContactLinks labels={labels} />);
    expect(screen.getByRole("link", { name: /LINE/ })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: /Phone/ })).not.toHaveAttribute("target");
    expect(screen.getByRole("img", { name: "LINE QR code" })).toHaveAttribute("src", CONTACT_CHANNELS.line.qr);
  });

  it("uses only https, tel, and mailto links in the channel config", () => {
    for (const { href } of Object.values(CONTACT_CHANNELS)) expect(href).toMatch(/^(https:\/\/|tel:\+|mailto:)/);
  });
});
