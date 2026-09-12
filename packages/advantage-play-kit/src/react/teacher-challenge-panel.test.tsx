import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TeacherChallengePanel } from "./teacher-challenge-panel.js";

const classId = "11111111-1111-4111-8111-111111111111";
const challengeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fetchMock = vi.fn<typeof fetch>();

/** Creates one JSON response. */
function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Fills the fixed reading challenge fields. */
function fillForm(): void {
  fireEvent.change(screen.getByLabelText("Challenge title"), { target: { value: "River goal" } });
  fireEvent.change(screen.getByLabelText("English answer"), { target: { value: "river" } });
  fireEvent.change(screen.getByLabelText("Thai prompt"), { target: { value: "แม่น้ำ" } });
  fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2026-09-10T09:00" } });
  fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2026-09-11T09:00" } });
  fireEvent.change(screen.getByLabelText("Target players"), { target: { value: "20" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("crypto", {
    getRandomValues: (values: Uint32Array) => { values[0] = 7; values[1] = 9; return values; },
    randomUUID: vi.fn()
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("20000000-0000-4000-8000-000000000002"),
  });
});

afterEach(() => {
  cleanup(); vi.unstubAllGlobals(); fetchMock.mockReset();
});

describe("TeacherChallengePanel", () => {
  it("does not fetch or render without an authenticated owner", () => {
    const { container } = render(<TeacherChallengePanel games={{}} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a fixed Thai-to-English reading challenge", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ classes: [{ id: classId, name: "Class A" }], hasMore: false }))
      .mockResolvedValueOnce(response({
        id: challengeId, classId, title: "River goal", gameId: "wizard-vs-zombie", gameVersion: "2026-09-09.1",
        contentMode: "vocabulary", contentLocale: "th", contentItemCount: 1, seed: 7 * 0x100000 + 9,
        difficulty: "medium", modality: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
        startsAt: new Date("2026-09-10T09:00").toISOString(), expiresAt: new Date("2026-09-11T09:00").toISOString(), target: 20, contributionCount: 0,
      }, 201));
    render(<TeacherChallengePanel ownerKey="teacher-1" games={{ "wizard-vs-zombie": { title: "Wizard", version: "2026-09-09.1" } }} />);
    await screen.findByRole("option", { name: "Class A" });
    fillForm(); fireEvent.click(screen.getByRole("button", { name: "Create challenge" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Challenge saved: River goal");
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body).toMatchObject({ classId, gameId: "wizard-vs-zombie", gameVersion: "2026-09-09.1", difficulty: "medium", teacherParticipationEnabled: false, target: 20, content: { mode: "vocabulary", items: [{ term: "river", translation: "แม่น้ำ" }] } });
    expect(body).not.toHaveProperty("schoolId"); expect(body).not.toHaveProperty("userId"); expect(body).not.toHaveProperty("id");
    fireEvent.click(screen.getByRole("button", { name: "Create challenge" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Create another challenge" }));
    expect(screen.getByLabelText("Challenge title")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create challenge" })).toBeEnabled();
  });

  it("retains the form when creation cannot be confirmed", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ classes: [{ id: classId, name: "Class A" }], hasMore: false }))
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce(response({ challenges: [] }));
    render(<TeacherChallengePanel ownerKey="teacher-1" games={{ "wizard-vs-zombie": { title: "Wizard", version: "2026-09-09.1" } }} />);
    await screen.findByRole("option", { name: "Class A" });
    fillForm(); fireEvent.click(screen.getByRole("button", { name: "Create challenge" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Creation could not be confirmed."));
    expect(screen.getByLabelText("Challenge title")).toHaveValue("River goal");
    expect(screen.getByLabelText("English answer")).toHaveValue("river");
  });

  it("loads and refreshes existing summaries after an ambiguous creation", async () => {
    const existing = {
      id: challengeId, classId, title: "Earlier goal", gameId: "wizard-vs-zombie", gameVersion: "2026-09-09.1",
      contentMode: "vocabulary", contentLocale: "th", contentItemCount: 1, seed: 12, difficulty: "medium",
      modality: { modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true },
      startsAt: "2026-09-10T01:00:00.000Z", expiresAt: "2026-09-11T01:00:00.000Z", target: 20, contributionCount: 0,
    };
    fetchMock
      .mockResolvedValueOnce(response({ classes: [{ id: classId, name: "Class A" }], hasMore: false }))
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce(response({ challenges: [existing] }))
      .mockResolvedValueOnce(response({ challenges: [{ ...existing, title: "Current goal" }] }));
    render(<TeacherChallengePanel ownerKey="teacher-1" games={{ "wizard-vs-zombie": { title: "Wizard", version: "2026-09-09.1" } }} />);
    await screen.findByRole("option", { name: "Class A" });
    fillForm(); fireEvent.click(screen.getByRole("button", { name: "Create challenge" }));

    expect(await screen.findByText("Earlier goal")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(3, `/api/v1/apk/challenges?classId=${classId}&limit=25&offset=0`, expect.objectContaining({ credentials: "same-origin" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh existing challenges" }));
    expect(await screen.findByText("Current goal")).toBeInTheDocument();
    expect(screen.queryByText("Earlier goal")).not.toBeInTheDocument();
  });

  it("reuses one creation key for an unchanged retry and replaces it after an edit", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ classes: [{ id: classId, name: "Class A" }], hasMore: false }))
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce(response({ challenges: [] }))
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce(response({ challenges: [] }))
      .mockResolvedValueOnce(response({ error: "rejected" }, 400));
    render(<TeacherChallengePanel ownerKey="teacher-1" games={{ "wizard-vs-zombie": { title: "Wizard", version: "2026-09-09.1" } }} />);
    await screen.findByRole("option", { name: "Class A" });
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Create challenge" }));
    await screen.findByText("No existing challenges were found.");
    fireEvent.click(screen.getByRole("button", { name: "Create challenge" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const firstBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    const retryBody = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));
    expect(retryBody).toEqual(firstBody);

    fireEvent.change(screen.getByLabelText("Challenge title"), { target: { value: "Edited goal" } });
    fireEvent.click(screen.getByRole("button", { name: "Create challenge" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    const editedBody = JSON.parse(String(fetchMock.mock.calls[5]?.[1]?.body));
    expect(editedBody.creationKey).not.toBe(firstBody.creationKey);
    expect(editedBody.title).toBe("Edited goal");
  });
});
