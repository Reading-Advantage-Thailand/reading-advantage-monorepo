import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

/**
 * The i18n mock of `src/test/setup.ts` returns `<scope>.<key>`, so the page test
 * proves the per-slot wiring and the locale test pins the literal copy (spec 6.3).
 */
const SCREENS_COPY = "pages.products.tutorAdvantage.screens.items";
const SCREEN_SLOT_INDEXES = [0, 1, 2] as const;

afterEach(() => {
  cleanup();
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

  it("renders three screen cards with the slot alt and caption in copy order", async () => {
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
