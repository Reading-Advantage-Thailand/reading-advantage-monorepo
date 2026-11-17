/**
 * Adversarial probes for the client calculator
 * (track www_tutor_calculator_20261117, spec 5.3, AC-9, D-3, D-5, D-6, D-7, D-9).
 *
 * This file adds cases only. It changes no existing assertion and no product code.
 * The money pins come from spec section 3 and D-2; the display rules come from D-3.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { en, zh } from "@/locales/pages/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";
import { TutorCommissionCalculator } from "./tutor-commission-calculator";

const copy = en.calculator;

/** ASCII money of spec D-3: grouped whole baht, or exactly two decimals. */
const MONEY = /^(0|[1-9]\d{0,2}(,\d{3})*)(\.\d{2})?$/;

/** Rate of spec D-3: one decimal at most, with a percent sign. */
const RATE = /^(0|[1-9]\d*)(\.\d)?%$/;

const COMPONENT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "tutor-commission-calculator.tsx",
);

afterEach(() => {
  cleanup();
});

/** Renders the calculator with the copy the page passes as props. */
function renderCalculator(props = copy) {
  return render(<TutorCommissionCalculator copy={props} />);
}

/** Escapes a literal string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Returns one preset button by its en name. */
function presetButton(index: number): HTMLElement {
  return screen.getByRole("button", {
    name: new RegExp(escapeRegExp(copy.presets[index].name)),
  });
}

/** Returns the price number input. */
function priceInput(): HTMLElement {
  return screen.getByRole("spinbutton", { name: new RegExp(escapeRegExp(copy.inputs.price)) });
}

/** Returns the own-students number input. */
function ownStudentsInput(): HTMLElement {
  return screen.getByRole("spinbutton", {
    name: new RegExp(escapeRegExp(copy.inputs.ownStudents)),
  });
}

/** Returns the leg-count number input. */
function legCountInput(): HTMLElement {
  return screen.getByRole("spinbutton", {
    name: new RegExp(escapeRegExp(copy.inputs.directTutors)),
  });
}

/** Returns one per-leg student number input. */
function legStudentInputs(): HTMLElement[] {
  return screen.queryAllByRole("spinbutton", {
    name: new RegExp(escapeRegExp(copy.inputs.studentsPerDirect)),
  });
}

/** Returns the graph label of each leg row, for example "Leg 1". */
function legRows(): HTMLElement[] {
  const pattern = new RegExp(`^\\s*${escapeRegExp(copy.chart.leg)}\\s*[1-9]\\d*\\s*$`);
  return screen.queryAllByText(pattern);
}

/** Returns the result card, which is the polite live region. */
function resultRegion(): HTMLElement {
  const region = document.querySelector('[aria-live="polite"]');
  if (!region) throw new Error("no polite live-region result card found");
  return region as HTMLElement;
}

/** Returns the formatted value shown beside a named result row. */
function resultValue(label: string): string {
  const term = within(resultRegion()).getByText(label);
  const row = term.closest("div");
  const value = row?.querySelector("dd");
  if (!value) throw new Error(`no result value for ${label}`);
  return value.textContent ?? "";
}

/** Returns the six breakdown values in render order: own, network, rate, gross, downline, tax. */
function breakdownValues(): string[] {
  return Array.from(resultRegion().querySelectorAll("dd")).map((dd) => dd.textContent ?? "");
}

/** Returns the hero net figure of the result card. */
function heroValue(): string {
  const paragraphs = Array.from(resultRegion().querySelectorAll("p"));
  const index = paragraphs.findIndex((p) => p.textContent === copy.results.net);
  const hero = paragraphs[index + 1];
  if (!hero) throw new Error("no hero figure under the net label");
  return hero.textContent ?? "";
}

/** Converts a formatted ASCII money string to integer satang. */
function parseSatang(text: string): number {
  return Math.round(Number(text.replace(/,/g, "")) * 100);
}

/** Counts the presets whose aria-pressed state is true. */
function pressedPresetCount(): number {
  return copy.presets.reduce((total, _preset, index) => {
    return total + (presetButton(index).getAttribute("aria-pressed") === "true" ? 1 : 0);
  }, 0);
}

/** Returns the inline bar widths of the payout graph, as percentages. */
function barWidths(): number[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".bar-width")).map((bar) =>
    Number.parseFloat(bar.style.getPropertyValue("--bar-width")),
  );
}

describe("Adversarial: leg count", () => {
  it("a decimal leg count keeps whole rows and whole students", async () => {
    const user = userEvent.setup();
    renderCalculator();
    const count = legCountInput();

    await user.clear(count);
    await user.type(count, "2.5");
    expect(count).toHaveValue(2.5);
    expect(legStudentInputs()).toHaveLength(2);
    expect(legStudentInputs()[0]).toHaveValue(3);
    expect(legStudentInputs()[1]).toHaveValue(3);
    expect(legRows()).toHaveLength(2);
    expect(resultValue(copy.results.networkGV)).toBe("18,000");
    expect(resultValue(copy.results.downline)).toBe("8,010");

    await user.clear(count);
    await user.type(count, "0.5");
    expect(legStudentInputs()).toHaveLength(0);
    expect(legRows()).toHaveLength(0);
    expect(resultValue(copy.results.networkGV)).toBe("0");
    expect(heroValue()).toBe("0");
  });
});

describe("Adversarial: an edit clears the preset example", () => {
  it("a price edit clears the example, keeps the figures, and keeps three buttons", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(0));
    expect(screen.getByText(copy.presets[0].setup)).toBeInTheDocument();

    const price = priceInput();
    await user.clear(price);
    await user.type(price, "5000");

    expect(screen.queryByText(copy.presets[0].setup)).toBeNull();
    expect(screen.queryByText(copy.presets[0].result)).toBeNull();
    expect(pressedPresetCount()).toBe(0);
    for (let index = 0; index < copy.presets.length; index += 1) {
      expect(presetButton(index)).toBeInTheDocument();
    }
    expect(resultValue(copy.results.networkGV)).toBe("20,000");
    expect(resultValue(copy.results.gross)).toBe("10,000");
    expect(resultValue(copy.results.tax)).toBe("300");
    expect(heroValue()).toBe("9,700");
  });

  it("a leg-student edit clears the example and the live figures follow", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(2));
    expect(screen.getByText(copy.presets[2].setup)).toBeInTheDocument();

    const secondLeg = legStudentInputs()[1];
    await user.clear(secondLeg);
    await user.type(secondLeg, "4");

    expect(screen.queryByText(copy.presets[2].setup)).toBeNull();
    expect(screen.queryByText(copy.presets[2].result)).toBeNull();
    expect(pressedPresetCount()).toBe(0);
    expect(resultValue(copy.results.networkGV)).toBe("36,000");
    expect(resultValue(copy.results.downline)).toBe("13,530");
    expect(resultValue(copy.results.gross)).toBe("20,744.54");
    expect(heroValue()).toBe("6,998.11");
  });
});

describe("Adversarial: presets", () => {
  it("the same preset picked twice keeps one selection and one example", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(1));
    await user.click(presetButton(1));

    expect(pressedPresetCount()).toBe(1);
    expect(presetButton(1)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(copy.presets[1].setup)).toHaveLength(1);
    expect(screen.getAllByText(copy.presets[1].result)).toHaveLength(1);
    expect(priceInput()).toHaveValue(3000);
    expect(resultValue(copy.results.gross)).toBe("12,655.69");
    expect(heroValue()).toBe("4,506.32");
  });

  it("the typed path and the preset path show the same text", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(1));
    const fromPreset = [...breakdownValues(), heroValue()];

    cleanup();
    renderCalculator();
    await user.clear(ownStudentsInput());
    await user.type(ownStudentsInput(), "2");
    await user.clear(legCountInput());
    await user.type(legCountInput(), "2");
    const fromTyping = [...breakdownValues(), heroValue()];

    expect(fromTyping).toEqual(fromPreset);
  });
});

describe("Adversarial: prices at and below zero", () => {
  it("a price of 0 shows no income figure and no invalid text", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.clear(ownStudentsInput());
    await user.type(ownStudentsInput(), "4");
    await user.clear(priceInput());
    await user.type(priceInput(), "0");

    expect(resultValue(copy.results.networkGV)).toBe("0");
    expect(resultValue(copy.results.gross)).toBe("0");
    expect(resultValue(copy.results.rate)).toBe("0%");
    expect(heroValue()).toBe("0");
    expect(within(resultRegion()).getByText(copy.explain.zero)).toBeInTheDocument();
    expect(resultRegion().textContent ?? "").not.toMatch(/NaN|Infinity|undefined/);
  });

  it("a negative price clamps to zero money and never shows a minus sign", async () => {
    renderCalculator();
    fireEvent.change(ownStudentsInput(), { target: { value: "4" } });
    fireEvent.change(priceInput(), { target: { value: "-500" } });

    expect(resultValue(copy.results.networkGV)).toBe("0");
    expect(heroValue()).toBe("0");
    for (const value of breakdownValues()) {
      expect(value).not.toMatch(/-/);
    }
    expect(resultRegion().textContent ?? "").not.toMatch(/NaN|Infinity|undefined/);
  });

  it("an overflowing price parsed as Infinity clamps to zero money", () => {
    renderCalculator();
    fireEvent.change(ownStudentsInput(), { target: { value: "4" } });
    fireEvent.change(priceInput(), { target: { value: "1e999" } });

    expect(resultValue(copy.results.networkGV)).toBe("0");
    expect(heroValue()).toBe("0");
    expect(document.body.textContent ?? "").not.toMatch(/Infinity|NaN/);
  });
});

describe("Adversarial: display of D-3", () => {
  it("preset 2 keeps two decimals and reconciles in satang", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(1));

    const [own, network, rate, gross, downline, tax] = breakdownValues();
    expect(rate).toBe("52.7%");
    for (const value of [own, network, gross, downline, tax]) {
      expect(value).toMatch(MONEY);
    }
    expect(rate).toMatch(RATE);
    expect(heroValue()).toMatch(MONEY);

    expect(parseSatang(gross)).toBe(1265569);
    expect(parseSatang(downline)).toBe(801000);
    expect(parseSatang(tax)).toBe(13937);
    expect(parseSatang(heroValue())).toBe(450632);
    expect(parseSatang(gross) - parseSatang(downline) - parseSatang(tax)).toBe(
      parseSatang(heroValue()),
    );
    expect(document.body.textContent ?? "").not.toMatch(/\d\.\d{3,}/);
  });

  it("preset 3 reconciles in satang and shows no third decimal", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(2));

    const [, , rate, gross, downline, tax] = breakdownValues();
    expect(rate).toBe("56.7%");
    expect(parseSatang(gross)).toBe(1870944);
    expect(parseSatang(downline)).toBe(1201500);
    expect(parseSatang(tax)).toBe(20083);
    expect(parseSatang(heroValue())).toBe(649361);
    expect(parseSatang(gross) - parseSatang(downline) - parseSatang(tax)).toBe(
      parseSatang(heroValue()),
    );
    expect(document.body.textContent ?? "").not.toMatch(/\d\.\d{3,}/);
  });

  it("the rate row shows one decimal at most, never a raw rate", async () => {
    const user = userEvent.setup();
    renderCalculator();

    await user.click(presetButton(0));
    expect(resultValue(copy.results.rate)).toBe("46%");

    await user.click(presetButton(1));
    expect(resultValue(copy.results.rate)).toBe("52.7%");

    await user.click(presetButton(2));
    expect(resultValue(copy.results.rate)).toBe("56.7%");
    expect(resultRegion().textContent ?? "").not.toMatch(/56\.6953|52\.732/);
  });

  it("the graph bars add up to the whole gross", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(1));

    const widths = barWidths();
    expect(widths).toHaveLength(3);
    expect(widths[0]).toBeCloseTo((4005 / 12655.69) * 100, 6);
    expect(widths[1]).toBeCloseTo((4005 / 12655.69) * 100, 6);
    expect(widths[2]).toBeCloseTo((4645.69 / 12655.69) * 100, 6);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 6);

    await user.click(presetButton(2));
    const threeLegWidths = barWidths();
    expect(threeLegWidths).toHaveLength(4);
    expect(threeLegWidths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 6);
  });
});

describe("Adversarial: no locale-dependent formatting", () => {
  it("the component source has no locale formatter and no third-decimal format", () => {
    const source = readFileSync(COMPONENT_PATH, "utf8");
    expect(source).not.toMatch(/toLocaleString/);
    expect(source).not.toMatch(/\bIntl\./);
    expect(source).not.toMatch(/from "next-intl"/);
    expect(source).not.toMatch(/from "@\/locales/);

    const fixedCalls = Array.from(source.matchAll(/toFixed\((\d+)\)/g)).map((match) =>
      Number(match[1]),
    );
    expect(fixedCalls.length).toBeGreaterThan(0);
    for (const digits of fixedCalls) {
      expect([0, 1, 2], `toFixed(${digits})`).toContain(digits);
    }
  });

  it("a different locale copy gives the same figure strings", async () => {
    const user = userEvent.setup();
    renderCalculator();
    await user.click(presetButton(1));
    const enText = [...breakdownValues(), heroValue()];

    cleanup();
    renderCalculator(zh.calculator);
    await user.click(presetButton(1));
    const zhText = [...breakdownValues(), heroValue()];

    expect(zhText).toEqual(enText);
  });

  it("the page's server props and the standalone client render show the same figures", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const section = document.querySelector("[data-testid='tutor-calculator']");
    const pageRegion = section?.querySelector('[aria-live="polite"]');
    if (!pageRegion) throw new Error("the page renders no calculator live region");
    // The jsdom i18n stub returns key paths, not copy, so compare the figures only.
    const pageValues = Array.from(pageRegion.querySelectorAll("dd")).map(
      (dd) => dd.textContent ?? "",
    );
    const pageHero = pageRegion.querySelectorAll("p")[1]?.textContent ?? "";

    cleanup();
    renderCalculator();
    expect(pageValues).toEqual(breakdownValues());
    expect(pageHero).toBe(heroValue());
    expect(pageValues).toEqual(["0", "0", "0%", "0", "0", "0"]);
  });
});
