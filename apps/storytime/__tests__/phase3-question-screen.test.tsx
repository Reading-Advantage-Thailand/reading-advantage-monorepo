// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import week from "../content/l2/w01.json";
import { weekSchema } from "../lib/contracts/week";

/**
 * The Red tests of the question screen of the at-home read-along (plan task 3.9, AC-13.6).
 *
 * The screen does not exist yet. The tests name the modules and the exports that Green adds:
 * the rule module `apps/storytime/lib/questions.ts` and the client component
 * `apps/storytime/app/[locale]/st/[level]/[week]/questions.tsx`. A test that needs the rule
 * module fails with the message that names the missing module. A test of the screen fails with
 * the message that names the missing screen.
 *
 * The tests read the shipped week and never the words of the shipped questions. The week data
 * changes in a later fix batch, so every expectation comes from the data of the loaded week.
 */

const app = resolve(import.meta.dirname, "..");
const routePath = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");
const route = readFileSync(routePath, "utf8");

/** One question of a read-along book, as the week data holds it. */
interface Question {
  kind: string;
  ask: { en: string; th: string };
  answer: { page: number; word: string };
}

/** One page of a book, as the week data holds it. */
interface Page {
  text: string;
  image?: { file?: string; caption?: string };
}

/** One book of a week, as the week data holds it. */
interface Book {
  kind: string;
  pages: Page[];
  questions?: Question[];
}

/** The parts of a week that the question screen reads. */
interface WeekShape {
  meta: { level: number; week: number; key: string; status: string };
  books: Book[];
  approval?: Record<string, { status: string; date?: string; words?: string } | undefined>;
}

/** The labels of the reader controls. */
const readerLabels = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "Sound could not be played",
  finished: "Book finished",
};

/** The labels of the question screen. */
const questionLabels = {
  skip: "Skip",
  right: "Yes",
  gentle: "Try again",
};

/** The date of an approved loops part in a test copy. */
const approvalDate = "2026-11-04";

/** The approval words of an approved loops part in a test copy. */
const approvalWords = '"Loops approved" (2026-11-04)';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Creates a copy of the shipped week and leaves the shipped file alone. */
function weekCopy(source = week): WeekShape {
  return structuredClone(source) as unknown as WeekShape;
}

/** Creates a copy of the shipped week with an approved loops part. */
function approvedWeek(source = week): WeekShape {
  const copy = weekCopy(source);
  const loops = { status: "approved", date: approvalDate, words: approvalWords };
  const approval = { ...(copy.approval ?? {}) };
  approval.loops = loops;
  copy.approval = approval;
  return copy;
}

/** Reads the read-along book of a week copy. */
function readAlongBook(copy: WeekShape): Book {
  const book = copy.books.find((entry) => entry.kind === "readalong");
  expect(book, "the shipped week must include a read-along book").toBeDefined();
  return book as Book;
}

/** Reads the questions of the read-along book of a week copy. */
function readAlongQuestions(copy: WeekShape): Question[] {
  const questions = readAlongBook(copy).questions ?? [];
  expect(questions.length, "the shipped week must hold the questions of the read-along book").toBeGreaterThan(
    0,
  );
  return questions;
}

/** Lists the distinct answer pages of the questions, in book order. */
function answerPages(questions: Question[]): number[] {
  return [...new Set(questions.map((question) => question.answer.page))].sort(
    (left, right) => left - right,
  );
}

/** Builds the three entry tiles of the week page from the week data. */
function buildTiles(copy: WeekShape) {
  const book = (kind: string) => copy.books.find((entry) => entry.kind === kind);
  const readalong = book("readalong");
  const decodable = book("decodable");
  return [
    {
      id: "readalong",
      href: "?part=book",
      label: "Read-along",
      pictureFile: readalong?.pages[0]?.image?.file,
      pictureAlt: "",
    },
    {
      id: "decodable",
      href: "?part=decodable",
      label: "Decodable",
      pictureFile: decodable?.pages[0]?.image?.file,
      pictureAlt: "",
    },
    { id: "song", href: "?part=song", label: "Song" },
  ];
}

/** Loads the question rule module and reports a missing implementation as an assertion. */
async function loadRule() {
  const modulePath = "../lib/questions";
  try {
    return await import(/* @vite-ignore */ modulePath);
  } catch (error) {
    expect(
      error,
      "Storytime must add the question rule module at apps/storytime/lib/questions.ts",
    ).toBeUndefined();
    throw error;
  }
}

/** Loads the client reader and reports a missing implementation as an assertion. */
async function loadReader() {
  const modulePath = "../app/[locale]/st/[level]/[week]/reader";
  try {
    return (await import(/* @vite-ignore */ modulePath)).StorytimeReader;
  } catch (error) {
    expect(error, "Storytime must keep the client reader at the documented path").toBeUndefined();
    throw error;
  }
}

/** Renders the client reader with the questions of a week copy. */
async function renderReader(copy: WeekShape, questions: Question[]) {
  const Reader = await loadReader();
  const book = readAlongBook(copy);
  const result = render(
    <Reader
      book={book}
      locale="en"
      labels={readerLabels}
      questions={questions}
      tiles={buildTiles(copy)}
      questionLabels={questionLabels}
    />,
  );
  return { ...result, book };
}

/** Clicks the next-page control until the reader passes the last page. */
function goPastLastPage(pages: number): void {
  for (let index = 0; index < pages; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: readerLabels.nextPage }));
  }
}

/** Lists the pages of the choices of the question screen, in the order of the screen. */
function choicePages(container: HTMLElement): number[] {
  return [...container.querySelectorAll("[data-choice-page]")].map((choice) =>
    Number(choice.getAttribute("data-choice-page")),
  );
}

/** Reads one choice of the question screen. */
function choice(container: HTMLElement, page: number): HTMLElement {
  const found = container.querySelector(`[data-choice-page="${page}"]`);
  expect(found, `the screen must show the choice of page ${page}`).not.toBeNull();
  return found as HTMLElement;
}

/** Reports whether a choice shows its mark as a shape or as text, and not as a color alone. */
function showsMark(choiceElement: HTMLElement, textBefore: string): boolean {
  const text = choiceElement.textContent ?? "";
  return text !== textBefore || choiceElement.querySelector("svg, [role='img']") !== null;
}

/** Lists the links of a view, in the order of the view. */
function linkHrefs(container: HTMLElement): string[] {
  return [...container.querySelectorAll("a")].map((link) => link.getAttribute("href") ?? "");
}

describe("Phase 3 Storytime question screen", () => {
  it("lists the choices as the distinct answer pages in book order", async () => {
    const rule = await loadRule();
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const expected = answerPages(questions);
    expect(expected.length, "the shipped week must hold two or more distinct answer pages").toBeGreaterThan(1);
    const choices = rule.questionChoices(questions, book.pages) as Array<{
      page: number;
      file: string;
    }>;
    expect(
      choices.map((entry) => entry.page),
      "the choices must hold the distinct answer pages",
    ).toEqual(expected);
    expect(
      new Set(choices.map((entry) => entry.page)).size,
      "each answer page must show one time",
    ).toBe(choices.length);
    for (const entry of choices) {
      expect(entry.file, `the choice of page ${entry.page} must hold the picture of that page`).toBe(
        book.pages[entry.page - 1]?.image?.file,
      );
    }
  });

  it("keeps the approved copy of the shipped week a valid week", () => {
    const copy = approvedWeek();
    const parsed = weekSchema.safeParse(copy);
    expect(
      parsed.success,
      `the approved copy must parse: ${
        parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")
      }`,
    ).toBe(true);
  });

  it("shows the question screen after the last page", async () => {
    const copy = approvedWeek();
    const questions = readAlongQuestions(copy);
    const { container, book } = await renderReader(copy, questions);
    expect(
      container.querySelector("[data-question-screen]"),
      "the book must show no question screen at the start",
    ).toBeNull();
    goPastLastPage(book.pages.length);
    expect(
      container.querySelector("[data-question-screen]"),
      "the question screen must show after the last page",
    ).not.toBeNull();
    expect(container.textContent, "the screen must show the first question").toContain(questions[0].ask.en);
  });

  it("shows the picture of every distinct answer page one time, in book order", async () => {
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const expected = answerPages(questions);
    const { container } = await renderReader(copy, questions);
    goPastLastPage(book.pages.length);
    expect(
      choicePages(container),
      "the choices must hold the distinct answer pages in book order",
    ).toEqual(expected);
    for (const page of expected) {
      const image = choice(container, page).querySelector("img");
      expect(image, `the choice of page ${page} must hold a picture`).not.toBeNull();
      expect(
        image?.getAttribute("src"),
        `the choice of page ${page} must hold the picture of that page`,
      ).toContain(book.pages[page - 1]?.image?.file ?? "");
    }
  });

  it("shows the English and Thai prompts as text only, with no speaker", async () => {
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const { container } = await renderReader(copy, questions);
    goPastLastPage(book.pages.length);
    const questionScreen = container.querySelector("[data-question-screen]");
    expect(questionScreen, "the question screen must show").not.toBeNull();
    expect(questionScreen?.textContent, "the screen must show the English prompt").toContain(
      questions[0].ask.en,
    );
    expect(questionScreen?.textContent, "the screen must show the Thai prompt").toContain(
      questions[0].ask.th,
    );
    const thai = [...(questionScreen?.querySelectorAll("[lang='th']") ?? [])].find((element) =>
      (element.textContent ?? "").includes(questions[0].ask.th),
    );
    expect(thai, "the Thai prompt must carry lang=th").toBeDefined();
    expect(
      questionScreen?.querySelector("audio"),
      "the prompts must be text only, with no speaker",
    ).toBeNull();
  });

  it("marks the right picture and goes to the next question on a right tap", async () => {
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const { container } = await renderReader(copy, questions);
    goPastLastPage(book.pages.length);
    const rightPage = questions[0].answer.page;
    fireEvent.click(choice(container, rightPage));
    expect(container.textContent, "the screen must show the next question").toContain(questions[1].ask.en);
    const marked = choice(container, rightPage);
    expect(marked.getAttribute("data-mark"), "the right tap must mark the picture").toBe("right");
    expect(marked.getAttribute("aria-pressed"), "the right mark must show as an ARIA state").toBe("true");
  });

  it("shows a gentle mark on a wrong tap, stays on the question, and plays no sound", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const { container } = await renderReader(copy, questions);
    goPastLastPage(book.pages.length);
    const pages = answerPages(questions);
    const wrongPage = pages.find((page) => page !== questions[0].answer.page);
    expect(wrongPage, "the question must hold a wrong choice").toBeDefined();
    const wrong = choice(container, wrongPage as number);
    const textBefore = wrong.textContent ?? "";
    fireEvent.click(wrong);
    expect(container.textContent, "a wrong tap must stay on the question").toContain(questions[0].ask.en);
    expect(container.textContent, "a wrong tap must not go to the next question").not.toContain(
      questions[1].ask.en,
    );
    const marked = choice(container, wrongPage as number);
    expect(marked.getAttribute("data-mark"), "a wrong tap must show the gentle mark").toBe("gentle");
    expect(showsMark(marked, textBefore), "the gentle mark must show as a shape or text").toBe(true);
    expect(play, "a wrong tap must play no sound").not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-question-screen] audio"),
      "the question screen must hold no sound",
    ).toBeNull();
  });

  it("ends the screen with the skip control", async () => {
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const { container } = await renderReader(copy, questions);
    goPastLastPage(book.pages.length);
    const skip = screen.queryByRole("button", { name: questionLabels.skip });
    expect(skip, "the question screen must show the skip control").not.toBeNull();
    fireEvent.click(skip as HTMLElement);
    expect(container.textContent, "the skip control must end the question screen").not.toContain(
      questions[0].ask.en,
    );
  });

  it("ends the screen with the right tap on the third question", async () => {
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    expect(questions.length, "the shipped week must hold the three questions").toBeGreaterThan(2);
    const { container } = await renderReader(copy, questions);
    goPastLastPage(book.pages.length);
    for (const question of questions) {
      const right = container.querySelector(`[data-choice-page="${question.answer.page}"]`);
      expect(right, "the screen must show the right choice of every question").not.toBeNull();
      fireEvent.click(right as HTMLElement);
    }
    expect(
      container.textContent,
      "the right tap on the last question must end the screen",
    ).not.toContain(questions[0].ask.en);
  });

  it("shows the three tiles of the week page at the end of the screen", async () => {
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const { container } = await renderReader(copy, questions);
    goPastLastPage(book.pages.length);
    const skip = screen.queryByRole("button", { name: questionLabels.skip });
    expect(skip, "the question screen must show the skip control").not.toBeNull();
    fireEvent.click(skip as HTMLElement);
    expect(linkHrefs(container), "the end must show the three tiles of the week page").toEqual([
      "?part=book",
      "?part=decodable",
      "?part=song",
    ]);
    expect(container.textContent, "the end must show the tile labels").toContain("Read-along");
    expect(container.textContent, "the end must show the tile labels").toContain("Decodable");
    expect(container.textContent, "the end must show the tile labels").toContain("Song");
  });

  it("leads to the question screen in the slow mode", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    const { container } = await renderReader(copy, questions);
    fireEvent.click(screen.getByRole("button", { name: readerLabels.slow }));
    goPastLastPage(book.pages.length);
    expect(
      container.querySelector("[data-question-screen]"),
      "the slow mode must lead to the question screen",
    ).not.toBeNull();
    expect(container.textContent, "the slow mode must show the first question").toContain(
      questions[0].ask.en,
    );
  });

  it("shows a shared answer page one time and takes it as right for each question", async () => {
    const copy = approvedWeek();
    const book = readAlongBook(copy);
    const questions = readAlongQuestions(copy);
    expect(questions.length, "the shipped week must hold the three questions").toBeGreaterThan(2);
    const sharedPage = questions[0].answer.page;
    book.questions = book.questions?.map((question, index) =>
      index === 1
        ? { ...question, answer: { page: sharedPage, word: questions[0].answer.word } }
        : question,
    );
    const sharedQuestions = readAlongQuestions(copy);
    expect(sharedQuestions[1].answer.page, "the copy must hold the shared answer page").toBe(sharedPage);
    const { container } = await renderReader(copy, sharedQuestions);
    goPastLastPage(book.pages.length);
    expect(
      container.querySelectorAll(`[data-choice-page="${sharedPage}"]`).length,
      "the shared answer page must show one time",
    ).toBe(1);
    expect(
      choicePages(container).length,
      "the choices must hold each distinct answer page one time",
    ).toBe(new Set(sharedQuestions.map((question) => question.answer.page)).size);
    fireEvent.click(choice(container, sharedPage));
    expect(container.textContent, "the shared picture must be right for the first question").toContain(
      sharedQuestions[1].ask.en,
    );
    fireEvent.click(choice(container, sharedPage));
    expect(container.textContent, "the shared picture must be right for the second question").toContain(
      sharedQuestions[2].ask.en,
    );
  });

  it("passes the three tiles of the week page to the reader", () => {
    expect(route, "the week page must pass its three tiles to the reader").toMatch(/tiles=\{/);
  });
});
