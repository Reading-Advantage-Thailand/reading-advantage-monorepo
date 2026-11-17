/**
 * Red contract for the calculator component (AC-9, spec 5.3, D-5, D-6, D-7, D-9).
 * The copy comes from the en dictionary, so the component receives the strings
 * the page will pass. The component module does not exist at the Red stage.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { en } from "@/locales/pages/products/tutor-advantage";
import { TutorCommissionCalculator } from "./tutor-commission-calculator";

const copy = en.calculator;

afterEach(() => {
  cleanup();
});

/** Renders the calculator with the en copy the page passes as props. */
function renderCalculator() {
  return render(<TutorCommissionCalculator copy={copy} />);
}

/** Escapes a literal string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds a substring matcher for a copy label. */
function labelPattern(label: string): RegExp {
  return new RegExp(escapeRegExp(label));
}

/** Returns one preset button by its en name. */
function presetButton(index: number): HTMLElement {
  return screen.getByRole("button", {
    name: labelPattern(copy.presets[index].name),
  });
}

/** Returns the price number input. */
function priceInput(): HTMLElement {
  return screen.getByRole("spinbutton", {
    name: labelPattern(copy.inputs.price),
  });
}

/** Returns the own-students number input. */
function ownStudentsInput(): HTMLElement {
  return screen.getByRole("spinbutton", {
    name: labelPattern(copy.inputs.ownStudents),
  });
}

/** Returns the leg-count number input. */
function legCountInput(): HTMLElement {
  return screen.getByRole("spinbutton", {
    name: labelPattern(copy.inputs.directTutors),
  });
}

/** Returns one per-leg student number input. */
function legStudentInputs(): HTMLElement[] {
  return screen.queryAllByRole("spinbutton", {
    name: labelPattern(copy.inputs.studentsPerDirect),
  });
}

/** Returns the graph label of each leg row, for example "Leg commission 1". */
function legRows(): HTMLElement[] {
  const pattern = new RegExp(
    `^\\s*${escapeRegExp(copy.chart.legPayout)}\\s*[1-9]\\d*\\s*$`,
  );
  return screen.queryAllByText(pattern);
}

/** Returns the result card, which is the polite live region. */
function resultRegion(): HTMLElement {
  const region = document.querySelector('[aria-live="polite"]');
  if (!region) throw new Error("no polite live-region result card found");
  return region as HTMLElement;
}

/** Counts the presets whose aria-pressed state is true. */
function pressedPresetCount(): number {
  return copy.presets.reduce((total, _preset, index) => {
    return total + (presetButton(index).getAttribute("aria-pressed") === "true" ? 1 : 0);
  }, 0);
}

/** Returns the formatted value shown beside a named result row. */
function resultValue(label: string): string {
  const term = within(resultRegion()).getByText(label);
  const row = term.closest("div");
  const value = row?.querySelector("dd");
  if (!value) throw new Error(`no result value for ${label}`);
  return value.textContent ?? "";
}

/** Reports whether a formatted figure appears anywhere in the rendered calculator. */
function hasFigure(figure: string): boolean {
  return screen.queryAllByText(figure).length > 0;
}

/** Returns the hero net figure shown under the net label in the result card. */
function heroValue(): string {
  const paragraphs = Array.from(resultRegion().querySelectorAll("p"));
  const index = paragraphs.findIndex((p) => p.textContent === copy.results.net);
  const hero = paragraphs[index + 1];
  if (!hero) throw new Error("no hero figure under the net label");
  return hero.textContent ?? "";
}

describe("TutorCommissionCalculator first paint", () => {
  it("shows the zero line and no income figures", () => {
    renderCalculator();
    const result = resultRegion();
    expect(within(result).getByText(copy.explain.zero)).toBeInTheDocument();
    expect(within(result).getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.queryByText("5,520")).toBeNull();
    expect(screen.queryByText("5,354.40")).toBeNull();
    expect(screen.queryByText("24,833.45")).toBeNull();
    expect(screen.queryByText("8,025.25")).toBeNull();
  });

  it("marks the result card as a polite live region", () => {
    renderCalculator();
    const result = resultRegion();
    expect(result).toHaveAttribute("aria-live", "polite");
    expect(within(result).getByText(copy.results.net)).toBeInTheDocument();
  });

  it("labels every input and gives it a zero minimum", () => {
    const { container } = renderCalculator();
    const inputs = Array.from(container.querySelectorAll("input"));
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAccessibleName();
    }
  });
});

describe("TutorCommissionCalculator leg rows", () => {
  it("grows from 0 to 3 legs, one student row per leg, each new leg at 3", async () => {
    const user = userEvent.setup();
    renderCalculator();
    expect(legStudentInputs()).toHaveLength(0);

    const count = legCountInput();
    expect(count).toHaveValue(0);

    await user.clear(count);
    await user.type(count, "1");
    expect(legStudentInputs()).toHaveLength(1);
    expect(legStudentInputs()[0]).toHaveValue(3);

    await user.clear(count);
    await user.type(count, "2");
    expect(legStudentInputs()).toHaveLength(2);

    await user.clear(count);
    await user.type(count, "3");
    expect(legStudentInputs()).toHaveLength(3);
    expect(legRows()).toHaveLength(3);
  });

  it("removes one input row and one graph row when the count drops from 3 to 2", async () => {
    const user = userEvent.setup();
    renderCalculator();

    const count = legCountInput();
    await user.clear(count);
    await user.type(count, "3");
    expect(legStudentInputs()).toHaveLength(3);
    expect(legRows()).toHaveLength(3);
    expect(resultValue(copy.results.networkGV)).toBe("27,000");
    expect(resultValue(copy.results.downline)).toBe("12,015");

    await user.clear(count);
    await user.type(count, "2");
    expect(legStudentInputs()).toHaveLength(2);
    expect(legRows()).toHaveLength(2);
    expect(resultValue(copy.results.networkGV)).toBe("18,000");
    expect(resultValue(copy.results.downline)).toBe("8,010");
  });

  it("shows four input rows and four graph rows at a count of 4", async () => {
    const user = userEvent.setup();
    renderCalculator();

    const count = legCountInput();
    await user.clear(count);
    await user.type(count, "4");
    expect(legStudentInputs()).toHaveLength(4);
    expect(legRows()).toHaveLength(4);
    expect(legStudentInputs()[3]).toHaveValue(3);
    expect(resultValue(copy.results.networkGV)).toBe("36,000");
    expect(resultValue(copy.results.gross)).toBe("20,744.54");
    expect(resultValue(copy.results.downline)).toBe("16,020");
  });
});

describe("TutorCommissionCalculator presets", () => {
  it("shows the preset 1 figures", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(0));
    expect(screen.queryAllByText("5,520").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("5,354.40").length).toBeGreaterThan(0);
  });

  it("shows the preset 3 figures and three leg rows of four students in the graph", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(2));

    // Recomputed from calculateNetwork({ price: 3000, personalStudents: 2,
    // studentsPerLeg: [4, 4, 4] }) and formatted by the component's display rules.
    expect(resultValue(copy.results.networkGV)).toBe("42,000");
    expect(resultValue(copy.results.rate)).toBe("59.1%");
    expect(resultValue(copy.results.gross)).toBe("24,833.45");
    expect(resultValue(copy.results.downline)).toBe("16,560");
    expect(hasFigure("8,273.45")).toBe(true);
    expect(resultValue(copy.results.tax)).toBe("248.20");
    expect(heroValue()).toBe("8,025.25");

    const inputs = legStudentInputs();
    expect(inputs).toHaveLength(3);
    for (const input of inputs) expect(input).toHaveValue(4);

    const lines = legRows().map((row) => row.parentElement!);
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line.textContent).toContain("12,000");
      expect(line.textContent).toContain("5,520");
    }
  });

  it("presses exactly one preset after a selection", async () => {
    const user = userEvent.setup();
    renderCalculator();
    expect(pressedPresetCount()).toBe(0);
    await user.click(presetButton(1));
    expect(pressedPresetCount()).toBe(1);
  });

  it("shows the selected preset's setup and result text", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(0));
    expect(screen.getByText(copy.presets[0].setup)).toBeInTheDocument();
    expect(screen.getByText(copy.presets[0].result)).toBeInTheDocument();
  });

  it("clears the example text on edit but keeps the figures", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(0));
    expect(screen.getByText(copy.presets[0].setup)).toBeInTheDocument();

    const own = ownStudentsInput();
    await user.clear(own);
    await user.type(own, "5");

    expect(screen.queryByText(copy.presets[0].setup)).toBeNull();
    expect(screen.queryByText(copy.presets[0].result)).toBeNull();
    expect(presetButton(0)).toHaveAttribute("aria-pressed", "false");
    const results = resultRegion();
    expect(within(results).getAllByText("15,000")).toHaveLength(2);
  });

  it("defaults the price to 3,000 and restores it when a preset is picked", async () => {
    const user = userEvent.setup();
    renderCalculator();
    const price = priceInput();
    expect(price).toHaveValue(3000);

    await user.clear(price);
    await user.type(price, "5000");
    expect(price).toHaveValue(5000);

    await user.click(presetButton(0));
    expect(price).toHaveValue(3000);
  });

  it("shows every preset 1 figure, its text, and only one pressed preset", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(1));

    expect(resultValue(copy.results.networkGV)).toBe("24,000");
    expect(resultValue(copy.results.gross)).toBe("12,655.69");
    expect(resultValue(copy.results.downline)).toBe("8,010");
    expect(resultValue(copy.results.tax)).toBe("139.37");
    expect(hasFigure("4,645.69")).toBe(true);
    expect(hasFigure("4,506.32")).toBe(true);

    expect(screen.getByText(copy.presets[1].setup)).toBeInTheDocument();
    expect(screen.getByText(copy.presets[1].result)).toBeInTheDocument();

    expect(pressedPresetCount()).toBe(1);
    expect(presetButton(1)).toHaveAttribute("aria-pressed", "true");
    expect(presetButton(0)).toHaveAttribute("aria-pressed", "false");
    expect(presetButton(2)).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the preset 2 setup and result text", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(2));
    expect(screen.getByText(copy.presets[2].setup)).toBeInTheDocument();
    expect(screen.getByText(copy.presets[2].result)).toBeInTheDocument();
  });
});
