/**
 * AC-23 (Phase 3, review round 1, C-P3-1): the page supplies a value for every
 * placeholder it requests. The translator here resolves the real dictionary and
 * records each message that holds a `{placeholder}` with no value for it.
 * The check fails when the page requests `calculator.graph.legBar` ("Leg {n}")
 * without the `n` value, as design-rules rule 11 requires. No case reads
 * production source as text and no case computes a hash.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getScopedI18n } from "@/locales/server";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

type Dict = Record<string, unknown>;
const REAL: Record<string, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

const LOCALES = ["en", "th", "zh"] as const;
type Locale = (typeof LOCALES)[number];

/** One message that held a placeholder without a value. */
type MissingPlaceholder = { key: string; name: string };

/** What the translator saw during one render. */
type Trace = {
  /** Messages that held at least one placeholder. */
  checked: string[];
  /** Placeholders the page requested without a value. */
  missing: MissingPlaceholder[];
};

/** Matches one `{placeholder}` token in a message. */
const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** Resolves a scope-relative dotted key against one real dictionary. */
function resolve(dict: Dict, key: string): string {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur == null || typeof cur !== "object") return key;
    cur = (cur as Dict)[part];
  }
  return typeof cur === "string" ? cur : key;
}

/** Restores the key-path mock of `src/test/setup.ts` after each case. */
function restoreMock(): void {
  vi.mocked(getScopedI18n).mockImplementation((scope) => {
    const translator = ((key: string) =>
      key.endsWith(".image")
        ? "/images/placeholder.png"
        : `${String(scope)}.${key}`) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });
}

/** Renders the page with the real dictionary and records placeholder calls. */
async function renderPage(locale: Locale): Promise<Trace> {
  const dict = REAL[locale]!;
  const trace: Trace = { checked: [], missing: [] };

  vi.mocked(getScopedI18n).mockImplementation(() => {
    const translator = ((
      key: string,
      values?: Record<string, unknown>,
    ) => {
      if (key.endsWith(".image")) return "/images/placeholder.png";
      const message = resolve(dict, key);
      const names = Array.from(message.matchAll(PLACEHOLDER), (match) => match[1]!);
      if (names.length > 0) trace.checked.push(key);
      for (const name of names) {
        if (values == null || values[name] == null) {
          trace.missing.push({ key, name });
        }
      }
      return message;
    }) as Awaited<ReturnType<typeof getScopedI18n>>;

    return Promise.resolve(translator);
  });

  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale }) });
  render(jsx);
  return trace;
}

afterEach(() => {
  cleanup();
  restoreMock();
});

describe("AC-23: every requested placeholder has a value", () => {
  for (const locale of LOCALES) {
    it(`${locale}: renders with no string missing a placeholder value`, async () => {
      const trace = await renderPage(locale);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(
        trace.checked,
        `${locale}: the legBar string with its placeholder was examined`,
      ).toContain("calculator.graph.legBar");
      expect(
        trace.missing.map((item) => `${item.key}: {${item.name}}`),
        `${locale}: messages with a missing placeholder value`,
      ).toEqual([]);
    });
  }
});
