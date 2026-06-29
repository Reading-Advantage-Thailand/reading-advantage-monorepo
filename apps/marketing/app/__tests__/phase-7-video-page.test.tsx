// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  cleanup,
} from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import VideoProductionPage from "@/campaigns/[id]/video/page";

// Mock the Next.js navigation hook so the page receives a campaign id
// without requiring a full App Router runtime.
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "campaign-1111-2222-3333" }),
}));

const campaign = {
  id: "campaign-1111-2222-3333",
  name: "Summer Reading Push",
  app: "reading-advantage",
};

const researchedTopics = [
  "Reading for fun every day",
  "Daily 10-minute reading practice",
];

const scriptFixture = [
  {
    narration: "ยินดีต้อนรับสู่ Reading Advantage",
    imagePrompt: "A bright Thai classroom",
    motionDirection: "Slow zoom in",
  },
  {
    narration: "แพลตฟอร์มนี้ช่วยให้นักเรียนฝึกอ่าน",
    imagePrompt: "A student using a tablet",
    motionDirection: "Gentle pan left to right",
  },
  {
    narration: "ครูติดตามความก้าวหน้าได้แบบเรียลไทม์",
    imagePrompt: "Teacher dashboard",
    motionDirection: "Static frame",
  },
  {
    narration: "บทเรียนปรับระดับตามความสามารถ",
    imagePrompt: "Adaptive path",
    motionDirection: "Scroll along path",
  },
  {
    narration: "เริ่มต้นการเรียนรู้ที่สนุกวันนี้",
    imagePrompt: "Happy students",
    motionDirection: "Slow dolly out",
  },
];

const savedProject = { id: "project-4444-5555-6666" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Phase 7: Campaign Video Page — component interactions", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes(`/api/campaigns/${campaign.id}`)) {
        return jsonResponse(campaign);
      }
      if (url.includes("/api/video/research-topics")) {
        return jsonResponse({ topics: researchedTopics });
      }
      if (url.includes("/api/video/generate-script")) {
        return jsonResponse({ script: scriptFixture });
      }
      if (url.includes("/api/video/projects")) {
        return jsonResponse(savedProject);
      }

      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
      });
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("loads and displays the campaign name", async () => {
    render(<VideoProductionPage />);

    await waitFor(() => {
      expect(
        screen.getByText(`Video Production: ${campaign.name}`),
      ).toBeInTheDocument();
    });
  });

  async function waitForCampaign() {
    await waitFor(() => {
      expect(
        screen.getByText(`Video Production: ${campaign.name}`),
      ).toBeInTheDocument();
    });
  }

  it("fetches proposed topics when the user clicks Research Topics", async () => {
    render(<VideoProductionPage />);
    await waitForCampaign();

    fireEvent.click(screen.getByRole("button", { name: /Research Topics/i }));

    await waitFor(() => {
      researchedTopics.forEach((topic) => {
        expect(screen.getByText(topic)).toBeInTheDocument();
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/video/research-topics",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining(campaign.app),
      }),
    );
  });

  it("lets the user approve a topic, select it, and enables script generation", async () => {
    render(<VideoProductionPage />);
    await waitForCampaign();

    fireEvent.click(screen.getByRole("button", { name: /Research Topics/i }));

    await waitFor(() =>
      expect(screen.getByText(researchedTopics[0])).toBeInTheDocument(),
    );

    const approveButtons = screen.getAllByRole("button", { name: /Approve/i });
    fireEvent.click(approveButtons[0]);

    const useButton = await screen.findByRole("button", {
      name: /Use for Script/i,
    });
    fireEvent.click(useButton);

    const generateButton = screen.getByRole("button", {
      name: /Generate Script/i,
    });
    expect(generateButton).not.toBeDisabled();
  });

  it("generates a script for the selected approved topic and shows scenes", async () => {
    render(<VideoProductionPage />);
    await waitForCampaign();

    fireEvent.click(screen.getByRole("button", { name: /Research Topics/i }));
    await waitFor(() =>
      expect(screen.getByText(researchedTopics[0])).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Approve/i })[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Use for Script/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generate Script/i }));

    await waitFor(() =>
      expect(screen.getByText(/Scene 1/)).toBeInTheDocument(),
    );

    scriptFixture.forEach((scene) => {
      expect(screen.getByDisplayValue(scene.narration)).toBeInTheDocument();
    });
  });

  it("displays the selected approved topic inside Step 3 before generation", async () => {
    render(<VideoProductionPage />);
    await waitForCampaign();

    fireEvent.click(screen.getByRole("button", { name: /Research Topics/i }));
    await waitFor(() =>
      expect(screen.getByText(researchedTopics[0])).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Approve/i })[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Use for Script/i }));

    const step3 = screen.getByRole("heading", { name: /Step 3/i }).closest("div");
    expect(step3).toBeTruthy();
    expect(within(step3 as HTMLElement).getByText(researchedTopics[0])).toBeInTheDocument();
  });

  it("reorders scenes using the move-down control", async () => {
    render(<VideoProductionPage />);
    await waitForCampaign();

    fireEvent.click(screen.getByRole("button", { name: /Research Topics/i }));
    await waitFor(() =>
      expect(screen.getByText(researchedTopics[0])).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Approve/i })[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Use for Script/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generate Script/i }));

    await waitFor(() =>
      expect(screen.getByText(/Scene 1/)).toBeInTheDocument(),
    );

    const moveDownButtons = screen.getAllByRole("button", { name: "↓" });
    fireEvent.click(moveDownButtons[0]);

    await waitFor(() => {
      const narrationFields = screen.getAllByLabelText(
        /Narration \(Thai\)/i,
      ) as HTMLTextAreaElement[];
      expect(narrationFields[0].value).toBe(scriptFixture[1].narration);
      expect(narrationFields[1].value).toBe(scriptFixture[0].narration);
    });
  });

  it("saves the project and shows the returned project id", async () => {
    render(<VideoProductionPage />);
    await waitForCampaign();

    fireEvent.click(screen.getByRole("button", { name: /Research Topics/i }));
    await waitFor(() =>
      expect(screen.getByText(researchedTopics[0])).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Approve/i })[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Use for Script/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generate Script/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Save Script/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Script/i }));

    await waitFor(() =>
      expect(
        screen.getByText(`Saved as project ${savedProject.id}`),
      ).toBeInTheDocument(),
    );

    const lastCall = fetchMock.mock.lastCall;
    expect(lastCall).toBeTruthy();
    const [url, options] = lastCall as [string, RequestInit];
    expect(url).toBe("/api/video/projects");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body as string);
    expect(body.campaignId).toBe(campaign.id);
    expect(body.topic).toBe(researchedTopics[0]);
    expect(body.script).toEqual(scriptFixture);
  });
});
