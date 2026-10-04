// @vitest-environment jsdom
/**
 * Live sign-in roster (primary_student_login_20261003, Phase 3 task 2, FR-3/FR-4/FR-5):
 * who is signed in, who is locked, last seen, one-tap picture-password reset, and card rotate.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RosterStudent } from "../teacher/class-login/api";
import { LiveRoster } from "../teacher/class-login/live-roster";
import { renderWithMessages } from "./helpers/render-with-messages";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-10-05T03:00:00Z").getTime();
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
const TOKEN = "B".repeat(43);
const students: RosterStudent[] = [
  { userId: "u1", name: "Ann Smith", username: "p3a1", hasPicturePassword: true, hasCardToken: true, signedIn: true, lastSeenAt: ago(2) },
  { userId: "u2", name: "Bo Jones", username: "p3a2", hasPicturePassword: false, hasCardToken: false, signedIn: false, lastSeenAt: ago(45) },
  { userId: "u3", name: "Cy", username: "p3a3", hasPicturePassword: false, hasCardToken: false, signedIn: false, lastSeenAt: null },
];
const locked = [{ userId: "u1", name: "Ann Smith", lockedUntil: new Date(NOW + 210_000).toISOString() }];
const fetchMock = vi.fn();
const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const row = (name: string) => screen.getByRole("row", { name: new RegExp(name) });

/** Renders the roster with the fixture data. */
function renderRoster(onChange = vi.fn().mockResolvedValue(undefined), locale: "en" | "th" = "en") {
  renderWithMessages(
    <LiveRoster classroomId={CLASS_ID} classroomName="P3A" students={students} locked={locked} fetchedAt={NOW} onChange={onChange} />,
    { locale },
  );
  return onChange;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("LiveRoster", () => {
  it("shows who is signed in, last seen, who is locked, and who has no picture password", () => {
    renderRoster();
    expect(screen.getByText("1 of 3 signed in")).toBeInTheDocument();
    const ann = within(row("Ann Smith"));
    expect(ann.getByText("Signed in")).toBeInTheDocument();
    expect(ann.getByText("Seen 2 minutes ago")).toBeInTheDocument();
    expect(ann.getByText("Locked, 4 min left")).toBeInTheDocument();
    expect(ann.getByText("p3a1")).toBeInTheDocument();
    const bo = within(row("Bo Jones"));
    expect(bo.getByText("Not signed in")).toBeInTheDocument();
    expect(bo.getByText("Last seen 45 minutes ago")).toBeInTheDocument();
    expect(bo.getByText("No picture password")).toBeInTheDocument();
    expect(bo.queryByText(/Locked/)).not.toBeInTheDocument();
    const cy = within(row("Cy"));
    expect(cy.getByText("Not signed in")).toBeInTheDocument();
    expect(cy.queryByText(/Last seen/)).not.toBeInTheDocument();
  });

  it("resets a picture password in one tap and shows the new pictures once", async () => {
    fetchMock.mockReturnValue(respond(200, { credentialId: "c1", pictures: [0, 1, 2] }));
    const onChange = renderRoster();
    fireEvent.click(screen.getByRole("button", { name: "Reset picture password for Ann Smith" }));
    const dialog = await screen.findByRole("dialog", { name: "New picture password" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/picture-password/reset",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ classroomId: CLASS_ID, studentUserId: "u1" }) }),
    );
    expect(within(dialog).getByText("Ann Smith")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["1red circle", "2blue square", "3green triangle"]);
    expect(onChange).toHaveBeenCalled();
  });

  it("offers Set pictures for a student without a picture password", () => {
    renderRoster();
    expect(screen.getByRole("button", { name: "Set picture password for Bo Jones" })).toBeInTheDocument();
  });

  it("gives picture passwords to every student without one", async () => {
    fetchMock.mockReturnValue(
      respond(200, [
        { credentialId: "c2", userId: "u2", name: "Bo Jones", pictures: [3, 4, 5] },
        { credentialId: "c3", userId: "u3", name: null, pictures: [6, 7, 8] },
      ]),
    );
    const onChange = renderRoster();
    fireEvent.click(screen.getByRole("button", { name: "Give picture passwords to 2 students" }));
    const dialog = await screen.findByRole("dialog", { name: "New picture password" });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/student/picture-password/assign", expect.objectContaining({ body: JSON.stringify({ classroomId: CLASS_ID }) }));
    expect(within(dialog).getByText("Bo Jones")).toBeInTheDocument();
    expect(within(dialog).getByText("Cy")).toBeInTheDocument();
    expect(within(dialog).getByText("yellow star")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalled();
  });

  it("rotates a card after a confirmation and shows the new card to print", async () => {
    fetchMock.mockReturnValue(respond(200, { credentialId: "c2", token: TOKEN }));
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const onChange = renderRoster();
    fireEvent.click(screen.getByRole("button", { name: "New card for Bo Jones" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("The old card stops working now");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole("button", { name: "Make new card" }));
    const dialog = await screen.findByRole("dialog", { name: "New QR card" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/card-token/rotate",
      expect.objectContaining({ body: JSON.stringify({ classroomId: CLASS_ID, studentUserId: "u2" }) }),
    );
    expect(within(dialog).getByRole("img", { name: "Sign-in QR code for Bo Jones" })).toBeInTheDocument();
    expect(onChange).toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalled();
  });

  it("announces a failed reset", async () => {
    fetchMock.mockReturnValue(respond(404, { code: "not_found" }));
    const onChange = renderRoster();
    fireEvent.click(screen.getByRole("button", { name: "Reset picture password for Ann Smith" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We cannot find this class or student.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows Thai copy", () => {
    renderRoster(undefined, "th");
    expect(within(row("Ann Smith")).getByText("เข้าสู่ระบบแล้ว")).toBeInTheDocument();
  });
});
