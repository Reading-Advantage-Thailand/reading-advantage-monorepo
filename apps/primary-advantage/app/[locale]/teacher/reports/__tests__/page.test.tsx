// @vitest-environment jsdom
/**
 * Teacher reports page (Lane C Phase 3, task 4): the page passes the class from the class page
 * link to the reports, and a failed read of the classes or students shows an error with a retry
 * (before, the page showed an empty list as if the teacher had no students).
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

const mocks = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
  fetchClassrooms: vi.fn(),
  fetchStudentsByRole: vi.fn(),
  reports: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@/server/controllers/classroomController", () => ({
  fetchClassrooms: mocks.fetchClassrooms,
  fetchStudentsByRole: mocks.fetchStudentsByRole,
}));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return { getTranslations: async (namespace?: string) => createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }) };
});
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/teacher/teacher-progress-reports", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.reports(props);
    return <div data-testid="reports" />;
  },
}));

import ReportsPage from "../page";

const en = testMessages.en;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "t1", role: "TEACHER", schoolId: "school-1" };
  mocks.fetchClassrooms.mockResolvedValue(Response.json({ classrooms: [{ id: "c1", name: "P3A", classCode: "AAA111" }] }));
  mocks.fetchStudentsByRole.mockResolvedValue(Response.json({ students: [{ id: "s1", display_name: "Ann" }] }));
});
afterEach(cleanup);

describe("teacher reports page", () => {
  it("passes the classes, the students, and the class of the link to the reports", async () => {
    renderWithMessages(await ReportsPage({ searchParams: Promise.resolve({ classroomId: "c1" }) }));
    expect(screen.getByRole("heading", { level: 1, name: en.Reports.title })).toBeInTheDocument();
    expect(mocks.reports).toHaveBeenCalledWith(
      expect.objectContaining({
        classrooms: [expect.objectContaining({ id: "c1" })],
        students: [expect.objectContaining({ id: "s1" })],
        initialClassroomId: "c1",
      }),
    );
  });

  it("shows an error with a retry when the students cannot load", async () => {
    mocks.fetchStudentsByRole.mockResolvedValue(Response.json({ error: "Failed" }, { status: 500 }));
    renderWithMessages(await ReportsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.TeacherStudents.reportsLoadError);
    expect(screen.getByRole("button", { name: en.Error.retry })).toBeInTheDocument();
    expect(screen.queryByTestId("reports")).not.toBeInTheDocument();
  });
});
