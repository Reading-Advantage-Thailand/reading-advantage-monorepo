// @vitest-environment jsdom
/**
 * Teachers table, SYSTEM school management (S3): the school column and filter show for SYSTEM only,
 * a school change reloads the class list, the move runs through POST /api/teachers/[id]/move,
 * and a 409 shows the class names.
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

const teacher = {
  id: "t1",
  name: "Anna Teacher",
  email: "anna@example.com",
  role: "teacher",
  createdAt: "2026-10-04T20:00:00Z",
  schoolId: "school-a",
  totalStudents: 0,
  totalClasses: 0,
  assignedClassrooms: [{ id: "c-old", name: "Old class" }],
};
const stats = { totalTeachers: 1, totalStudents: 0, totalClasses: 0, averageStudentsPerTeacher: 0, activeTeachers: 0 };
const calls = () => fetchMock.mock.calls.map((call) => ({ url: String(call[0]), init: call[1] as RequestInit | undefined }));
const fetchMock = vi.fn();
let moveResponse: Response;
let putResponse: Response;

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  session.user = { role: "SYSTEM" };
  moveResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
  putResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/schools")) return new Response(JSON.stringify([{ id: "school-a", name: "School A" }, { id: "school-b", name: "School B" }]), { status: 200 });
    if (url.startsWith("/api/classrooms")) {
      const body = url.includes("school-b") ? [{ id: "c-new", name: "New class", grade: null, studentCount: 0 }] : [{ id: "c-old", name: "Old class", grade: null, studentCount: 0 }];
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (url.endsWith("/move")) return moveResponse;
    if (init?.method === "PUT") return putResponse;
    return new Response(JSON.stringify({ teachers: [teacher], statistics: stats }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Opens the edit dialog of the first teacher. */
async function openEdit() {
  renderWithMessages(<TeachersTable />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Edit Teacher" }));
  await flush();
  return screen.getByRole("dialog");
}

describe("TeachersTable school management", () => {
  it("shows the school column and the school filter for SYSTEM", async () => {
    renderWithMessages(<TeachersTable />);
    await flush();
    expect(screen.getByRole("columnheader", { name: "School" })).toBeInTheDocument();
    expect(screen.getAllByText("School A").length).toBeGreaterThan(0);
    fireEvent.change(screen.getAllByTestId("plain-select")[0]!, { target: { value: "school-b" } });
    await waitFor(() => expect(calls().some((c) => c.url === "/api/teachers?schoolId=school-b")).toBe(true));
  });

  it("shows no school column, filter, or school fetch for an ADMIN", async () => {
    session.user = { role: "ADMIN" };
    renderWithMessages(<TeachersTable />);
    await flush();
    expect(screen.queryByRole("columnheader", { name: "School" })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("plain-select")).toHaveLength(0);
    expect(calls().some((c) => c.url.startsWith("/api/schools"))).toBe(false);
  });

  it("clears the class choice and reloads the classes of the new school", async () => {
    const dialog = await openEdit();
    expect(within(dialog).getByLabelText(/Old class/)).toBeChecked();
    fireEvent.change(within(dialog).getByLabelText("School"), { target: { value: "school-b" } });
    await flush();
    expect(calls().some((c) => c.url === "/api/classrooms?schoolId=school-b")).toBe(true);
    expect(within(dialog).getByLabelText(/New class/)).not.toBeChecked();
    expect(within(dialog).queryByLabelText(/Old class/)).not.toBeInTheDocument();
  });

  it("moves through the move route with the chosen classes, after it saves the other fields", async () => {
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("School"), { target: { value: "school-b" } });
    await flush();
    fireEvent.click(within(dialog).getByLabelText(/New class/));
    fireEvent.click(within(dialog).getByRole("button", { name: "Update Teacher" }));
    await flush();
    const move = calls().find((c) => c.url === "/api/teachers/t1/move");
    expect(JSON.parse(String(move?.init?.body))).toEqual({ schoolId: "school-b", classroomIds: ["c-new"] });
    const put = calls().find((c) => c.init?.method === "PUT");
    expect(JSON.parse(String(put?.init?.body))).not.toHaveProperty("classroomIds");
    // M10: the PUT goes first, so a failed PUT leaves the teacher in the old school.
    const urls = calls().map((c) => (c.init?.method === "PUT" ? "PUT" : c.url.endsWith("/move") ? "MOVE" : "other"));
    expect(urls.indexOf("PUT")).toBeGreaterThan(-1);
    expect(urls.indexOf("PUT")).toBeLessThan(urls.indexOf("MOVE"));
  });

  it("sends no move and keeps the dialog open when the PUT fails (M10)", async () => {
    putResponse = new Response(JSON.stringify({ error: "Update refused" }), { status: 400 });
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("School"), { target: { value: "school-b" } });
    await flush();
    fireEvent.click(within(dialog).getByRole("button", { name: "Update Teacher" }));
    await flush();
    expect(calls().some((c) => c.url.endsWith("/move"))).toBe(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the move error in the dialog when the move fails after the PUT (M10)", async () => {
    moveResponse = new Response(JSON.stringify({ error: "The school was not found", code: "SCHOOL_NOT_FOUND" }), { status: 400 });
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("School"), { target: { value: "school-b" } });
    await flush();
    fireEvent.click(within(dialog).getByRole("button", { name: "Update Teacher" }));
    await flush();
    const open = screen.getByRole("dialog");
    expect(within(open).getByRole("alert")).toHaveTextContent("The school was not found");
  });

  it("shows the class names when the server refuses the move with 409", async () => {
    moveResponse = new Response(JSON.stringify({ code: "OWNS_CLASSES", classNames: ["P1A", "P2B"] }), { status: 409 });
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText("School"), { target: { value: "school-b" } });
    await flush();
    fireEvent.click(within(dialog).getByRole("button", { name: "Update Teacher" }));
    await flush();
    expect(screen.getByText("The teacher cannot move yet")).toBeInTheDocument();
    expect(screen.getByText("P1A")).toBeInTheDocument();
    expect(screen.getByText("P2B")).toBeInTheDocument();
  });
});
