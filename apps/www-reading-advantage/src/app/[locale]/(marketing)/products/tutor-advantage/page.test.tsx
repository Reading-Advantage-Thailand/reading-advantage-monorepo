import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getScopedI18n } from "@/locales/server";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

/**
 * The default i18n mock of `src/test/setup.ts` returns `<scope>.<key>`, so the
 * existing page cases prove wiring and order. The Phase 3 downline cases below
 * override that mock to resolve keys against the real dictionaries, because a
 * key-path render cannot prove which copy the visitor reads.
 */
const SCREENS_COPY = "pages.products.tutorAdvantage.screens.items";
const SCREEN_SLOT_INDEXES = [0, 1, 2, 3, 4] as const;

type Dict = Record<string, unknown>;
const REAL: Record<string, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

/** Resolves a scope-relative dotted key against one real dictionary. */
function resolve(dict: Dict, key: string): string {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur == null || typeof cur !== "object") return key;
    cur = (cur as Dict)[part];
  }
  return typeof cur === "string" ? cur : key;
}

/** Restores the setup.ts key-path mock after a real-message case. */
function restoreMock(): void {
  vi.mocked(getScopedI18n).mockImplementation((scope) => {
    const translator = ((key: string) =>
      key.endsWith(".image")
        ? "/images/placeholder.png"
        : `${String(scope)}.${key}`) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
}

/** Escapes a literal string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

afterEach(() => {
  cleanup();
  restoreMock();
});

describe("TutorAdvantage", () => {
  it("renders horizontal process flow", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const flow = document.querySelector("[data-testid='process-flow']");
    expect(flow).toBeInTheDocument();
  });

  it("renders floating testimonials", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const cards = document.querySelectorAll("[data-testid='testimonial-card']");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("renders overlapping section", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const section = document.querySelector("[data-testid='overlapping-section']");
    expect(section).toBeInTheDocument();
  });

  it("renders combined stats/cta", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const section = document.querySelector("[data-testid='combined-stats-cta']");
    expect(section).toBeInTheDocument();
  });

  it("renders the calculator section with its anchor", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const section = document.querySelector("[data-testid='tutor-calculator']");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("id", "commission-calculator");
  });

  it("places the calculator after the tutor role and before the commitments", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const tutorRole = document.querySelector("#become-a-tutor");
    const calculator = document.querySelector("[data-testid='tutor-calculator']");
    const commitments = document.querySelector("[data-testid='tutor-commitments']");

    expect(tutorRole).toBeInTheDocument();
    expect(calculator).toBeInTheDocument();
    expect(commitments).toBeInTheDocument();

    const order = [tutorRole, calculator, commitments];
    for (let i = 0; i < order.length - 1; i += 1) {
      expect(
        order[i]!.compareDocumentPosition(order[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("renders five screen cards with the slot alt and caption in copy order", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const section = document.querySelector("[data-testid='tutor-screens']");
    expect(section).toBeInTheDocument();

    const cards = section!.querySelectorAll("li");
    expect(cards.length).toBe(SCREEN_SLOT_INDEXES.length);
    for (const index of SCREEN_SLOT_INDEXES) {
      const card = cards[index]!;
      const picture = card.querySelector("img");
      expect(picture).toBeInTheDocument();
      expect(picture).toHaveAttribute("alt", `${SCREENS_COPY}.${index}.alt`);
      expect(card.textContent).toContain(`${SCREENS_COPY}.${index}.caption`);
    }
  });

  it("places the screens gallery after the tutor role and before the calculator, the commitments, and the faq", async () => {
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
    render(jsx);
    const tutorRole = document.querySelector("#become-a-tutor");
    const screensSection = document.querySelector("[data-testid='tutor-screens']");
    const calculator = document.querySelector("[data-testid='tutor-calculator']");
    const commitments = document.querySelector("[data-testid='tutor-commitments']");
    const faqSection = document.querySelector("#faq-question-0")?.closest("section") ?? null;

    const order = [tutorRole, screensSection, calculator, commitments, faqSection];
    for (const node of order) {
      expect(node).toBeInTheDocument();
    }
    for (let i = 0; i < order.length - 1; i += 1) {
      expect(
        order[i]!.compareDocumentPosition(order[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });
});

describe("TutorAdvantage real-copy downline gate (D-17, AC-17)", () => {
  /** Renders the page with the real messages of one locale. */
  async function renderWithRealCopy(locale: string): Promise<void> {
    const dict = REAL[locale]!;
    vi.mocked(getScopedI18n).mockImplementation(() => {
      const translator = ((key: string) =>
        resolve(dict, key)) as Awaited<ReturnType<typeof getScopedI18n>>;

      return Promise.resolve(translator);
    });
    const jsx = await TutorAdvantage({ params: Promise.resolve({ locale }) });
    render(jsx);
  }

  /** Fails on any downline wording, in English or Thai. */
  function expectNoDownline(step: string): void {
    const text = document.body.textContent ?? "";
    expect(text, `${step}: /downline/i`).not.toMatch(/downline/i);
    expect(text, `${step}: Downline deduction`).not.toContain("Downline deduction");
    expect(text, `${step}: ดาวน์ไลน์`).not.toContain("ดาวน์ไลน์");
  }

  for (const locale of ["en", "th", "zh"] as const) {
    it(`${locale}: the first paint carries no downline wording`, async () => {
      await renderWithRealCopy(locale);
      expectNoDownline(`${locale} first paint`);
    });

    it(`${locale}: preset 2 and preset 3 carry no downline wording`, async () => {
      await renderWithRealCopy(locale);
      const user = userEvent.setup();
      const copy = (REAL[locale]!.calculator as Dict).presets as Dict[];

      for (const index of [1, 2]) {
        const name = copy[index]!.name as string;
        const button = screen.getByRole("button", { name: new RegExp(escapeRegExp(name)) });
        await user.click(button);
        expectNoDownline(`${locale} preset ${index + 1}`);
      }
    });
  }
});
