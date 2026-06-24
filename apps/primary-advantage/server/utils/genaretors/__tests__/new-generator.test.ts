// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { capturedInserts, capturedInnerRejections, articlesTable, longAnswerQuestionsTable, shortAnswerQuestionsTable, multipleChoiceQuestionsTable } = vi.hoisted(() => {
  const capturedInserts: Array<{ table: string; values: unknown }> = [];
  const capturedInnerRejections: string[] = [];
  const articlesTable = Symbol("articles");
  const longAnswerQuestionsTable = Symbol("longAnswerQuestions");
  const shortAnswerQuestionsTable = Symbol("shortAnswerQuestions");
  const multipleChoiceQuestionsTable = Symbol("multipleChoiceQuestions");
  return {
    capturedInserts,
    capturedInnerRejections,
    articlesTable,
    longAnswerQuestionsTable,
    shortAnswerQuestionsTable,
    multipleChoiceQuestionsTable,
  };
});

const tableNameFor = (t: unknown): string => {
  if (t === articlesTable) return "articles";
  if (t === longAnswerQuestionsTable) return "longAnswerQuestions";
  if (t === shortAnswerQuestionsTable) return "shortAnswerQuestions";
  if (t === multipleChoiceQuestionsTable) return "multipleChoiceQuestions";
  return "unknown";
};

vi.mock("@reading-advantage/db", () => ({
  db: {},
  articles: articlesTable,
  longAnswerQuestions: longAnswerQuestionsTable,
  shortAnswerQuestions: shortAnswerQuestionsTable,
  multipleChoiceQuestions: multipleChoiceQuestionsTable,
}));

vi.mock("@/lib/zod", () => ({
  articleGeneratorSchema: {},
}));

vi.mock("@/utils/google", () => ({
  google: vi.fn(),
  googleModel: "test-model",
}));

vi.mock("@/utils/openai", () => ({
  openai: vi.fn(),
  newModel: "test-model",
  openaiModel4o: "test-4o",
}));

vi.mock("@/types/enum", () => ({
  ArticleBaseCefrLevel: { A1: "A1" },
  ArticleType: { FICTION: "FICTION" },
}));

vi.mock("@/lib/utils", () => ({
  convertCefrLevel: (s: string) => s,
}));

import {
  persistGeneratedArticle,
  type PersistArticleInput,
} from "../new-generator";

const validInput: PersistArticleInput = {
  article: {
    brainstorming: "ideas",
    planning: "plan",
    title: "Test",
    passage: "Hello world.",
    summary: "A test",
    imageDesc: "an image",
    translatedSummary: { th: "th", cn: "cn", tw: "tw", vi: "vi" },
    sentences: ["Hello world."],
    wordlist: [],
    flashcard: [],
    multipleChoiceQuestions: [
      {
        question: "q1",
        options: ["a", "b", "c", "d"],
        answer: "a",
      },
    ],
    shortAnswerQuestions: [{ question: "sq1", answer: "sa1" }],
    longAnswerQuestions: [{ question: "lq1" }],
  },
  data: { genre: "fiction", description: "topic" },
  cefrLevel: "A1",
  rating: 3,
  generateImage: vi.fn().mockResolvedValue({ success: true, imageUrls: ["u"] }),
  generateAudio: vi.fn().mockResolvedValue(undefined),
  generateAudioForFlashcard: vi.fn().mockResolvedValue(undefined),
  convertCefrLevel: (s: string) => s as unknown as ReturnType<typeof import("@/lib/utils")["convertCefrLevel"]>,
  ArticleType: { FICTION: "FICTION" },
};

function makeTx(opts?: { rejectOnCall?: number }) {
  let callIndex = 0;
  const triggerReject = () => {
    callIndex++;
    if (opts?.rejectOnCall !== undefined && callIndex === opts.rejectOnCall) {
      capturedInnerRejections.push("insert-fail");
      throw new Error("Simulated inner transaction rejection");
    }
  };

  return {
    insert: vi.fn().mockImplementation((table: unknown) => {
      const valuesFn = vi.fn().mockImplementation((values: unknown) => {
        triggerReject();
        const isArticleInsert = table === articlesTable;
        capturedInserts.push({
          table: tableNameFor(table),
          values: isArticleInsert ? [{ id: "article-1" }] : values,
        });
        const returningFn = vi.fn().mockImplementation(async () => {
          if (!isArticleInsert) return [];
          return [{ id: "article-1" }];
        });
        return { returning: returningFn };
      });
      return { values: valuesFn };
    }),
  };
}

describe("persistGeneratedArticle — FR-3 transaction integrity", () => {
  it("a row whose `answer` is not in `options` is NOT persisted with correctAnswer: 0", async () => {
    capturedInserts.length = 0;
    const tx = makeTx();

    const brokenInput: PersistArticleInput = {
      ...validInput,
      article: {
        ...validInput.article,
        multipleChoiceQuestions: [
          {
            question: "q-broken",
            options: ["a", "b", "c", "d"],
            answer: "z",
          },
          {
            question: "q-ok",
            options: ["a", "b", "c", "d"],
            answer: "b",
          },
        ],
      },
    };

    await persistGeneratedArticle(tx as never, brokenInput);

    const mcqInserts = capturedInserts
      .filter((c) => c.table === "multipleChoiceQuestions")
      .flatMap((c) => (Array.isArray(c.values) ? c.values : [c.values]));

    const brokenRow = (mcqInserts as Array<{ question: string; correctAnswer?: number }>).find(
      (r) => r?.question === "q-broken",
    );
    expect(
      brokenRow,
      "FR-3: a multiple-choice row whose `answer` is not in `options` must NOT be persisted at all " +
        "(the previous code silently wrote correctAnswer: 0, persisting a wrong key).",
    ).toBeUndefined();

    const okRow = (mcqInserts as Array<{ question: string; correctAnswer?: number }>).find(
      (r) => r?.question === "q-ok",
    );
    expect(okRow, "Healthy row (answer='b', options contains 'b') must be persisted with correctAnswer=1.").toBeDefined();
    expect(okRow?.correctAnswer).toBe(1);
  });

  it("the function rejects when the inner transaction fails (transaction is awaited, not fire-and-forget)", async () => {
    capturedInserts.length = 0;
    capturedInnerRejections.length = 0;
    const tx = makeTx({ rejectOnCall: 2 });

    await expect(
      persistGeneratedArticle(tx as never, validInput),
    ).rejects.toThrow(/Simulated inner transaction rejection/);
  });

  it("awaits the inner Promise.all of background generators (artwork + audio happen before resolve)", async () => {
    capturedInserts.length = 0;
    const tx = makeTx();

    let imageDone = false;
    let audioDone = false;
    let flashcardDone = false;

    const input: PersistArticleInput = {
      ...validInput,
      generateImage: vi.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 10));
        imageDone = true;
        return { success: true, imageUrls: ["u"] };
      }),
      generateAudio: vi.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 10));
        audioDone = true;
      }),
      generateAudioForFlashcard: vi.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 10));
        flashcardDone = true;
      }),
    };

    await persistGeneratedArticle(tx as never, input);

    expect(imageDone, "FR-3: image generation must be awaited before the transaction resolves.").toBe(true);
    expect(audioDone, "FR-3: audio generation must be awaited before the transaction resolves.").toBe(true);
    expect(flashcardDone, "FR-3: flashcard audio must be awaited before the transaction resolves.").toBe(true);
  });
});