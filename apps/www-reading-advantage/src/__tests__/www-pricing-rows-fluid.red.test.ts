import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PricingPage from "@/app/[locale]/(marketing)/pricing/page";
import enMessages from "@/locales/en";

/*
 * Red r6 pins for fluid pricing rows (track www_features_pricing_20261120,
 * Review A RA1): the pricing page maps over the locale row array, so adding
 * or removing a row in the data changes the table. A three-row message
 * fixture renders exactly three rows with no missing-cell marker. The new
 * rows must fail at 7fb548e5e, where the page uses the literal index list
 * [0, 1, 2, 3].
 */

const hoisted = vi.hoisted(() => {
  const state: { messages: unknown } = { messages: {} };

  function readPath(root: unknown, path: string): unknown {
    let value: unknown = root;
    for (const segment of path.split(".")) {
      if (value === null || typeof value !== "object") return undefined;
      if (!(segment in (value as Record<string, unknown>))) return undefined;
      value = (value as Record<string, unknown>)[segment];
    }
    return value;
  }

  function makeTranslator(scope: string) {
    const prefix = scope ? `${scope}.` : "";
    const translate = (key: string): string => {
      const value = readPath(state.messages, `${prefix}${key}`);
      return typeof value === "string" ? value : `[[missing:${prefix}${key}]]`;
    };
    translate.raw = (key: string): unknown =>
      readPath(state.messages, `${prefix}${key}`);
    return translate;
  }

  return { state, makeTranslator, readPath };
});

vi.mock("@/locales/server", () => ({
  getI18n: vi.fn(() => Promise.resolve(hoisted.makeTranslator(""))),
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve(hoisted.makeTranslator(scope)),
  ),
  getStaticParams: vi.fn(() => []),
}));

vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn(
    (scope: string) => (key: string) => {
      const value = hoisted.readPath(
        hoisted.state.messages,
        scope ? `${scope}.${key}` : key,
      );
      return typeof value === "string" ? value : `[[missing:${scope}.${key}]]`;
    },
  ),
}));

/** Messages with the subject table cut to three rows. */
function threeRowMessages(): unknown {
  const messages = JSON.parse(JSON.stringify(enMessages)) as {
    pages: { pricing: { subjects: { rows: unknown[] } } };
  };
  messages.pages.pricing.subjects.rows =
    messages.pages.pricing.subjects.rows.slice(0, 3);
  return messages;
}

afterEach(() => {
  cleanup();
});

describe("control: fluid-rows fixture", () => {
  it("control: the three-row fixture holds exactly three rows", () => {
    const rows = (
      threeRowMessages() as {
        pages: { pricing: { subjects: { rows: unknown[] } } };
      }
    ).pages.pricing.subjects.rows;
    expect(rows.length, "fixture rows: 3").toBe(3);
  });
});

describe("RA1 render: a three-row fixture renders three rows", () => {
  beforeEach(async () => {
    hoisted.state.messages = threeRowMessages();
    render(await PricingPage());
  });

  it("renders exactly the fixture row count", () => {
    const rows = document.querySelectorAll(
      '[data-testid="subject-price-table"] tbody tr',
    );
    expect(rows.length, "rendered rows: 3").toBe(3);
  });

  it("renders no missing-cell marker", () => {
    const table = document.querySelector('[data-testid="subject-price-table"]');
    expect(
      (table?.textContent ?? "").includes("[[missing"),
      "missing-cell marker: absent",
    ).toBe(false);
  });
});
