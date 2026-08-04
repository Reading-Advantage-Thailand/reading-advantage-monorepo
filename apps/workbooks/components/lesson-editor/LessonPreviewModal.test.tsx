// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonPreviewModal } from "./LessonPreviewModal";

vi.mock("./LessonPreview", () => ({
  LessonPreview: ({
    htmlContent,
    className,
  }: {
    htmlContent: string;
    className?: string;
  }) => (
    <div data-testid="lesson-preview" data-class={className}>
      {htmlContent}
    </div>
  ),
}));

describe("LessonPreviewModal", () => {
  it("renders the Lesson Preview heading and the preview html", () => {
    render(<LessonPreviewModal previewHtml="<p>hello</p>" onClose={() => {}} />);

    expect(screen.getByText("Lesson Preview")).toBeTruthy();
    expect(screen.getByTestId("lesson-preview").textContent).toBe("<p>hello</p>");
  });

  it("passes the full-height class to the preview", () => {
    render(<LessonPreviewModal previewHtml="x" onClose={() => {}} />);

    expect(screen.getByTestId("lesson-preview").getAttribute("data-class")).toBe(
      "h-full",
    );
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<LessonPreviewModal previewHtml="x" onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("shows the empty-state message instead of the preview when html is null", () => {
    render(<LessonPreviewModal previewHtml={null} onClose={() => {}} />);

    expect(
      screen.getByText("No preview available."),
    ).toBeTruthy();
    expect(screen.queryByTestId("lesson-preview")).toBeNull();
  });

  it("shows the empty-state message for an empty html string", () => {
    render(<LessonPreviewModal previewHtml="" onClose={() => {}} />);

    expect(
      screen.getByText("No preview available."),
    ).toBeTruthy();
    expect(screen.queryByTestId("lesson-preview")).toBeNull();
  });
});
