// @vitest-environment jsdom
/**
 * Start/End class control (primary_student_login_20261003, Phase 3 task 1, FR-1).
 * The control starts and ends the class login session through the Phase 2 routes and shows
 * the code once, big enough to project.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassSessionControl } from "../teacher/class-login/class-session-control";
import { renderWithMessages, withMessages } from "./helpers/render-with-messages";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const EXPIRES = "2026-10-05T07:45:00.000Z";
const fetchMock = vi.fn();
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("ClassSessionControl", () => {
  it("starts the class and shows the code and its end time", async () => {
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    expect(screen.getByText("Start the class to show a sign-in code for your students.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/class-session/start",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ classroomId: CLASS_ID }) }),
    );
    // The roster refresh after the start reports the new open session.
    rerender(withMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: SESSION_ID, expiresAt: EXPIRES }} fetchedAt={Date.now() + 1000} onChange={onChange} />));
    expect(screen.getByText("ABCDEF")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Class code A B C D E F" })).toBeInTheDocument();
    expect(screen.getByText(/^Open until /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End class" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
  });

  it("keeps the new code when the roster read after the start fails", async () => {
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    // The panel refresh catches its own error: the roster and its read time stay the same.
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(await screen.findByText("ABCDEF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End class" })).toBeInTheDocument();
  });

  it("keeps the new code after New code when the next roster read fails", async () => {
    const OTHER_ID = "44444444-4444-4444-8444-444444444444";
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "GHJKMN", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: OTHER_ID, expiresAt: EXPIRES }} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "New code" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(await screen.findByText("GHJKMN")).toBeInTheDocument();
  });

  it.each([
    ["no session", null],
    ["another session", { id: "44444444-4444-4444-8444-444444444444", expiresAt: EXPIRES }],
  ])("hides the code when a later roster read reports %s", async (_label, openSession) => {
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(await screen.findByText("ABCDEF")).toBeInTheDocument();
    rerender(withMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={openSession} fetchedAt={Date.now() + 1000} onChange={onChange} />));
    await waitFor(() => expect(screen.queryByText("ABCDEF")).not.toBeInTheDocument());
  });

  it("explains an open session whose code is no longer known and offers a new code", () => {
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: SESSION_ID, expiresAt: EXPIRES }} fetchedAt={1} onChange={vi.fn()} />);
    expect(screen.getByText(/The code shows only once/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start class" })).not.toBeInTheDocument();
  });

  it("ends the class", async () => {
    fetchMock.mockReturnValue(json(200, { closed: 1 }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={{ id: SESSION_ID, expiresAt: EXPIRES }} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "End class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/student/class-session/end", expect.objectContaining({ method: "POST" }));
  });

  it("announces an error from the server", async () => {
    fetchMock.mockReturnValue(json(403, { message: "Not allowed.", code: "forbidden" }));
    const onChange = vi.fn();
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot manage this class.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows Thai copy", () => {
    renderWithMessages(<ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={vi.fn()} />, { locale: "th" });
    expect(screen.getByRole("button", { name: "เริ่มชั้นเรียน" })).toBeInTheDocument();
  });
});
