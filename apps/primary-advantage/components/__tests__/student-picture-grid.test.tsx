// @vitest-environment jsdom
/**
 * Picture grid of the student picture password (primary_student_login_20261003, Phase 4 task 1,
 * FR-3). It uses the 12 pictures of `pictures.tsx`, where the array index is the stored number.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PictureGrid } from "../student-login/picture-grid";
import { renderWithMessages } from "./helpers/render-with-messages";
import en from "../../messages/en.json";
import { PICTURES } from "../student-login/pictures";

describe("PictureGrid", () => {
  it("shows the 12 pictures in stored-number order", () => {
    renderWithMessages(<PictureGrid value={[]} onChange={vi.fn()} />);
    const labels = PICTURES.map((picture) => en.StudentPictures[picture.key as keyof typeof en.StudentPictures]);
    for (const label of labels) expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: new RegExp(`^(${labels.join("|")})$`) })).toHaveLength(12);
  });

  it("keeps a light picture background in dark mode so dark pictures stay visible", () => {
    renderWithMessages(<PictureGrid value={[]} onChange={vi.fn()} />);
    const bolt = screen.getByRole("button", { name: en.StudentPictures[PICTURES[0]!.key as keyof typeof en.StudentPictures] });
    expect(bolt).toHaveClass("bg-white", "dark:bg-white");
    expect(bolt).not.toHaveClass("dark:bg-input/30");
  });

  it("adds the tapped picture number to the taps", () => {
    const onChange = vi.fn();
    renderWithMessages(<PictureGrid value={[4]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "teal flower" }));
    expect(onChange).toHaveBeenCalledWith([4, 11]);
  });

  it("shows the progress without naming the tapped pictures", () => {
    renderWithMessages(<PictureGrid value={[4, 2]} onChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("2 of 3 pictures");
    expect(screen.getByRole("status")).not.toHaveTextContent(/pink|green/);
  });

  it("undoes the last tap and clears all taps", () => {
    const onChange = vi.fn();
    renderWithMessages(<PictureGrid value={[4, 2]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenLastCalledWith([4]);
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("blocks more taps after 3 pictures and while disabled", () => {
    const { unmount } = renderWithMessages(<PictureGrid value={[1, 2, 3]} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "red circle" })).toBeDisabled();
    unmount();
    renderWithMessages(<PictureGrid value={[]} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "red circle" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("disables Undo and Start again without taps", () => {
    renderWithMessages(<PictureGrid value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start again" })).toBeDisabled();
  });
});
