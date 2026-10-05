// @vitest-environment jsdom
/**
 * Teacher assignments list and assignment page (Lane C Phase 3, task 3): the first class opens by
 * default, rows link to the assignment page, due chips use Bangkok calendar days, "created" is a
 * Bangkok date, and both screens have loading, empty, and error-with-retry states.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "a1" }) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/teacher/assignments",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-debounce", () => ({ useDebounce: <T,>(value: T) => value }));

import Assignments from "../assignments";
import AssignmentDashboard from "../assignment-dashboard";

const en = testMessages.en;
const ta = en.TeacherAssignments;
/** 5 October 2026, 15:00 in Bangkok. */
const NOW = new Date("2026-10-05T15:00:00+07:00");
const fetchMock = vi.fn();
let failAssignments = 0;
let classes: { id: string; name: string }[] = [];

const listResponse = {
  assignments: [
    {
      articleId: "art-1",
      // 20:30 UTC on 4 October is 03:30 on 5 October in Bangkok.
      meta: { id: "a1", title: "Frogs", createdAt: "2026-10-04T20:30:00.000Z", dueDate: new Date("2026-10-03T00:00:00+07:00").toISOString() },
      students: [{ id: "x" }, { id: "y" }],
    },
    { articleId: "art-2", meta: { id: "a2", title: "Rain", createdAt: "2026-10-01T03:00:00.000Z", dueDate: null }, students: [] },
  ],
  pagination: { currentPage: 1, totalPages: 1, totalCount: 2, hasNextPage: false, hasPrevPage: false, limit: 10 },
};

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  failAssignments = 0;
  classes = [
    { id: "c1", name: "P3A" },
    { id: "c2", name: "P4B" },
  ];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/classroom") return new Response(JSON.stringify({ classrooms: classes }), { status: 200 });
    if (url.startsWith("/api/teachers/assignments")) {
      return failAssignments-- > 0 ? new Response("{}", { status: 500 }) : new Response(JSON.stringify(listResponse), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  });
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
  vi.useRealTimers();
});

describe("teacher assignment list", () => {
  it("opens the first class by default and links each row to its assignment page", async () => {
    renderWithMessages(<Assignments />);
    await flush();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("classroomId=c1"), expect.anything());
    const link = screen.getByRole("link", { name: "Frogs" });
    expect(link).toHaveAttribute("href", "/teacher/assignments/a1");
    expect(link).toHaveClass("min-h-11");
  });

  it("shows due chips by Bangkok calendar day and No due date", async () => {
    renderWithMessages(<Assignments />);
    await flush();
    const frogs = screen.getByRole("row", { name: /Frogs/ });
    expect(within(frogs).getByText(en.TeacherUi.due.overdue)).toBeInTheDocument();
    const rain = screen.getByRole("row", { name: /Rain/ });
    expect(within(rain).getByText(en.TeacherUi.due.none)).toBeInTheDocument();
  });

  it("writes the created date in the Bangkok time zone", async () => {
    renderWithMessages(<Assignments />);
    await flush();
    const frogs = screen.getByRole("row", { name: /Frogs/ });
    expect(frogs).toHaveTextContent(/Oct 5, 2026/);
    expect(frogs).not.toHaveTextContent(/Oct 4, 2026/);
  });

  it("labels the class picker and the search, and gives the pager 44 px buttons", async () => {
    renderWithMessages(<Assignments />);
    await flush();
    expect(screen.getByRole("combobox", { name: ta.classLabel })).toHaveClass("min-h-11");
    expect(screen.getByRole("searchbox", { name: ta.searchLabel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.Teacher.Assignments.pagination.next })).toHaveClass("min-h-11");
  });

  it("shows an error with a retry when the assignments cannot load, and loads them on retry", async () => {
    failAssignments = 1;
    renderWithMessages(<Assignments />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(ta.loadError);
    fireEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    await flush();
    expect(screen.getByRole("link", { name: "Frogs" })).toBeInTheDocument();
  });

  it("shows an error with a retry when the class list cannot load, not the no-classes state (review fix)", async () => {
    let failClasses = 1;
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/classroom") {
        return failClasses-- > 0 ? new Response("{}", { status: 500 }) : new Response(JSON.stringify({ classrooms: classes }), { status: 200 });
      }
      return new Response(JSON.stringify(listResponse), { status: 200 });
    });
    renderWithMessages(<Assignments />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(ta.loadError);
    expect(screen.queryByText(ta.noClasses)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    await flush();
    expect(screen.getByRole("link", { name: "Frogs" })).toBeInTheDocument();
  });

  it("offers My Classes when the teacher has no class", async () => {
    classes = [];
    renderWithMessages(<Assignments />);
    await flush();
    expect(screen.getByText(ta.noClasses)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ta.goToClasses })).toHaveAttribute("href", "/teacher/my-classes");
  });
});

describe("teacher assignment page", () => {
  const detail = {
    meta: {
      id: "a1",
      title: "Quiz 1",
      description: "First quiz",
      dueDate: new Date("2026-10-07T00:00:00+07:00").toISOString(),
      classroomId: "c1",
      articleId: "art-1",
      userId: "t1",
      createdAt: "2026-10-01T03:00:00.000Z",
      articleTitle: "Cat Story",
    },
    students: [
      { id: "sa-1", studentId: "s1", status: 0, displayName: "Ann" },
      { id: "sa-2", studentId: "s2", status: 2, displayName: "Ben" },
    ],
  };

  beforeEach(() => {
    fetchMock.mockImplementation(async () =>
      failAssignments-- > 0 ? new Response("{}", { status: 500 }) : new Response(JSON.stringify(detail), { status: 200 }),
    );
  });

  it("names the assignment in the heading, labels the story, and links back to the list", async () => {
    renderWithMessages(<AssignmentDashboard />);
    await flush();
    expect(screen.getByRole("heading", { level: 1, name: "Quiz 1" })).toBeInTheDocument();
    expect(screen.getByText(`${ta.story}:`, { exact: false })).toHaveTextContent("Cat Story");
    expect(screen.getByRole("link", { name: ta.backToAssignments })).toHaveAttribute("href", "/teacher/assignments");
    // Due 7 October, today is 5 October in Bangkok.
    expect(screen.getByText("Due in 2 days")).toBeInTheDocument();
  });

  it("shows the status filters as 44 px toggle buttons that wrap", async () => {
    renderWithMessages(<AssignmentDashboard />);
    await flush();
    const group = screen.getByRole("group", { name: ta.statusFilter });
    expect(group).toHaveClass("flex-wrap");
    const all = within(group).getByRole("button", { name: `${en.Teacher.AssignmentDashboard.all} (2)` });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveClass("min-h-11");
    fireEvent.click(within(group).getByRole("button", { name: `${en.Teacher.AssignmentDashboard.completed} (1)` }));
    expect(screen.queryByText("Ann")).not.toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();
  });

  it("shows an error with a retry when the assignment cannot load", async () => {
    failAssignments = 1;
    renderWithMessages(<AssignmentDashboard />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(ta.loadOneError);
    fireEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    await flush();
    expect(screen.getByRole("heading", { level: 1, name: "Quiz 1" })).toBeInTheDocument();
  });
});
