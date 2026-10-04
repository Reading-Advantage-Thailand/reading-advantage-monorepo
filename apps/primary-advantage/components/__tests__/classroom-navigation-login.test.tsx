// @vitest-environment jsdom
/**
 * The class page header no longer shows the old class code and student password
 * (primary_student_login_20261003, Phase 4 review). Students sign in with the live code from the
 * class login panel, so the old values would send them to a sign-in path that is gone.
 */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import ClassroomNavigation from "../teacher/classroom-navigation";
import { renderWithMessages } from "./helpers/render-with-messages";

describe("ClassroomNavigation", () => {
  it("does not show the old class code or the old student password", () => {
    renderWithMessages(
      <ClassroomNavigation
        classroom={{ id: "c1", name: "P3A", classCode: "OLDCODE1", passwordStudents: "oldpass1", studentCount: 2 }}
      />,
    );
    expect(screen.getByRole("heading", { name: "P3A" })).toBeInTheDocument();
    expect(screen.queryByText(/OLDCODE1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /password/i })).not.toBeInTheDocument();
  });
});
