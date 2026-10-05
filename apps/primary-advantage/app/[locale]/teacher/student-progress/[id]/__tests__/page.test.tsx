// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages, type TestLocale } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getUserById: vi.fn(),
  fetchUserActivity: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@/server/models/userModel", () => ({
  getUserById: mocks.getUserById,
}));
vi.mock("@/server/controllers/userController", () => ({
  fetchUserActivity: mocks.fetchUserActivity,
}));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: "en", messages: messages["en" as TestLocale], namespace: namespace as never }),
  };
});
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// The page composes dashboard charts; stub them to prove the data flow only.
vi.mock("@/components/header", () => ({
  Header: ({ heading }: { heading: string }) => <h1>{heading}</h1>,
}));
vi.mock("@/components/dashboard/user-recent-activity", () => ({
  default: () => <div data-testid="recent-activity" />,
}));
vi.mock("@/components/dashboard/user-level-indicator", () => ({
  default: () => <div data-testid="level-indicator" />,
}));
vi.mock("@/components/dashboard/user-activity-chart", () => ({
  UserActivityChart: () => <div data-testid="activity-chart" />,
}));
vi.mock("@/components/dashboard/user-heatmap-chart", () => ({
  default: () => <div data-testid="heatmap" />,
}));
vi.mock("@/components/dashboard/user-xpoverall-chart", () => ({
  UserXpOverAllChart: () => <div data-testid="xp-chart" />,
}));
vi.mock("@/components/dashboard/user-reading-chart", () => ({
  default: () => <div data-testid="reading-chart" />,
}));

import StudentProgressPage from "../page";

/**
 * Invokes the page with the given viewer and target rows.
 * @param viewer The signed-in user, or null for anonymous.
 * @param target The student row returned by the model.
 * @returns The resolved element for rendering or rejection assertion.
 */
function invokePage(
  viewer: { id: string; role: string; schoolId: string | null } | null,
  target: { id: string; schoolId: string | null; name?: string | null; username?: string } | null,
  query: { classroomId?: string } = {},
) {
  mocks.currentUser.mockResolvedValue(viewer);
  mocks.getUserById.mockResolvedValue(target);
  return StudentProgressPage({
    params: Promise.resolve({ id: target?.id ?? "student-1" }),
    searchParams: Promise.resolve(query),
  });
}

/** Renders a server page element with the English messages (the retry button is a client part). */
const render = (ui: ReactElement) => renderWithMessages(ui);
const ts = testMessages.en.TeacherStudents;
const sameSchoolTeacher = { id: "teacher-1", role: "TEACHER", schoolId: "school-a" };

const crossSchoolViewer = {
  id: "teacher-2",
  role: "TEACHER",
  schoolId: "school-b",
};

afterEach(cleanup);

describe("teacher student-progress page ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the auth error page for an anonymous visitor", async () => {
    const ui = await invokePage(null, {
      id: "student-1",
      schoolId: "school-a",
    });
    render(ui);

    expect(
      screen.getByRole("heading", { name: "Authentication Error" }),
    ).toBeInTheDocument();
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.fetchUserActivity).not.toHaveBeenCalled();
  });

  it("denies a teacher from another school before fetching activity", async () => {
    const ui = await invokePage(crossSchoolViewer, {
      id: "student-1",
      schoolId: "school-a",
    });
    render(ui);

    expect(
      screen.getByRole("heading", { name: "Authentication Error" }),
    ).toBeInTheDocument();
    expect(mocks.fetchUserActivity).not.toHaveBeenCalled();
  });

  it("denies a same-school student who is not the owner", async () => {
    const ui = await invokePage(
      { id: "student-2", role: "STUDENT", schoolId: "school-a" },
      { id: "student-1", schoolId: "school-a" },
    );
    render(ui);

    expect(
      screen.getByRole("heading", { name: "Authentication Error" }),
    ).toBeInTheDocument();
    expect(mocks.fetchUserActivity).not.toHaveBeenCalled();
  });

  it("renders progress for a same-school teacher", async () => {
    mocks.fetchUserActivity.mockResolvedValue({
      activity: [],
      xpLogs: [],
      user: { name: "Sam Student", username: "sam", cefrLevel: "A1" },
    });

    const ui = await invokePage(
      { id: "teacher-1", role: "TEACHER", schoolId: "school-a" },
      { id: "student-1", schoolId: "school-a" },
    );
    render(ui);

    expect(
      screen.getByRole("heading", { name: "Progress for Sam Student" }),
    ).toBeInTheDocument();
    expect(mocks.fetchUserActivity).toHaveBeenCalledWith("student-1");
  });

  it("lets a student read their own progress", async () => {
    mocks.fetchUserActivity.mockResolvedValue({
      activity: [],
      xpLogs: [],
      user: { name: null, username: "sam", cefrLevel: "A1" },
    });

    const ui = await invokePage(
      { id: "student-1", role: "STUDENT", schoolId: "school-a" },
      { id: "student-1", schoolId: "school-a" },
    );
    render(ui);

    expect(
      screen.getByRole("heading", { name: "Progress for sam" }),
    ).toBeInTheDocument();
  });

  it("links back to the reports, or to the class when the class page opened it", async () => {
    mocks.fetchUserActivity.mockResolvedValue({ activity: [], xpLogs: [], user: { name: "Sam Student", username: "sam", cefrLevel: "A1" } });
    render(await invokePage(sameSchoolTeacher, { id: "student-1", schoolId: "school-a" }));
    expect(screen.getByRole("link", { name: ts.backToReports })).toHaveAttribute("href", "/teacher/reports");
    cleanup();

    render(await invokePage(sameSchoolTeacher, { id: "student-1", schoolId: "school-a" }, { classroomId: "c1" }));
    const back = screen.getByRole("link", { name: ts.backToClass });
    expect(back).toHaveAttribute("href", "/teacher/class-roster/c1");
    expect(back).toHaveClass("min-h-11");
  });

  it("shows an error with a retry, not the sign-in error, when the activity cannot load", async () => {
    mocks.fetchUserActivity.mockResolvedValue(undefined);
    render(await invokePage(sameSchoolTeacher, { id: "student-1", schoolId: "school-a", name: "Sam Student", username: "sam" }));
    expect(screen.getByRole("heading", { level: 1, name: "Progress for Sam Student" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(ts.activityLoadError);
    expect(screen.getByRole("button", { name: testMessages.en.Error.retry })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Authentication Error" })).not.toBeInTheDocument();
  });
});
