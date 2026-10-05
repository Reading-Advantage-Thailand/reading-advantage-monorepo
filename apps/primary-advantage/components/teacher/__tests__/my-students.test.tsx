// @vitest-environment jsdom
/**
 * My Students (Lane C Phase 3, task 4, audit T3): names link to the student progress page, the
 * table shows classes (students sign in by username, so the email column showed "Unknown"), no
 * CSS capitalize, a named 44 px actions button, a labelled search, and loading, empty, and
 * error-with-retry states.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/hooks/use-current-role", () => ({ useCurrentRole: () => "TEACHER" }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import MyStudents from "../my-students";

const en = testMessages.en;
const ts = en.TeacherStudents;
const fetchMock = vi.fn();
let failures = 0;
let students: Record<string, unknown>[] = [];

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  failures = 0;
  students = [
    { id: "s1", display_name: "qa-student-a1", email: null, xp: 30, cefrLevel: "A1", classrooms: [{ id: "c1", name: "P3A" }] },
  ];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    failures-- > 0 ? new Response("{}", { status: 500 }) : new Response(JSON.stringify({ students }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("My Students", () => {
  it("links each name to its progress page and shows the classes, without capitalize", async () => {
    renderWithMessages(<MyStudents />);
    await flush();
    const link = screen.getByRole("link", { name: "qa-student-a1" });
    expect(link).toHaveAttribute("href", "/teacher/student-progress/s1");
    expect(link).toHaveClass("min-h-11");
    const row = screen.getByRole("row", { name: /qa-student-a1/ });
    expect(within(row).getByText("P3A")).toBeInTheDocument();
    expect(document.body.querySelector(".capitalize")).toBeNull();
    expect(document.body.textContent).not.toContain(en.teacher.myStudents.unknown.email);
  });

  it("names the actions button and the search, and gives them 44 px", async () => {
    renderWithMessages(<MyStudents />);
    await flush();
    expect(screen.getByRole("button", { name: "Actions for qa-student-a1" })).toHaveClass("size-11");
    expect(screen.getByRole("searchbox", { name: ts.searchLabel })).toHaveClass("min-h-11");
  });

  it("shows an error with a retry when the students cannot load, and loads them on retry", async () => {
    failures = 1;
    renderWithMessages(<MyStudents />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(ts.loadError);
    fireEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    await flush();
    expect(screen.getByRole("link", { name: "qa-student-a1" })).toBeInTheDocument();
  });

  it("offers My Classes when the teacher has no student", async () => {
    students = [];
    renderWithMessages(<MyStudents />);
    await flush();
    expect(screen.getByText(ts.noStudents)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ts.goToClasses })).toHaveAttribute("href", "/teacher/my-classes");
  });
});
