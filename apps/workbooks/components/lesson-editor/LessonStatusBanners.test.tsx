// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("offers a Reload content action when a newer server lesson is pending", () => {
    const onReloadContent = vi.fn();
    render(
      <LessonStatusBanners
        {...baseProps}
        revisionConflict
        reloadAvailable
        onReloadContent={onReloadContent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reload content" }));
    expect(onReloadContent).toHaveBeenCalled();
  });

  it("does not offer Reload content when no server lesson is pending", () => {
    render(<LessonStatusBanners {...baseProps} revisionConflict />);
    expect(screen.queryByRole("button", { name: "Reload content" })).toBeNull();
  });
});
