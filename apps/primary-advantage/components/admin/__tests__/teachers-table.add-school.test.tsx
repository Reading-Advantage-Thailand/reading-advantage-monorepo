// @vitest-environment jsdom
/**
 * Teachers table, SYSTEM add-teacher school choice (S2 follow-up): the add
 * dialog offers a school picker for SYSTEM only, the class list is scoped to
 * the picked school, the create carries the school id, and the non-SYSTEM
 * flow sends no school id.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const session = vi.hoisted(() => ({ user: { role: "SYSTEM" } as { role: string } | null }));
vi.mock("@reading-advantage/auth-client", () => ({ useSession: () => session }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children?: ReactNode }) => (
    <select data-testid="plain-select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>,
}));
vi.mock("@/components/admin/school-select", () => ({
  SchoolSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) =>
    session.user?.role === "SYSTEM" ? (
      <select aria-label="School" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="school-a">School A</option>
        <option value="school-b">School B</option>
      </select>
    ) : null,
}));

import { TeachersTable } from "../teachers-table";

const stats = { totalTeachers: 0, totalStudents: 0, totalClasses: 0, averageStudentsPerTeacher: 0, activeTeachers: 0 };
const fetchMock = vi.fn();
const calls = () => fetchMock.mock.calls.map((call) => ({ url: String(call[0]), init: call[1] as RequestInit | undefined }));

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  session.user = { role: "SYSTEM" };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/schools")) return new Response(JSON.stringify([{ id: "school-a", name: "School A" }, { id: "school-b", name: "School B" }]), { status: 200 });
    if (url.startsWith("/api/classrooms")) {
      const body = url.includes("school-b")
        ? [{ id: "c-new", name: "New class", grade: null, studentCount: 0 }]
        : [{ id: "c-old", name: "Old class", grade: null, studentCount: 0 }];
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (url === "/api/teachers" && init?.method === "POST") {
      return new Response(JSON.stringify({ success: true, teacher: { id: "t-new" } }), { status: 201 });
    }
    return new Response(JSON.stringify({ teachers: [], statistics: stats }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Opens the add dialog. */
async function openAdd() {
  renderWithMessages(<TeachersTable />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Add Teacher" }));
  await flush();
  return screen.getByRole("dialog");
}

/** Fills the required add fields. */
function fillRequired(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText("Full Name"), { target: { value: "Nina New" } });
  fireEvent.change(within(dialog).getByLabelText("Email Address"), { target: { value: "nina@example.com" } });
}

describe("TeachersTable add-teacher school choice", () => {
  it("shows the school picker in the add dialog for SYSTEM", async () => {
    const dialog = await openAdd();
    expect(within(dialog).getByLabelText("School")).toBeInTheDocument();
  });

  it("scopes the class list to the picked school", async () => {
    const dialog = await openAdd();
    fireEvent.change(within(dialog).getByLabelText("School"), { target: { value: "school-b" } });
    await flush();
    expect(calls().some((c) => c.url === "/api/classrooms?schoolId=school-b")).toBe(true);
    expect(within(dialog).getByLabelText(/New class/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Old class/)).not.toBeInTheDocument();
  });

  it("sends the picked school id in the create body", async () => {
    const dialog = await openAdd();
    fillRequired(dialog);
    fireEvent.change(within(dialog).getByLabelText("School"), { target: { value: "school-b" } });
    await flush();
    fireEvent.click(within(dialog).getByLabelText(/New class/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Teacher" }));
    await waitFor(() => expect(calls().some((c) => c.url === "/api/teachers" && c.init?.method === "POST")).toBe(true));
    const post = calls().find((c) => c.url === "/api/teachers" && c.init?.method === "POST");
    expect(JSON.parse(String(post?.init?.body))).toMatchObject({ schoolId: "school-b", classroomIds: ["c-new"] });
  });

  it("sends no school id and shows no picker for a non-SYSTEM caller", async () => {
    session.user = { role: "ADMIN" };
    const dialog = await openAdd();
    expect(within(dialog).queryByLabelText("School")).not.toBeInTheDocument();
    fillRequired(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Teacher" }));
    await waitFor(() => expect(calls().some((c) => c.url === "/api/teachers" && c.init?.method === "POST")).toBe(true));
    const post = calls().find((c) => c.url === "/api/teachers" && c.init?.method === "POST");
    expect(JSON.parse(String(post?.init?.body))).not.toHaveProperty("schoolId");
  });
});
