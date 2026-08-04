// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonReflectionEditor } from "./LessonReflectionEditor";

describe("LessonReflectionEditor", () => {
  it("renders the reflection focus textarea", () => {
    render(
      <LessonReflectionEditor
        reflection_focus="Today I learned:"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Lesson Reflection")).toBeTruthy();
    expect(
      (screen.getByLabelText(/Reflection Focus/i) as HTMLTextAreaElement).value,
    ).toBe("Today I learned:");
  });

  it("calls onChange with the legacy field name on change", () => {
    const onChange = vi.fn();
    render(<LessonReflectionEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Reflection Focus/i), {
      target: { value: "What surprised me most?" },
    });
    expect(onChange).toHaveBeenCalledWith(
      "reflection_focus",
      "What surprised me most?",
    );
  });

  it("renders placeholder text when empty", () => {
    render(<LessonReflectionEditor onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/Today I learned:/i)).toBeTruthy();
  });
});
