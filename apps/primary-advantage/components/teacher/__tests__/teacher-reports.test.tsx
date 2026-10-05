// @vitest-environment jsdom
/**
 * Teacher reports (Lane C Phase 3, task 4, audit T11): a labelled class picker (the class page
 * link preselects its class), a sorted and paged student table that shows classes (not emails),
 * an empty state with a next step, and a per-student view with an error state and a retry. The
 * level card speaks to the teacher, not to the student.
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
vi.mock("@/components/dashboard/user-activity-chart", () => ({ UserActivityChart: () => <div data-testid="activity-chart" /> }));
vi.mock("@/components/dashboard/user-xpoverall-chart", () => ({ UserXpOverAllChart: () => <div data-testid="xp-chart" /> }));
vi.mock("@/components/dashboard/user-reading-chart", () => ({ default: () => <div data-testid="reading-chart" /> }));
vi.mock("@/components/dashboard/user-heatmap-chart", () => ({ default: () => <div data-testid="heatmap" /> }));

import TeacherProgressReports from "../teacher-progress-reports";

const en = testMessages.en;
const ts = en.TeacherStudents;
const fetchMock = vi.fn();
let failures = 0;

const classrooms = [
  { id: "c1", name: "P3A", classCode: "AAA111" },
  { id: "c2", name: "P4B", classCode: "BBB222" },
];
const somchai = {
  id: "s1",
  display_name: "Somchai",
  email: "somchai@example.com",
  cefrLevel: "A1",
  xp: 10,
  classrooms: [{ id: "c1", name: "P3A" }],
};
const ann = { id: "s2", display_name: "Ann", email: "", cefrLevel: "A0", xp: 40, classrooms: [{ id: "c2", name: "P4B" }] };

const ACTIVITY_BODY = {
  activity: [
    { id: "act-1", userId: "s1", activityType: "ARTICLE_READ", targetId: "article-1", completed: true, details: {}, createdAt: "2026-10-04T09:00:00.000Z" },
  ],
  xpLogs: [],
};

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

/**
 * Renders the reports with the given students and class.
 * @param students The students.
 * @param initialClassroomId The class from the `classroomId` query, when there is one.
 */
function renderReports(students: (typeof somchai)[], initialClassroomId?: string) {
  renderWithMessages(
    <TeacherProgressReports
      classrooms={classrooms}
      students={students}
      currentUser={{ id: "t1" } as never}
      initialClassroomId={initialClassroomId}
    />,
  );
}

beforeEach(() => {
  failures = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    failures-- > 0 ? new Response("{}", { status: 500 }) : new Response(JSON.stringify(ACTIVITY_BODY), { status: 200 }),
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

describe("teacher reports overview", () => {
  it("labels the pickers, shows classes instead of emails, and sorts by name", () => {
    renderReports([somchai, ann]);
    expect(screen.getByRole("combobox", { name: ts.classLabel })).toHaveClass("min-h-11");
    expect(screen.getByRole("searchbox", { name: ts.searchLabel })).toBeInTheDocument();
    const names = screen.getAllByRole("button", { name: /^(Ann|Somchai)$/ }).map((button) => button.textContent);
    expect(names).toEqual(["Ann", "Somchai"]);
    const row = screen.getByRole("row", { name: /Somchai/ });
    expect(within(row).getByText("P3A")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("somchai@example.com");
    // The tile that always showed 0% (no activity data in the list) is gone.
    expect(screen.queryByText(en.Reports.progress.activeThisWeek)).not.toBeInTheDocument();
  });

  it("opens with the class from the class page link", () => {
    renderReports([somchai, ann], "c2");
    expect(screen.getByRole("button", { name: "Ann" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Somchai" })).not.toBeInTheDocument();
  });

  it("pages a long list with 44 px pager buttons", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...somchai, id: `s${i}`, display_name: `Student ${String(i).padStart(2, "0")}` }));
    renderReports(many);
    expect(screen.getAllByRole("button", { name: /^Student \d\d$/ })).toHaveLength(10);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: en.teacher.myStudents.pagination.next });
    expect(next).toHaveClass("min-h-11");
    fireEvent.click(next);
    expect(screen.getAllByRole("button", { name: /^Student \d\d$/ })).toHaveLength(2);
  });

  it("offers My Classes when the teacher has no student", () => {
    renderReports([]);
    expect(screen.getByText(ts.noStudents)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ts.goToClasses })).toHaveAttribute("href", "/teacher/my-classes");
  });
});

// The real report panels render here (the gauge loads on demand), so a loaded machine needs time.
describe("teacher reports per-student view", { timeout: 20_000 }, () => {
  it("shows the level for the teacher, not the student text", async () => {
    renderReports([somchai]);
    fireEvent.click(screen.getByRole("button", { name: "Somchai" }));
    await flush();
    expect(screen.getByRole("heading", { name: "Somchai" })).toBeInTheDocument();
    expect(screen.getByText("Level: A1")).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(en.Reports.level.yourlevel))).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.Reports.progress.backToOverview })).toHaveClass("min-h-11");
  });

  it("shows an error with a retry when the activity cannot load, and loads it on retry", async () => {
    failures = 1;
    renderReports([somchai]);
    fireEvent.click(screen.getByRole("button", { name: "Somchai" }));
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(ts.activityLoadError);
    fireEvent.click(screen.getByRole("button", { name: en.Error.retry }));
    await flush();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(en.Reports.activityType.ARTICLE_READ)).toBeInTheDocument();
  });
});
