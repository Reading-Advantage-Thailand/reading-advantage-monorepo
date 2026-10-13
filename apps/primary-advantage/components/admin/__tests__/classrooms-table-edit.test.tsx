// @vitest-environment jsdom
/**
 * Admin class edit dialog (FR-1): it sends `classroomName` and `grade` (the contract of
 * `updateClassroomBodySchema`), uses a grade select, shows the class code read-only, and has no
 * "Student password" field (Q1 default).
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
  DropdownMenuLabel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children?: ReactNode }) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { ClassroomsTable } from "../classrooms-table";

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const classroom = {
  id: C1,
  name: "P3A",
  grade: "4",
  classCode: "ABC123",
  createdAt: "2026-10-04T20:00:00Z",
  updatedAt: "2026-10-04T20:00:00Z",
  students: [],
  teachers: [],
};
const fetchMock = vi.fn();

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === "PATCH"
      ? new Response(JSON.stringify({ classroom }), { status: 200 })
      : new Response(JSON.stringify({ classrooms: [classroom] }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openEditDialog() {
  renderWithMessages(<ClassroomsTable />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  await flush();
}

describe("admin class edit dialog", () => {
  it("sends classroomName and grade from a grade select", async () => {
    await openEditDialog();

    const grade = screen.getByRole("combobox") as HTMLSelectElement;
    expect(grade.value).toBe("4");
    fireEvent.change(grade, { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "P3B" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await flush();

    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(patch?.[0]).toBe(`/api/classroom/${C1}`);
    expect(JSON.parse(patch?.[1].body as string)).toEqual({ classroomName: "P3B", grade: "5" });
  });

  it("shows the class code read-only and no student password field", async () => {
    await openEditDialog();

    expect(screen.getByLabelText("Class Code")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Class Code")).toHaveValue("ABC123");
    expect(screen.queryByLabelText("Student Password")).not.toBeInTheDocument();
  });
});

/**
 * H-1, H-2, M-9: the list returns an integer grade and flat teacher rows `{id, name, email}`.
 * The dialog opens, sends the grade as a string, and sends `teacherIds` only after a change.
 */
describe("admin class edit dialog with API-shaped rows", () => {
  const OWNER = "t-owner";
  const ADMIN_CO = "a-co";
  const apiClassroom = {
    ...classroom,
    grade: 4,
    schoolId: "s1",
    ownerId: OWNER,
    teachers: [
      { id: OWNER, name: "Ms. Owner", email: "owner@demo.example" },
      { id: ADMIN_CO, name: "Admin Co", email: "admin-co@demo.example" },
    ],
  };

  beforeEach(() => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return new Response(JSON.stringify({ classroom }), { status: 200 });
      if (String(url).startsWith("/api/teachers")) {
        return new Response(JSON.stringify({ teachers: [{ id: OWNER, name: "Ms. Owner", email: "owner@demo.example" }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ classrooms: [apiClassroom] }), { status: 200 });
    });
  });

  const patchBody = () => {
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    return JSON.parse(patch?.[1].body as string);
  };

  it("opens the dialog and sends a string grade with no teacherIds when no teacher changed", async () => {
    await openEditDialog();

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("4");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "P3B" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await flush();

    expect(patchBody()).toEqual({ classroomName: "P3B", grade: "4" });
  });

  it("lists a co-teacher who is not a TEACHER of the school as a checked row that can be removed", async () => {
    await openEditDialog();

    const row = screen.getByText("Admin Co").closest("label") as HTMLElement;
    const box = row.querySelector("input") as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await flush();

    expect(patchBody().teacherIds).toEqual([OWNER]);
  });
});

describe("admin class create dialog (L-6)", () => {
  it("does not send an empty passwordStudents", async () => {
    renderWithMessages(<ClassroomsTable />);
    await flush();
    fireEvent.click(screen.getAllByRole("button", { name: "Create Classroom" })[0]);
    await flush();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "P4A" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await flush();

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    const body = JSON.parse(post?.[1].body as string);
    expect(body).not.toHaveProperty("passwordStudents");
    expect(body).toMatchObject({ name: "P4A", grade: "4" });
  });
});
