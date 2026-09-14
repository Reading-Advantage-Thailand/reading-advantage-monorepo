// @vitest-environment jsdom
/**
 * Behavioral replacement for the component-deduplication DataTable static
 * case. The shared shell is stubbed with a row-count marker, then each live
 * table renders through it: a marker carrying the fetched row count proves at
 * runtime that the table delegates to the one DataTable shell.
 */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, fetchMock, toastMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  fetchMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

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
  usePathname: () => "/en/teacher/c1",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ refresh: vi.fn() }),
  useSession: () => ({
    user: {
      id: "user-1",
      username: "user-1",
      name: "User One",
      role: "TEACHER",
      schoolId: "school-1",
      xp: 0,
      level: 1,
      cefrLevel: "B1",
    },
  }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/actions/flashcard", () => ({
  deleteFlashcardCard: vi.fn(),
  getLessonFlashcards: vi.fn(),
  getDeckCards: vi.fn(),
  reviewCard: vi.fn(),
}));

vi.mock("../ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="shared-data-table" data-rows={String(data.length)} />
  ),
}));

import type { AssignmentStudent } from "@/types";
import { HistoryTable } from "../dashboard/history-table";
import Assignments from "../teacher/assignments";
import StudentAssignmentTable from "../student-assignment-table";
import MyStudents from "../teacher/my-students";
import MyClasses from "../teacher/my-classes";
import LicenseTable from "../system/license-table";
import ManageTab from "../manage-tab";
import { renderWithMessages } from "./helpers/render-with-messages";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (url: unknown) => {
    const target = String(url);
    if (target === "/api/classroom") {
      return {
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
      };
    }
    if (target.startsWith("/api/teachers/assignments")) {
      return {
        ok: true,
        json: async () => ({
          assignments: [
            {
              meta: {
                id: "a1",
                title: "Assign One",
                createdAt: new Date(0).toISOString(),
                dueDate: new Date(0).toISOString(),
              },
              students: [],
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
      };
    }
    if (target.includes("article-records")) {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: "r1",
              title: "River Tale",
              scores: "90",
              updated_at: new Date(0).toISOString(),
              rated: 1,
              status: "READ",
            },
            {
              id: "r2",
              title: "Hill Tale",
              scores: "80",
              updated_at: new Date(0).toISOString(),
              rated: 0,
              status: "READ",
            },
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        }),
      };
    }
    if (target === "/api/classroom/students") {
      return {
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
      };
    }
    if (target === "/api/licenses") {
      return {
        ok: true,
        json: async () => [
          { id: "l1", name: "License One", School: { id: "s1", name: "S1" } },
        ],
      };
    }
    return { ok: false, json: async () => ({}) };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Asserts one shared-shell marker carries the expected row count.
 * @param count Rows the table hands to the shell.
 */
async function expectShellRows(count: number): Promise<void> {
  const shells = await screen.findAllByTestId("shared-data-table");
  expect(
    shells.some((shell) => shell.getAttribute("data-rows") === String(count)),
  ).toBe(true);
}

describe("live tables through one DataTable shell", () => {
  it("serves history rows through the shell", async () => {
    renderWithMessages(<HistoryTable variant="history" />);
    await expectShellRows(2);
  });

  it("serves teacher assignments through the shell", async () => {
    renderWithMessages(<Assignments />);
    await expectShellRows(1);
  });

  it("serves student assignments through the shell", async () => {
    const initialAssignments: AssignmentStudent[] = [
      {
        id: "row-1",
        assignmentId: "a1",
        studentId: "user-1",
        status: "IN_PROGRESS",
        startedAt: new Date(0),
        completedAt: new Date(0),
      },
      {
        id: "row-2",
        assignmentId: "a2",
        studentId: "user-1",
        status: "COMPLETED",
        startedAt: new Date(0),
        completedAt: new Date(0),
      },
    ];
    renderWithMessages(
      <StudentAssignmentTable
        initialAssignments={initialAssignments}
        initialPagination={{
          currentPage: 1,
          totalPages: 1,
          totalCount: 2,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
        }}
      />,
    );
    await expectShellRows(2);
  });

  it("serves the student roster through the shell", async () => {
    renderWithMessages(<MyStudents />);
    await expectShellRows(1);
  });

  it("serves the classroom list through the shell", async () => {
    renderWithMessages(<MyClasses />);
    await expectShellRows(1);
  });

  it("serves licenses through the shell", async () => {
    renderWithMessages(<LicenseTable />);
    await expectShellRows(1);
  });

  it("serves managed sentences through the shell", async () => {
    renderWithMessages(
      <ManageTab
        data={[
          {
            id: "card-1",
            deckId: "deck-1",
            front: "Hello",
            back: "Hi",
            sourceId: null,
            order: 0,
            createdAt: new Date(0),
          },
          {
            id: "card-2",
            deckId: "deck-1",
            front: "World",
            back: "World",
            sourceId: null,
            order: 1,
            createdAt: new Date(0),
          },
        ]}
      />,
    );
    await expectShellRows(2);
  });
});
