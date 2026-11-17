/**
 * Phase 3 adversarial probes for the leg controls and the payout graph of the client
 * calculator (track www_tutor_calculator_20261117; review finding A-P3-r2-1, spec 5.3
 * item 4, AC-9, AC-23, D-7, D-9, D-18, D-20).
 *
 * The cases drive the rendered component only. They click Add a leg and Remove a leg, also
 * with a cleared leg-count field (the branch that reads the row count), and they check that
 * the leg rows, the typed students, and the figures stay equal to the module result for the
 * inputs that the page shows. A seeded random walk repeats the checks over many states.
 * No case reads production source as text, and no case computes a hash.
 *
 * Money text is rebuilt here from integer satang, so the figure format is not copied from
 * the component. The random prices are binary-exact (whole baht, .25, .5, .75), so every
 * product of a price and a student count is exact in a Number.
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { en, th } from "@/locales/pages/products/tutor-advantage";
import {
  LEG_STUDENTS_DEFAULT,
  NETWORK_PRESETS,
  calculateNetwork,
  explainVariant,
  type NetworkResult,
} from "@/lib/tutor-commission";
import { TutorCommissionCalculator } from "./tutor-commission-calculator";

type Copy = typeof en.calculator;

const EN: Copy = en.calculator;
const TH: Copy = th.calculator;

afterEach(() => {
  cleanup();
});

/* -------------------------------------------------------------------------- */
/* DOM helpers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Escapes a literal string for use inside a RegExp.
 * @param value The literal text.
 * @returns The escaped text.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads a text field the way a visitor sees it: not a number or not above 0 gives 0.
 * @param text The field value.
 * @returns The number.
 */
function numberOf(text: string): number {
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Builds money text from baht with integer satang: grouped whole baht, else two decimals.
 * @param baht The amount in baht.
 * @returns The text, for example "5,520" or "4,506.32".
 */
function moneyText(baht: number): string {
  const satang = Math.round(baht * 100);
  const whole = Math.trunc(satang / 100);
  const part = satang % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return part === 0 ? grouped : `${grouped}.${String(part).padStart(2, "0")}`;
}

/** The accessors of one rendered calculator, bound to one locale copy. */
type Ui = ReturnType<typeof bind>;

/**
 * Binds the DOM accessors to one copy block. Inputs are found through their label
 * (`label.control`, the link a visitor and a screen reader use) and buttons through their
 * visible text. These plain DOM scans are much faster than role queries in a long walk.
 * @param copy The copy block the calculator renders.
 * @returns The accessors.
 */
function bind(copy: Copy) {
  const labelled = (pattern: RegExp): HTMLInputElement[] =>
    Array.from(document.querySelectorAll("label"))
      .filter((label) => pattern.test(label.textContent ?? ""))
      .map((label) => label.control as HTMLInputElement | null)
      .filter((control): control is HTMLInputElement => control !== null);
  const spin = (text: string) => {
    const found = labelled(new RegExp(escapeRegExp(text)));
    if (found.length !== 1) throw new Error(`${found.length} inputs are labelled ${text}`);
    return found[0]!;
  };
  const button = (text: string) => {
    const found = Array.from(document.querySelectorAll("button")).filter(
      (node) => (node.textContent ?? "").trim() === text,
    );
    if (found.length !== 1) throw new Error(`${found.length} buttons read ${text}`);
    return found[0]!;
  };
  const leaves = (selector: string) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
      (node) => node.children.length === 0,
    );
  const region = () => {
    const node = document.querySelector<HTMLElement>('[aria-live="polite"]');
    if (!node) throw new Error("no polite live region");
    return node;
  };
  const legPattern = () => {
    const [prefix = "", suffix = ""] = copy.graph.legBar.split("{n}");
    return new RegExp(`^\\s*${escapeRegExp(prefix)}(\\d+)${escapeRegExp(suffix)}\\s*$`);
  };
  const legLabels = () => leaves("span").filter((node) => legPattern().test(node.textContent ?? ""));
  const barWidth = (row: Element | null) => {
    const bar = row?.nextElementSibling?.querySelector<HTMLElement>('[style*="--bar-width"]');
    return bar ? Number.parseFloat(bar.style.getPropertyValue("--bar-width")) : Number.NaN;
  };

  return {
    price: () => spin(copy.inputs.price),
    own: () => spin(copy.inputs.ownStudents),
    count: () => spin(copy.inputs.legCount),
    add: () => button(copy.inputs.addLeg),
    remove: () => button(copy.inputs.removeLeg),
    preset: (index: number) => button(copy.presets[index]!.name),
    legInputs: () => labelled(new RegExp(escapeRegExp(copy.inputs.legStudents))),
    /** The text of each leg label in the graph, in DOM order. */
    graphLabels: () => legLabels().map((node) => (node.textContent ?? "").trim()),
    /** One record per graph leg row: label, volume text, payout text, and bar width. */
    graphLegs: () =>
      legLabels().map((label) => {
        const row = label.parentElement as HTMLElement;
        return {
          label: (label.textContent ?? "").trim(),
          volume: row.children[1]?.textContent ?? "",
          payout: row.children[2]?.textContent ?? "",
          width: barWidth(row),
        };
      }),
    /** The own-students row of the graph: figure text and bar width. */
    ownRow: () => {
      const labels = leaves("span").filter((node) => (node.textContent ?? "").trim() === copy.graph.ownBar);
      if (labels.length !== 1) throw new Error(`${labels.length} own-bar labels`);
      const row = labels[0]!.parentElement as HTMLElement;
      return { figure: row.children[1]?.textContent ?? "", width: barWidth(row) };
    },
    /** The text beside a graph total label. */
    total: (label: string) => {
      const terms = leaves("dt").filter((node) => (node.textContent ?? "").trim() === label);
      if (terms.length !== 1) throw new Error(`${terms.length} totals named ${label}`);
      return terms[0]!.parentElement?.querySelector("dd")?.textContent ?? "";
    },
    /** The figures of the result card. */
    figures: () => {
      const node = region();
      const dd = Array.from(node.querySelectorAll("dd")).map((item) => item.textContent ?? "");
      const paragraphs = Array.from(node.querySelectorAll("p"));
      const labelAt = paragraphs.findIndex((item) => item.textContent === copy.results.net);
      const explain = (["ownOnly", "withLegs", "zero"] as const).filter((key) =>
        (node.textContent ?? "").includes(copy.explain[key]),
      );
      return {
        ownGV: dd[0] ?? "",
        networkGV: dd[1] ?? "",
        rate: dd[2] ?? "",
        gross: dd[3] ?? "",
        legCommissions: dd[4] ?? "",
        tax: dd[5] ?? "",
        hero: paragraphs[labelAt + 1]?.textContent ?? "",
        explain,
      };
    },
    /** The index of the preset with aria-pressed true, or null. */
    pressed: () => {
      const hits = copy.presets
        .map((_preset, index) => index)
        .filter((index) => button(copy.presets[index]!.name).getAttribute("aria-pressed") === "true");
      expect(hits.length, "at most one preset is pressed").toBeLessThanOrEqual(1);
      return hits[0] ?? null;
    },
    /** True when any preset example text is on the page. */
    exampleShown: () => {
      const text = document.body.textContent ?? "";
      return copy.presets.some((preset) => text.includes(preset.setup) || text.includes(preset.result));
    },
  };
}

/**
 * Renders the calculator and returns its accessors.
 * @param copy The copy block.
 * @returns The accessors and the render result.
 */
function mount(copy: Copy = EN) {
  const view = render(<TutorCommissionCalculator copy={copy} />);
  return { ...bind(copy), view };
}

/**
 * Reads the inputs the page shows.
 * @param ui The accessors.
 * @returns The calculator input that the visible fields give.
 */
function visibleInput(ui: Ui) {
  return {
    price: numberOf(ui.price().value),
    personalStudents: numberOf(ui.own().value),
    studentsPerLeg: ui.legInputs().map((input) => numberOf(input.value)),
  };
}

/**
 * Types a value into an input as one change event.
 * @param input The input.
 * @param text The new value.
 */
function type(input: HTMLElement, text: string): void {
  fireEvent.change(input, { target: { value: text } });
}

/**
 * Asserts that the whole page state equals the module result for the visible inputs.
 * @param copy The copy block.
 * @param ui The accessors.
 * @param step A label for the failure message.
 * @returns The module result.
 */
function expectConsistent(copy: Copy, ui: Ui, step: string): NetworkResult {
  const result = calculateNetwork(visibleInput(ui));
  const rows = ui.legInputs();
  expect(ui.graphLabels(), `${step}: graph labels`).toEqual(
    result.legs.map((leg) => copy.graph.legBar.replace("{n}", String(leg.leg))),
  );
  expect(rows.length, `${step}: input rows against module legs`).toBe(result.legs.length);

  const figures = ui.figures();
  expect(figures.ownGV, `${step}: own volume`).toBe(moneyText(result.ownVolume));
  expect(figures.networkGV, `${step}: network volume`).toBe(moneyText(result.networkVolume));
  expect(figures.gross, `${step}: gross`).toBe(moneyText(result.gross));
  expect(figures.legCommissions, `${step}: leg commissions`).toBe(moneyText(result.legPayouts));
  expect(figures.tax, `${step}: tax`).toBe(moneyText(result.withholdingTax));
  expect(figures.hero, `${step}: net`).toBe(moneyText(result.net));
  expect(figures.explain, `${step}: explain line`).toEqual([explainVariant(result)]);

  expect(figures.rate, `${step}: rate shape`).toMatch(/^(0|[1-9]\d*)(\.\d)?%$/);
  expect(
    Math.abs(Number.parseFloat(figures.rate) - result.rate * 100),
    `${step}: rate value`,
  ).toBeLessThanOrEqual(0.0501);

  expect(ui.total(copy.graph.grossBar), `${step}: graph gross`).toBe(moneyText(result.gross));
  expect(ui.total(copy.graph.legCommissionBar), `${step}: graph legs`).toBe(
    moneyText(result.legPayouts),
  );
  expect(ui.total(copy.graph.netBar), `${step}: graph net`).toBe(moneyText(result.net));

  const own = ui.ownRow();
  expect(own.figure, `${step}: own bar figure`).toBe(moneyText(result.ownVolume));
  const widths = [own.width];
  ui.graphLegs().forEach((row, index) => {
    const leg = result.legs[index]!;
    expect(row.volume, `${step}: leg ${index + 1} volume`).toBe(moneyText(leg.volume));
    expect(row.payout, `${step}: leg ${index + 1} payout`).toBe(moneyText(leg.payout));
    widths.push(row.width);
    if (result.networkVolume > 0) {
      expect(row.width, `${step}: leg ${index + 1} width`).toBeCloseTo(
        (leg.volume / result.networkVolume) * 100,
        6,
      );
    }
  });
  if (result.networkVolume > 0) {
    expect(own.width, `${step}: own width`).toBeCloseTo(
      (result.ownVolume / result.networkVolume) * 100,
      6,
    );
    expect(
      widths.reduce((sum, width) => sum + width, 0),
      `${step}: bars add up to the network volume`,
    ).toBeCloseTo(100, 6);
  } else {
    expect(widths, `${step}: no volume, no bar`).toEqual(widths.map(() => 0));
  }
  return result;
}

/**
 * Asserts the preset rule of D-7: a pressed preset always matches the inputs, and no
 * example text shows while no preset is pressed.
 * @param copy The copy block.
 * @param ui The accessors.
 * @param step A label for the failure message.
 */
function expectPresetRule(copy: Copy, ui: Ui, step: string): void {
  const pressed = ui.pressed();
  if (pressed === null) {
    expect(ui.exampleShown(), `${step}: example text without a pressed preset`).toBe(false);
    return;
  }
  const preset = NETWORK_PRESETS[pressed]!;
  expect(ui.price().value, `${step}: pressed preset price`).toBe(String(preset.price));
  expect(ui.own().value, `${step}: pressed preset own students`).toBe(
    String(preset.personalStudents),
  );
  expect(ui.count().value, `${step}: pressed preset leg count`).toBe(
    String(preset.studentsPerLeg.length),
  );
  expect(
    ui.legInputs().map((input) => input.value),
    `${step}: pressed preset leg students`,
  ).toEqual(preset.studentsPerLeg.map(String));
  expect(document.body.textContent ?? "", `${step}: preset setup text`).toContain(
    copy.presets[pressed]!.setup,
  );
  expect(document.body.textContent ?? "", `${step}: preset result text`).toContain(
    copy.presets[pressed]!.result,
  );
}

/* -------------------------------------------------------------------------- */
/* Add a leg and Remove a leg                                                 */
/* -------------------------------------------------------------------------- */

describe("L1 Add a leg and Remove a leg", () => {
  it("adds legs one at a time, each at the default of 3 students, and numbers them in order", async () => {
    const user = userEvent.setup();
    const ui = mount();
    expect(ui.legInputs()).toHaveLength(0);
    expect(ui.count().value).toBe("0");

    for (let legs = 1; legs <= 4; legs += 1) {
      await user.click(ui.add());
      expect(ui.count().value).toBe(String(legs));
      expect(ui.legInputs().map((input) => input.value)).toEqual(
        new Array(legs).fill(String(LEG_STUDENTS_DEFAULT)),
      );
      expect(ui.graphLabels()).toEqual(
        Array.from({ length: legs }, (_item, index) =>
          EN.graph.legBar.replace("{n}", String(index + 1)),
        ),
      );
      expectConsistent(EN, ui, `after add ${legs}`);
    }
  });

  it("keeps the typed students when a leg is added, and again when one is removed", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.own(), "2");
    type(ui.count(), "2");
    type(ui.legInputs()[0]!, "5");
    type(ui.legInputs()[1]!, "7");

    await user.click(ui.add());
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "7", "3"]);
    expectConsistent(EN, ui, "after add");

    await user.click(ui.remove());
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "7"]);
    expect(ui.count().value).toBe("2");
    expectConsistent(EN, ui, "after remove");

    await user.click(ui.remove());
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5"]);
    await user.click(ui.remove());
    expect(ui.legInputs()).toHaveLength(0);
    expect(ui.graphLabels()).toEqual([]);
    expectConsistent(EN, ui, "after the last remove");
  });

  it("does not go below 0 legs and keeps the field at 0", async () => {
    const user = userEvent.setup();
    const ui = mount();
    await user.click(ui.remove());
    await user.click(ui.remove());
    expect(ui.legInputs()).toHaveLength(0);
    expect(ui.count().value).toBe("0");
    expect(ui.figures().hero).toBe("0");
    expectConsistent(EN, ui, "remove at zero");
  });

  it("applies every click of a fast run of clicks", () => {
    const ui = mount();
    for (let click = 0; click < 7; click += 1) fireEvent.click(ui.add());
    expect(ui.legInputs()).toHaveLength(7);
    expect(ui.count().value).toBe("7");
    for (let click = 0; click < 9; click += 1) fireEvent.click(ui.remove());
    expect(ui.legInputs()).toHaveLength(0);
    expect(ui.count().value).toBe("0");
    expectConsistent(EN, ui, "after the fast run");
  });

  it("restores the earlier count with new legs at 3 after remove then add", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.own(), "1");
    type(ui.count(), "2");
    type(ui.legInputs()[0]!, "5");
    type(ui.legInputs()[1]!, "7");
    await user.click(ui.remove());
    await user.click(ui.add());
    // The removed leg does not come back with its old value: the spec appends the default.
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "3"]);
  });

  it("is reachable and operable from the keyboard", async () => {
    const user = userEvent.setup();
    const ui = mount();
    ui.count().focus();
    await user.tab();
    expect(ui.add()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(ui.legInputs()).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(ui.legInputs()).toHaveLength(2);
    await user.tab();
    expect(ui.remove()).toHaveFocus();
    await user.keyboard(" ");
    expect(ui.legInputs()).toHaveLength(1);
    expectConsistent(EN, ui, "keyboard");
  });

  it("works the same with the Thai copy", async () => {
    const user = userEvent.setup();
    const ui = mount(TH);
    type(ui.own(), "1");
    await user.click(ui.add());
    await user.click(ui.add());
    expect(ui.graphLabels()).toEqual(["สาย 1", "สาย 2"]);
    type(ui.legInputs()[0]!, "5");
    type(ui.count(), "");
    await user.click(ui.add());
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "3", "3"]);
    expectConsistent(TH, ui, "thai");
  });
});

describe("L2 a cleared leg-count field (the row-count branch)", () => {
  /** Builds a state with two typed legs of 5 and 7 and a cleared count field. */
  function twoTypedLegsAndClearedField() {
    const ui = mount();
    type(ui.own(), "2");
    type(ui.count(), "2");
    type(ui.legInputs()[0]!, "5");
    type(ui.legInputs()[1]!, "7");
    type(ui.count(), "");
    return ui;
  }

  it("keeps both rows and both typed students while the field is empty", () => {
    const ui = twoTypedLegsAndClearedField();
    expect(ui.count().value).toBe("");
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "7"]);
    expectConsistent(EN, ui, "cleared field");
  });

  it("Add reads the row count, so 2 rows become 3 and the typed 5 and 7 stay", async () => {
    const user = userEvent.setup();
    const ui = twoTypedLegsAndClearedField();
    await user.click(ui.add());
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "7", "3"]);
    expect(ui.count().value).toBe("3");
    expectConsistent(EN, ui, "add with a cleared field");
  });

  it("Remove reads the row count, so 2 rows become 1 and the typed 5 stays", async () => {
    const user = userEvent.setup();
    const ui = twoTypedLegsAndClearedField();
    await user.click(ui.remove());
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5"]);
    expect(ui.count().value).toBe("1");
    expectConsistent(EN, ui, "remove with a cleared field");
  });

  it("Add at 0 rows with a cleared field gives one leg of 3", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.count(), "");
    await user.click(ui.add());
    expect(ui.legInputs().map((input) => input.value)).toEqual(["3"]);
    expect(ui.count().value).toBe("1");
  });

  it("Remove at 0 rows with a cleared field stays at 0 and writes 0 to the field", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.count(), "");
    await user.click(ui.remove());
    expect(ui.legInputs()).toHaveLength(0);
    expect(ui.count().value).toBe("0");
  });

  it("a figure change while the field is empty still matches the module", () => {
    const ui = twoTypedLegsAndClearedField();
    type(ui.price(), "4000");
    expectConsistent(EN, ui, "price edit with a cleared field");
    type(ui.legInputs()[1]!, "0");
    expectConsistent(EN, ui, "leg edit with a cleared field");
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "0"]);
  });

  it("typing a new count after the clear resizes from the kept rows", () => {
    const ui = twoTypedLegsAndClearedField();
    type(ui.count(), "3");
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5", "7", "3"]);
    type(ui.count(), "");
    type(ui.count(), "1");
    expect(ui.legInputs().map((input) => input.value)).toEqual(["5"]);
  });

  it("clears the preset example, like any other edit (D-7)", () => {
    const ui = mount();
    fireEvent.click(ui.preset(2));
    expect(ui.pressed()).toBe(2);
    type(ui.count(), "");
    expect(ui.pressed()).toBeNull();
    expect(ui.exampleShown()).toBe(false);
    expect(ui.legInputs()).toHaveLength(3);
  });
});

describe("L3 fractional and negative counts", () => {
  it("adds one leg to a fractional count and removes one again", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.count(), "2.5");
    expect(ui.legInputs()).toHaveLength(2);
    await user.click(ui.add());
    expect(ui.legInputs()).toHaveLength(3);
    expect(ui.count().value).toBe("3.5");
    await user.click(ui.remove());
    expect(ui.legInputs()).toHaveLength(2);
    expect(ui.count().value).toBe("2.5");
    expectConsistent(EN, ui, "fractional count");
  });

  it("treats a count below 1 as no legs, and Add then gives one", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.count(), "0.5");
    expect(ui.legInputs()).toHaveLength(0);
    await user.click(ui.add());
    expect(ui.legInputs()).toHaveLength(1);
  });

  it("treats a negative count as no legs, and Add then gives one", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.count(), "2");
    type(ui.count(), "-1");
    expect(ui.legInputs()).toHaveLength(0);
    await user.click(ui.add());
    expect(ui.legInputs()).toHaveLength(1);
    expect(ui.count().value).toBe("1");
    expectConsistent(EN, ui, "negative count");
  });

  it("clears a leg student that is typed negative or fractional the way the module does", async () => {
    const user = userEvent.setup();
    const ui = mount();
    type(ui.own(), "1");
    type(ui.count(), "3");
    type(ui.legInputs()[0]!, "-3");
    type(ui.legInputs()[1]!, "2.9");
    type(ui.legInputs()[2]!, "");
    expectConsistent(EN, ui, "typed hostile students");
    await user.click(ui.add());
    // The resize keeps the module reading of each entry: 0, 2, and 0.
    expect(ui.legInputs().map((input) => input.value)).toEqual(["0", "2", "0", "3"]);
    expectConsistent(EN, ui, "hostile students after add");
  });
});

describe("L4 Add and Remove are edits (D-7) and the figures follow (D-18)", () => {
  it("clears the preset example and keeps the live figures after Add", async () => {
    const user = userEvent.setup();
    const ui = mount();
    await user.click(ui.preset(2));
    expect(ui.pressed()).toBe(2);
    await user.click(ui.add());
    expect(ui.pressed()).toBeNull();
    expect(ui.exampleShown()).toBe(false);
    expect(ui.legInputs().map((input) => input.value)).toEqual(["4", "4", "4", "3"]);
    // 2 own students and 3 legs of 4 at 3,000 baht, plus a new leg of 3: 6,000 + 36,000 + 9,000.
    expect(ui.figures().networkGV).toBe("51,000");
    expectConsistent(EN, ui, "preset then add");
  });

  it("clears the preset example after Remove", async () => {
    const user = userEvent.setup();
    const ui = mount();
    await user.click(ui.preset(1));
    await user.click(ui.remove());
    expect(ui.pressed()).toBeNull();
    expect(ui.exampleShown()).toBe(false);
    expect(ui.legInputs()).toHaveLength(1);
    expectConsistent(EN, ui, "preset then remove");
  });

  it("pays 0 and shows the zero line for legs without own students, then pays once a student is typed", async () => {
    const user = userEvent.setup();
    const ui = mount();
    await user.click(ui.add());
    await user.click(ui.add());
    expect(ui.figures().hero).toBe("0");
    expect(ui.figures().tax).toBe("0");
    expect(ui.figures().explain).toEqual(["zero"]);
    expect(ui.figures().networkGV).toBe("18,000");

    type(ui.own(), "1");
    expect(Number(ui.figures().hero.replace(/,/g, ""))).toBeGreaterThan(0);
    expect(ui.figures().explain).toEqual(["withLegs"]);

    type(ui.own(), "0");
    expect(ui.figures().hero).toBe("0");
    expect(ui.figures().explain).toEqual(["zero"]);
    expectConsistent(EN, ui, "own student toggled");
  });

  it("shows no bar and no volume when every leg is empty", async () => {
    const user = userEvent.setup();
    const ui = mount();
    await user.click(ui.add());
    type(ui.legInputs()[0]!, "0");
    expect(ui.ownRow().width).toBe(0);
    expect(ui.graphLegs().map((row) => row.width)).toEqual([0]);
    expectConsistent(EN, ui, "empty leg");
  });
});

/* -------------------------------------------------------------------------- */
/* The graph for random states (AC-23)                                        */
/* -------------------------------------------------------------------------- */

/**
 * A seeded generator so that a run repeats exactly.
 * @param seed The seed.
 * @returns A function that returns a number from 0 up to, not including, 1.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks one item at random.
 * @param random The generator.
 * @param items The items.
 * @returns One item.
 */
function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

/** Binary-exact prices: whole baht, .25, .5, and .75. */
const PRICES = ["3000", "1500", "4000.5", "999", "20000", "3000.25", "2500.75", "1", "250"];

describe("L5 the own bar and the leg bars for random inputs (AC-23, D-20)", () => {
  it("shows the own volume under graph.ownBar, and the bars as shares of the network volume", () => {
    const random = seeded(77);
    let withVolume = 0;
    let withLegs = 0;
    let unpaid = 0;
    for (let round = 0; round < 120; round += 1) {
      const ui = mount();
      type(ui.price(), pick(random, PRICES));
      type(ui.own(), String(Math.floor(random() * 25)));
      const legCount = Math.floor(random() * 7);
      type(ui.count(), String(legCount));
      ui.legInputs().forEach((input) => type(input, String(Math.floor(random() * 25))));

      const result = expectConsistent(EN, ui, `round ${round}`);
      expect(ui.ownRow().figure).toBe(moneyText(visibleInput(ui).price * visibleInput(ui).personalStudents));
      if (result.networkVolume > 0) withVolume += 1;
      if (result.legs.length > 0 && result.networkVolume > 0) withLegs += 1;
      if (result.ownVolume === 0 && result.legs.length > 0 && result.networkVolume > 0) unpaid += 1;
      cleanup();
    }
    // The rounds reach states with a volume, with legs, and with legs but no own students.
    expect(withVolume).toBeGreaterThan(60);
    expect(withLegs).toBeGreaterThan(40);
    expect(unpaid).toBeGreaterThan(2);
  }, 120_000);

  it("shows the own volume of each preset, and the bars of each preset add up to 100", () => {
    const expectedOwn = ["12,000", "6,000", "6,000"];
    for (const [index, own] of expectedOwn.entries()) {
      const ui = mount();
      fireEvent.click(ui.preset(index));
      expect(ui.ownRow().figure).toBe(own);
      const widths = [ui.ownRow().width, ...ui.graphLegs().map((row) => row.width)];
      expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100, 6);
      expectConsistent(EN, ui, `preset ${index + 1}`);
      cleanup();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* A seeded random walk over every control                                    */
/* -------------------------------------------------------------------------- */

/** One user action of the random walk. A "count" action with an empty text clears the field. */
type Action =
  | { kind: "price"; text: string }
  | { kind: "own"; text: string }
  | { kind: "count"; text: string }
  | { kind: "leg"; text: string }
  | { kind: "add" }
  | { kind: "remove" }
  | { kind: "preset"; index: number };

const COUNT_TEXTS = ["0", "1", "2", "3", "5", "2.5", "0.5", "1.9", "-1", "007", "9"];
const OWN_TEXTS = ["0", "1", "2", "3", "4", "10", "", "2.9", "-1"];
const LEG_TEXTS = ["0", "1", "3", "5", "7", "12", "", "2.9", "-3"];
const PRICE_TEXTS = [...PRICES, "0", "", "-5"];

/**
 * Chooses the next action; Add and Remove carry the most weight.
 * @param random The generator.
 * @param rows The current number of leg rows.
 * @returns The action.
 */
function nextAction(random: () => number, rows: number): Action {
  const roll = random();
  if (roll < 0.04) return { kind: "price", text: pick(random, PRICE_TEXTS) };
  if (roll < 0.1) return { kind: "own", text: pick(random, OWN_TEXTS) };
  if (roll < 0.2) return { kind: "count", text: pick(random, COUNT_TEXTS) };
  if (roll < 0.32) return { kind: "count", text: "" };
  if (roll < 0.46 && rows > 0) return { kind: "leg", text: pick(random, LEG_TEXTS) };
  if (roll < 0.5) return { kind: "preset", index: Math.floor(random() * 3) };
  if (roll < 0.76 && rows < 14) return { kind: "add" };
  return { kind: "remove" };
}

/**
 * Normalizes a typed leg value the way a resize does: a whole number of 0 or more.
 * @param text The typed value.
 * @returns The text a resize leaves in the field.
 */
function resized(text: string): string {
  return String(Math.floor(numberOf(text)));
}

describe("L6 a seeded random walk keeps rows, typed students, and figures consistent", () => {
  /**
   * Runs one walk against one copy block.
   * @param copy The copy block.
   * @param seed The seed.
   * @param steps The number of actions.
   * @returns Counters that show which branches the walk reached.
   */
  function walk(copy: Copy, seed: number, steps: number) {
    const random = seeded(seed);
    const ui = mount(copy);
    const seen = { emptyAdd: 0, emptyRemove: 0, fractionalAdd: 0, presetThenEdit: 0, typedCount: 0 };
    expectConsistent(copy, ui, `seed ${seed} start`);

    for (let step = 1; step <= steps; step += 1) {
      const before = {
        price: ui.price().value,
        own: ui.own().value,
        count: ui.count().value,
        legs: ui.legInputs().map((input) => input.value),
        pressed: ui.pressed(),
      };
      const action = nextAction(random, before.legs.length);
      const label = `seed ${seed} step ${step} ${JSON.stringify(action)} before ${JSON.stringify(before)}`;
      let edited = true;

      switch (action.kind) {
        case "price":
          edited = before.price !== action.text;
          type(ui.price(), action.text);
          break;
        case "own":
          edited = before.own !== action.text;
          type(ui.own(), action.text);
          break;
        case "count":
          edited = before.count !== action.text;
          type(ui.count(), action.text);
          break;
        case "leg": {
          const index = Math.floor(random() * before.legs.length);
          edited = before.legs[index] !== action.text;
          type(ui.legInputs()[index]!, action.text);
          break;
        }
        case "add":
          if (before.count.trim() === "" && before.legs.length > 0) seen.emptyAdd += 1;
          if (before.count.includes(".")) seen.fractionalAdd += 1;
          fireEvent.click(ui.add());
          break;
        case "remove":
          if (before.count.trim() === "" && before.legs.length > 0) seen.emptyRemove += 1;
          fireEvent.click(ui.remove());
          break;
        case "preset":
          fireEvent.click(ui.preset(action.index));
          break;
      }
      if (action.kind === "count" && action.text !== "") seen.typedCount += 1;

      const after = {
        price: ui.price().value,
        own: ui.own().value,
        count: ui.count().value,
        legs: ui.legInputs().map((input) => input.value),
        pressed: ui.pressed(),
      };

      // The page state always equals the module result for the visible inputs.
      expectConsistent(copy, ui, label);
      expectPresetRule(copy, ui, label);

      // The count field and the rows agree whenever the field holds a number.
      if (after.count.trim() !== "") {
        expect(after.legs.length, `${label}: rows against field ${after.count}`).toBe(
          Math.floor(numberOf(after.count)),
        );
      }

      // Each action changes only what it should.
      switch (action.kind) {
        case "price":
          expect(after.own, label).toBe(before.own);
          expect(after.legs, label).toEqual(before.legs);
          break;
        case "own":
          expect(after.price, label).toBe(before.price);
          expect(after.legs, label).toEqual(before.legs);
          break;
        case "leg":
          expect(after.count, label).toBe(before.count);
          expect(after.legs.length, label).toBe(before.legs.length);
          break;
        case "count":
          if (!edited || action.text.trim() === "") {
            // A cleared field, or a value that equals the field, keeps the rows and the
            // typed students exactly: a repeated value fires no change event.
            expect(after.legs, label).toEqual(before.legs);
          } else {
            const count = Math.floor(numberOf(action.text));
            expect(after.legs.length, label).toBe(count);
            const kept = before.legs.slice(0, count).map(resized);
            expect(after.legs.slice(0, kept.length), label).toEqual(kept);
            expect(
              after.legs.slice(kept.length),
              `${label}: new legs start at the default`,
            ).toEqual(new Array(count - kept.length).fill(String(LEG_STUDENTS_DEFAULT)));
          }
          break;
        case "add": {
          const rows = before.legs.length;
          expect(after.legs.length, `${label}: add makes one more row`).toBe(rows + 1);
          expect(after.legs.slice(0, rows), label).toEqual(before.legs.map(resized));
          expect(after.legs[rows], label).toBe(String(LEG_STUDENTS_DEFAULT));
          break;
        }
        case "remove": {
          const rows = before.legs.length;
          expect(after.legs.length, `${label}: remove makes one row fewer`).toBe(
            Math.max(0, rows - 1),
          );
          expect(after.legs, label).toEqual(before.legs.slice(0, Math.max(0, rows - 1)).map(resized));
          break;
        }
        case "preset":
          break;
      }

      // An edit clears the pressed preset (D-7). A change that does not alter a field fires no event.
      if (action.kind !== "preset" && edited && before.pressed !== null) {
        expect(after.pressed, `${label}: the edit clears the preset`).toBeNull();
        seen.presetThenEdit += 1;
      }
      if (action.kind === "preset") {
        expect(after.pressed, label).toBe(action.index);
      }
    }
    return seen;
  }

  it("holds over 36 walks of 30 actions in English", () => {
    const total = { emptyAdd: 0, emptyRemove: 0, fractionalAdd: 0, presetThenEdit: 0, typedCount: 0 };
    for (let seed = 1; seed <= 36; seed += 1) {
      const seen = walk(EN, seed, 30);
      for (const key of Object.keys(total) as Array<keyof typeof total>) total[key] += seen[key];
      cleanup();
    }
    // The walks must reach the branches that the review named, or a pass would prove nothing.
    expect(total.emptyAdd, "Add with a cleared count field and rows").toBeGreaterThan(5);
    expect(total.emptyRemove, "Remove with a cleared count field and rows").toBeGreaterThan(5);
    expect(total.fractionalAdd, "Add with a fractional count field").toBeGreaterThan(2);
    expect(total.presetThenEdit, "an edit after a preset").toBeGreaterThan(10);
    expect(total.typedCount, "a typed count").toBeGreaterThan(100);
  }, 120_000);

  it("holds over 8 walks of 30 actions in Thai", () => {
    for (let seed = 101; seed <= 108; seed += 1) {
      walk(TH, seed, 30);
      cleanup();
    }
  }, 120_000);
});

/* -------------------------------------------------------------------------- */
/* No downline wording while the legs change                                  */
/* -------------------------------------------------------------------------- */

/**
 * Finds banned downline wording in rendered HTML, attributes included. No line is
 * filtered, so a hit beside the words "never" or "do not" still counts.
 * @param html The rendered HTML.
 * @returns The banned terms found.
 */
function findDownline(html: string): string[] {
  const text = html.replace(/&[a-z]+;/gi, " ");
  const patterns: Array<[string, RegExp]> = [
    ["downline", /down[\s\-_]*line/i],
    ["Downline deduction", /downline\s+deduction/i],
    ["ดาวน์ไลน์", /ดาวน์\s*ไลน์/u],
    ["ดาวไลน์", /ดาว\s*ไลน์/u],
  ];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

describe("L7 no downline wording before and after each control", () => {
  it("the scanner keeps a hit that sits beside a filter word", () => {
    const probes = [
      "We never show a Downline deduction here",
      "Do not call it a down-line",
      '<span title="no downline">x</span>',
      "no ดาวน์ไลน์ here",
      "ไม่มี ดาวน์ ไลน์",
    ];
    for (const probe of probes) {
      expect(findDownline(probe), probe).not.toEqual([]);
    }
    expect(findDownline("Commission of each leg. The legs earn 8,010 baht.")).toEqual([]);
  });

  for (const [name, copy] of [
    ["en", EN],
    ["th", TH],
  ] as const) {
    it(`${name}: the rendered calculator holds no downline wording in any state`, async () => {
      const user = userEvent.setup();
      const ui = mount(copy);
      const html = () => ui.view.container.innerHTML;
      expect(findDownline(html()), "first paint").toEqual([]);
      for (let index = 0; index < copy.presets.length; index += 1) {
        await user.click(ui.preset(index));
        expect(findDownline(html()), `preset ${index + 1}`).toEqual([]);
        await user.click(ui.add());
        expect(findDownline(html()), `preset ${index + 1} then add`).toEqual([]);
        await user.click(ui.remove());
        await user.click(ui.remove());
        expect(findDownline(html()), `preset ${index + 1} then remove`).toEqual([]);
      }
      type(ui.own(), "0");
      type(ui.count(), "2");
      expect(findDownline(html()), "legs without own students").toEqual([]);
      type(ui.count(), "");
      await user.click(ui.add());
      expect(findDownline(html()), "add after a cleared field").toEqual([]);
    });
  }
});
