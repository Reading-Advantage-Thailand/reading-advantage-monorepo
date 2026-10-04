// @vitest-environment jsdom
/**
 * QR card print page (primary_student_login_20261003, Phase 3 task 3, FR-5): issue tokens for
 * students without a card, rotate one card, and print 8 cards per A4 page.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { QrCardSheet } from "../teacher/class-login/qr-card-sheet";
import { renderWithMessages } from "./helpers/render-with-messages";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const token = (i: number) => String(i).padStart(43, "T");
const student = (i: number, hasCardToken: boolean) => ({
  userId: `u${i}`, name: `Student ${i}`, username: `p3a${i}`, hasPicturePassword: true, hasCardToken, signedIn: false, lastSeenAt: null,
});
const fetchMock = vi.fn();
const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

/** Answers the roster, issue, and rotate routes. */
function routes(students: ReturnType<typeof student>[], issued: number[] = []) {
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith("/roster")) return respond(200, { classroomName: "P3A", picturePasswordEnabled: true, openSession: null, students });
    if (url.endsWith("/card-token/issue")) {
      return respond(200, { cards: issued.map((i) => ({ credentialId: `c${i}`, userId: `u${i}`, name: `Student ${i}`, token: token(i) })) });
    }
    if (url.endsWith("/card-token/rotate")) return respond(200, { credentialId: "c1", token: token(99) });
    return respond(404, {});
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("QrCardSheet", () => {
  it("reads the roster on load and changes nothing until the teacher asks", async () => {
    routes([student(1, true), student(2, false)]);
    renderWithMessages(<QrCardSheet classroomId={CLASS_ID} />);
    expect(await screen.findByRole("button", { name: "Make cards for 1 student without a card" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/student/roster", expect.objectContaining({ body: JSON.stringify({ classroomId: CLASS_ID }) }));
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Back to class" })).toHaveAttribute("href", `/teacher/class-roster/${CLASS_ID}`);
  });

  it("issues cards and lays them out 8 to a page", async () => {
    const students = Array.from({ length: 9 }, (_, i) => student(i + 1, false));
    routes(students, students.map((_, i) => i + 1));
    const { container } = renderWithMessages(<QrCardSheet classroomId={CLASS_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Make cards for 9 students without a card" }));
    await waitFor(() => expect(screen.getAllByRole("img", { name: /^Sign-in QR code for/ })).toHaveLength(9));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/student/card-token/issue", expect.objectContaining({ body: JSON.stringify({ classroomId: CLASS_ID }) }));
    const pages = container.querySelectorAll("[data-print-area] [data-card-page]");
    expect(pages).toHaveLength(2);
    expect(within(pages[0] as HTMLElement).getAllByRole("img")).toHaveLength(8);
    expect(within(pages[1] as HTMLElement).getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
  });

  it("rotates a card made before after a confirmation and adds it to the print sheet", async () => {
    routes([student(1, true)]);
    renderWithMessages(<QrCardSheet classroomId={CLASS_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "New card for Student 1" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("The old card stops working now");
    fireEvent.click(within(confirm).getByRole("button", { name: "Make new card" }));
    expect(await screen.findByRole("img", { name: "Sign-in QR code for Student 1" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/card-token/rotate",
      expect.objectContaining({ body: JSON.stringify({ classroomId: CLASS_ID, studentUserId: "u1" }) }),
    );
    expect(screen.queryByRole("button", { name: "New card for Student 1" })).not.toBeInTheDocument();
  });

  it("explains when every student already has a card", async () => {
    routes([student(1, true)], []);
    renderWithMessages(<QrCardSheet classroomId={CLASS_ID} />);
    expect(await screen.findByText(/Every student has a card/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Make cards/ })).not.toBeInTheDocument();
  });

  it("announces a load error", async () => {
    fetchMock.mockReturnValue(respond(403, {}));
    renderWithMessages(<QrCardSheet classroomId={CLASS_ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot manage this class.");
  });
});
