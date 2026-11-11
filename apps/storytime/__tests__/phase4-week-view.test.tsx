// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
// The media of a week comes from the signed map of the page. The mock keeps the old URL of the
// test, so the assertion of this file stays unchanged.
vi.mock("../lib/media/url", () => ({
  mediaUrl: (_mediaUrls: Record<string, string>, file: string) =>
    `https://storage.googleapis.com/storytime-app-media/${file}`,
}));

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import weekJson from "../content/l2/w01.json";
import { weekSchema, type StorytimeWeek } from "../lib/contracts/week";

/**
 * The Red tests of the teacher week view (plan task 4.2, AC-9.1).
 *
 * The route `/<locale>/teacher/<level>/<week>` renders the week view for the teacher with the
 * server-side flag `STORYTIME_TEACHER_ROUTES` on. Every item of the view comes from the shipped
 * milestone week `apps/storytime/content/l2/w01.json`, never from a hard-coded string: the title,
 * the element with its sound, the phonemic awareness skill, the tricky words, the frame, the
 * family words with their pictures, the five lessons by day, and the three materials.
 *
 * The F21 default of the three materials (A-48 paper map, B-activity-design.md section 1): the
 * student book (`print`), the read-along `books[0]` ("Hello!"), and the decodable `books[1]`
 * ("Nan Can Nod").
 *
 * The shipped family pictures hold no file yet, so a family picture shows as an element with its
 * caption as the accessible name: an `<img alt="{caption}">` or a `role="img"` element with
 * `aria-label="{caption}"`.
 *
 * Green builds to this contract: the client view lives at
 * `app/[locale]/teacher/[level]/[week]/week-view.tsx` and exports `TeacherWeekView` with the
 * props `{ week, locale }`. The server page of task 4.1 renders it behind the flag.
 */

/** The name of the teacher route flag. */
const FLAG_ENV = "STORYTIME_TEACHER_ROUTES";

/** The shipped milestone week, parsed with the app contract. */
const week = weekSchema.parse(weekJson) as StorytimeWeek;

/** The print part of a week, as the shipped file holds it. */
interface PrintShape {
  print?: { letterBox?: { letter?: string } };
}

/** Loads the teacher week view and reports a missing implementation as an assertion. */
async function loadWeekView() {
  const modulePath = "../app/[locale]/teacher/[level]/[week]/week-view";
  try {
    return (await import(/* @vite-ignore */ modulePath)).TeacherWeekView;
  } catch (error) {
    expect(
      error,
      "Storytime must add the teacher week view at app/[locale]/teacher/[level]/[week]/week-view.tsx exporting TeacherWeekView",
    ).toBeUndefined();
    throw error;
  }
}

/** Renders the week view for one week with the flag on. */
async function renderWeekView(source: StorytimeWeek) {
  const TeacherWeekView = await loadWeekView();
  return render(<TeacherWeekView week={source} locale="en" />);
}

beforeEach(() => {
  process.env[FLAG_ENV] = "1";
});

afterEach(() => {
  cleanup();
  delete process.env[FLAG_ENV];
});

describe("Phase 4 teacher week view (AC-9.1)", () => {
  it("renders the title, the element with its sound, and the phonemic awareness skill", async () => {
    const { container } = await renderWeekView(week);
    const element = week.focus.element;
    expect(element, "the shipped week must hold the element of the week").toBeDefined();
    const paSkill = week.focus.paSkill;
    expect(paSkill, "the shipped week must hold the phonemic awareness skill").toBeDefined();

    expect(
      screen.getAllByText(week.meta.title).length,
      "the week view must show the title of the week",
    ).toBeGreaterThan(0);
    expect(container.textContent).toContain(element!.graphemes.join(" "));
    expect(container.textContent).toContain(element!.sound);
    expect(container.textContent).toContain(paSkill!.en);

    const recordings = Array.from(container.querySelectorAll("audio"));
    expect(
      recordings.some((node) => (node.getAttribute("src") ?? "").includes(element!.audio ?? "")),
      `the week view must offer the recorded sound ${element!.audio} of the element`,
    ).toBe(true);
  });

  it("renders each tricky word and the frame from the week", async () => {
    const { container } = await renderWeekView(week);
    expect(week.focus.trickyWords.length, "the shipped week must hold tricky words").toBeGreaterThan(
      0,
    );
    for (const word of week.focus.trickyWords) {
      expect(
        screen.getAllByText(word, { exact: true }).length,
        `the week view must show the tricky word ${word}`,
      ).toBeGreaterThan(0);
    }
    expect(container.textContent).toContain(week.focus.frame ?? "");
  });

  it("renders each family word with its picture", async () => {
    await renderWeekView(week);
    const family = week.focus.family;
    expect(family, "the shipped week must hold the family words").toBeDefined();
    expect(family!.words.length, "the shipped week must hold family words").toBeGreaterThan(0);
    for (const entry of family!.words) {
      expect(
        screen.getAllByText(entry.word, { exact: true }).length,
        `the week view must show the family word ${entry.word}`,
      ).toBeGreaterThan(0);
      const caption = entry.image?.caption ?? "";
      expect(
        screen.getAllByRole("img", { name: caption }).length,
        `the family word ${entry.word} must show its picture with the caption ${caption} as its name`,
      ).toBeGreaterThan(0);
    }
  });

  it("lists the five lessons by day, each with a link to the lesson flow", async () => {
    const { container } = await renderWeekView(week);
    expect(week.scripts, "the shipped week must hold exactly five lessons (A4)").toHaveLength(5);
    const hrefs = Array.from(container.querySelectorAll("a[href]")).map((node) =>
      node.getAttribute("href"),
    );
    expect(hrefs.length, "the week view must link to the lesson flow").toBeGreaterThan(0);
    for (const script of week.scripts) {
      expect(script.steps.length, `day ${script.day} must hold at least one step`).toBeGreaterThan(
        0,
      );
      expect(
        screen.getAllByText(script.title.en).length,
        `the week view must list the lesson of day ${script.day} with its title`,
      ).toBeGreaterThan(0);
      expect(
        hrefs.some((href) => !!href && href.includes("/teacher/") && href.endsWith(`/${script.day}`)),
        `the week view must link day ${script.day} to its lesson flow`,
      ).toBe(true);
    }
  });

  it("lists the three materials: the student book, the read-along, and the decodable", async () => {
    const { container } = await renderWeekView(week);
    const print = (week as unknown as PrintShape).print;
    expect(print?.letterBox?.letter, "the shipped week must hold the print part").toBeDefined();
    const readAlong = week.books.find((book) => book.kind === "readalong");
    const decodable = week.books.find((book) => book.kind === "decodable");
    expect(readAlong, "the shipped week must hold the read-along book").toBeDefined();
    expect(decodable, "the shipped week must hold the decodable book").toBeDefined();

    const materialsExpected = 3;
    const present = [print!.letterBox!.letter!, readAlong!.title, decodable!.title].filter((value) =>
      container.textContent?.includes(value),
    );
    expect(
      present.length,
      `materials_checked: the week view must show all ${materialsExpected} materials (the ` +
        `student book, the read-along ${readAlong!.title}, and the decodable ${decodable!.title})`,
    ).toBe(materialsExpected);
  });

  it("takes every item from the shipped file, never a hard-coded string", async () => {
    const cases: Array<{ label: string; make: () => StorytimeWeek; marker: string }> = [
      {
        label: "the title",
        make: () => {
          const copy = structuredClone(week);
          copy.meta.title = "ZZZ Unique Week Title ZZZ";
          return copy;
        },
        marker: "ZZZ Unique Week Title ZZZ",
      },
      {
        label: "the frame",
        make: () => {
          const copy = structuredClone(week);
          copy.focus.frame = "ZZZ unique frame ZZZ.";
          return copy;
        },
        marker: "ZZZ unique frame ZZZ.",
      },
      {
        label: "a tricky word",
        make: () => {
          const copy = structuredClone(week);
          copy.focus.trickyWords[0] = "zztrickyword";
          return copy;
        },
        marker: "zztrickyword",
      },
      {
        label: "a family word with its picture caption",
        make: () => {
          const copy = structuredClone(week);
          const entry = copy.focus.family!.words[0];
          entry.word = "zzfamilyword";
          if (entry.image) entry.image.caption = "zzfamilyword";
          return copy;
        },
        marker: "zzfamilyword",
      },
      {
        label: "a lesson title",
        make: () => {
          const copy = structuredClone(week);
          copy.scripts[1].title.en = "ZZZ Unique Day Two ZZZ";
          return copy;
        },
        marker: "ZZZ Unique Day Two ZZZ",
      },
      {
        label: "the decodable material title",
        make: () => {
          const copy = structuredClone(week);
          const book = copy.books.find((entry) => entry.kind === "decodable")!;
          book.title = "ZZZ Unique Decodable ZZZ";
          return copy;
        },
        marker: "ZZZ Unique Decodable ZZZ",
      },
      {
        label: "the read-along material title",
        make: () => {
          const copy = structuredClone(week);
          const book = copy.books.find((entry) => entry.kind === "readalong")!;
          book.title = "ZZZ Unique Read-Along ZZZ";
          return copy;
        },
        marker: "ZZZ Unique Read-Along ZZZ",
      },
      {
        label: "the student book letter of the print part",
        make: () => {
          const copy = structuredClone(week) as unknown as PrintShape;
          copy.print!.letterBox!.letter = "QQ";
          return copy as unknown as StorytimeWeek;
        },
        marker: "QQ",
      },
    ];

    for (const testCase of cases) {
      const { container, unmount } = await renderWeekView(testCase.make());
      expect(
        container.textContent,
        `the week view must take ${testCase.label} from the week data`,
      ).toContain(testCase.marker);
      unmount();
    }
  });
});

describe("Phase 4 teacher week view: the control floor and the language marks (F603, F605)", () => {
  it("holds min-h-11 on every Open the lesson link (F603)", async () => {
    const { container } = await renderWeekView(week);
    const links = Array.from(container.querySelectorAll("a")).filter((node) =>
      node.textContent?.includes("Open the lesson"),
    );
    expect(
      links.length,
      `lesson_links=${links.length}: the shipped week must hold one link per day`,
    ).toBe(week.scripts.length);
    for (const node of links) {
      expect(
        node.className.includes("min-h-11"),
        `link_classes=${node.className}: each Open the lesson link must hold min-h-11 (F603)`,
      ).toBe(true);
    }
  });

  it("marks every English text element of the week view with lang=en (F605)", async () => {
    const { container } = await renderWeekView(week);
    // The 16 English text elements that the UX role named (ux-browser-p4-e24a1f06c, F605):
    // the level line, the seven section headings, the five lesson links, and the three
    // material labels.
    const levelLine = container.querySelector("main > header > p");
    expect(levelLine?.textContent).toContain(`Level ${week.meta.level}, week ${week.meta.week}`);
    const sectionNames = [
      "The element of the week",
      "The phonemic awareness skill",
      "The tricky words",
      "The frame",
      "The family words",
      "The five lessons",
      "The three materials",
    ];
    const checked: Array<[Element | null, string]> = [
      [levelLine, "the level line"],
      ...sectionNames.map(
        (name) =>
          [
            container.querySelector(`section[aria-label="${name}"] > h2`),
            `the heading of ${name}`,
          ] as [Element | null, string],
      ),
      ...Array.from(
        container.querySelectorAll('section[aria-label="The five lessons"] a'),
      ).map((node) => [node, `the link ${node.textContent}`] as [Element, string]),
      ...["The student book", "The read-along", "The decodable"].map(
        (label) =>
          [
            Array.from(container.querySelectorAll("span")).find(
              (node) => node.textContent === label,
            ) ?? null,
            `the material label ${label}`,
          ] as [Element | null, string],
      ),
    ];
    expect(checked.length, `english_elements=${checked.length}`).toBe(16);
    for (const [node, label] of checked) {
      expect(node, `the week view must render ${label}`).not.toBeNull();
      expect(
        node!.getAttribute("lang"),
        `lang=${node!.getAttribute("lang")}: ${label} must hold lang=en (F605)`,
      ).toBe("en");
    }
  });
});
