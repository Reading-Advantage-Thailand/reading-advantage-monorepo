// @vitest-environment jsdom
/**
 * Finding F151 (UX3): the decodable sentence read "A NEST ." with a space before the full
 * stop.
 *
 * Cause: the sentence is a `flex flex-wrap gap-x-1` row, and the punctuation token was its
 * own flex item, so the flex gap opened a space between the word and the stop. The week
 * content is correct (`A nest.`). The fix groups a word with its trailing punctuation in one
 * flex item, so the stop sits next to its word and a line break cannot start a line with a
 * stop. The 44 px tap floor and the word gaps stay.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const week = JSON.parse(readFileSync(resolve(appDir, "content/l2/w01.json"), "utf8")) as {
  books: Array<{ kind: string }>;
};

afterEach(() => {
  cleanup();
});

describe("the decodable keeps the full stop next to its word (finding F151)", () => {
  it("renders the stop in the same flex item as its word button", async () => {
    const { StorytimeDecodable } = await import("../app/[locale]/st/[level]/[week]/decodable");
    const view = render(<StorytimeDecodable week={week as never} locale="en" />);
    const sentence = [...view.container.querySelectorAll("p")].find((element) =>
      (element.textContent ?? "").toUpperCase().includes("NEST"),
    );
    expect(sentence, "the shipped w01 decodable page one holds the word nest").toBeTruthy();
    const button = [...sentence!.querySelectorAll("button")].find(
      (element) => element.textContent === "nest",
    );
    expect(button, "the word nest is a tappable button").toBeTruthy();
    const dot = [...sentence!.querySelectorAll("span")].find((element) => element.textContent === ".");
    expect(dot, "the full stop is one span").toBeTruthy();
    const group = dot!.parentElement;
    expect(
      group,
      "the stop shares one flex item with its word (finding F151)",
    ).toBe(button!.parentElement);
    expect(group!.querySelectorAll("button"), "the group holds only its own word").toHaveLength(1);
    expect(group!.textContent, "the group reads as the word and its stop, with no gap").toBe("nest.");
  });
});
