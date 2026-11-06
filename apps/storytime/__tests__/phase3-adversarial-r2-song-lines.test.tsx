// @vitest-environment jsdom
/**
 * Phase 3 adversarial round 2: a song line that carries no picture reference (amendment M-3).
 *
 * The lyric list shows text only, so a line without `image` and a line whose `imageOf` points
 * past the end of the list must render like every other line. Both shapes are valid under the
 * week contract: `image` is optional and `imageOf` has no upper bound.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorytimeWeek } from "../lib/contracts/week";
import shippedWeek from "../content/l2/w01.json";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Phase 3 adversarial song lines without a picture", () => {
  it("renders a line with neither image nor imageOf and an imageOf past the end", async () => {
    const week = structuredClone(shippedWeek) as unknown as StorytimeWeek;
    const lines = week.song!.lines;
    lines[0] = { ...lines[0]!, image: undefined, imageOf: undefined };
    lines[1] = { ...lines[1]!, image: undefined, imageOf: 99 };
    const { StorytimeSong } = await import("../app/[locale]/st/[level]/[week]/song");
    const view = render(<StorytimeSong song={week.song!} />);
    const list = view.container.querySelector("ol");
    expect(list, "the song view must render its lyric list").not.toBeNull();
    const rendered = list!.querySelectorAll("[data-line-index]");
    expect(rendered, "every shipped line must render").toHaveLength(lines.length);
    for (const [index, line] of lines.entries()) {
      const item = view.container.querySelector<HTMLElement>(`[data-line-index="${index}"]`)!;
      expect(item, `lyric line ${index} must render`).toBeInTheDocument();
      expect(within(item).getByText(line.text)).toBeInTheDocument();
      expect(within(item).getByText(line.gesture)).toBeInTheDocument();
      expect(
        item.querySelectorAll("img"),
        `lyric line ${index} must hold no picture`,
      ).toHaveLength(0);
    }
    expect(list!.querySelector("img"), "the lyric list must hold no picture").toBeNull();
  });
});
