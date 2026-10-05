// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import StudentAssignmentList, { type AssignmentStudent } from "../assignment-list";
import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";

const DAY_MS = 86_400_000;
const fetchMock = vi.fn();

vi.mock("@reading-advantage/auth-client", () => ({
  useSession: () => ({ user: { id: "student-1", role: "STUDENT", schoolId: "school-1" } }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * Builds one student assignment row.
 * @param id Row id suffix.
 * @param title Assignment title.
 * @param dueDate ISO due date, or null when the assignment has none.
 * @param status Student progress status.
 * @returns The row.
 */
function row(
  id: string,
  title: string,
  dueDate: string | null,
  status: AssignmentStudent["status"] = "NOT_STARTED",
): AssignmentStudent {
  return {
    id: `row-${id}`,
    studentId: "student-1",
    status,
    score: null,
    startedAt: null,
    assignmentId: `assignment-${id}`,
    createdAt: new Date(Date.now() - DAY_MS).toISOString(),
    completedAt: null,
    assignment: {
      id: `assignment-${id}`,
      classroomId: "classroom-1",
      articleId: "article-1",
      lessonId: null,
      title,
      type: "ARTICLE",
      description: null,
      dueDate,
      createdAt: new Date(Date.now() - DAY_MS).toISOString(),
      teacherId: "teacher-1",
      teacherName: "Teacher One",
    },
  };
}

/**
 * A due date at local noon, some days from today (stable near midnight).
 * @param offsetDays Days from today; negative for the past.
 * @returns The ISO string.
 */
function noonIn(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

const ONE_PAGE = { currentPage: 1, totalPages: 1, totalCount: 0, hasNextPage: false, hasPrevPage: false, limit: 10 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StudentAssignmentList due dates", () => {
  it.each(["en", "th"] as const)("shows an assignment without a due date as 'No due date', not 1970 and late (%s)", (locale) => {
    const t = testMessages[locale].StudentAssignments;
    renderWithMessages(
      <StudentAssignmentList initialAssignments={[row("a", "River story", null)]} initialPagination={ONE_PAGE} />,
      { locale },
    );
    const card = screen.getByRole("listitem");
    expect(within(card).getByText(t.noDueDate)).toBeInTheDocument();
    expect(within(card).queryByText(t.late)).not.toBeInTheDocument();
    expect(card.textContent).not.toMatch(/1970/);
  });

  it("shows late and days-left chips from the real messages", () => {
    const t = testMessages.en.StudentAssignments;
    renderWithMessages(
      <StudentAssignmentList
        initialAssignments={[
          row("late", "Forest story", noonIn(-2)),
          row("soon", "Sea story", noonIn(2)),
        ]}
        initialPagination={ONE_PAGE}
      />,
    );
    const [late, soon] = screen.getAllByRole("listitem");
    expect(within(late).getByText(t.late)).toBeInTheDocument();
    expect(within(soon).getByText("2 days left")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("StudentAssignments.");
  });

  it("does not mark a finished assignment as late", () => {
    const t = testMessages.en.StudentAssignments;
    renderWithMessages(
      <StudentAssignmentList
        initialAssignments={[row("done", "Old story", noonIn(-2), "COMPLETED")]}
        initialPagination={ONE_PAGE}
      />,
    );
    const card = screen.getByRole("listitem");
    expect(within(card).queryByText(t.late)).not.toBeInTheDocument();
    expect(within(card).getByText(t.statusCompleted)).toBeInTheDocument();
  });
});

describe("StudentAssignmentList cards", () => {
  it("links each card to its lesson with a label for the student status", () => {
    const t = testMessages.en.StudentAssignments;
    renderWithMessages(
      <StudentAssignmentList
        initialAssignments={[
          row("new", "New story", null, "NOT_STARTED"),
          row("going", "Going story", null, "IN_PROGRESS"),
          row("done", "Done story", null, "COMPLETED"),
        ]}
        initialPagination={ONE_PAGE}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/student/lesson/assignment-new",
      "/student/lesson/assignment-going",
      "/student/lesson/assignment-done",
    ]);
    expect(links[0]).toHaveAccessibleName(`${t.start}: New story`);
    expect(links[1]).toHaveAccessibleName(`${t.continue}: Going story`);
    expect(links[2]).toHaveAccessibleName(`${t.review}: Done story`);
  });

  it("names the filter controls", () => {
    const t = testMessages.th.StudentAssignments;
    renderWithMessages(<StudentAssignmentList initialAssignments={[]} initialPagination={ONE_PAGE} />, { locale: "th" });
    expect(screen.getByRole("searchbox", { name: t.search })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: t.status })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: t.due })).toBeInTheDocument();
  });
});

describe("StudentAssignmentList states", () => {
  it("shows an empty state with a way to the stories when the student has no assignments", () => {
    const t = testMessages.en.StudentAssignments;
    renderWithMessages(<StudentAssignmentList initialAssignments={[]} initialPagination={ONE_PAGE} />);
    expect(screen.getByText(t.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.findStory })).toHaveAttribute("href", "/student/read");
    expect(screen.queryByRole("navigation", { name: t.pages })).not.toBeInTheDocument();
  });

  it("offers 'Show all' when a filter matches nothing, and it clears the filter", async () => {
    const t = testMessages.en.StudentAssignments;
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ assignments: [], pagination: ONE_PAGE }) });
    renderWithMessages(<StudentAssignmentList initialAssignments={[]} initialPagination={ONE_PAGE} />);

    fireEvent.click(screen.getByRole("button", { name: t.statusCompleted }));
    expect(await screen.findByText(t.noMatch)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("status=2"));

    fireEvent.click(screen.getByRole("button", { name: t.showAll }));
    await waitFor(() => expect(screen.getByRole("button", { name: t.statusAll })).toHaveAttribute("aria-pressed", "true"));
    expect(fetchMock).toHaveBeenLastCalledWith(expect.not.stringContaining("status="));
  });

  it("shows an error with a retry when loading fails, and the retry loads the list", async () => {
    const t = testMessages.en.StudentAssignments;
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    renderWithMessages(<StudentAssignmentList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadError);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assignments: [row("a", "River story", null)], pagination: { ...ONE_PAGE, totalCount: 1 } }),
    });
    fireEvent.click(screen.getByRole("button", { name: testMessages.en.Error.retry }));
    expect(await screen.findByText("River story")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/students/student-1/assignments"));
  });

  it("shows page controls only when there is more than one page", async () => {
    const t = testMessages.en.StudentAssignments;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        assignments: [row("b", "Second page story", null)],
        pagination: { currentPage: 2, totalPages: 2, totalCount: 11, hasNextPage: false, hasPrevPage: true, limit: 10 },
      }),
    });
    renderWithMessages(
      <StudentAssignmentList
        initialAssignments={[row("a", "First page story", null)]}
        initialPagination={{ currentPage: 1, totalPages: 2, totalCount: 11, hasNextPage: true, hasPrevPage: false, limit: 10 }}
      />,
    );
    const pages = screen.getByRole("navigation", { name: t.pages });
    expect(within(pages).getByText("Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(within(pages).getByRole("button", { name: t.next }));
    expect(await screen.findByText("Second page story")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });
});
