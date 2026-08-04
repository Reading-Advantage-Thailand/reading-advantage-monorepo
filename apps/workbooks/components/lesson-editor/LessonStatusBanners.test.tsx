// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonStatusBanners } from "./LessonStatusBanners";

const baseProps = {
  saveSuccess: false,
  revisionConflict: false,
};

describe("LessonStatusBanners", () => {
  it("renders nothing when no messages are active", () => {
    render(<LessonStatusBanners {...baseProps} />);
    expect(screen.queryByText(/Draft saved successfully/)).toBeNull();
    expect(screen.queryByText(/Save conflict/)).toBeNull();
    expect(screen.queryByText(/Unable to save/)).toBeNull();
  });

  it("renders the form error banner", () => {
    render(<LessonStatusBanners {...baseProps} formError="Failed to save draft" />);
    expect(screen.getByRole("alert").textContent).toContain(
      "Failed to save draft",
    );
  });

  it("renders the save success banner", () => {
    render(<LessonStatusBanners {...baseProps} saveSuccess />);
    expect(screen.getByRole("status").textContent).toContain(
      "Draft saved successfully!",
    );
  });

  it("renders the revision conflict banner with its message", () => {
    render(
      <LessonStatusBanners
        {...baseProps}
        revisionConflict
        revisionConflictMessage="Revision conflict: actual revision 4 does not match expected revision 3."
      />,
    );
    const banner = screen.getByRole("alert");
    expect(banner.textContent).toContain("Save conflict");
    expect(banner.textContent).toContain("does not match expected revision 3");
  });

  it("renders a default conflict message when none is provided", () => {
    render(<LessonStatusBanners {...baseProps} revisionConflict />);
    expect(screen.getByRole("alert").textContent).toContain(
      "Reload the latest revision",
    );
  });
});
