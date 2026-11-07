// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 2: a part tile whose part the week does not have (finding F149).
 *
 * The week contract needs one read-along book and one decodable book on a published week, but
 * the song stays optional. The page still builds the three entry tiles, and the end of the
 * book shows them, so a child can open `?part=song` on a week without a song. The part screen
 * must then offer a control to leave the screen; the F149 rationale says a screen with no
 * control is the defect.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import shippedWeek from "../content/l2/w01.json";

const routeMocks = vi.hoisted(() => ({ loadVisibleWeek: vi.fn() }));
vi.mock("../lib/content", () => ({ loadVisibleWeek: routeMocks.loadVisibleWeek }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale?: string }) => (key: string) => `${locale ?? "en"}:${key}`,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("unexpected notFound");
  },
}));

vi.mock("../lib/auth", () => ({
  // The login of task 2b.4 needs a session. The page runs with a signed-in family account, so
  // the content assertions of this test stay unchanged.
  requireUser: async () => ({ id: "account-1", username: "staff-01", role: "family" }),
}));

import StorytimeWeekPage from "../app/[locale]/st/[level]/[week]/page";

afterEach(() => {
  cleanup();
  routeMocks.loadVisibleWeek.mockReset();
});

describe("Phase 3 adversarial part screen without its content", () => {
  // F242: the song section of a week without a song renders empty, so the child who follows
  // the end-of-book tile has no control on that screen.
  it("offers a control on the song part of a week that has no song", async () => {
    const week = structuredClone(shippedWeek) as unknown as StorytimeWeek;
    delete week.song;
    routeMocks.loadVisibleWeek.mockResolvedValue(week);
    const element = await StorytimeWeekPage({
      params: Promise.resolve({ locale: "en", level: "2", week: "1" }),
      searchParams: Promise.resolve({ part: "song" }),
    });
    const view = render(element);
    const section = view.container.querySelector<HTMLElement>('[data-part="song"]');
    expect(section, "the page must render the song part section").toBeTruthy();
    expect(
      section!.querySelector("a, button"),
      "a part screen without its content must still offer a control to leave (F149)",
    ).not.toBeNull();
  });
});
