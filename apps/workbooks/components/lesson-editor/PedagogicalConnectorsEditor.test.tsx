// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PedagogicalConnectorsEditor } from "./PedagogicalConnectorsEditor";

describe("PedagogicalConnectorsEditor", () => {
  it("renders all connector fields", () => {
    render(
      <PedagogicalConnectorsEditor
        connection_question="Have you used a map?"
        grammar_search_term="simple past"
        phonics_focus="short a"
        discussion_question="Why do we need maps?"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Pedagogical Connectors")).toBeTruthy();
    expect(
      (
        screen.getByLabelText(/Connection Question/i) as HTMLTextAreaElement
      ).value,
    ).toBe("Have you used a map?");
    expect(
      (screen.getByLabelText(/Grammar Search Term/i) as HTMLInputElement).value,
    ).toBe("simple past");
    expect(
      (screen.getByLabelText(/Phonics Focus/i) as HTMLInputElement).value,
    ).toBe("short a");
    expect(
      (
        screen.getByLabelText(/Discussion Question/i) as HTMLTextAreaElement
      ).value,
    ).toBe("Why do we need maps?");
  });

  it("calls onChange with the legacy field name on connection change", () => {
    const onChange = vi.fn();
    render(<PedagogicalConnectorsEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Connection Question/i), {
      target: { value: "New connection question" },
    });
    expect(onChange).toHaveBeenCalledWith(
      "connection_question",
      "New connection question",
    );
  });

  it("calls onChange with the legacy field name on grammar change", () => {
    const onChange = vi.fn();
    render(<PedagogicalConnectorsEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Grammar Search Term/i), {
      target: { value: "present perfect" },
    });
    expect(onChange).toHaveBeenCalledWith(
      "grammar_search_term",
      "present perfect",
    );
  });

  it("calls onChange with the legacy field name on phonics change", () => {
    const onChange = vi.fn();
    render(<PedagogicalConnectorsEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Phonics Focus/i), {
      target: { value: "long e" },
    });
    expect(onChange).toHaveBeenCalledWith("phonics_focus", "long e");
  });

  it("calls onChange with the legacy field name on discussion change", () => {
    const onChange = vi.fn();
    render(<PedagogicalConnectorsEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Discussion Question/i), {
      target: { value: "New discussion question" },
    });
    expect(onChange).toHaveBeenCalledWith(
      "discussion_question",
      "New discussion question",
    );
  });
});
