// @vitest-environment jsdom
/**
 * Audit T10: an assignment without a due date showed "January 1, 1970" and "Overdue" on the
 * teacher assignment page, because `new Date(null)` is the epoch. These tests render the two
 * teacher views with a null due date.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "assign-1", locale: "en" }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/en/teacher/c1",
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import AssignmentDashboard from "../assignment-dashboard";
import Assignments from "../assignments";
import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";

const t = testMessages.en.Teacher;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("teacher assignment views with no due date", () => {
  it("shows 'No due date' and counts no student as overdue on the assignment page", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        meta: {
          id: "assign-1",
          title: "Quiz 1",
          description: "First quiz",
          dueDate: null,
          classroomId: "c1",
          articleId: "article-1",
          createdAt: "2026-10-01T03:00:00.000Z",
          articleTitle: "Cat Story",
        },
        students: [
          { id: "sa-1", studentId: "student-000001", status: 0, displayName: "Ann" },
          { id: "sa-2", studentId: "student-000002", status: 1, displayName: "Ben" },
        ],
      }),
    });
    renderWithMessages(<AssignmentDashboard />);

    expect(await screen.findByText(`${t.AssignmentDashboard.dueDate}: ${t.AssignmentDashboard.noDueDate}`)).toBeInTheDocument();
    expect(screen.getByText(`${t.AssignmentDashboard.overdue} (0)`)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/1970/);
  });

  it("shows 'No due date' in the teacher assignment list", async () => {
    fetchMock.mockImplementation(async (url: unknown) => {
      const target = String(url);
      if (target === "/api/classroom") {
        return { ok: true, json: async () => ({ classrooms: [{ id: "c1", name: "Class One" }] }) };
      }
      if (target.startsWith("/api/teachers/assignments")) {
        return {
          ok: true,
          json: async () => ({
            assignments: [
              {
                articleId: "article-1",
                meta: { id: "a1", title: "Assign One", createdAt: "2026-10-01T03:00:00.000Z", dueDate: null },
                students: [],
              },
            ],
            pagination: { currentPage: 1, totalPages: 1, totalCount: 1, hasNextPage: false, hasPrevPage: false, limit: 10 },
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });
    renderWithMessages(<Assignments />);

    expect(await screen.findByText("Assign One")).toBeInTheDocument();
    expect(screen.getByText(t.Assignments.table.noDueDate)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/1970/);
  });
});

/**
 * Phase 2 review (item 2): the due chip and the overdue count compared instants, and the teacher
 * calendar stores midnight of the chosen day, so the page showed "Overdue" all day on the due day.
 * Days are calendar days in Bangkok.
 */
describe("teacher assignment page on and after the due day", () => {
  /**
   * Primes the assignment response with one student who has not started and one who finished.
   * @param dueDate The ISO due date.
   */
  function primeAssignment(dueDate: string) {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        meta: {
          id: "assign-1",
          title: "Quiz 1",
          description: "First quiz",
          dueDate,
          classroomId: "c1",
          articleId: "article-1",
          createdAt: "2026-10-01T03:00:00.000Z",
          articleTitle: "Cat Story",
        },
        students: [
          { id: "sa-1", studentId: "student-000001", status: 0, displayName: "Ann" },
          { id: "sa-2", studentId: "student-000002", status: 2, displayName: "Ben" },
        ],
      }),
    });
  }

  afterEach(() => vi.useRealTimers());

  /** Midnight of 7 October in Bangkok, the value of the teacher calendar. */
  const dueMidnight = new Date("2026-10-07T00:00:00+07:00").toISOString();

  it.each([
    ["at 10:00 on the due day", "2026-10-07T10:00:00+07:00", "today"],
    ["at 23:59 on the due day", "2026-10-07T23:59:00+07:00", "today"],
    ["one day later", "2026-10-08T00:01:00+07:00", "overdue"],
  ])("shows Due Today on the due day and counts overdue only after it (%s)", async (_label, now, expected) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    primeAssignment(dueMidnight);
    renderWithMessages(<AssignmentDashboard />);

    expect(await screen.findByText("Quiz 1")).toBeInTheDocument();
    if (expected === "today") {
      expect(screen.getByText(t.AssignmentDashboard.dueToday)).toBeInTheDocument();
      expect(screen.getByText(`${t.AssignmentDashboard.overdue} (0)`)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(t.AssignmentDashboard.dueToday)).not.toBeInTheDocument();
      // Ann has not finished; Ben finished, so he is not overdue.
      expect(screen.getByText(`${t.AssignmentDashboard.overdue} (1)`)).toBeInTheDocument();
    }
  });

  it("writes the due date on the Bangkok calendar, whatever the time zone of the machine", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T10:00:00+07:00"));
    // 23:30 in Bangkok is already 8 October in UTC+8.
    primeAssignment(new Date("2026-10-07T23:30:00+07:00").toISOString());
    renderWithMessages(<AssignmentDashboard />);

    expect(await screen.findByText(t.AssignmentDashboard.dueToday)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/October 7, 2026/);
    expect(document.body.textContent).not.toMatch(/October 8, 2026/);
  });
});
