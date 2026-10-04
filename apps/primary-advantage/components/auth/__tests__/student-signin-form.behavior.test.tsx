// @vitest-environment jsdom
/**
 * Behavioral test: entering a class code renders the student picker from the
 * flat fields that fetchStudentsByClassCode returns.
 */
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/actions/classroom", () => ({
  fetchStudentsByClassCode: vi.fn(async () => ({
    success: true,
    students: [
      {
        id: "cs-1",
        classroomId: "c-1",
        studentId: "u-1",
        studentUserId: "u-1",
        studentEmail: "ada@example.com",
        studentName: "Ada Student",
      },
    ],
  })),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { StudentSignInForm } from "../student-signin-form";
import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";

describe("StudentSignInForm", () => {
  it("shows the student picker after a class code is submitted", async () => {
    const user = userEvent.setup();
    const { container } = renderWithMessages(<StudentSignInForm />);
    await user.type(container.querySelector("input")!, "ABC123");
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
  });
});
