// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleEditor } from "./ArticleEditor";

describe("ArticleEditor", () => {
  it("renders the paragraphs editor as JSON", () => {
    const paragraphs = [{ number: 1, text: "The map shows the library." }];
    render(<ArticleEditor article_paragraphs={paragraphs} onChange={() => {}} />);
    expect(screen.getByText("Article")).toBeTruthy();
    expect(
      (screen.getByLabelText(/Article Paragraphs/i) as HTMLTextAreaElement).value,
    ).toBe(JSON.stringify(paragraphs, null, 2));
  });

  it("does not render URL, caption, or image fields in this phase", () => {
    render(<ArticleEditor onChange={() => {}} />);
    expect(screen.queryByLabelText(/Article URL/i)).toBeNull();
    expect(screen.queryByLabelText(/Image Caption/i)).toBeNull();
    expect(screen.queryByLabelText(/Additional Article Images/i)).toBeNull();
  });

  it("calls onChange with the parsed paragraphs array", () => {
    const onChange = vi.fn();
    render(<ArticleEditor onChange={onChange} />);
    const paragraphs = [{ number: 1, text: "New paragraph." }];
    fireEvent.change(screen.getByLabelText(/Article Paragraphs/i), {
      target: { value: JSON.stringify(paragraphs) },
    });
    expect(onChange).toHaveBeenCalledWith("article_paragraphs", paragraphs);
  });

  it("ignores invalid JSON", () => {
    const onChange = vi.fn();
    render(<ArticleEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Article Paragraphs/i), {
      target: { value: "invalid json" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
