/**
 * Follow-up adversarial pins for tutor images under calculator presets
 * (track www_tutor_followups_20261118).
 *
 * page.images.test.tsx pins distinct files on first paint and
 * page.phase3.adversarial.test.tsx pins the full D-19 order on first paint.
 * Neither clicks a calculator preset before reading images. This file fills
 * that gap: every locale keeps distinct content files after each preset.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { getScopedI18n } from "@/locales/server";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

const LOCALES = ["en", "th", "zh"] as const;
type Locale = (typeof LOCALES)[number];
type Dict = Record<string, unknown>;

const DICTS: Record<Locale, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

const makeTranslator = createTranslator as unknown as (config: {
  locale: string;
  messages: Dict;
  namespace: string;
  onError: (error: { code: string; message: string }) => void;
}) => (key: string, values?: Record<string, unknown>) => string;

/** Reads one string from a real dictionary by dotted path. */
function text(locale: Locale, path: string): string {
  let current: unknown = DICTS[locale];
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") throw new Error(`missing ${path}`);
    current = (current as Dict)[part];
  }
  if (typeof current !== "string") throw new Error(`not text: ${path}`);
  return current;
}

/** Renders the page through the real message engine. */
async function renderPage(locale: Locale): Promise<void> {
  vi.mocked(getScopedI18n).mockImplementation(((scope: string) => {
    const base = makeTranslator({
      locale,
      messages: { pages: { products: { tutorAdvantage: DICTS[locale] } } },
      namespace: scope,
      onError: () => {},
    });
    return Promise.resolve(base);
  }) as never);
  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale }) });
  render(jsx);
}

afterEach(() => {
  cleanup();
  vi.mocked(getScopedI18n).mockImplementation((scope) => {
    const translator = ((key: string) =>
      key.endsWith(".image")
        ? "/images/placeholder.png"
        : `${String(scope)}.${key}`) as Awaited<ReturnType<typeof getScopedI18n>>;
    return Promise.resolve(translator);
  });
});

/** Lists content image files in DOM order, outside brand logos. */
function contentFiles(): string[] {
  return Array.from(document.querySelectorAll("img"))
    .map((img) => {
      const src = img.getAttribute("src") ?? "";
      return new URL(src, "http://localhost").searchParams.get("url") ?? src;
    })
    .filter((file) => file !== "" && !file.startsWith("/media/brand/"));
}

/** Returns the duplicate files of a list. */
function duplicates(files: string[]): string[] {
  return files.filter((file, index) => files.indexOf(file) !== index);
}

const presetName = (locale: Locale, index: number) =>
  text(locale, `calculator.presets.${index}.name`);

/** Finds the one calculator button with the given visible text. */
function buttonNamed(label: string): HTMLElement {
  const section = document.querySelector("[data-testid='tutor-calculator']");
  if (!section) throw new Error("no calculator section");
  const found = Array.from(section.querySelectorAll("button")).filter(
    (node) => (node.textContent ?? "").trim() === label,
  );
  if (found.length !== 1) throw new Error(`${found.length} buttons read ${label}`);
  return found[0]!;
}

describe("followups: no content image shares a file after any preset", () => {
  it("control: the duplicate check fires on a shared file", () => {
    expect(duplicates(["/a.webp", "/a.webp", "/b.webp"])).toEqual(["/a.webp"]);
    expect(duplicates(["/a.webp", "/b.webp"])).toEqual([]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: content files stay distinct after each preset`, async () => {
      await renderPage(locale);
      const first = contentFiles();
      expect(first.length).toBeGreaterThan(10);
      expect(duplicates(first)).toEqual([]);
      expect(first).toContain("/images/tutor-advantage-hero-2026-11-06.webp");
      expect(first).toContain("/images/tutor-advantage-teach-class.webp");

      for (let index = 0; index < 3; index += 1) {
        fireEvent.click(buttonNamed(presetName(locale, index)));
        const files = contentFiles();
        expect(files.length, `${locale} preset ${index + 1} image count`).toBe(first.length);
        expect(duplicates(files), `${locale} preset ${index + 1} shares`).toEqual([]);
        expect(files).toContain("/images/tutor-advantage-hero-2026-11-06.webp");
        expect(files).toContain("/images/tutor-advantage-teach-class.webp");
      }
    });
  }
});
