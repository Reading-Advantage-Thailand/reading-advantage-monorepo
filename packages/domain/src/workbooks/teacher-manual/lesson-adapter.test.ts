import { describe, expect, it } from "vitest";

import type { WorkbookNormalizedContent } from "../contracts.js";
import { workbookNormalizedContentSchema } from "../contracts.js";
import {
  importLegacyWorkbook,
  legacyWorkbookLessonSchema,
} from "../legacy-workbook-importer.js";
import { toTeacherManualLesson } from "./lesson-adapter.js";

/**
 * Maximal normalized content fixture: every optional carrier in
 * workbookNormalizedContentSchema is populated so the adapter's full mapping
 * surface is exercised.
 */
function makeMaximalContent(): WorkbookNormalizedContent {
  return {
    title: "The Night Sky",
    cefrLevel: "A2",
    paragraphs: [
      { order: 0, text: "First paragraph." },
      { order: 1, text: "Second paragraph." },
    ],
    questions: [
      {
        questionId: "q-1",
        prompt: "What color is the sky?",
        questionType: "multiple-choice",
        choices: ["Blue", "Green"],
        correctChoiceIndex: 0,
      },
    ],
    assets: [
      { key: "assets/hero.png", contentType: "image/png", byteSize: 1024, checksum: "sha256:abc123" },
    ],
    lessonNumber: "3",
    levelName: "Level 2",
    articleType: "expository",
    genre: "science",
    vocabulary: [
      {
        word: "orbit",
        phonetic: "/ˈɔːbɪt/",
        definition: "The path a planet takes around a star.",
        thai_definition: "วงโคจร",
      },
    ],
    vocabMatch: [
      {
        number: 1,
        word: "orbit",
        letter: "a",
        definition: "The path a planet takes around a star.",
        thai_definition: "วงโคจร",
      },
    ],
    vocabFill: [{ number: 1, sentence: "The moon ___ the earth." }],
    vocabWordBank: ["orbit", "gravity"],
    sentenceOrderQuestions: [{ words: ["The", "sky", "is", "blue"] }],
    sentenceCompletionPrompts: [{ number: 1, prompt: "The sky is ___" }],
    shortAnswerQuestion: "Why is the sky blue?",
    shortAnswerHint: "Think about light.",
    writingPrompt: "Describe your favorite star.",
    writingPracticeUrl: "https://app.example.com/writing/1",
    writingPlanPrompts: ["What is your star?", "Why do you like it?"],
    writingSentenceFrames: ["My favorite star is ___."],
    sentenceStarters: ["I think that"],
    connectionQuestion: "How does gravity affect the sky?",
    grammarSearchTerm: "is/are",
    phonicsFocus: "sk",
    discussionQuestion: "Do you enjoy the night sky?",
    reflectionFocus: "What did you learn about stars?",
    mcAnswers: [{ number: 1, letter: "a", text: "Blue" }],
    vocabMatchAnswerString: "1-a",
    vocabFillAnswerString: "orbits",
    sentenceOrderAnswers: [{ number: 1, sentence: "The sky is blue." }],
    translationParagraphs: [{ label: "P1", text: "ท้องฟ้า" }],
    articleCaption: "A night sky view",
    articleUrl: "https://app.example.com/articles/1",
    articleImages: [
      {
        key: "img/hero.png",
        legacyUrl: "https://cdn.example.com/hero.png",
        caption: "Hero shot",
        imagePrompt: "a night sky",
        position: "hero",
      },
    ],
  };
}

describe("toTeacherManualLesson", () => {
  it("accepts the maximal fixture as valid normalized content", () => {
    const fixture = makeMaximalContent();
    expect(workbookNormalizedContentSchema.safeParse(fixture).success).toBe(true);
  });

  it("outputs a legacy lesson that validates against legacyWorkbookLessonSchema", () => {
    const adapted = toTeacherManualLesson(makeMaximalContent());
    const parsed = legacyWorkbookLessonSchema.safeParse(adapted);
    expect(parsed.success).toBe(true);
  });

  it("maps every manual-consumed lesson field to its snake_case counterpart", () => {
    const fixture = makeMaximalContent();
    const adapted = toTeacherManualLesson(fixture);

    expect(adapted.lesson_title).toBe(fixture.title);
    expect(adapted.cefr_level).toBe(fixture.cefrLevel);
    expect(adapted.article_type).toBe(fixture.articleType);
    expect(adapted.genre).toBe(fixture.genre);

    expect(adapted.article_paragraphs).toEqual([
      { number: 1, text: "First paragraph." },
      { number: 2, text: "Second paragraph." },
    ]);

    expect(adapted.comprehension_questions).toEqual([
      { number: 1, question: "What color is the sky?", options: ["Blue", "Green"] },
    ]);

    expect(adapted.vocabulary).toEqual([
      {
        word: "orbit",
        phonetic: "/ˈɔːbɪt/",
        definition: "The path a planet takes around a star.",
        thai_definition: "วงโคจร",
      },
    ]);

    expect(adapted.article_images).toEqual([
      {
        url: "https://cdn.example.com/hero.png",
        caption: "Hero shot",
        image_prompt: "a night sky",
        position: "hero",
      },
    ]);

    expect(adapted.short_answer_question).toBe(fixture.shortAnswerQuestion);
    expect(adapted.short_answer_hint).toBe(fixture.shortAnswerHint);
    expect(adapted.sentence_starters).toEqual(fixture.sentenceStarters);

    expect(adapted.vocab_match).toEqual(fixture.vocabMatch);
    expect(adapted.vocab_fill).toEqual(fixture.vocabFill);
    expect(adapted.sentence_order_questions).toEqual(fixture.sentenceOrderQuestions);
    expect(adapted.sentence_completion_prompts).toEqual(fixture.sentenceCompletionPrompts);

    expect(adapted.writing_prompt).toBe(fixture.writingPrompt);
    expect(adapted.writing_plan_prompts).toEqual(fixture.writingPlanPrompts);
    expect(adapted.writing_sentence_frames).toEqual(fixture.writingSentenceFrames);

    expect(adapted.reflection_focus).toBe(fixture.reflectionFocus);
  });

  it("round-trips manual-consumed fields through the importer unchanged", () => {
    const fixture = makeMaximalContent();
    const adapted = toTeacherManualLesson(fixture);
    const record = importLegacyWorkbook({
      lesson: adapted,
      sourceApp: "reading-advantage",
      sourceId: "lesson-1",
      sourceRevision: "rev-1",
    });
    const roundTripped = record.content;

    expect(roundTripped.title).toBe(fixture.title);
    expect(roundTripped.cefrLevel).toBe(fixture.cefrLevel);
    expect(roundTripped.paragraphs).toEqual(fixture.paragraphs);
    expect(roundTripped.articleType).toBe(fixture.articleType);
    expect(roundTripped.genre).toBe(fixture.genre);
    expect(roundTripped.lessonNumber).toBe(fixture.lessonNumber);
    expect(roundTripped.levelName).toBe(fixture.levelName);
    expect(roundTripped.vocabulary).toEqual(fixture.vocabulary);
    expect(roundTripped.vocabMatch).toEqual(fixture.vocabMatch);
    expect(roundTripped.vocabFill).toEqual(fixture.vocabFill);
    expect(roundTripped.vocabWordBank).toEqual(fixture.vocabWordBank);
    expect(roundTripped.sentenceOrderQuestions).toEqual(fixture.sentenceOrderQuestions);
    expect(roundTripped.sentenceCompletionPrompts).toEqual(fixture.sentenceCompletionPrompts);
    expect(roundTripped.shortAnswerQuestion).toBe(fixture.shortAnswerQuestion);
    expect(roundTripped.shortAnswerHint).toBe(fixture.shortAnswerHint);
    expect(roundTripped.sentenceStarters).toEqual(fixture.sentenceStarters);
    expect(roundTripped.writingPrompt).toBe(fixture.writingPrompt);
    expect(roundTripped.writingPlanPrompts).toEqual(fixture.writingPlanPrompts);
    expect(roundTripped.writingSentenceFrames).toEqual(fixture.writingSentenceFrames);
    expect(roundTripped.connectionQuestion).toBe(fixture.connectionQuestion);
    expect(roundTripped.grammarSearchTerm).toBe(fixture.grammarSearchTerm);
    expect(roundTripped.phonicsFocus).toBe(fixture.phonicsFocus);
    expect(roundTripped.discussionQuestion).toBe(fixture.discussionQuestion);
    expect(roundTripped.reflectionFocus).toBe(fixture.reflectionFocus);
    expect(roundTripped.mcAnswers).toEqual(fixture.mcAnswers);
    expect(roundTripped.vocabMatchAnswerString).toBe(fixture.vocabMatchAnswerString);
    expect(roundTripped.vocabFillAnswerString).toBe(fixture.vocabFillAnswerString);
    expect(roundTripped.sentenceOrderAnswers).toEqual(fixture.sentenceOrderAnswers);
    expect(roundTripped.translationParagraphs).toEqual(fixture.translationParagraphs);
    expect(roundTripped.articleCaption).toBe(fixture.articleCaption);
    expect(roundTripped.articleUrl).toBe(fixture.articleUrl);

    expect(roundTripped.articleImages).toEqual([
      {
        legacyUrl: "https://cdn.example.com/hero.png",
        caption: "Hero shot",
        imagePrompt: "a night sky",
        position: "hero",
      },
    ]);

    expect(roundTripped.questions).toEqual([
      {
        questionId: "q-1",
        prompt: "What color is the sky?",
        questionType: "multiple-choice",
        choices: ["Blue", "Green"],
      },
    ]);
  });

  it("drops normalized fields with no legacy schema counterpart", () => {
    const adapted = toTeacherManualLesson(makeMaximalContent());

    expect(adapted).not.toHaveProperty("assets");
    expect(adapted).not.toHaveProperty("writing_practice_url");
    expect(adapted.comprehension_questions?.[0]).not.toHaveProperty("questionId");
    expect(adapted.comprehension_questions?.[0]).not.toHaveProperty("questionType");
    expect(adapted.comprehension_questions?.[0]).not.toHaveProperty("correctChoiceIndex");
  });

  it("sorts paragraphs by order before numbering them from one", () => {
    const adapted = toTeacherManualLesson({
      title: "Unsorted",
      cefrLevel: "A1",
      paragraphs: [
        { order: 2, text: "Third." },
        { order: 0, text: "First." },
        { order: 1, text: "Second." },
      ],
      questions: [],
      assets: [],
    });
    expect(adapted.article_paragraphs).toEqual([
      { number: 1, text: "First." },
      { number: 2, text: "Second." },
      { number: 3, text: "Third." },
    ]);
  });

  it("maps key-only article images to an empty legacy url", () => {
    const adapted = toTeacherManualLesson({
      title: "Key Only",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "One." }],
      questions: [],
      assets: [],
      articleImages: [{ key: "img/hero.png", position: "hero" }],
    });
    expect(adapted.article_images).toEqual([
      { url: "", caption: "", position: "hero" },
    ]);
  });

  it("maps minimal content to a minimal legacy lesson", () => {
    const adapted = toTeacherManualLesson({
      title: "Minimal",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "One." }],
      questions: [],
      assets: [],
    });
    expect(adapted).toEqual({
      lesson_title: "Minimal",
      cefr_level: "A1",
      article_paragraphs: [{ number: 1, text: "One." }],
    });
  });
});
