// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isLoading: false },
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

  it("ignores an unknown sign-in error code", () => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams("error=unknown"));

    render(<HomePage />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
