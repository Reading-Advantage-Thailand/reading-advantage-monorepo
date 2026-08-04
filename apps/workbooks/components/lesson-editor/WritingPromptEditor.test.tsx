// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WritingPromptEditor } from "./WritingPromptEditor";

describe("WritingPromptEditor", () => {
  it("renders the prompt, plan prompts, sentence frames, and starters", () => {
    render(
      <WritingPromptEditor
        writing_prompt="Write about your discovery"
        writing_plan_prompts={["Main idea:", "Details:"]}
        writing_sentence_frames={["First, I will..."]}
        sentence_starters={["The map shows..."]}
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByText("Writing Prompt").length).toBeGreaterThan(0);
    expect(
      (
        screen.getByRole("textbox", { name: /Writing Prompt/i }) as
          HTMLTextAreaElement
      ).value,
    ).toBe("Write about your discovery");
    expect(
      (screen.getByLabelText(/Writing Plan Prompts/i) as HTMLTextAreaElement)
        .value,
    ).toBe(JSON.stringify(["Main idea:", "Details:"]));
    expect(
      (screen.getByLabelText(/Writing Sentence Frames/i) as HTMLTextAreaElement)
        .value,
    ).toBe(JSON.stringify(["First, I will..."]));
    expect(
      (screen.getByLabelText(/Sentence Starters/i) as HTMLTextAreaElement).value,
    ).toBe(JSON.stringify(["The map shows..."]));
  });

  it("does not render AI image generation fields in this phase", () => {
    render(<WritingPromptEditor onChange={() => {}} />);
    expect(screen.queryByLabelText(/AI Image Prompt/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Create Image/i })).toBeNull();
  });

  it("calls onChange with the legacy field name on prompt change", () => {
    const onChange = vi.fn();
    render(<WritingPromptEditor onChange={onChange} />);
    fireEvent.change(
      screen.getByRole("textbox", { name: /Writing Prompt/i }),
      { target: { value: "New writing prompt" } },
    );
    expect(onChange).toHaveBeenCalledWith(
      "writing_prompt",
      "New writing prompt",
    );
  });

  it("calls onChange with the parsed plan prompts", () => {
    const onChange = vi.fn();
    render(<WritingPromptEditor onChange={onChange} />);
    const prompts = ["Main idea:", "Key details:"];
    fireEvent.change(screen.getByLabelText(/Writing Plan Prompts/i), {
      target: { value: JSON.stringify(prompts) },
    });
    expect(onChange).toHaveBeenCalledWith("writing_plan_prompts", prompts);
  });

  it("calls onChange with the parsed sentence frames", () => {
    const onChange = vi.fn();
    render(<WritingPromptEditor onChange={onChange} />);
    const frames = ["First, I will..."];
    fireEvent.change(screen.getByLabelText(/Writing Sentence Frames/i), {
      target: { value: JSON.stringify(frames) },
    });
    expect(onChange).toHaveBeenCalledWith("writing_sentence_frames", frames);
  });

  it("calls onChange with the parsed sentence starters", () => {
    const onChange = vi.fn();
    render(<WritingPromptEditor onChange={onChange} />);
    const starters = ["The map shows..."];
    fireEvent.change(screen.getByLabelText(/Sentence Starters/i), {
      target: { value: JSON.stringify(starters) },
    });
    expect(onChange).toHaveBeenCalledWith("sentence_starters", starters);
  });

  it("ignores invalid JSON", () => {
    const onChange = vi.fn();
    render(<WritingPromptEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Writing Plan Prompts/i), {
      target: { value: "invalid json" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
