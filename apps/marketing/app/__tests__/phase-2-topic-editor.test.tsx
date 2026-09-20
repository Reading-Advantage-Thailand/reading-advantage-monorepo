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

describe("video topic editor", () => {
  it("keeps edits controlled until the topic Save button is used", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes(`/api/campaigns/${campaign.id}`)) {
          return jsonResponse(campaign);
        }
        if (url.includes("/api/video/projects")) return jsonResponse([]);
        if (url.includes("/api/video/research-topics")) {
          return jsonResponse({ topics: ["Original topic"] });
        }
        return jsonResponse({ message: "Not found" }, 404);
      }),
    );

    render(<VideoProductionPage />);
    expect(
      await screen.findByText(`Video Production: ${campaign.name}`),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Research Topics" }));
    expect(await screen.findByText("Original topic")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const editor = screen.getByDisplayValue("Original topic");
    fireEvent.change(editor, { target: { value: "Updated topic" } });

    expect(screen.getByDisplayValue("Updated topic")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Script" }));

    expect(await screen.findByText("Updated topic")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Updated topic")).not.toBeInTheDocument();
  });
});
