// @vitest-environment jsdom
/**
 * Class sheet print page (primary_student_login_20261003, Phase 3 task 3, FR-6): after a
 * confirmation, the class gets new initial passwords, and the sheet lists name, username, and
 * the new password once.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ClassSheet } from "../teacher/class-login/class-sheet";
import { renderWithMessages } from "./helpers/render-with-messages";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const fetchMock = vi.fn();
const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const result = {
  classroomName: "P3A",
  students: [
    { userId: "u1", name: "Ann Smith", username: "p3a1", password: "abcd2345" },
    { userId: "u2", name: "Bo Jones", username: "p3a2", password: "wxyz6789" },
  ],
  failed: [] as { userId: string; name: string }[],
};

/** Confirms the reset in the dialog. */
async function makeSheet() {
  fireEvent.click(screen.getByRole("button", { name: "Make class sheet" }));
  const confirm = await screen.findByRole("alertdialog");
  fireEvent.click(within(confirm).getByRole("button", { name: "Set new passwords" }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("ClassSheet", () => {
  it("warns before it changes anything and calls nothing on load", () => {
    renderWithMessages(<ClassSheet classroomId={CLASS_ID} />);
    expect(screen.getByRole("heading", { name: "Class sheet" })).toBeInTheDocument();
    expect(screen.getByText(/sets a new password for every student in this class/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to class" })).toHaveAttribute("href", `/teacher/class-roster/${CLASS_ID}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the teacher cancels", async () => {
    renderWithMessages(<ClassSheet classroomId={CLASS_ID} />);
    fireEvent.click(screen.getByRole("button", { name: "Make class sheet" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resets the class passwords and prints name, username, and new password", async () => {
    fetchMock.mockReturnValue(respond(200, result));
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderWithMessages(<ClassSheet classroomId={CLASS_ID} />);
    await makeSheet();
    const table = await screen.findByRole("table");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/class-passwords/reset",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ classroomId: CLASS_ID }) }),
    );
    const rows = within(table).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    expect(rows).toEqual([["Ann Smith", "p3a1", "abcd2345"], ["Bo Jones", "p3a2", "wxyz6789"]]);
    expect(screen.getByText("P3A")).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/auth/signin`)).toBeInTheDocument();
    expect(table.closest("[data-print-area]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalled();
  });

  it("lists the students whose password did not change", async () => {
    fetchMock.mockReturnValue(respond(200, { ...result, failed: [{ userId: "u3", name: "Cy" }] }));
    renderWithMessages(<ClassSheet classroomId={CLASS_ID} />);
    await makeSheet();
    expect(await screen.findByRole("alert")).toHaveTextContent("These students kept their old password: Cy");
  });

  it("announces a rate limit", async () => {
    fetchMock.mockReturnValue(respond(429, { code: "rate_limited" }));
    renderWithMessages(<ClassSheet classroomId={CLASS_ID} />);
    await makeSheet();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Wait a few minutes and try again.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows Thai copy", () => {
    renderWithMessages(<ClassSheet classroomId={CLASS_ID} />, { locale: "th" });
    expect(screen.getByRole("button", { name: "ทำใบรายชื่อชั้นเรียน" })).toBeInTheDocument();
  });
});
