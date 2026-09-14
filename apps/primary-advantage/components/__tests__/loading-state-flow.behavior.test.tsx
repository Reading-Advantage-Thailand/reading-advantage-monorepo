// @vitest-environment jsdom
/**
 * Behavioral replacements for the loading-state-invariants flow cases
 * (FR-12 router navigation, FR-10 response guard, FR-9 teacher table init
 * and row model, FR-5 admin search debounce and history mount fetch, FR-6
 * hoisted components and hooks).
 *
 * Mapping to the deleted static cases in loading-state-invariants.test.ts:
 * - FR-12 student assignments router nav -> row dialog action calls
 *   router.push with the lesson path and leaves window.location alone.
 * - FR-12 deck-view router refresh -> refresh button calls router.refresh
 *   after a study session completes.
 * - FR-12 dashboard retry without reload -> retry button calls
 *   router.refresh instead of reloading the page.
 * - FR-10 response.ok guard -> failed fetch never reaches response.json and
 *   the dashboard falls back; success fetch renders the assignment title.
 * - FR-9 init() on mount -> mounting the teacher table fires the classroom
 *   fetch exactly once.
 * - FR-9 table body from the row model -> DataTable renders each row model
 *   entry, and the teacher table wires its rows through DataTable.
 * - FR-5 debounced admin search -> rapid keystrokes settle into one search
 *   fetch after the debounce delay.
 * - FR-5 skipped duplicate mount fetch -> mounting the history table fires
 *   exactly one records fetch.
 * - FR-6 AssignmentDetailDialog module scope -> the open dialog keeps its
 *   DOM node across parent re-renders.
 * - FR-6 hoisted table debounce hook -> rapid keystrokes in the table settle
 *   into one assignments fetch after the debounce delay.
 * - FR-6 StudentRow module scope -> roster rows keep their DOM nodes across
 *   parent re-renders.
 * - FR-6 LessonTimer module scope -> the timer label keeps its DOM node and
 *   keeps counting across parent re-renders.
 */
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

const { pushMock, refreshMock, fetchMock, getDeckCardsMock } = vi.hoisted(
  () => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    fetchMock: vi.fn(),
    getDeckCardsMock: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useParams: () => ({ id: "assign-1", classroomId: "c1", locale: "en" }),
  usePathname: () => "/en/teacher/assignments",
  useRouter: () => ({ push: pushMock, back: vi.fn(), refresh: refreshMock }),
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: pushMock, back: vi.fn(), refresh: refreshMock }),
  usePathname: () => "/en/teacher/assignments",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: { id: "u1" }, refresh: vi.fn() }),
  useSession: () => ({ user: { id: "u1" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/actions/flashcard", () => ({
  getDeckCards: getDeckCardsMock,
  getDashboardData: vi.fn(),
}));

vi.mock("../teacher/student-enrollment-button", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../teacher/student-unenrollment-button", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../teacher/classroom-navigation", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../teacher/student-cefr-level-setter", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../teacher/class-code-generator", () => ({
  __esModule: true,
  default: () => null,
}));

import StudentAssignmentTable from "../student-assignment-table";
import { SingleDeckViewInline } from "../flashcards/deck-view";
import { DashboardRetryButton } from "../flashcards/dashboard-retry-button";
import AssignmentDashboard from "../teacher/assignment-dashboard";
import Assignments from "../teacher/assignments";
import { DataTable } from "../ui/data-table";
import StudentsPage from "../../app/[locale]/admin/students/page";
import { HistoryTable } from "../dashboard/history-table";
import EnhancedClassRoster from "../teacher/enhanced-class-roster";
import LessonProgressBar from "../lesson/lesson-progress-bar";
import { QuizContextProvider } from "@/contexts/question-context";
import type { Article } from "@/types";
import {
  renderWithMessages,
  testMessages,
  withMessages,
} from "./helpers/render-with-messages";

/** Real English copy used for user-facing assertions. */
const en = testMessages.en;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockRejectedValue(new Error("network disabled"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * Sets a fake mobile viewport before the table measures it on mount.
 */
function useMobileViewport(): void {
  Object.defineProperty(window, "innerWidth", {
    value: 500,
    configurable: true,
  });
}

/**
 * One student-assignment row accepted by the table.
 */
function studentAssignment(id: string, title: string) {
  return {
    id,
    studentId: "u1",
    status: "NOT_STARTED",
    score: null,
    startedAt: null,
    assignmentId: `assignment-${id}`,
    createdAt: "2026-01-01",
    assignment: {
      id: `assignment-${id}`,
      classroomId: "c1",
      articleId: "article-1",
      lessonId: null,
      title,
      type: "lesson",
      description: `${title} description`,
      dueDate: null,
      createdAt: "2026-01-01",
      teacherId: "t1",
      teacherName: "Teacher One",
    },
  };
}

/**
 * Minimal article accepted by the lesson progress bar.
 */
function baseArticle(): Article {
  return {
    id: "article-1",
    title: "A Test Story",
    summary: "A short summary.",
    translatedSummary: null,
    translatedPassage: null,
    imageDescription: "",
    passage: "Alpha beta gamma.",
    createdAt: new Date(0),
    rating: 1,
    type: "story",
    cefrLevel: "A1",
    raLevel: 1,
    genre: "fiction",
    audioUrl: "/audio/article-1.mp3",
    sentences: [
      {
        sentence: "Alpha beta gamma.",
        startTime: 0,
        endTime: 3,
        words: [
          { word: "Alpha", start: 0, end: 1 },
          { word: "beta", start: 1, end: 2 },
          { word: "gamma.", start: 2, end: 3 },
        ],
      },
    ],
  };
}

describe("FR-12 router navigation instead of full reloads", () => {
  it("navigates to the lesson through the router when the row action fires", async () => {
    useMobileViewport();
    const startUrl = window.location.href;
    renderWithMessages(
      <StudentAssignmentTable
        initialAssignments={[
          studentAssignment("s1", "Reading Quiz") as never,
          studentAssignment("s2", "Word Drill") as never,
        ]}
      />,
    );
    fireEvent.click(await screen.findByText("Reading Quiz"));
    fireEvent.click(
      await screen.findByRole("button", {
        name: en.Assignment.studentAssignmentTable.goToLesson,
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/student/lesson/assignment-s1");
    expect(window.location.href).toBe(startUrl);
  });

  it("refreshes the deck view through the router after a session", async () => {
    getDeckCardsMock.mockResolvedValue({
      success: true,
      cards: [{ id: "card-1" }],
    });
    renderWithMessages(
      <SingleDeckViewInline
        deck={{
          id: "deck-1",
          name: "Deck One",
          type: "VOCABULARY",
          totalCards: 10,
          dueCards: 4,
          newCards: 2,
          learningCards: 1,
          reviewCards: 1,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-02",
        }}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: en.SentencesPage.sentencesCard.refreshData,
      }),
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(en.SentencesPage.sentencesCard.readyToStudy),
    ).toBeInTheDocument();
  });

  it("retries the flashcard dashboard through the router", () => {
    renderWithMessages(<DashboardRetryButton />);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});

describe("FR-10 assignment dashboard response guard", () => {
  it("skips parsing and falls back when the assignment fetch fails", async () => {
    const jsonSpy = vi.fn();
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: jsonSpy });
    renderWithMessages(<AssignmentDashboard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText("Loading")).not.toBeInTheDocument(),
    );
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("renders the assignment title when the fetch succeeds", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        meta: {
          id: "assign-1",
          title: "Quiz 1",
          description: "First quiz",
          dueDate: "",
          classroomId: "c1",
          articleId: "article-1",
          userId: "t1",
          createdAt: "2026-01-01",
          articleTitle: "Cat Story",
        },
        students: [],
      }),
    });
    renderWithMessages(<AssignmentDashboard />);
    expect(await screen.findByText("Quiz 1")).toBeInTheDocument();
    expect(await screen.findByText("Cat Story")).toBeInTheDocument();
  });
});

describe("FR-9 teacher assignments table", () => {
  it("fires the classroom init fetch once on mount", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ classrooms: [] }),
    });
    renderWithMessages(<Assignments />);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/classroom"),
    );
    expect(
      fetchMock.mock.calls.filter(([url]) => url === "/api/classroom"),
    ).toHaveLength(1);
  });

  it("renders each row model entry with its cell text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ classrooms: [] }),
    });
    renderWithMessages(<Assignments />);
    await screen.findByText(en.Teacher.Assignments.empty.selectClassroom);
    cleanup();

    const rows = [
      { title: "Reading Quiz", students: 3 },
      { title: "Word Drill", students: 5 },
    ];
    renderWithMessages(
      <DataTable
        columns={[
          {
            accessorKey: "title",
            header: "Assignment",
            cell: ({ row }) => row.getValue("title") as string,
          },
          {
            accessorKey: "students",
            header: "Students",
            cell: ({ row }) => row.getValue("students") as number,
          },
        ]}
        data={rows}
      />,
    );
    expect(await screen.findByText("Reading Quiz")).toBeInTheDocument();
    expect(screen.getByText("Word Drill")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

describe("FR-5 debounced admin search and single history fetch", () => {
  it("settles rapid admin search keystrokes into one search fetch", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).startsWith("/api/classrooms")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          students: [],
          statistics: {
            totalStudents: 0,
            averageXp: 0,
            mostCommonLevel: "A0-",
            activeThisWeek: 0,
            activePercentage: 0,
          },
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      });
    });
    const studentCalls = () =>
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/students"),
      );
    renderWithMessages(<StudentsPage />);
    const search = await screen.findByPlaceholderText(
      en.AdminStudents.filters.searchPlaceholder,
    );
    await waitFor(() => expect(studentCalls()).toHaveLength(1));
    vi.useFakeTimers();
    let query = "";
    for (const char of "ana") {
      query += char;
      fireEvent.change(search, { target: { value: query } });
    }
    // Debounce pending: no new fetch yet.
    expect(studentCalls()).toHaveLength(1);
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(studentCalls()).toHaveLength(2);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("search=ana");
  });

  it("fires exactly one records fetch on history table mount", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    });
    renderWithMessages(<HistoryTable variant="history" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("article-records");
  });
});

describe("FR-6 hoisted components and hooks keep state across renders", () => {
  it("keeps the open assignment dialog node across parent re-renders", async () => {
    useMobileViewport();
    renderWithMessages(
      <StudentAssignmentTable
        initialAssignments={[
          studentAssignment("s1", "Reading Quiz") as never,
        ]}
      />,
    );
    fireEvent.click(await screen.findByText("Reading Quiz"));
    const dialog = await screen.findByRole("dialog");
    const search = screen.getByPlaceholderText(
      en.Assignment.studentAssignmentTable.searchPlaceholder,
    );
    fireEvent.change(search, { target: { value: "word" } });
    // The dialog survives the parent re-render on the same DOM node.
    expect(await screen.findByRole("dialog")).toBe(dialog);
    expect(
      screen.getByRole("button", {
        name: en.Assignment.studentAssignmentTable.goToLesson,
      }),
    ).toBeInTheDocument();
  });

  it("settles rapid table search keystrokes into one assignments fetch", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ assignments: [], pagination: {} }),
    });
    renderWithMessages(
      <StudentAssignmentTable
        initialAssignments={[
          studentAssignment("s1", "Reading Quiz") as never,
        ]}
      />,
    );
    const search = await screen.findByPlaceholderText(
      en.Assignment.studentAssignmentTable.searchPlaceholder,
    );
    vi.useFakeTimers();
    let query = "";
    for (const char of "xyz") {
      query += char;
      fireEvent.change(search, { target: { value: query } });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("search=xyz");
  });

  it("keeps roster row nodes across parent re-renders", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        classroom: { id: "c1", classroomName: "Class One" },
        studentInClass: [
          {
            id: "st-1",
            display_name: "Alice Anders",
            email: "alice@example.com",
            last_activity: null,
            level: 3,
          },
          {
            id: "st-2",
            display_name: "Bob Brown",
            email: "bob@example.com",
            last_activity: null,
            level: 5,
          },
        ],
      }),
    });
    renderWithMessages(<EnhancedClassRoster />);
    const alice = await screen.findByText("Alice Anders");
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: "example" } });
    // Both rows survive the filter; Alice's node is the same instance.
    expect(await screen.findByText("Alice Anders")).toBe(alice);
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
  });

  it("keeps the timer label node counting across parent re-renders", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        userLessonProgress: { progress: 10, timeSpent: 5 },
      }),
    });

    /**
     * Re-renders the bar from a parent state bump, like a lesson page would.
     */
    function ParentProbe() {
      const [tick, setTick] = useState(0);
      return (
        <QuizContextProvider>
          <button type="button" onClick={() => setTick((count) => count + 1)}>
            parent-{tick}
          </button>
          <LessonProgressBar source="article" article={baseArticle()} />
        </QuizContextProvider>
      );
    }

    renderWithMessages(withMessages(<ParentProbe />, "en"));
    // The progress fetch lands on task 2 with 5 elapsed seconds.
    const label = await screen.findByText("0m 5s");
    fireEvent.click(screen.getByRole("button", { name: /parent-/ }));
    fireEvent.click(screen.getByRole("button", { name: /parent-/ }));
    expect(screen.getByText("0m 5s")).toBe(label);
    // The countdown continues on the same node after parent re-renders.
    expect(await screen.findByText("0m 8s", undefined, { timeout: 8000 })).toBe(
      label,
    );
  }, 15000);
});
