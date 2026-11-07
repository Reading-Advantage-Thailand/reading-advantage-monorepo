// @vitest-environment jsdom
/**
 * Task 1.6: the decodable week card reads "Read the words" (AC-1.7; plan 1.6).
 *
 * The English label `tileDecodable` changes from "Decodable" to "Read the words"; the Thai label
 * stays "อ่านคำ". The JSON case fails at the base, and so does the live week page render, because
 * both read the shipped English message. The Thai case is the named characterization.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";

const app = resolve(import.meta.dirname, "..");
const englishSource = readFileSync(resolve(app, "messages/en.json"), "utf8");
const thaiSource = readFileSync(resolve(app, "messages/th.json"), "utf8");
const english = JSON.parse(englishSource) as Record<string, string>;
const thai = JSON.parse(thaiSource) as Record<string, string>;
const shipped = JSON.parse(readFileSync(resolve(app, "content/l2/w01.json"), "utf8")) as StorytimeWeek;

const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale?: string } = {}) =>
    (key: string) => (locale === "th" ? thai[key] : english[key]) ?? key,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("unexpected notFound");
  },
}));

// The page signs the media of the week after the session check (login task 2b.6). The mock gives
// an empty signed map, because this file reads only the card label.
vi.mock("../lib/media/sign", () => ({
  signWeekMedia: async () => ({}),
}));

vi.mock("../lib/auth", () => ({
  // The login of task 2b.4 needs a session. This file belongs to the look track, so its
  // expectation stays unchanged: the page runs with a signed-in family account.
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));

import StorytimeWeekPage from "../app/[locale]/st/[level]/[week]/page";

afterEach(() => {
  cleanup();
  routeMocks.loadVisibleWeek.mockReset();
});

describe("Task 1.6 week card label (AC-1.7)", () => {
  it("sets the English decodable label to Read the words and drops the old word", () => {
    expect(
      english.tileDecodable,
      'the English decodable tile label must read "Read the words"',
    ).toBe("Read the words");
    expect(englishSource, 'messages/en.json must hold no "Decodable" value').not.toContain('"Decodable"');
    expect(thaiSource, 'messages/th.json must hold no "Decodable" value').not.toContain('"Decodable"');
  });

  it("keeps the Thai decodable label as อ่านคำ", () => {
    // Named characterization: the Thai label does not change.
    expect(thai.tileDecodable, "the Thai decodable tile label must stay อ่านคำ").toBe("อ่านคำ");
  });

  it("renders the live week page with the new decodable card label", async () => {
    routeMocks.loadVisibleWeek.mockResolvedValue(structuredClone(shipped));
    const element = await StorytimeWeekPage({
      params: Promise.resolve({ locale: "en", level: "2", week: "1" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(element);

    const cards = [...container.querySelectorAll("[data-week-tiles] > li")];
    expect(cards.length, "the week page must render the three cards").toBeGreaterThanOrEqual(2);
    const decodableCard = cards[1];
    expect(decodableCard, "the decodable card must be the second card").toBeTruthy();
    const link = decodableCard!.querySelector("a");
    expect(link, "the decodable card must hold its link").not.toBeNull();
    expect(link!.textContent, 'the decodable card must read "Read the words"').toBe("Read the words");
    const hits = (container.textContent ?? "").split("Decodable").length - 1;
    expect(`decodable_label_hits=${hits}`).toBe("decodable_label_hits=0");
  });
});
