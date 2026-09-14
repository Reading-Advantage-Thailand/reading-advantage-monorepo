// @vitest-environment jsdom
/**
 * Behavioral replacements for the broken-ux-fixes static cases that target
 * client components (FR-4 dead links, FR-5 footer copy, FR-7 signup form,
 * FR-8 header spelling, FR-9 act warnings). Each test renders through the
 * real message trees and asserts on visible output. FR-6 (assignment-table
 * t() calls) is already covered by student-assignment-table-messages.test.tsx,
 * so it is deleted without a duplicate here.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: pushMock,
    back: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/en",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ logout: vi.fn().mockResolvedValue(undefined) }),
  useSession: () => ({
    user: {
      id: "student-1",
      username: "student-1",
      name: "Student One",
      role: "TEACHER",
      schoolId: "school-1",
      xp: 0,
      level: 1,
      cefrLevel: "B1",
    },
  }),
}));

const signUpActionMock = vi.fn();

vi.mock("@/actions/signupAction", () => ({
  signUpAction: (...args: unknown[]) => signUpActionMock(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { AdminQuickActions } from "../admin/admin-quick-actions";
import { AdminDashboardHeader } from "../admin/admin-dashboard-header";
import { Footer } from "../index/footer";
import { SignUpForm } from "../auth/user-signup-form";
import MyStudents from "../teacher/my-students";
import MyClasses from "../teacher/my-classes";
import { HistoryTable } from "../dashboard/history-table";
import StudentAssignmentTable from "../student-assignment-table";
import {
  renderWithMessages,
  testMessages,
} from "./helpers/render-with-messages";

const en = testMessages.en;
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
  pushMock.mockClear();
  signUpActionMock.mockReset();
  // jsdom lacks the layout observer Radix form controls rely on.
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
  vi.unstubAllGlobals();
});

/**
 * Collects every rendered anchor href in the current document.
 * @returns The href values in document order.
 */
function renderedHrefs(): (string | null)[] {
  return Array.from(document.body.querySelectorAll("a")).map((anchor) =>
    anchor.getAttribute("href"),
  );
}

describe("FR-4 admin and footer links", () => {
  it("renders only live admin routes from quick actions and the header", () => {
    renderWithMessages(<AdminQuickActions />);
    renderWithMessages(<AdminDashboardHeader />);
    const hrefs = renderedHrefs();
    expect(hrefs.length).toBeGreaterThan(0);
    for (const dead of [
      "/admin/dashboard/reports",
      "/admin/settings",
      "/pricing",
    ]) {
      expect(hrefs).not.toContain(dead);
    }
    for (const href of hrefs) {
      expect(href, "every rendered link points somewhere").not.toBe("");
      expect(href).not.toBeNull();
    }
  });
});

describe("FR-5 footer content", () => {
  it("shows the corrected tagline and contact details", () => {
    renderWithMessages(<Footer />);
    expect(
      screen.getByText("Providing the best English learning experience."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Email: admin@reading-advantage.com"),
    ).toBeInTheDocument();
    expect(document.body.textContent).toContain(en.Footer.rights);
    expect(
      document.body.textContent,
    ).toContain(String(new Date().getFullYear()));
    for (const stale of [
      "Provinding",
      "info@primaryadvantage.com",
      "+1 (123) 456-7890",
      "2024",
    ]) {
      expect(document.body.textContent).not.toContain(stale);
    }
    expect(renderedHrefs()).not.toContain("/pricing");
  });
});

describe("FR-7 signup legal links and pending state", () => {
  it("links the real legal routes and disables inputs while pending", async () => {
    signUpActionMock.mockReturnValue(new Promise(() => undefined));
    renderWithMessages(<SignUpForm />);
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy-policy");

    fireEvent.change(screen.getByPlaceholderText("John Doe"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    const passwords = screen.getAllByLabelText(/password/i);
    fireEvent.change(passwords[0], { target: { value: "password123" } });
    fireEvent.change(passwords[1], { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => expect(signUpActionMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByPlaceholderText("John Doe")).toBeDisabled(),
    );
    expect(screen.getByPlaceholderText("name@example.com")).toBeDisabled();
  });
});

describe("FR-8 header spelling", () => {
  it("renders the students table with translated copy and correct classes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        students: [
          {
            id: "s1",
            email: "ann@example.com",
            display_name: "Ann",
            xp: 0,
            level: 1,
            cefrLevel: "A1",
            classrooms: [],
          },
        ],
      }),
    });
    renderWithMessages(<MyStudents />);
    expect(
      await screen.findByPlaceholderText(
        en.teacher.myStudents.search.placeholder,
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Ann")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("captoliza");
    expect(
      document.body.querySelector(".capitalize"),
      "cells use the correctly spelled capitalize class",
    ).not.toBeNull();
  });

  it("renders the classes table with translated copy and correct classes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        classrooms: [
          {
            id: "c1",
            name: "Class One",
            classCode: "ABC123",
            grade: "1",
            students: [],
            importedFromGoogle: false,
          },
        ],
      }),
    });
    renderWithMessages(<MyClasses />);
    expect(
      await screen.findByPlaceholderText(
        en.TeacherMyClasses.search.placeholder,
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Class One")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("captoliza");
    expect(
      document.body.querySelector(".capitalize"),
      "cells use the correctly spelled capitalize class",
    ).not.toBeNull();
  });

  it("renders the history table with translated copy and correct classes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "r1",
            title: "River Tale",
            scores: "90",
            updated_at: new Date().toISOString(),
            rated: 5,
            status: "READ",
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    });
    renderWithMessages(<HistoryTable variant="history" />);
    expect(await screen.findByText("River Tale")).toBeInTheDocument();
    expect(
      await screen.findByPlaceholderText(
        en.Student.history.searchPlaceholder,
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("captoliza");
    expect(
      document.body.querySelector(".capitalize"),
      "cells use the correctly spelled capitalize class",
    ).not.toBeNull();
  });
});

describe("FR-9 act warnings", () => {
  it("renders the assignment table with no React act warnings", async () => {
    // The legacy "no console module import" rows collapse into this render:
    // the client component loads in jsdom (a browser-like module graph with
    // no node:console loader), and the server files use only the console
    // global. No runtime signal can distinguish a global from an import, so
    // import hygiene there stays a lint concern.
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        assignments: [
          {
            id: "row-1",
            studentId: "student-1",
            status: "IN_PROGRESS",
            score: null,
            startedAt: null,
            assignmentId: "assignment-1",
            createdAt: new Date().toISOString(),
            completedAt: null,
            assignment: {
              id: "assignment-1",
              classroomId: "classroom-1",
              articleId: null,
              lessonId: null,
              title: "River assignment",
              type: "reading",
              description: null,
              dueDate: new Date(
                Date.now() + 86_400_000,
              ).toISOString(),
              createdAt: new Date().toISOString(),
              teacherId: "teacher-1",
              teacherName: "Teacher One",
            },
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
        },
      }),
    });
    const consoleErrors: unknown[][] = [];
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        consoleErrors.push(args);
      });
    try {
      renderWithMessages(<StudentAssignmentTable />);
      expect(
        await screen.findByText(
          en.Assignment.studentAssignmentTable.title,
        ),
      ).toBeInTheDocument();
      const actWarnings = consoleErrors.filter((args) =>
        args
          .map(String)
          .join(" ")
          .includes("not wrapped in act"),
      );
      expect(actWarnings).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
