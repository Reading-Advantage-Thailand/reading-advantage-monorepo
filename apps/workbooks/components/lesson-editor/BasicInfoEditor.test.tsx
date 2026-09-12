// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BasicInfoEditor } from "./BasicInfoEditor";

describe("BasicInfoEditor", () => {
  it("renders the lesson title and CEFR level fields", () => {
    render(
      <BasicInfoEditor
        lesson_title="The Library Map"
        cefr_level="A1"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Basic Information")).toBeTruthy();
    expect(
      (screen.getByLabelText(/Lesson Title/i) as HTMLInputElement).value,
    ).toBe("The Library Map");
    expect(
      (screen.getByLabelText(/CEFR Level/i) as HTMLInputElement).value,
    ).toBe("A1");
  });

  it("does not render fields without a normalized-contract carrier", () => {
    render(<BasicInfoEditor onChange={() => {}} />);
    expect(screen.queryByLabelText(/Lesson Number/i)).toBeNull();
    expect(screen.queryByLabelText(/Level Name/i)).toBeNull();
    expect(screen.queryByLabelText(/Genre/i)).toBeNull();
  });

  it("calls onChange with the legacy field name on title change", () => {
    const onChange = vi.fn();
    render(<BasicInfoEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Lesson Title/i), {
      target: { value: "New Title" },
    });
    expect(onChange).toHaveBeenCalledWith("lesson_title", "New Title");
  });

  it("calls onChange with the legacy field name on cefr change", () => {
    const onChange = vi.fn();
    render(<BasicInfoEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/CEFR Level/i), {
      target: { value: "B1" },
    });
    expect(onChange).toHaveBeenCalledWith("cefr_level", "B1");
  });
});
