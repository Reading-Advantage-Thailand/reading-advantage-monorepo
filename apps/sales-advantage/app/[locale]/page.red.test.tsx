// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isForbidden: false, isLoading: false },
  dashboardQuery: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => mocks.auth,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: () => null,
    redirect: vi.fn(),
    usePathname: () => "/",
    useRouter: () => ({}),
    getPathname: () => "/",
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: mocks.useSearchParams,
}));
vi.mock("@/components/login-form", () => ({
  LoginForm: () => <div>login-form</div>,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    sales: {
      dashboard: {
        useQuery: mocks.dashboardQuery,
      },
    },
  },
}));

import HomePage from "./page";

describe("Sales landing sign-in errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.isAuthenticated = false;
    mocks.auth.isForbidden = false;
    mocks.auth.isLoading = false;
    mocks.dashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it.each([
    ["sso", "errorSso"],
    ["forbidden", "errorForbidden"],
  ] as const)("renders the approved sign-in error for %s", (code, messageKey) => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams(`error=${code}`));

    render(<HomePage />);

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.textContent).toContain(messageKey);
  });

  it.each([
    ["sso", "errorSso", false],
    ["forbidden", "errorForbidden", true],
  ] as const)(
    "keeps the %s sign-in error after the session check settles",
    (code, messageKey, isForbidden) => {
      mocks.useSearchParams.mockReturnValue(new URLSearchParams(`error=${code}`));
      mocks.dashboardQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Dashboard unavailable"),
      });

      const { rerender } = render(<HomePage />);
      expect(screen.getByRole("alert").textContent).toContain(messageKey);

      mocks.auth.isAuthenticated = true;
      mocks.auth.isForbidden = isForbidden;
      rerender(<HomePage />);

      expect(screen.getByRole("alert").textContent).toContain(messageKey);
      expect(screen.queryByText("unavailableTitle")).toBeNull();
    },
  );

  it("ignores an unknown sign-in error code", () => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams("error=unknown"));

    render(<HomePage />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the forbidden message from the auth client state", () => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams());
    mocks.auth.isAuthenticated = true;
    mocks.auth.isForbidden = true;

    render(<HomePage />);

    expect(screen.getByRole("alert").textContent).toContain("errorForbidden");
    expect(mocks.dashboardQuery).toHaveBeenCalledWith(undefined, {
      enabled: false,
    });
  });
});
