import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

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
});
