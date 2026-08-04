// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VocabularyEditor } from "./VocabularyEditor";

describe("VocabularyEditor", () => {
  it("renders the vocabulary, matching, fill, and word-bank editors as JSON", () => {
    const vocabulary = [{ word: "map", definition: "a drawing of a place" }];
    render(<VocabularyEditor vocabulary={vocabulary} onChange={() => {}} />);
    expect(screen.getByText("Vocabulary")).toBeTruthy();
    expect(
      (screen.getByLabelText(/Vocabulary Items/i) as HTMLTextAreaElement).value,
    ).toBe(JSON.stringify(vocabulary, null, 2));
    expect(screen.getByLabelText(/Matching Items/i)).toBeTruthy();
    expect(screen.getByLabelText(/Fill Items/i)).toBeTruthy();
    expect(screen.getByLabelText(/Word Bank/i)).toBeTruthy();
  });

  it("renders the vocabulary count hint", () => {
    render(
      <VocabularyEditor
        vocabulary={[
          { word: "word1", definition: "def1" },
          { word: "word2", definition: "def2" },
        ]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/2 items/i)).toBeTruthy();
  });

  it("calls onChange with the parsed vocabulary array", () => {
    const onChange = vi.fn();
    render(<VocabularyEditor onChange={onChange} />);
    const vocabulary = [{ word: "new-word", definition: "a new definition" }];
    fireEvent.change(screen.getByLabelText(/Vocabulary Items/i), {
      target: { value: JSON.stringify(vocabulary) },
    });
    expect(onChange).toHaveBeenCalledWith("vocabulary", vocabulary);
  });

  it("calls onChange with the parsed matching items", () => {
    const onChange = vi.fn();
    render(<VocabularyEditor onChange={onChange} />);
    const items = [
      { number: 1, word: "map", letter: "A", definition: "a drawing" },
    ];
    fireEvent.change(screen.getByLabelText(/Matching Items/i), {
      target: { value: JSON.stringify(items) },
    });
    expect(onChange).toHaveBeenCalledWith("vocab_match", items);
  });

  it("calls onChange with the parsed fill items", () => {
    const onChange = vi.fn();
    render(<VocabularyEditor onChange={onChange} />);
    const items = [{ number: 1, sentence: "The ___ shows the library." }];
    fireEvent.change(screen.getByLabelText(/Fill Items/i), {
      target: { value: JSON.stringify(items) },
    });
    expect(onChange).toHaveBeenCalledWith("vocab_fill", items);
  });

  it("calls onChange with the parsed word bank", () => {
    const onChange = vi.fn();
    render(<VocabularyEditor onChange={onChange} />);
    const bank = ["map", "library"];
    fireEvent.change(screen.getByLabelText(/Word Bank/i), {
      target: { value: JSON.stringify(bank) },
    });
    expect(onChange).toHaveBeenCalledWith("vocab_word_bank", bank);
  });

  it("ignores invalid JSON", () => {
    const onChange = vi.fn();
    render(<VocabularyEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Vocabulary Items/i), {
      target: { value: "invalid json" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the typed text while an intermediate JSON fragment is invalid", () => {
    render(<VocabularyEditor onChange={() => {}} />);
    const textarea = screen.getByLabelText(
      /Vocabulary Items/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '[{"word": ' } });
    expect(textarea.value).toBe('[{"word": ');
  });

  it("shows an inline parse error and does not propagate invalid JSON", () => {
    const onChange = vi.fn();
    render(<VocabularyEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Vocabulary Items/i), {
      target: { value: "not json" },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Invalid JSON");
  });

  it("re-syncs the raw text when the upstream value changes externally", () => {
    const { rerender } = render(
      <VocabularyEditor
        vocabulary={[{ word: "a", definition: "b" }]}
        onChange={() => {}}
      />,
    );
    const next = [{ word: "c", definition: "d" }];
    rerender(<VocabularyEditor vocabulary={next} onChange={() => {}} />);
    expect(
      (screen.getByLabelText(/Vocabulary Items/i) as HTMLTextAreaElement).value,
    ).toBe(JSON.stringify(next, null, 2));
  });

  it("links each field hint to its control through aria-describedby", () => {
    render(<VocabularyEditor onChange={() => {}} />);
    const hints: Record<string, RegExp> = {
      vocabulary: /Enter as JSON array/,
      vocab_match: /matching items/,
      vocab_fill: /fill-in-the-blank items/,
      vocab_word_bank: /JSON array of words/,
    };
    for (const [id, hintPattern] of Object.entries(hints)) {
      const control = document.getElementById(id) as HTMLTextAreaElement;
      const describedBy = control.getAttribute("aria-describedby");
      expect(describedBy, `${id} should be described by a hint`).toBeTruthy();
      const hint = document.getElementById(describedBy as string);
      expect(hint, `${id} hint id should resolve`).toBeTruthy();
      expect(hint?.textContent).toMatch(hintPattern);
    }
  });
});
