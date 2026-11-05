// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("../i18n/routing", () => ({ routing: { locales: ["th", "en"] } }));
vi.mock("next-intl", () => ({ hasLocale: (locales: string[], locale: string) => locales.includes(locale) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => async (key: string) => key }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("unexpected notFound"); } }));

import StorytimeWeekPage from "../app/[locale]/st/[level]/[week]/page";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const content = resolve(app, "content/l2");
const route = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");

describe("printed Storytime URLs (AC-2.2)", () => {
  beforeAll(() => {
    routeMocks.loadVisibleWeek.mockImplementation(async (level: number, week: number) =>
      JSON.parse(readFileSync(resolve(content, `w${String(week).padStart(2, "0")}.json`), "utf8")),
    );
  });

  it("keeps every shipped home URL relative, week-local, and accepted by the route", async () => {
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const weekNumber = index + 1;
      const file = resolve(content, `w${String(weekNumber).padStart(2, "0")}.json`);
      expect(existsSync(file), `Missing shipped week: ${file}`).toBe(true);
      return { file, weekNumber, week: JSON.parse(readFileSync(file, "utf8")) };
    });
    expect(weeks).toHaveLength(8);
    expect(existsSync(route), "Missing route /<locale>/st/<level>/<week>").toBe(true);

    let urlsChecked = 0;
    for (const { file, weekNumber, week } of weeks) {
      const expectedPrefix = `/th/st/${week.meta.level}/${week.meta.week}`;
      expect(week.meta.week, `${file}: own week`).toBe(weekNumber);
      for (const [field, url] of [
        ["home.songUrl", week.home.songUrl],
        ["home.readAlongUrl", week.home.readAlongUrl],
      ] as const) {
        expect(url, `${file}: ${field} exists`).toBeTruthy();
        const parsed = new URL(url, "https://storytime.invalid");
        expect(url, `${file}: ${field} is a relative path`).toMatch(/^\/(?!\/)[^?#]+(?:\?[^#]*)?$/);
        expect(parsed.origin, `${file}: ${field} has no external host`).toBe("https://storytime.invalid");
        expect(parsed.pathname, `${file}: ${field} uses its own level and week`).toBe(expectedPrefix);
        const part = parsed.searchParams.get("part");
        expect(
          part === null || ["book", "decodable", "song"].includes(part),
          `${file}: ${field} uses an allowed part or no part`,
        ).toBe(true);
        expect(parsed.searchParams.getAll("part"), `${file}: ${field} has one part value at most`).toHaveLength(part === null ? 0 : 1);
        const routeResult = StorytimeWeekPage({
          params: Promise.resolve({
            locale: parsed.pathname.split("/")[1],
            level: parsed.pathname.split("/")[3],
            week: parsed.pathname.split("/")[4],
          }),
          searchParams: Promise.resolve(Object.fromEntries(parsed.searchParams.entries())),
        });
        expect(routeResult, `${file}: ${field} is accepted by the app route`).toBeInstanceOf(Promise);
        await routeResult;
        expect(routeMocks.loadVisibleWeek).toHaveBeenLastCalledWith(week.meta.level, week.meta.week);
        urlsChecked += 1;
      }
    }
    console.log(`urls_checked=${urlsChecked}`);
    expect(urlsChecked, "All eight weeks must contribute both printed URLs").toBeGreaterThanOrEqual(15);
  });
});
