import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PricingPage from "@/app/[locale]/(marketing)/pricing/page";
import enMessages from "@/locales/en";

/*
 * Red r7 pins for RA4 required row data (track www_features_pricing_20261120,
 * Review A r2 blocker): pricing/page.tsx substitutes an empty array for
 * missing or non-array subjects.rows, so the page renders a zero-row table
 * with no visible error, also with the real production translator.
 *
 * These tests use the REAL next-intl translator (createTranslator, the same
 * loader the page uses: the real @/locales message objects), not a stub
 * without raw. Default D-R7-1: a missing or invalid subjects.rows throws
 * during render instead of substituting an empty array. This matches how the
 * page already treats a missing message elsewhere (the real translator
 * surfaces MISSING_MESSAGE as an error and renders the key as visible text,
 * never a silent empty section), and it adds no unapproved copy. Missing
 * rows log the expected MISSING_MESSAGE console error.
 */

const serverWiring = vi.hoisted(() => ({
  messages: null as unknown,
}));

vi.mock("@/locales/server", () => ({
  getI18n: () =>
    import("next-intl").then(({ createTranslator }) =>
      createTranslator({
        locale: "en",
        messages: serverWiring.messages as never,
      }),
    ),
  getScopedI18n: (scope: string) =>
    import("next-intl").then(({ createTranslator }) =>
      createTranslator({
        locale: "en",
        namespace: scope as never,
        messages: serverWiring.messages as never,
      }),
    ),
  getStaticParams: () => [],
}));

type PricingMessages = {
  pages: { pricing: { subjects: { rows: unknown } } };
};

/** Deep copy of the real en messages. */
function copyMessages(): PricingMessages {
  return JSON.parse(JSON.stringify(enMessages)) as PricingMessages;
}

/** Messages with subjects.rows removed. */
function messagesWithoutRows(): unknown {
  const messages = copyMessages();
  delete (
    messages.pages.pricing.subjects as unknown as Record<string, unknown>
  ).rows;
  return messages;
}

/** Messages with subjects.rows replaced by the given invalid value. */
function messagesWithRows(value: unknown): unknown {
  const messages = copyMessages();
  messages.pages.pricing.subjects.rows = value;
  return messages;
}

/** Messages with subjects.rows cut to the given count. */
function messagesWithRowCount(count: number): unknown {
  const messages = copyMessages();
  const rows = messages.pages.pricing.subjects.rows as unknown[];
  messages.pages.pricing.subjects.rows = rows.slice(0, count);
  return messages;
}

afterEach(() => {
  cleanup();
});

describe("control: required-rows scanners use the real translator", () => {
  it("control: the real translator resolves the four-row array", async () => {
    serverWiring.messages = copyMessages();
    const { createTranslator } = await import("next-intl");
    const t = createTranslator({
      locale: "en",
      namespace: "pages.pricing" as never,
      messages: serverWiring.messages as never,
    });
    const raw = (t as unknown as { raw: (key: string) => unknown }).raw(
      "subjects.rows",
    );
    expect(Array.isArray(raw), "raw rows: array").toBe(true);
    expect((raw as unknown[]).length, "raw rows: 4").toBe(4);
  });

  it("control: the omitted-rows fixture lacks subjects.rows", () => {
    const subjects = (messagesWithoutRows() as PricingMessages).pages.pricing
      .subjects as unknown as Record<string, unknown>;
    expect("rows" in subjects, "rows key: absent").toBe(false);
  });
});

describe("RA4: omitted rows do not render a silent empty table", () => {
  it("rejects omitted rows instead of resolving to zero rows", async () => {
    serverWiring.messages = messagesWithoutRows();
    await expect(PricingPage()).rejects.toThrow();
  });
});

describe("RA4: invalid rows do not render a silent empty table", () => {
  it("rejects string rows instead of resolving to zero rows", async () => {
    serverWiring.messages = messagesWithRows("one price fits all");
    await expect(PricingPage()).rejects.toThrow();
  });

  it("rejects object rows instead of resolving to zero rows", async () => {
    serverWiring.messages = messagesWithRows({
      label: "1 subject",
      cells: ["1 subject", "1,200 baht", "1,200 baht"],
    });
    await expect(PricingPage()).rejects.toThrow();
  });
});

describe("RA4 regression: valid arrays still drive the table", () => {
  it("renders three rows from a three-row array", async () => {
    serverWiring.messages = messagesWithRowCount(3);
    render(await PricingPage());
    const rows = document.querySelectorAll(
      '[data-testid="subject-price-table"] tbody tr',
    );
    expect(rows.length, "rendered rows: 3").toBe(3);
  });

  it("renders four rows from a four-row array", async () => {
    serverWiring.messages = copyMessages();
    render(await PricingPage());
    const rows = document.querySelectorAll(
      '[data-testid="subject-price-table"] tbody tr',
    );
    expect(rows.length, "rendered rows: 4").toBe(4);
  });
});
