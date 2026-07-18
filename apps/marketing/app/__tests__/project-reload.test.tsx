// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VideoProductionPage from "@/campaigns/[id]/video/page";

const campaignId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: campaignId }),
}));

const campaign = {
  id: campaignId,
  name: "Existing Project Campaign",
  app: "reading-advantage",
};

const persistedScript = Array.from({ length: 5 }, (_, index) => ({
  narration: `คำบรรยายที่บันทึกไว้ ${index + 1}`,
  imagePrompt: `Persisted image prompt ${index + 1}`,
  motionDirection: `Persisted motion ${index + 1}`,
}));

const persistedProject = {
  id: projectId,
  campaignId,
  topic: "โครงการอ่านภาษาอังกฤษ",
  script: persistedScript,
  status: "draft",
  createdAt: "2026-07-18T12:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Marketing project reload and edit workflow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const method = init?.method ?? "GET";

        if (url === `/api/campaigns/${campaignId}`) {
          return jsonResponse(campaign);
        }
        if (
          url === `/api/video/projects?campaignId=${campaignId}` &&
          method === "GET"
        ) {
          return jsonResponse([persistedProject]);
        }
        if (url === "/api/video/projects" && method === "PATCH") {
          const body = JSON.parse(String(init?.body));
          return jsonResponse({
            ...persistedProject,
            ...body,
          });
        }

        return jsonResponse({ message: "Not found" }, 404);
      },
    );

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("offers an accessible project selector and restores the selected script", async () => {
    render(<VideoProductionPage />);

    const projectSelector = await screen.findByRole("combobox", {
      name: /existing projects/i,
    });
    expect(
      screen.getByRole("option", { name: persistedProject.topic }),
    ).toBeInTheDocument();

    fireEvent.change(projectSelector, { target: { value: projectId } });

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(persistedScript[0].narration),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/loaded project 22222222-2222-4222-8222-222222222222/i),
    ).toBeInTheDocument();
  });

  it("persists edits to a restored project with PATCH", async () => {
    render(<VideoProductionPage />);

    const projectSelector = await screen.findByRole("combobox", {
      name: /existing projects/i,
    });
    fireEvent.change(projectSelector, { target: { value: projectId } });

    const firstNarration = await screen.findByDisplayValue(
      persistedScript[0].narration,
    );
    fireEvent.change(firstNarration, {
      target: { value: "คำบรรยายที่แก้ไขแล้ว" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update script/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/video/projects",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/video/projects" &&
        (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCall).toBeTruthy();
    const payload = JSON.parse(
      String((patchCall?.[1] as RequestInit | undefined)?.body),
    );
    expect(payload).toEqual(
      expect.objectContaining({
        id: projectId,
        campaignId,
        topic: persistedProject.topic,
      }),
    );
    expect(payload.script[0].narration).toBe("คำบรรยายที่แก้ไขแล้ว");
    expect(
      await screen.findByText(`Updated project ${projectId}`),
    ).toBeInTheDocument();
  });

  it("shows a retryable message when project loading returns another non-OK response", async () => {
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === `/api/campaigns/${campaignId}`) {
          return jsonResponse(campaign);
        }
        return jsonResponse({ message: "Unavailable" }, 503);
      },
    );

    render(<VideoProductionPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /failed to load saved projects. please try again/i,
    );
  });

  it("shows a clear access message when project loading returns 403", async () => {
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === `/api/campaigns/${campaignId}`) {
          return jsonResponse(campaign);
        }
        return jsonResponse({ message: "Marketing access required" }, 403);
      },
    );

    render(<VideoProductionPage />);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/do not have access to this campaign's projects/i);
  });
});
