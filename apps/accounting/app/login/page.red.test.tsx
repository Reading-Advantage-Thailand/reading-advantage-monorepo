// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useSearchParams: mocks.useSearchParams,
}));

import LoginPage from "@/app/login/page";

describe("Accounting login page (SSO parity)", () => {
  it("carries the current path and query as an encoded returnTo on the sign-in link", () => {
    mocks.usePathname.mockReturnValue("/login");
    mocks.useSearchParams.mockReturnValue(
      new URLSearchParams("returnTo=%2Fexpenses%3Ftab%3Dopen"),
    );

    render(<LoginPage />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/api/auth/company/start?returnTo=%2Fexpenses%3Ftab%3Dopen",
    );
  });

  it.each([["sso"], ["forbidden"]] as const)(
    "renders a visible message for the %s error code",
    (code) => {
      mocks.usePathname.mockReturnValue("/login");
      mocks.useSearchParams.mockReturnValue(
        new URLSearchParams(`error=${code}`),
      );

      render(<LoginPage />);

      expect(screen.getByRole("alert")).toHaveTextContent(/sign|access|account/i);
    },
  );
});
