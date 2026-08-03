import { describe, expect, it } from "vitest";

import {
  importLegacyWorkbook,
  type LegacyWorkbookLesson,
} from "../workbooks/legacy-workbook-importer.js";
import { workbookSourceRecordSchema } from "../workbooks/contracts.js";
import { WorkbookCatalogError } from "../workbooks/content-catalog-port.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";

/**
 * Full legacy lesson fixture mirroring the origins-2-a0 lesson shape so every
 * historically dropped field is exercised by the importer.
 */
const FULL_LESSON: LegacyWorkbookLesson = {
  lesson_number: "Lesson 1",
  lesson_title: "Pip the Curious Puppy Feels",
  level_name: "Level 2",
  cefr_level: "CEFR A0",
  article_type: "fiction",
  genre: "Materials & Science",
  vocabulary: [
    {
      word: "puppy",
      phonetic: "",
      definition: "A young dog.",
      thai_definition: "ลูกสุนัข",
    },
    {
      word: "curious",
      phonetic: "",
      definition: "Eager to know or learn something.",
      thai_definition: "อยากรู้อยากเห็น",
    },
  ],
  article_image_url: [
    "https://storage.googleapis.com/primary-app-storage/images/demo_1.png",
    "https://storage.googleapis.com/primary-app-storage/images/demo_2.png",
  ],
  article_caption: "Pip the curious puppy feels a soft blanket, a rough rug, and a smooth ball.",
  article_url:
    "https://primary.reading-advantage.com/student/read/cmgqx8v6602p3t79btatvfjuw",
  article_paragraphs: [
    { number: 1, text: "This is Pip. Pip is a puppy." },
    { number: 2, text: "Pip is a curious puppy." },
  ],
  comprehension_questions: [
    { number: 1, question: "What is Pip?", options: ["A cat", "A puppy", "A bird"] },
  ],
  short_answer_question: "What is the puppy's name?",
  short_answer_hint: "Look at the first sentence.",
  sentence_starters: ["I think...", "The article says..."],
  vocab_match: [
    {
      number: 1,
      word: "puppy",
      letter: "a",
      definition: "A young dog.",
      thai_definition: "ลูกสุนัข",
    },
  ],
  vocab_fill: [{ number: 1, sentence: "Pip is a <span class=\"blank\"></span>." }],
  vocab_word_bank: ["puppy", "curious", "blanket"],
  sentence_order_questions: [{ words: ["is", "Pip", "This"] }],
  sentence_completion_prompts: [{ number: 1, prompt: "This is Pip" }],
  writing_prompt: "Describe Pip the puppy in two sentences.",
  writing_plan_prompts: ["What does Pip look like?"],
  writing_sentence_frames: ["Pip is ..."],
  connection_question: "How does Pip feel about the blanket?",
  grammar_search_term: "adjectives",
  phonics_focus: "short a",
  discussion_question: "What is your favorite texture?",
  reflection_focus: "What did Pip learn about textures?",
  mc_answers: [{ number: 1, letter: "b", text: "A puppy" }],
  vocab_match_answer_string: "1-a",
  vocab_fill_answer_string: "1. puppy",
  sentence_order_answers: [{ number: 1, sentence: "This is Pip." }],
  translation_paragraphs: [{ label: "Paragraph 1", text: "นี่คือปิ๊ป" }],
};

/** Minimal legacy lesson carrying only the fields the old contract supported. */
const MINIMAL_LESSON: LegacyWorkbookLesson = {
  lesson_title: "Minimal Lesson",
  cefr_level: "A0",
  article_paragraphs: [{ number: 1, text: "Only paragraph." }],
};

/**
 * Builds a legacy import payload for the importer.
 * @param overrides Optional partial input merged over the base payload.
 * @returns A raw import input with a stable source identity.
 */
function createInput(
  overrides: Partial<Parameters<typeof importLegacyWorkbook>[0]> = {},
): Parameters<typeof importLegacyWorkbook>[0] {
  return {
    lesson: FULL_LESSON,
    sourceApp: "reading-advantage",
    sourceId: "cmgqx8v6602p3t79btatvfjuw",
    sourceRevision: "sha256:rev-1",
    ...overrides,
  };
}

describe("legacy workbook importer / source identity", () => {
  it("takes sourceApp from the input instead of hardcoding reading-advantage", () => {
    const record = importLegacyWorkbook(createInput({ sourceApp: "primary-advantage" }));
    expect(record.identity.sourceApp).toBe("primary-advantage");
  });

  it("accepts reading-advantage as the sourceApp", () => {
    const record = importLegacyWorkbook(createInput({ sourceApp: "reading-advantage" }));
    expect(record.identity.sourceApp).toBe("reading-advantage");
  });

  it("rejects an unknown sourceApp value", () => {
    expect(() =>
      importLegacyWorkbook(
        createInput({ sourceApp: "science-advantage" as never }),
      ),
    ).toThrow(WorkbookCatalogError);
  });
});

describe("legacy workbook importer / lesson metadata", () => {
  it("maps lesson_number, level_name, article_type, and genre", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.lessonNumber).toBe("Lesson 1");
    expect(record.content.levelName).toBe("Level 2");
    expect(record.content.articleType).toBe("fiction");
    expect(record.content.genre).toBe("Materials & Science");
  });

  it("omits lesson metadata when the legacy lesson omits it", () => {
    const record = importLegacyWorkbook(createInput({ lesson: MINIMAL_LESSON }));
    expect(record.content.lessonNumber).toBeUndefined();
    expect(record.content.levelName).toBeUndefined();
    expect(record.content.genre).toBeUndefined();
  });
});

describe("legacy workbook importer / vocabulary carriers", () => {
  it("maps vocabulary entries with word, definition, and thai_definition", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.vocabulary).toEqual([
      {
        word: "puppy",
        phonetic: "",
        definition: "A young dog.",
        thai_definition: "ลูกสุนัข",
      },
      {
        word: "curious",
        phonetic: "",
        definition: "Eager to know or learn something.",
        thai_definition: "อยากรู้อยากเห็น",
      },
    ]);
  });

  it("maps vocab matching data when present", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.vocabMatch).toEqual([
      {
        number: 1,
        word: "puppy",
        letter: "a",
        definition: "A young dog.",
        thai_definition: "ลูกสุนัข",
      },
    ]);
  });

  it("maps vocab fill, word bank, sentence order, and completion prompts", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.vocabFill).toEqual([
      { number: 1, sentence: "Pip is a <span class=\"blank\"></span>." },
    ]);
    expect(record.content.vocabWordBank).toEqual(["puppy", "curious", "blanket"]);
    expect(record.content.sentenceOrderQuestions).toEqual([{ words: ["is", "Pip", "This"] }]);
    expect(record.content.sentenceCompletionPrompts).toEqual([
      { number: 1, prompt: "This is Pip" },
    ]);
  });

  it("omits vocabulary carriers when the legacy lesson omits them", () => {
    const record = importLegacyWorkbook(createInput({ lesson: MINIMAL_LESSON }));
    expect(record.content.vocabulary).toBeUndefined();
    expect(record.content.vocabMatch).toBeUndefined();
  });
});

describe("legacy workbook importer / short answer and writing", () => {
  it("maps the short answer question and hint", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.shortAnswerQuestion).toBe("What is the puppy's name?");
    expect(record.content.shortAnswerHint).toBe("Look at the first sentence.");
  });

  it("maps writing prompt, plan prompts, sentence frames, and starters", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.writingPrompt).toBe("Describe Pip the puppy in two sentences.");
    expect(record.content.writingPlanPrompts).toEqual(["What does Pip look like?"]);
    expect(record.content.writingSentenceFrames).toEqual(["Pip is ..."]);
    expect(record.content.sentenceStarters).toEqual(["I think...", "The article says..."]);
  });
});

describe("legacy workbook importer / connectors and reflection", () => {
  it("maps pedagogical connectors", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.connectionQuestion).toBe("How does Pip feel about the blanket?");
    expect(record.content.grammarSearchTerm).toBe("adjectives");
    expect(record.content.phonicsFocus).toBe("short a");
    expect(record.content.discussionQuestion).toBe("What is your favorite texture?");
  });

  it("maps the reflection focus prompt", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.reflectionFocus).toBe("What did Pip learn about textures?");
  });
});

describe("legacy workbook importer / answer keys", () => {
  it("maps mc answers, answer strings, sentence order answers, and translations", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.mcAnswers).toEqual([{ number: 1, letter: "b", text: "A puppy" }]);
    expect(record.content.vocabMatchAnswerString).toBe("1-a");
    expect(record.content.vocabFillAnswerString).toBe("1. puppy");
    expect(record.content.sentenceOrderAnswers).toEqual([
      { number: 1, sentence: "This is Pip." },
    ]);
    expect(record.content.translationParagraphs).toEqual([
      { label: "Paragraph 1", text: "นี่คือปิ๊ป" },
    ]);
  });
});

describe("legacy workbook importer / article images", () => {
  it("maps article_image_url entries as legacyUrl provenance", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.articleImages).toEqual([
      {
        legacyUrl: "https://storage.googleapis.com/primary-app-storage/images/demo_1.png",
      },
      {
        legacyUrl: "https://storage.googleapis.com/primary-app-storage/images/demo_2.png",
      },
    ]);
  });

  it("maps a single article_image_url string as one provenance entry", () => {
    const record = importLegacyWorkbook(
      createInput({ lesson: { ...FULL_LESSON, article_image_url: "https://example.com/hero.png" } }),
    );
    expect(record.content.articleImages).toEqual([
      { legacyUrl: "https://example.com/hero.png" },
    ]);
  });

  it("maps structured article_images with caption and position", () => {
    const record = importLegacyWorkbook(
      createInput({
        lesson: {
          ...FULL_LESSON,
          article_image_url: "",
          article_images: [
            {
              url: "https://example.com/inline_1.png",
              caption: "Pip feels the soft blanket.",
              position: "inline-para-1",
            },
          ],
        },
      }),
    );
    expect(record.content.articleImages).toEqual([
      {
        legacyUrl: "https://example.com/inline_1.png",
        caption: "Pip feels the soft blanket.",
        position: "inline-para-1",
      },
    ]);
  });

  it("maps the article caption and article URL as provenance", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.content.articleCaption).toBe(
      "Pip the curious puppy feels a soft blanket, a rough rug, and a smooth ball.",
    );
    expect(record.content.articleUrl).toBe(
      "https://primary.reading-advantage.com/student/read/cmgqx8v6602p3t79btatvfjuw",
    );
  });
});

describe("legacy workbook importer / contract and digest", () => {
  it("returns a record that satisfies workbookSourceRecordSchema", () => {
    const record = importLegacyWorkbook(createInput());
    expect(workbookSourceRecordSchema.safeParse(record).success).toBe(true);
  });

  it("hashes the content with computeWorkbookDigest", () => {
    const record = importLegacyWorkbook(createInput());
    expect(record.identity.contentHash).toBe(computeWorkbookDigest(record.content));
  });

  it("keeps the digest of a minimal lesson identical to the pre-extension content shape", () => {
    const record = importLegacyWorkbook(
      createInput({ lesson: MINIMAL_LESSON }),
    );
    const preExtensionContent = {
      title: "Minimal Lesson",
      cefrLevel: "A0",
      paragraphs: [{ order: 0, text: "Only paragraph." }],
      questions: [],
      assets: [],
    };
    expect(record.identity.contentHash).toBe(computeWorkbookDigest(preExtensionContent));
  });

  it("changes the digest when extended carriers are populated", () => {
    const full = importLegacyWorkbook(createInput());
    const minimal = importLegacyWorkbook(createInput({ lesson: MINIMAL_LESSON }));
    expect(full.identity.contentHash).not.toBe(minimal.identity.contentHash);
  });
});
