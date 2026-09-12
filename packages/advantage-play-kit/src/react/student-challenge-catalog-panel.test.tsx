import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudentChallengeCatalogPanel } from "./student-challenge-catalog-panel.js";

const classOne = "11111111-1111-4111-8111-111111111111";
const classTwo = "22222222-2222-4222-8222-222222222222";
const challengeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fetchMock = vi.fn<typeof fetch>();

/** Creates a JSON response for one catalog request. */
function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Creates one active reading challenge summary. */
function challenge(classId = classOne, title = "River run") {
  return {
    id: challengeId,
    classId,
    title,
    gameId: "wizard-vs-zombie",
    gameVersion: "2026-09-09.1",
    contentMode: "vocabulary",
    contentLocale: "th",
    contentItemCount: 4,
    seed: 29,
    difficulty: "medium",
    modality: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
    startsAt: "2026-09-01T00:00:00.000Z",
    expiresAt: "2026-10-01T00:00:00.000Z",
    target: 10,
    contributionCount: 3,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("StudentChallengeCatalogPanel", () => {
  it("does not fetch or render without an authenticated owner", () => {
    const { container } = render(<StudentChallengeCatalogPanel locale="en" games={{}} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("links only an active installed reading challenge", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ classes: [{ id: classOne, name: "Class A" }], hasMore: false }))
      .mockResolvedValueOnce(response({ challenges: [challenge()] }));

    render(<StudentChallengeCatalogPanel
      ownerKey="school-1:student-1"
      locale="th"
      basePath="/games"
      games={{ "wizard-vs-zombie": { title: "Wizard vs. Zombie", version: "2026-09-09.1" } }}
    />);

    const link = await screen.findByRole("link", { name: "Play challenge" });
    expect(link).toHaveAttribute("href", `/games/th/student/games/apk/wizard-vs-zombie?challengeId=${challengeId}`);
    expect(screen.getByText("Wizard vs. Zombie")).toBeInTheDocument();
    expect(screen.getByText("Class progress: 3/10")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("wizard-vs-zombie")).not.toBeInTheDocument();
  });

  it("ignores a prior class response after the selected class changes", async () => {
    let resolveFirstChallenges: ((value: Response) => void) | undefined;
    const firstChallenges = new Promise<Response>((resolve) => { resolveFirstChallenges = resolve; });
    fetchMock
      .mockResolvedValueOnce(response({ classes: [{ id: classOne, name: "Class A" }, { id: classTwo, name: "Class B" }], hasMore: false }))
      .mockReturnValueOnce(firstChallenges)
      .mockResolvedValueOnce(response({ challenges: [challenge(classTwo, "Current class")] }));

    render(<StudentChallengeCatalogPanel ownerKey="owner-1" locale="en" games={{ "wizard-vs-zombie": { title: "Wizard", version: "2026-09-09.1" } }} />);
    const selector = await screen.findByRole("combobox", { name: "Class" });
    fireEvent.change(selector, { target: { value: classTwo } });
    await screen.findByText("Current class");

    resolveFirstChallenges?.(response({ challenges: [challenge(classOne, "Prior class")] }));
    await waitFor(() => expect(screen.queryByText("Prior class")).not.toBeInTheDocument());
    expect(screen.getByText("Current class")).toBeInTheDocument();
  });

  it("retries a failed class request and shows an empty challenge list", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ error: "unavailable" }, 503))
      .mockResolvedValueOnce(response({ classes: [{ id: classOne, name: "Class A" }], hasMore: false }))
      .mockResolvedValueOnce(response({ challenges: [] }));

    render(<StudentChallengeCatalogPanel ownerKey="owner-1" locale="en" games={{}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Classes could not be loaded.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("No challenges are available.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/apk/challenges/classes?limit=25&offset=0",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});
