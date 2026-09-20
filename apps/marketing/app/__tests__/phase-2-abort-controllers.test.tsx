// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CampaignsPage from "@/campaigns/page";
import CampaignDetailPage from "@/campaigns/[id]/page";
import SettingsPage from "@/settings/page";

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({
    user: { role: "ADMIN" },
    isAuthenticated: true,
    isForbidden: false,
    isLoading: false,
  }),
}));

const campaignId = "11111111-1111-4111-8111-111111111111";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: campaignId }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Inspects every recorded fetch call and returns its AbortSignal, if any.
 * @param mock The vi.fn() that stands in for fetch.
 * @returns AbortSignal when the call passed one, otherwise undefined.
 */
function readSignal(mock: ReturnType<typeof vi.fn>): AbortSignal | undefined {
  for (const call of mock.mock.calls) {
    const init = call[1] as RequestInit | undefined;
    if (init && init.signal instanceof AbortSignal) return init.signal;
  }
  return undefined;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("page-level fetches pass an AbortSignal", () => {
  it("settings page mount load attaches a signal to its fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const signal = readSignal(fetchMock);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("settings test connection attaches a signal to its fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsPage />);
    await screen.findByRole("button", { name: /test connection/i });

    fireEvent.change(screen.getByLabelText(/api key/i), {
      target: { value: "test-api-key" },
    });
    fetchMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const signal = readSignal(fetchMock);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("settings save attaches a signal to its fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsPage />);
    await screen.findByRole("button", { name: /save settings/i });

    fetchMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const signal = readSignal(fetchMock);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("campaigns list mount load attaches a signal to its fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignsPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const signal = readSignal(fetchMock);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("campaigns create attaches a signal to its fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValue(jsonResponse({ id: campaignId }));
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignsPage />);
    await screen.findByRole("button", { name: /create campaign/i });

    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));
    await screen.findByRole("button", { name: "Create" });

    fetchMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const signal = readSignal(fetchMock);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("campaign detail mount load attaches a signal to its fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: campaignId, type: "video", app: "reading-advantage", name: "C", status: "draft" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignDetailPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const signal = readSignal(fetchMock);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("campaign detail status update attaches a signal to its fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: campaignId, type: "video", app: "reading-advantage", name: "C", status: "draft" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignDetailPage />);
    await screen.findByText("C");

    fetchMock.mockClear();
    const moveButton = screen.getByRole("button", { name: /move to/i });
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const signal = readSignal(fetchMock);
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
