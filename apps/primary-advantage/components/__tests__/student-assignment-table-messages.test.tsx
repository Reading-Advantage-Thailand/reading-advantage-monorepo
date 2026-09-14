// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import enMessages from "../../messages/en.json";
import thMessages from "../../messages/th.json";
import StudentAssignmentTable from "../student-assignment-table";

const DAY_MS = 86_400_000;
const mockFetch = vi.fn();

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ logout: vi.fn().mockResolvedValue(undefined) }),
  useSession: () => ({
    user: {
      id: "student-1",
      username: "student-1",
      name: "Student One",
      role: "STUDENT",
      schoolId: "school-1",
      xp: 0,
      level: 1,
      cefrLevel: "B1",
    },
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/",
  Link: ({ children, href, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * Creates one student assignment row with the requested due date.
 * @param title Assignment title shown in the table.
 * @param dueDate ISO due date, or null when the assignment has none.
 * @returns A student-assignment row accepted by the table.
 */
function rowFixture(title: string, dueDate: string) {
  return {
    id: `row-${title}`,
    studentId: "student-1",
    status: "IN_PROGRESS",
    score: null,
    startedAt: null,
    assignmentId: `assignment-${title}`,
    createdAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
    completedAt: null,
    assignment: {
      id: `assignment-${title}`,
      classroomId: "classroom-1",
      articleId: null,
      lessonId: null,
      title,
      type: "reading",
      description: null,
      dueDate,
      createdAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      teacherId: "teacher-1",
      teacherName: "Teacher One",
    },
  };
}

const MESSAGES = { en: enMessages, th: thMessages } as const;

/**
 * Renders the assignment table with the real message tree for a locale.
 * @param locale Supported app locale.
 * @returns The rendered table utilities.
 */
function renderTable(locale: "en" | "th") {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <StudentAssignmentTable />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      assignments: [
        rowFixture("Upcoming river", new Date(Date.now() + 2 * DAY_MS).toISOString()),
        rowFixture("Overdue forest", new Date(Date.now() - 2 * DAY_MS).toISOString()),
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 2,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10,
      },
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StudentAssignmentTable due-date badge translations", () => {
  it.each(["en", "th"] as const)(
    "formats the due-date badges from the real %s message tree",
    async (locale) => {
      const messages = MESSAGES[locale];
      const table = messages.Assignment.studentAssignmentTable;
      const expectedDaysLeft = table.daysLeft.replace("{daysDiff}", "2");

      renderTable(locale);

      expect(await screen.findByText(expectedDaysLeft)).toBeInTheDocument();

      const badgeTexts = Array.from(
        document.body.querySelectorAll('[data-slot="badge"]'),
      ).map((badge) => badge.textContent);
      expect(badgeTexts).toHaveLength(2);
      expect(badgeTexts).toContain(expectedDaysLeft);
      expect(badgeTexts).toContain(table.overdue);

      expect(screen.getByText(table.title)).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/students/student-1/assignments"),
      );
      expect(document.body.textContent).not.toContain("Assignment.studentAssignmentTable");
    },
  );
});
