// @vitest-environment jsdom
/** Lesson step rail (audit S3): visible at the top on phones, all steps on demand, current step marked. */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";
import { LessonStepRail } from "../lesson-step-rail";

const steps = ["Introduction", "Preview Vocabulary", "First Reading", "Deep Reading"];
const en = testMessages.en.Lesson;

afterEach(cleanup);

describe("LessonStepRail", () => {
  it("says which step is open and shows progress as a progress bar", () => {
    renderWithMessages(<LessonStepRail steps={steps} current={3} />);
    expect(screen.getByText("Step 3 of 4: First Reading")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
  });

  it("lists every step behind a 48 px toggle on small screens and marks the current one", () => {
    renderWithMessages(<LessonStepRail steps={steps} current={2} />);
    const list = screen.getByRole("list", { hidden: true });
    expect(list).toHaveClass("hidden", "xl:flex");
    const toggle = screen.getByRole("button", { name: en.rail.showSteps });
    expect(toggle).toHaveClass("min-h-12", "xl:hidden");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(list).not.toHaveClass("hidden");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).toHaveTextContent(en.rail.done);
  });

  it("shows the timer once when given", () => {
    renderWithMessages(<LessonStepRail steps={steps} current={2} timer={<span>0m 5s</span>} />);
    expect(screen.getAllByText("0m 5s")).toHaveLength(1);
  });
});
