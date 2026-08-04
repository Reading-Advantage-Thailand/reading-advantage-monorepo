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

  it("shows a canonical asset indication for a key-only article image", () => {
    render(
      <ArticleEditor
        onChange={() => {}}
        article_images={[
          { url: "", key: "img/hero.png", caption: "", position: "hero" },
        ]}
      />,
    );
    expect(screen.getByText(/Canonical asset: img\/hero\.png/i)).toBeTruthy();
  });

  it("keeps the legacy URL input while preserving the canonical key", () => {
    render(
      <ArticleEditor
        onChange={() => {}}
        article_images={[
          {
            url: "https://cdn.example.com/inline.png",
            key: "img/inline.png",
            caption: "Shelves",
            position: "inline-para-2",
          },
        ]}
      />,
    );
    expect(screen.getByText(/Canonical asset: img\/inline\.png/i)).toBeTruthy();
    expect(
      (screen.getByLabelText(/Image URL/i) as HTMLInputElement).value,
    ).toBe("https://cdn.example.com/inline.png");
  });

  it("does not offer an interactive image upload flow", () => {
    render(
      <ArticleEditor
        onChange={() => {}}
        article_images={[
          { url: "", key: "img/hero.png", caption: "", position: "hero" },
        ]}
      />,
    );
    expect(screen.queryByRole("button", { name: /upload/i })).toBeNull();
    expect(screen.queryByLabelText(/file/i)).toBeNull();
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

  it("keeps the typed text while an intermediate JSON fragment is invalid", () => {
    render(<ArticleEditor onChange={() => {}} />);
    const textarea = screen.getByLabelText(
      /Article Paragraphs/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '[{"number": ' } });
    expect(textarea.value).toBe('[{"number": ');
  });

  it("shows an inline parse error and does not propagate invalid JSON", () => {
    const onChange = vi.fn();
    render(<ArticleEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Article Paragraphs/i), {
      target: { value: "not json" },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Invalid JSON");
  });

  it("links the field hint to its control through aria-describedby", () => {
    render(<ArticleEditor onChange={() => {}} />);
    const control = document.getElementById(
      "article_paragraphs",
    ) as HTMLTextAreaElement;
    const describedBy = control.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const hint = document.getElementById(describedBy as string);
    expect(hint).toBeTruthy();
    expect(hint?.textContent).toMatch(/JSON array/);
  });
});
