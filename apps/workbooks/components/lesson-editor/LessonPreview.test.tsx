// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonPreview } from "./LessonPreview";

describe("LessonPreview", () => {
  it("renders an iframe titled Lesson Preview", () => {
    render(<LessonPreview htmlContent="<p>hello</p>" />);
    expect(screen.getByTitle("Lesson Preview")).toBeTruthy();
  });

  it("writes the html content into the iframe document", () => {
    render(<LessonPreview htmlContent="<p>hello</p>" />);
    const iframe = screen.getByTitle("Lesson Preview") as HTMLIFrameElement;
    expect(iframe.contentDocument?.body?.innerHTML).toContain("<p>hello</p>");
  });

  it("re-writes the iframe when the html content changes", () => {
    const { rerender } = render(<LessonPreview htmlContent="<p>one</p>" />);
    rerender(<LessonPreview htmlContent="<p>two</p>" />);
    const iframe = screen.getByTitle("Lesson Preview") as HTMLIFrameElement;
    expect(iframe.contentDocument?.body?.innerHTML).toContain("<p>two</p>");
  });

  it("applies the className to the preview wrapper", () => {
    render(<LessonPreview htmlContent="<p>hello</p>" className="preview-panel" />);
    const iframe = screen.getByTitle("Lesson Preview") as HTMLIFrameElement;
    expect(iframe.parentElement?.className).toContain("preview-panel");
  });
});
