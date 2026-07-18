import { render, screen } from "@testing-library/react";
import { LessonContent } from "./lesson-content";

describe("LessonContent", () => {
  it("drops dangerous raw HTML instead of creating executable elements", () => {
    const { container } = render(
      <LessonContent
        content={
          'Welcome<script>alert("x")</script><img src=x onerror="alert(1)">'
        }
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.textContent).toContain("Welcome");
  });

  it("preserves the headings, emphasis, and lists used by the pedagogy", () => {
    render(
      <LessonContent
        content={
          "# Discovery\n\nUse **open questions**.\n\n- Listen\n- Clarify"
        }
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Discovery", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText("open questions").tagName).toBe("STRONG");
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders curriculum comparison tables as semantic tables", () => {
    render(
      <LessonContent
        content={
          "| Rep type | What they do |\n| --- | --- |\n| Beginner | Pitches features |\n| Top performer | Runs discovery |"
        }
      />,
    );

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "Runs discovery" })).toBeTruthy();
  });
});
