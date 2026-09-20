import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import enMessages from "../messages/en.json";
import { RoleplayResult } from "./roleplay-result";

/**
 * Creates an evaluation result fixture accepted by the result card.
 * @param overrides Field overrides applied to the base result.
 * @returns A result accepted by RoleplayResult.
 */
function createResult(overrides: Record<string, unknown> = {}) {
  return {
    overallScore: 84,
    passed: true,
    criteria: [],
    summary: "Strong discovery questions.",
    strengths: ["Clear framing"],
    weaknesses: [],
    suggestedNextAction: "Practice objection handling.",
    ...overrides,
  };
}

/**
 * Renders the roleplay result with English translations.
 * @param result Evaluation result to render.
 */
function renderResult(result: ReturnType<typeof createResult>) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <RoleplayResult result={result} />
    </NextIntlClientProvider>,
  );
}

describe("RoleplayResult accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("announces the score heading through a polite live region", () => {
    renderResult(createResult());

    expect(
      screen.getByText("84/100").closest('[aria-live="polite"]'),
    ).toBeTruthy();
  });

  it("renders the pass badge inside the announced heading region", () => {
    renderResult(createResult({ overallScore: 40, passed: false }));

    const headingRegion = screen
      .getByText("40/100")
      .closest('[aria-live="polite"]');
    expect(headingRegion?.textContent).toContain(enMessages.result.failed);
  });
});
