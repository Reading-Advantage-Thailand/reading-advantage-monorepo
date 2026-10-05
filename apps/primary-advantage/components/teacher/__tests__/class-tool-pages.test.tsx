// @vitest-environment jsdom
/**
 * Class sheet, QR card, and enrollment pages in the teacher shell (Lane C Phase 3, task 2): a
 * 44 px back link, a danger style for the password reset, a hint on the disabled Print button,
 * named remove buttons, and one enrollment heading.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ClassSheet } from "../class-login/class-sheet";
import { QrCardSheet } from "../class-login/qr-card-sheet";
import EnrollmentClient from "../enrollment-client";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const en = testMessages.en;
const fetchMock = vi.fn();

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    new Response(
      JSON.stringify({
        classroomName: "P3A",
        picturePasswordEnabled: true,
        openSession: null,
        students: [{ userId: "u1", name: "Ann", username: "p3a1", hasPicturePassword: true, hasCardToken: false, signedIn: false, lastSeenAt: null }],
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("class sheet page", () => {
  it("uses a danger style for the password reset and a 44 px back link", () => {
    renderWithMessages(<ClassSheet classroomId={CLASS_ID} />);
    expect(screen.getByRole("button", { name: en.ClassLogin.sheet.make })).toHaveClass("bg-destructive");
    expect(screen.getByRole("link", { name: en.ClassLogin.backToClass })).toHaveClass("min-h-11");
    expect(screen.getByRole("heading", { level: 1, name: en.ClassLogin.sheet.title })).toBeInTheDocument();
  });
});

describe("QR card page", () => {
  it("says why Print is disabled", async () => {
    renderWithMessages(<QrCardSheet classroomId={CLASS_ID} />);
    await flush();
    const print = screen.getByRole("button", { name: en.ClassLogin.qrPage.print });
    expect(print).toBeDisabled();
    expect(print).toHaveAccessibleDescription(en.TeacherClass.qrPrintHint);
    expect(screen.getByRole("link", { name: en.ClassLogin.backToClass })).toHaveClass("min-h-11");
  });
});

describe("enrollment page", () => {
  const classroom = {
    id: CLASS_ID,
    name: "P3A",
    students: [{ id: "cs1", studentId: "u1", classroomId: CLASS_ID, student: { id: "u1", name: "Ann", email: null, level: 2, xp: 10, cefrLevel: "A1" } }],
  };

  it("has one heading, a back link to the class, and a named remove button inside each card", () => {
    renderWithMessages(<EnrollmentClient classroomId={CLASS_ID} initialClassroom={classroom as never} />);
    expect(screen.getAllByText(en.Teacher.Enrollment.header.title)).toHaveLength(1);
    expect(screen.getByRole("link", { name: en.Teacher.Enrollment.actions.backToRoster })).toHaveAttribute("href", `/teacher/class-roster/${CLASS_ID}`);
    const remove = screen.getByRole("button", { name: "Remove Ann from the class" });
    expect(remove).toHaveClass("min-h-11");
  });
});
