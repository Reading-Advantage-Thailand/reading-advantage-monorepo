// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComprehensionQuestionsEditor } from "./ComprehensionQuestionsEditor";

describe("ComprehensionQuestionsEditor", () => {
  it("renders the questions editor as JSON", () => {
    const questions = [
      { number: 1, question: "Where is the map?", options: ["A", "B"] },
    ];
    render(
      <ComprehensionQuestionsEditor
        comprehension_questions={questions}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Comprehension Questions")).toBeTruthy();
    expect(
      (screen.getByLabelText(/^Questions$/i) as HTMLTextAreaElement).value,
    ).toBe(JSON.stringify(questions));
  });

  it("does not render short-answer fields in this phase", () => {
    render(<ComprehensionQuestionsEditor onChange={() => {}} />);
    expect(screen.queryByLabelText(/Short Answer Question/i)).toBeNull();
    expect(screen.queryByLabelText(/Short Answer Hint/i)).toBeNull();
  });

  it("calls onChange with the parsed questions array", () => {
    const onChange = vi.fn();
    render(<ComprehensionQuestionsEditor onChange={onChange} />);
    const questions = [
      { number: 1, question: "New question?", options: ["x", "y"] },
    ];
    fireEvent.change(screen.getByLabelText(/^Questions$/i), {
      target: { value: JSON.stringify(questions) },
    });
    expect(onChange).toHaveBeenCalledWith("comprehension_questions", questions);
  });

  it("ignores invalid JSON", () => {
    const onChange = vi.fn();
    render(<ComprehensionQuestionsEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/^Questions$/i), {
      target: { value: "invalid json" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the typed text while an intermediate JSON fragment is invalid", () => {
    render(<ComprehensionQuestionsEditor onChange={() => {}} />);
    const textarea = screen.getByLabelText(
      /^Questions$/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '[{"number": ' } });
    expect(textarea.value).toBe('[{"number": ');
  });

  it("shows an inline parse error and does not propagate invalid JSON", () => {
    const onChange = vi.fn();
    render(<ComprehensionQuestionsEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/^Questions$/i), {
      target: { value: "not json" },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Invalid JSON");
  });

  it("links the field hint to its control through aria-describedby", () => {
    render(<ComprehensionQuestionsEditor onChange={() => {}} />);
    const control = document.getElementById(
      "comprehension_questions",
    ) as HTMLTextAreaElement;
    const describedBy = control.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const hint = document.getElementById(describedBy as string);
    expect(hint).toBeTruthy();
    expect(hint?.textContent).toMatch(/JSON array/);
  });
});
