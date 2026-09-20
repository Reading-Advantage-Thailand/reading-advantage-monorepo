// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CampaignsPage from "@/campaigns/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("campaigns create panel form", () => {
  it("wraps the create panel in a form and submits with the typed name", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValue(jsonResponse({ id: "campaign-1" }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /create campaign/i }));

    const form = screen
      .getByLabelText(/name/i)
      .closest("form");
    expect(form).not.toBeNull();

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Autumn drive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/campaigns",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("keeps the Create button disabled while the name is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /create campaign/i }));

    const createButton = await screen.findByRole("button", { name: "Create" });
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/campaigns",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
