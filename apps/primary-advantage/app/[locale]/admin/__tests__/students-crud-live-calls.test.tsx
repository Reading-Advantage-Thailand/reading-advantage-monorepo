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
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  renderWithMessages,
  testMessages,
} from "../../../../components/__tests__/helpers/render-with-messages";

const mockPush = vi.fn();
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

import StudentsPage from "../students/page";
import cnMessages from "../../../../messages/cn.json";
import enMessages from "../../../../messages/en.json";
import thMessages from "../../../../messages/th.json";
import twMessages from "../../../../messages/tw.json";
import viMessages from "../../../../messages/vi.json";

/** Real English copy for the AdminStudents namespace. */
const studentCopy = testMessages.en.AdminStudents;

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

    renderWithMessages(<StudentsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/students\?/),
      );
    });

    const addButton = screen.getByRole("button", {
      name: studentCopy.actions.addStudent,
    });
    await userEvent.click(addButton);

    const nameInput = screen.getByPlaceholderText(
      studentCopy.form.namePlaceholder,
    );
    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });

    const saveButton = screen.getByRole("button", {
      name: studentCopy.actions.saveStudent,
    });
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
      // The list reloads after the add, so the totals follow it (manual test A6).
      const reads = fetchSpy.mock.calls.filter(([url, init]) => typeof url === "string" && url.startsWith("/api/students?") && !(init as RequestInit | undefined)?.method);
      expect(reads.length).toBeGreaterThan(1);
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

    renderWithMessages(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeDefined();
    });

    const row = screen.getByRole("row", { name: /Bob Jones/ });
    const [editButton] = within(row).getAllByRole("button");
    await userEvent.click(editButton);

    const nameInput = screen.getByDisplayValue("Bob Jones");
    fireEvent.change(nameInput, { target: { value: "Bob Updated" } });

    const saveButton = screen.getByRole("button", {
      name: studentCopy.actions.saveChanges,
    });
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

    renderWithMessages(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Carol White")).toBeDefined();
    });

    const row = screen.getByRole("row", { name: /Carol White/ });
    const [, deleteTrigger] = within(row).getAllByRole("button");
    await userEvent.click(deleteTrigger);

    const confirmButton = screen.getByRole("button", {
      name: studentCopy.actions.delete,
    });
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
    // The list and its totals reload after the delete (manual test A6).
    await waitFor(() => {
      const reads = fetchSpy.mock.calls.filter(([url, init]) => typeof url === "string" && url.startsWith("/api/students?") && !(init as RequestInit | undefined)?.method);
      expect(reads.length).toBeGreaterThan(1);
    });
  }, 30_000);
});

const BOB = {
  id: "student-1",
  name: "Bob Jones",
  email: "bob@example.com",
  cefrLevel: "A1",
  xp: 0,
  role: "student",
  createdAt: "2026-01-01",
  className: null,
  classroomId: null,
};

/**
 * Mocks the list read with one student and answers each write with the given status.
 * @param writeStatus HTTP status of the POST, PUT, and DELETE answers.
 * @param writeBody JSON body of those answers.
 */
function mockWrites(writeStatus: number, writeBody: Record<string, unknown>) {
  vi.spyOn(global, "fetch").mockImplementation(async (url, init) => {
    const method = (init as RequestInit | undefined)?.method;
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      return new Response(JSON.stringify(writeBody), { status: writeStatus });
    }
    if (typeof url === "string" && url.startsWith("/api/classrooms")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        ...EMPTY_RESPONSE,
        students: [BOB],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
      { status: 200 },
    );
  });
}

async function addStudent() {
  await userEvent.click(
    screen.getByRole("button", { name: studentCopy.actions.addStudent }),
  );
  fireEvent.change(screen.getByPlaceholderText(studentCopy.form.namePlaceholder), {
    target: { value: "Alice Smith" },
  });
  await userEvent.click(
    screen.getByRole("button", { name: studentCopy.actions.saveStudent }),
  );
}

async function editStudent() {
  const row = screen.getByRole("row", { name: /Bob Jones/ });
  await userEvent.click(within(row).getAllByRole("button")[0]);
  fireEvent.change(screen.getByDisplayValue("Bob Jones"), {
    target: { value: "Bob Updated" },
  });
  await userEvent.click(
    screen.getByRole("button", { name: studentCopy.actions.saveChanges }),
  );
}

async function deleteStudent() {
  const row = screen.getByRole("row", { name: /Bob Jones/ });
  await userEvent.click(within(row).getAllByRole("button")[1]);
  await userEvent.click(
    screen.getByRole("button", { name: studentCopy.actions.delete }),
  );
}

describe("admin students toasts (FR-2)", () => {
  const toasts = enMessages.AdminStudents.toasts;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["add", addStudent, toasts.addSuccess],
    ["edit", editStudent, toasts.updateSuccess],
    ["delete", deleteStudent, toasts.deleteSuccess],
  ])("shows a success toast after %s", async (_name, act, title) => {
    mockWrites(200, { student: BOB });
    renderWithMessages(<StudentsPage />);
    await waitFor(() => expect(screen.getByText("Bob Jones")).toBeDefined());

    await act();

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(title));
    expect(toastMock.error).not.toHaveBeenCalled();
  }, 30_000);

  it.each([
    ["add", addStudent, toasts.addError],
    ["edit", editStudent, toasts.updateError],
    ["delete", deleteStudent, toasts.deleteError],
  ])("shows an error toast with the server text after a failed %s", async (_name, act, title) => {
    mockWrites(400, { error: "Name already used" });
    renderWithMessages(<StudentsPage />);
    await waitFor(() => expect(screen.getByText("Bob Jones")).toBeDefined());

    await act();

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(title, {
        description: "Name already used",
      }),
    );
    expect(toastMock.success).not.toHaveBeenCalled();
  }, 30_000);

  it("shows an error toast without a description when the answer has no error text", async () => {
    mockWrites(500, {});
    renderWithMessages(<StudentsPage />);
    await waitFor(() => expect(screen.getByText("Bob Jones")).toBeDefined());

    await addStudent();

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(toasts.addError, {
        description: undefined,
      }),
    );
  }, 30_000);

  it("has the seven AdminStudents.toasts keys in the five locales", () => {
    const keys = Object.keys(toasts).sort();
    expect(keys).toEqual(
      [
        "addError",
        "addSuccess",
        "deleteError",
        "deleteSuccess",
        "fetchError",
        "updateError",
        "updateSuccess",
      ],
    );
    for (const messages of [thMessages, cnMessages, twMessages, viMessages]) {
      expect(Object.keys(messages.AdminStudents.toasts).sort()).toEqual(keys);
    }
  });
});
