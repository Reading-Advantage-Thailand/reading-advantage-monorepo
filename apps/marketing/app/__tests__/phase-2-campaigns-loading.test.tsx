// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CampaignsPage from "@/campaigns/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({
    user: { role: "ADMIN" },
    isAuthenticated: true,
    isForbidden: false,
    isLoading: false,
  }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("campaign list loading and empty states", () => {
  it("shows loading while the list request is pending, then shows the empty state", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(<CampaignsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading...");

    resolveFetch(new Response(JSON.stringify([]), { status: 200 }));

    expect(await screen.findByText("No campaigns yet.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
