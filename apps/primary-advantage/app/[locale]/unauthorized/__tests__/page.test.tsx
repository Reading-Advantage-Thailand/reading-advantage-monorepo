// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";

import enMessages from "../../../../messages/en.json";

// The mock Link stamps the marker attribute, so a swap to next/link renders
// a plain <a> without it and fails the marker assertion below.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} data-test-id="i18n-link" {...rest}>
      {children}
    </a>
  ),
}));

// The real i18n navigation module (loaded via importActual below) needs
// these at init or render time.
vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  redirect: (args: unknown) => {
    throw new Error(`redirect:${JSON.stringify(args)}`);
  },
  permanentRedirect: (args: unknown) => {
    throw new Error(`permanentRedirect:${JSON.stringify(args)}`);
  },
}));

import UnauthorizedPage from "../page";

// The suite-level vi.mock replaces @/i18n/navigation, so the real Link is
// loaded lazily where it is rendered against locale prefixing.
const { Link } = await vi.importActual<typeof import("@/i18n/navigation")>(
  "@/i18n/navigation",
);

afterEach(cleanup);

describe("unauthorized page", () => {
  it("explains the role denial and links home through the i18n Link", () => {
    render(<UnauthorizedPage />);

    expect(
      screen.getByRole("heading", { name: "Unauthorized" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your account does not have access to this page."),
    ).toBeInTheDocument();
    const home = screen.getByRole("link", { name: "Back to home" });
    expect(home).toHaveAttribute("data-test-id", "i18n-link");
    expect(home).toHaveAttribute("href", "/");
  });

  it("renders the home link with the real i18n Link as a locale-prefixed href", () => {
    // The mock above carries the marker but cannot prove locale prefixing.
    // This renders the real Link (createNavigation in @/i18n/navigation)
    // inside the real-messages provider and pins the prefixed home href.
    render(
      <NextIntlClientProvider
        locale="en"
        messages={
          enMessages as React.ComponentProps<
            typeof NextIntlClientProvider
          >["messages"]
        }
      >
        <Link href="/">Back to home</Link>
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/en");
  });
});
