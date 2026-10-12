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
