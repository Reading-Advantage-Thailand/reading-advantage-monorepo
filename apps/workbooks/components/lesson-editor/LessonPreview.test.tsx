// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonPreview } from "./LessonPreview";

describe("LessonPreview", () => {
  it("renders an iframe titled Lesson Preview", () => {
    render(<LessonPreview htmlContent="<p>hello</p>" />);
    expect(screen.getByTitle("Lesson Preview")).toBeTruthy();
  });

  it("carries the html content in the srcdoc attribute", () => {
    render(<LessonPreview htmlContent="<p>hello</p>" />);
    const iframe = screen.getByTitle("Lesson Preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("srcdoc")).toContain("<p>hello</p>");
  });

  it("updates the srcdoc when the html content changes", () => {
    const { rerender } = render(<LessonPreview htmlContent="<p>one</p>" />);
    rerender(<LessonPreview htmlContent="<p>two</p>" />);
    const iframe = screen.getByTitle("Lesson Preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("srcdoc")).toContain("<p>two</p>");
  });

  it("sandboxes the iframe without same-origin access", () => {
    render(<LessonPreview htmlContent="<p>hello</p>" />);
    const iframe = screen.getByTitle("Lesson Preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts allow-modals");
  });

  it("applies the className to the preview wrapper", () => {
    render(
      <LessonPreview htmlContent="<p>hello</p>" className="preview-panel" />,
    );
    const iframe = screen.getByTitle("Lesson Preview") as HTMLIFrameElement;
    expect(iframe.parentElement?.className).toContain("preview-panel");
  });
});
