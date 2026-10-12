// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, testMessages } from "../../__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { PreviewBanner } from "../preview-banner";
import { StudentViewProvider, useStudentView } from "../student-view-provider";

afterEach(cleanup);

describe("PreviewBanner", () => {
  it("shows the title, the note, and the way out", () => {
    renderWithMessages(<PreviewBanner exitHref="/teacher/dashboard" />);
    const copy = testMessages.en.StudentView;
    expect(screen.getByRole("status")).toHaveAttribute("data-preview-banner");
    expect(screen.getByText(copy.bannerTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.bannerNote)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.exit })).toHaveAttribute("href", "/teacher/dashboard");
  });

  it("stays over the scene backdrop", () => {
    renderWithMessages(<PreviewBanner exitHref="/admin/dashboard" />);
    expect(screen.getByRole("status").className).toContain("relative");
    expect(screen.getByRole("status").className).toContain("z-10");
  });
});

describe("StudentViewProvider", () => {
  function Probe() {
    return <p>{useStudentView().mode}</p>;
  }

  it("gives the mode to the children", () => {
    renderWithMessages(
      <StudentViewProvider mode="preview">
        <Probe />
      </StudentViewProvider>,
    );
    expect(screen.getByText("preview")).toBeInTheDocument();
  });

  it("falls back to the student mode with no provider", () => {
    renderWithMessages(<Probe />);
    expect(screen.getByText("student")).toBeInTheDocument();
  });
});
