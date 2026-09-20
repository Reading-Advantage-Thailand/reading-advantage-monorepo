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

const script = Array.from({ length: 5 }, (_, index) => ({
  narration: `Narration ${index + 1}`,
  imagePrompt: `Image ${index + 1}`,
  motionDirection: "Static",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: campaign.id }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubVideoFetch() {
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
      if (url.includes("/api/video/generate-script")) {
        return jsonResponse({ script });
      }
      return jsonResponse({ message: "Not found" }, 404);
    }),
  );
}

async function createUnsavedScript() {
  render(<VideoProductionPage />);
  expect(
    await screen.findByText(`Video Production: ${campaign.name}`),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Research Topics" }));
  expect(await screen.findByText("Original topic")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  fireEvent.click(screen.getByRole("button", { name: "Use for Script" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate Script" }));
  expect(await screen.findByText("Narration 1")).toBeInTheDocument();
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("unsaved script guard", () => {
  it("cancels beforeunload after script generation", async () => {
    stubVideoFetch();
    await createUnsavedScript();

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("asks before an internal navigation and cancels when declined", async () => {
    stubVideoFetch();
    await createUnsavedScript();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const link = document.createElement("a");
    link.href = "/campaigns";
    link.textContent = "Leave";
    document.body.append(link);

    fireEvent.click(link);

    expect(confirm).toHaveBeenCalledWith(
      "You have unsaved script changes. Leave this page anyway?",
    );
    expect(confirm).toHaveBeenCalledOnce();
  });
});
