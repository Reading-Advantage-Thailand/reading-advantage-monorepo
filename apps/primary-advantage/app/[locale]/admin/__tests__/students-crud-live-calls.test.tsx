// @vitest-environment jsdom
/**
 * Red test for Primary Phase 1: admin student CRUD must make real server calls.
 *
 * app/[locale]/admin/students/page.tsx currently mutates local React state for
 * add/update/delete and then calls fetchStudents() (a GET refresh). No
 * POST/PUT/DELETE requests are issued, so the admin UI is non-functional for
 * persistence.
 *
 * Green: wire handleAddStudent / handleUpdateStudent / handleDeleteStudent to
 * POST /api/students, PUT /api/students/:id, and DELETE /api/students/:id
 * respectively, then reconcile the server response before refreshing the list.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () =>
    (key: string, params?: Record<string, unknown>) => {
      if (params && typeof params === "object") {
        return `${key}:${Object.values(params).join(":")}`;
      }
      return key;
    },
}));

import StudentsPage from "../students/page";

const EMPTY_RESPONSE = {
  students: [],
  statistics: {
    totalStudents: 0,
    averageXp: 0,
    mostCommonLevel: "A0-",
    activeThisWeek: 0,
    activePercentage: 0,
  },
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

function mockFetch(responseOverrides: Record<string, unknown> = {}) {
  return vi.spyOn(global, "fetch").mockImplementation(async (url) => {
    if (typeof url === "string" && url.startsWith("/api/classrooms")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    return new Response(
      JSON.stringify({ ...EMPTY_RESPONSE, ...responseOverrides }),
      { status: 200 },
    );
  });
}

describe("admin students CRUD live server calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs to /api/students when adding a student", async () => {
    const fetchSpy = mockFetch();

    render(<StudentsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/students\?/),
      );
    });

    const addButton = screen.getByRole("button", { name: /actions\.addStudent/i });
    await userEvent.click(addButton);

    const nameInput = screen.getByPlaceholderText("form.namePlaceholder");
    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });

    const saveButton = screen.getByRole("button", { name: /actions\.saveStudent/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      const postCalls = fetchSpy.mock.calls.filter(
        ([url, init]) =>
          typeof url === "string" &&
          url === "/api/students" &&
          init && (init as RequestInit).method === "POST",
      );
      expect(
        postCalls.length,
        "add student must issue POST /api/students",
      ).toBeGreaterThan(0);
    });
  }, 30_000);

  it("PUTs to /api/students/:id when updating a student", async () => {
    const fetchSpy = mockFetch({
      students: [
        {
          id: "student-1",
          name: "Bob Jones",
          email: "bob@example.com",
          cefrLevel: "A1",
          xp: 0,
          role: "student",
          createdAt: "2026-01-01",
          className: null,
          classroomId: null,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeDefined();
    });

    const row = screen.getByRole("row", { name: /Bob Jones/ });
    const [editButton] = within(row).getAllByRole("button");
    await userEvent.click(editButton);

    const nameInput = screen.getByDisplayValue("Bob Jones");
    fireEvent.change(nameInput, { target: { value: "Bob Updated" } });

    const saveButton = screen.getByRole("button", { name: /actions\.saveChanges/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      const putCalls = fetchSpy.mock.calls.filter(
        ([url, init]) =>
          typeof url === "string" &&
          /^\/api\/students\/[^/]+$/.test(url) &&
          init && (init as RequestInit).method === "PUT",
      );
      expect(
        putCalls.length,
        "update student must issue PUT /api/students/:id",
      ).toBeGreaterThan(0);
    });
  }, 30_000);

  it("DELETEs /api/students/:id when deleting a student", async () => {
    const fetchSpy = mockFetch({
      students: [
        {
          id: "student-2",
          name: "Carol White",
          email: "carol@example.com",
          cefrLevel: "A1",
          xp: 0,
          role: "student",
          createdAt: "2026-01-01",
          className: null,
          classroomId: null,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Carol White")).toBeDefined();
    });

    const row = screen.getByRole("row", { name: /Carol White/ });
    const [, deleteTrigger] = within(row).getAllByRole("button");
    await userEvent.click(deleteTrigger);

    const confirmButton = screen.getByRole("button", { name: /actions\.delete$/i });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      const deleteCalls = fetchSpy.mock.calls.filter(
        ([url, init]) =>
          typeof url === "string" &&
          /^\/api\/students\/[^/]+$/.test(url) &&
          init && (init as RequestInit).method === "DELETE",
      );
      expect(
        deleteCalls.length,
        "delete student must issue DELETE /api/students/:id",
      ).toBeGreaterThan(0);
    });
  }, 30_000);
});
