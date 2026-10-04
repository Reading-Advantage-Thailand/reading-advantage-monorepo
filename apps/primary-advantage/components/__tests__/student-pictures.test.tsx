// @vitest-environment jsdom
/**
 * Picture-password pictures (primary_student_login_20261003, FR-3): 12 pictures that differ in
 * shape and in color, each with a translated name.
 */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PICTURES, PictureIcon, PictureSequence } from "../student-login/pictures";
import { renderWithMessages } from "./helpers/render-with-messages";

describe("picture-password pictures", () => {
  it("has 12 pictures with 12 different shapes and 12 different colors", () => {
    expect(PICTURES).toHaveLength(12);
    expect(new Set(PICTURES.map((p) => p.shape)).size).toBe(12);
    expect(new Set(PICTURES.map((p) => p.color.toLowerCase())).size).toBe(12);
  });

  it("names every picture in English and Thai", () => {
    for (const locale of ["en", "th"] as const) {
      const { unmount } = renderWithMessages(
        <div>
          {PICTURES.map((_, i) => (
            <PictureIcon key={i} index={i} />
          ))}
        </div>,
        { locale },
      );
      const names = screen.getAllByRole("img").map((img) => img.getAttribute("aria-label"));
      expect(names).toHaveLength(12);
      expect(new Set(names).size).toBe(12);
      for (const name of names) expect(name).not.toMatch(/StudentPictures/);
      unmount();
    }
  });

  it("draws nothing for a number outside the grid", () => {
    const { container } = renderWithMessages(<PictureIcon index={12} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists a sequence in tap order with step numbers and names", () => {
    renderWithMessages(<PictureSequence pictures={[3, 0, 11]} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["1yellow star", "2red circle", "3teal flower"]);
  });
});
