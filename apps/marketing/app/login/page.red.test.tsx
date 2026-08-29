// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSearchParams: vi.fn(),
  getMarketingMessage: vi.fn((key: string) => key),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: mocks.useSearchParams,
}));
vi.mock("@/lib/i18n", () => ({
  getMarketingMessage: mocks.getMarketingMessage,
}));

import LoginPage from "./page";

describe("Marketing login sign-in errors", () => {
  it.each([["sso", "login.errorSso"]] as const)(
    "renders the approved sign-in error for %s",
    (code, messageKey) => {
      mocks.useSearchParams.mockReturnValue(
        new URLSearchParams(`error=${code}`),
      );
      mocks.getMarketingMessage.mockImplementation((key: string) => key);

      render(<LoginPage />);

      const alerts = screen.getAllByRole("alert");
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent(messageKey);
    },
  );

  it("ignores an unknown sign-in error code", () => {
    mocks.useSearchParams.mockReturnValue(
      new URLSearchParams("error=unknown"),
    );
    mocks.getMarketingMessage.mockImplementation((key: string) => key);

    render(<LoginPage />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
