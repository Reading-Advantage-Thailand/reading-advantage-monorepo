// @vitest-environment jsdom
/** Lesson rehearsal in Preview mode: the student lesson runs inside a preview provider, so nothing saves. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadTeacherLesson: vi.fn() }));

vi.mock("@/lib/session", () => ({ currentUser: async () => ({ id: "t1", role: "TEACHER", schoolId: "sc1" }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en", getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(),
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("@/components/teacher/teacher-shell", () => ({ TEACHER_BACK_LINK: "back" }));
vi.mock("../../page", () => ({ loadTeacherLesson: mocks.loadTeacherLesson }));
vi.mock("@/components/lesson/lesson-card", async () => {
  const { useStudentView } = await import("@/components/student/student-view-provider");
  return { default: () => <div data-testid="lesson-card" data-mode={useStudentView().mode} /> };
});

import RehearsalPage from "../page";

afterEach(cleanup);

describe("lesson rehearsal page", () => {
  it("runs the student lesson in preview mode", async () => {
    mocks.loadTeacherLesson.mockResolvedValue({ lesson: { articleId: "a1" } });
    const ui = await RehearsalPage({ params: Promise.resolve({ classroomId: "c1", classBookId: "b1", number: "1" }) });
    render(ui as React.ReactElement);
    expect(screen.getByTestId("lesson-card")).toHaveAttribute("data-mode", "preview");
  });
});
