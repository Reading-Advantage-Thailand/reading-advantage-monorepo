// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";

const app = resolve(import.meta.dirname, "..");
const english = JSON.parse(readFileSync(resolve(app, "messages/en.json"), "utf8")) as Record<string, string>;
const thai = JSON.parse(readFileSync(resolve(app, "messages/th.json"), "utf8")) as Record<string, string>;

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => english[key] ?? key,
}));

afterEach(() => {
  cleanup();
});

describe("Phase 3 not-found view (finding F136)", () => {
  it("renders the not-found view with a non-empty lang and both languages", async () => {
    const modulePath = "../app/[locale]/not-found";
    let NotFound: () => Promise<{ type: unknown; props: unknown }>;
    try {
      NotFound = (await import(/* @vite-ignore */ modulePath)).default;
    } catch (error) {
      expect(error, "Storytime must provide the not-found view").toBeUndefined();
      throw error;
    }
    const element = await NotFound();
    render(element);
    const thaiLine = screen.getByText(thai.notFoundThai);
    const englishLine = screen.getByText(english.notFoundEnglish);
    expect(thaiLine).toHaveAttribute("lang", "th");
    expect(englishLine).toHaveAttribute("lang", "en");
    expect(thaiLine.textContent?.trim().length, "the Thai 404 text must not be empty").toBeGreaterThan(0);
    expect(englishLine.textContent?.trim().length, "the English 404 text must not be empty").toBeGreaterThan(0);
    // The message files hold the same 404 values in both locales, so the view shows both
    // languages under every locale.
    expect(thai.notFoundThai).toBe(english.notFoundThai);
    expect(thai.notFoundEnglish).toBe(english.notFoundEnglish);
  });
});
