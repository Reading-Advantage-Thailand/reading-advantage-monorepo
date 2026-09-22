// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VideoProductionPage from "@/campaigns/[id]/video/page";

const campaign = {
  id: "campaign-1111-2222-3333",
  name: "Summer Reading Push",
  app: "reading-advantage",
};

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: campaign.id }),
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

describe("video topic research error messages", () => {
  it("shows the server message for a 400 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes(`/api/campaigns/${campaign.id}`)) {
          return jsonResponse(campaign);
        }
        if (url.includes("/api/video/projects")) return jsonResponse([]);
        if (url.includes("/api/video/research-topics")) {
          return jsonResponse(
            { message: "LLM not configured. Please set up API key in Settings." },
            400,
          );
        }
        return jsonResponse({ message: "Not found" }, 404);
      }),
    );

    render(<VideoProductionPage />);
    expect(
      await screen.findByText(`Video Production: ${campaign.name}`),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Research Topics" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "LLM not configured. Please set up API key in Settings.",
    );
  });

  it("shows the server shortfall count for a 422 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes(`/api/campaigns/${campaign.id}`)) {
          return jsonResponse(campaign);
        }
        if (url.includes("/api/video/projects")) return jsonResponse([]);
        if (url.includes("/api/video/research-topics")) {
          return jsonResponse(
            {
              code: "TOPIC_RESEARCH_SHORTFALL",
              message:
                "Topic research produced fewer than five distinct new topics (2 found)",
              expectedCount: 5,
              actualCount: 2,
            },
            422,
          );
        }
        return jsonResponse({ message: "Not found" }, 404);
      }),
    );

    render(<VideoProductionPage />);
    expect(
      await screen.findByText(`Video Production: ${campaign.name}`),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Research Topics" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("2 found");
  });

  it("keeps the generic message for non-400 research failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes(`/api/campaigns/${campaign.id}`)) {
          return jsonResponse(campaign);
        }
        if (url.includes("/api/video/projects")) return jsonResponse([]);
        if (url.includes("/api/video/research-topics")) {
          return jsonResponse({ message: "Upstream unavailable" }, 503);
        }
        return jsonResponse({ message: "Not found" }, 404);
      }),
    );

    render(<VideoProductionPage />);
    expect(
      await screen.findByText(`Video Production: ${campaign.name}`),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Research Topics" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Topic research did not produce five new topics. Please try again.",
    );
  });
});
