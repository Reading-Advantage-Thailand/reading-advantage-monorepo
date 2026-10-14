// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ selectQueue: [] as unknown[][], currentUser: vi.fn() }));

/** Chainable Drizzle stub that resolves to the next queued select result. */
function selectChain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return stub;
}

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  db: { select: () => selectChain() },
}));

import { getArticleForLesson } from "../lessonModel";

const ARTICLE = "42e72186-f199-4eec-80e1-95802ce7649d";
const wordRow = { articleId: ARTICLE, words: [{ vocabulary: "happy", definition: { th: "มีความสุข" }, timeSeconds: 0.5 }], sentence: [{ sentence: "Pip is happy." }] };

describe("getArticleForLesson word rows (rehearsal steps 2, 4, and 6)", () => {
  beforeEach(() => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "s1" });
  });

  it("gives the word row as a list, so the lesson tasks find the words at [0]", async () => {
    mocks.selectQueue = [[{ id: ARTICLE, title: "Pip's Happy Place" }], [wordRow], [], [], []];
    const article = await getArticleForLesson(ARTICLE);
    expect(article.sentencsAndWordsForFlashcard).toEqual([wordRow]);
    expect(article.sentencsAndWordsForFlashcard[0]?.words).toHaveLength(1);
  });

  it("gives an empty list when the article has no word row", async () => {
    mocks.selectQueue = [[{ id: ARTICLE, title: "Pip's Happy Place" }], [], [], [], []];
    expect((await getArticleForLesson(ARTICLE)).sentencsAndWordsForFlashcard).toEqual([]);
  });
});
