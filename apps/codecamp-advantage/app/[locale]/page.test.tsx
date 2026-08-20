import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dashboardQuery: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));
vi.mock("@/components/auth-entry", () => ({
  AuthEntry: () => <div>auth-entry</div>,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    codecamp: {
      dashboard: {
        useQuery: mocks.dashboardQuery,
      },
    },
  },
}));
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: mocks.useSearchParams,
}));

import HomePage from "./page";

const approvedErrors = [
  ["sso", "signInErrorSso"],
  ["forbidden", "signInErrorForbidden"],
  ["session_check_failed", "signInErrorSessionCheckFailed"],
  ["legacy_auth_active", "signInErrorLegacyAuthActive"],
] as const;

describe("Codecamp landing sign-in errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dashboardQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it.each(approvedErrors)("renders the approved sign-in error for %s", (code, messageKey) => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams(`error=${code}`));

    render(<HomePage />);

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(messageKey);
  });

  it("ignores an unknown sign-in error code", () => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams("error=unknown"));

    render(<HomePage />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
