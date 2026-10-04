// @vitest-environment jsdom
/**
 * Class sign-in panel on the teacher class page (primary_student_login_20261003, Phase 3).
 * The panel reads the live roster route and polls it every 10 seconds while the page is visible.
 */
import "@testing-library/jest-dom/vitest";
import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassLoginPanel } from "../teacher/class-login/class-login-panel";
import { renderWithMessages } from "./helpers/render-with-messages";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const roster = {
  classroomName: "P3A",
  picturePasswordEnabled: true,
  openSession: null,
  students: [{ userId: "u1", name: "Ann Smith", username: "p3a1", hasPicturePassword: true, hasCardToken: false, signedIn: false, lastSeenAt: null }],
};
const fetchMock = vi.fn();
const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const calls = (path: string) => fetchMock.mock.calls.filter(([url]) => url === `/api/auth/student/${path}`).length;
const rosterCalls = () => calls("roster");
let visibility: DocumentVisibilityState = "visible";

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string) => respond(200, url.endsWith("/lockouts") ? { locked: [] } : roster));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ClassLoginPanel", () => {
  it("loads the roster and the lockouts and shows the start control and the students", async () => {
    renderWithMessages(<ClassLoginPanel classroomId={CLASS_ID} />);
    expect(screen.getByText("Loading class sign-in…")).toBeInTheDocument();
    await flush();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/roster",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ classroomId: CLASS_ID }) }),
    );
    expect(screen.getByRole("heading", { name: "Class sign-in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start class" })).toBeInTheDocument();
    expect(calls("lockouts")).toBe(1);
    expect(screen.getByRole("row", { name: /Ann Smith/ })).toBeInTheDocument();
  });

  it("polls every 10 seconds while the page is visible and stops while it is hidden", async () => {
    renderWithMessages(<ClassLoginPanel classroomId={CLASS_ID} />);
    await flush();
    expect(rosterCalls()).toBe(1);
    await act(async () => void vi.advanceTimersByTime(10_000));
    await flush();
    expect(rosterCalls()).toBe(2);
    expect(calls("lockouts")).toBe(2);

    visibility = "hidden";
    await act(async () => void vi.advanceTimersByTime(30_000));
    await flush();
    expect(rosterCalls()).toBe(2);

    // Coming back to the page refreshes at once.
    visibility = "visible";
    await act(async () => void document.dispatchEvent(new Event("visibilitychange")));
    await flush();
    expect(rosterCalls()).toBe(3);
  });

  it("announces a load error", async () => {
    fetchMock.mockImplementation(() => respond(403, { code: "forbidden" }));
    renderWithMessages(<ClassLoginPanel classroomId={CLASS_ID} />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("You cannot manage this class.");
  });
});
