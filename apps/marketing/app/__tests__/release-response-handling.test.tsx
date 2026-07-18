// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CampaignsPage from "@/campaigns/page";
import CampaignDetailPage from "@/campaigns/[id]/page";
import VideoProductionPage from "@/campaigns/[id]/video/page";
import SettingsPage from "@/settings/page";

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

const campaign = {
  id: campaignId,
  type: "video",
  app: "reading-advantage",
  name: "Release Campaign",
  status: "draft",
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Marketing UI non-success response handling", () => {
  it("surfaces campaign-list failures without parsing the error response", async () => {
    const json = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json } as unknown as Response),
    );

    render(<CampaignsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to load campaigns/i);
    expect(json).not.toHaveBeenCalled();
  });

  it("does not mutate campaign state after a failed status update", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(campaign))
      .mockResolvedValueOnce(jsonResponse({ message: "Unavailable" }, 503));
    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignDetailPage />);
    fireEvent.click(await screen.findByRole("button", { name: /move to in-progress/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to update campaign status/i);
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("does not report saved topics after the save endpoint fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === `/api/campaigns/${campaignId}`) return jsonResponse(campaign);
      if (url.startsWith("/api/video/projects?")) return jsonResponse([]);
      if (url === "/api/video/research-topics") {
        return jsonResponse({ topics: ["หนึ่ง", "สอง", "สาม", "สี่", "ห้า"] });
      }
      if (url === "/api/video/save-topics" && init?.method === "POST") {
        return jsonResponse({ message: "Unavailable" }, 503);
      }
      return jsonResponse({ message: "Not found" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<VideoProductionPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Research Topics" }));
    const approveButtons = await screen.findAllByRole("button", { name: "Approve" });
    fireEvent.click(approveButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save Approved Topics" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to save approved topics/i);
    expect(screen.queryByText(/approved topics saved/i)).not.toBeInTheDocument();
  });

  it("surfaces administrator denial without parsing settings data", async () => {
    const json = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json } as unknown as Response),
    );

    render(<SettingsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/administrator access is required/i);
    expect(json).not.toHaveBeenCalled();
  });
});
