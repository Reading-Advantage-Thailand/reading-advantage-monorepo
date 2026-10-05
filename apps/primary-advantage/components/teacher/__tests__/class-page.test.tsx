// @vitest-environment jsdom
/**
 * Teacher class page (Lane C Phase 3, task 2): one student list. The Lane B live roster rows
 * (sign-in status, lockouts, picture and card actions) carry the roster management parts
 * (level, CEFR, last activity, progress link, more actions, remove).
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../student-enrollment-button", () => ({ __esModule: true, default: ({ buttonText }: { buttonText?: string }) => <button type="button">{buttonText}</button> }));
vi.mock("../student-cefr-level-setter", () => ({ __esModule: true, default: () => null }));

import EnhancedClassRoster from "../enhanced-class-roster";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const classroom = {
  classroom: { id: CLASS_ID, classroomName: "P3A", grade: "3", teacherId: "t1", archived: false, noOfStudents: 2 },
  studentInClass: [
    { id: "u1", display_name: "Ann Smith", email: null, last_activity: null, level: 3, xp: 120, cefrLevel: "A1" },
    { id: "u2", display_name: "Bo Jones", email: null, last_activity: null, level: 5, xp: 300, cefrLevel: "A2" },
  ],
};
const roster = {
  classroomName: "P3A",
  picturePasswordEnabled: true,
  openSession: null,
  students: [
    { userId: "u1", name: "Ann Smith", username: "p3a1", hasPicturePassword: true, hasCardToken: false, signedIn: true, lastSeenAt: null },
    { userId: "u2", name: "Bo Jones", username: "p3a2", hasPicturePassword: true, hasCardToken: false, signedIn: false, lastSeenAt: null },
  ],
};
const fetchMock = vi.fn();
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
let rosterStatus = 200;
let classroomStatus = 200;
const en = testMessages.en.TeacherClass;

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

/** Renders the class page and waits for both reads. */
async function renderPage() {
  renderWithMessages(<EnhancedClassRoster classroomId={CLASS_ID} />);
  await flush();
}

beforeEach(() => {
  rosterStatus = 200;
  classroomStatus = 200;
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string) => {
    if (url === `/api/classroom/${CLASS_ID}`) return json(classroomStatus, classroomStatus === 200 ? classroom : { error: "x" });
    if (url.endsWith("/lockouts")) return json(rosterStatus, rosterStatus === 200 ? { locked: [] } : { code: "forbidden" });
    if (url.endsWith("/roster")) return json(rosterStatus, rosterStatus === 200 ? roster : { code: "forbidden" });
    return json(404, {});
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("teacher class page", () => {
  it("shows the class heading, the class sign-in panel, and one student list", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "P3A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: testMessages.en.ClassLogin.title }).closest("section")).toHaveAttribute("id", "class-login");
    expect(screen.getByRole("button", { name: testMessages.en.ClassLogin.session.start })).toBeInTheDocument();
    // One list: the old second list ("Students List") is gone.
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.queryByText(testMessages.en.Teacher.EnhancedClassRoster.students.title)).not.toBeInTheDocument();
    expect(screen.getByText("1 of 2 signed in")).toBeInTheDocument();
  });

  it("puts the management parts on the live roster row of each student", async () => {
    await renderPage();
    const ann = within(screen.getByRole("row", { name: /Ann Smith/ }));
    // Lane B parts.
    expect(ann.getByText(testMessages.en.ClassLogin.roster.signedIn)).toBeInTheDocument();
    expect(ann.getByRole("button", { name: "Reset picture password for Ann Smith" })).toBeInTheDocument();
    expect(ann.getByRole("button", { name: "New card for Ann Smith" })).toBeInTheDocument();
    // Roster management parts.
    expect(ann.getByText("A1")).toBeInTheDocument();
    expect(ann.getByText("Level 3")).toBeInTheDocument();
    expect(ann.getByRole("link", { name: "Progress of Ann Smith" })).toHaveAttribute("href", "/teacher/student-progress/u1");
    expect(ann.getByRole("button", { name: "More actions for Ann Smith" })).toBeInTheDocument();
    expect(ann.getByRole("button", { name: "Remove Ann Smith from the class" })).toBeInTheDocument();
  });

  it("keeps the enroll action and the reports link", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: testMessages.en.Teacher.EnhancedClassRoster.students.enrollButton })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: testMessages.en.Teacher.ClassroomNavigation.nav.reports })).toHaveAttribute(
      "href",
      `/teacher/reports?classroomId=${CLASS_ID}`,
    );
    expect(screen.getByRole("link", { name: testMessages.en.Teacher.ClassroomNavigation.actions.backToClassrooms })).toHaveAttribute(
      "href",
      "/teacher/class-roster",
    );
  });

  it("filters the student rows by name or username and says when nothing matches", async () => {
    await renderPage();
    const search = screen.getByRole("searchbox", { name: en.searchStudents });
    fireEvent.change(search, { target: { value: "p3a2" } });
    expect(screen.queryByRole("row", { name: /Ann Smith/ })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Bo Jones/ })).toBeInTheDocument();
    // The summary still counts the whole class.
    expect(screen.getByText("1 of 2 signed in")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText(en.noMatch)).toBeInTheDocument();
  });

  it("keeps the management list when the live roster cannot load", async () => {
    rosterStatus = 403;
    await renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(testMessages.en.ClassLogin.errors.forbidden);
    expect(screen.getByRole("link", { name: "Progress of Ann Smith" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Bo Jones from the class" })).toBeInTheDocument();
  });

  it("shows an error with a retry when the class cannot load, and loads again on retry", async () => {
    classroomStatus = 500;
    await renderPage();
    const alert = screen.getAllByRole("alert").find((node) => node.textContent?.includes(en.loadError));
    expect(alert).toBeDefined();
    classroomStatus = 200;
    fireEvent.click(screen.getByRole("button", { name: testMessages.en.Error.retry }));
    await flush();
    expect(screen.getByRole("heading", { level: 1, name: "P3A" })).toBeInTheDocument();
  });

  it("leaves the class book slot for the teacher-books track", async () => {
    await renderPage();
    expect(screen.getByRole("region", { name: testMessages.en.TeacherUi.classBook.title })).toHaveAttribute("data-class-book-slot", CLASS_ID);
  });

  it("gives the row actions a tap target of at least 44 px", async () => {
    await renderPage();
    for (const name of ["Progress of Ann Smith"]) expect(screen.getByRole("link", { name })).toHaveClass("min-h-11");
    for (const name of ["More actions for Ann Smith", "Remove Ann Smith from the class"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("min-h-11");
    }
  });
});
