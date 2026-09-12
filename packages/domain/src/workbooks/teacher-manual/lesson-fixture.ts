import type { LegacyWorkbookLesson } from "../legacy-workbook-importer.js";

/**
 * Maximal legacy lesson fixture: every carrier the teacher-manual generators
 * consume is populated so the renderers' full surface is exercised.
 * @returns A legacy lesson with vocabulary, paragraphs, comprehension
 * questions, writing carriers, and a hero image.
 */
export function makeFullLesson(): LegacyWorkbookLesson {
  return {
    lesson_title: "The Night Sky",
    cefr_level: "A2",
    lesson_number: "3",
    level_name: "Level 2",
    article_type: "expository",
    genre: "science",
    article_paragraphs: [
      { number: 1, text: "The night sky is full of stars." },
      {
        number: 2,
        text: "This is a very long first reading paragraph that deliberately exceeds the one hundred and fifty character truncation limit used by the step insert renderer so that the ellipsis marker is appended when the paragraph is too long for the reduced student view.",
      },
      { number: 3, text: "Third paragraph." },
      { number: 4, text: "Fourth paragraph." },
      { number: 5, text: "Fifth paragraph." },
    ],
    vocabulary: [
      {
        word: "orbit",
        phonetic: "/ˈɔːbɪt/",
        definition: "The path a planet takes around a star.",
        thai_definition: "วงโคจร",
      },
      {
        word: "gravity",
        phonetic: "/ˈɡrævɪti/",
        definition: "The force that pulls things toward Earth.",
      },
    ],
    comprehension_questions: [
      { number: 1, question: "What color is the sky?", options: ["Blue", "Green", "Red"] },
      { number: 2, question: "Which planet is closest to the sun?", options: ["Earth", "Mercury"] },
    ],
    short_answer_question: "Why is the sky blue?",
    short_answer_hint: "Think about light.",
    sentence_starters: ["I think that", "The sky is"],
    vocab_match: [
      {
        number: 1,
        word: "orbit",
        letter: "a",
        definition: "The path a planet takes around a star.",
      },
      {
        number: 2,
        word: "gravity",
        letter: "b",
        definition: "The force that pulls things toward Earth.",
      },
    ],
    vocab_fill: [
      { number: 1, sentence: "The moon ___ the earth." },
      { number: 2, sentence: "___ pulls objects down." },
    ],
    vocab_word_bank: ["orbit", "gravity"],
    sentence_order_questions: [
      { words: ["The", "sky", "is", "blue"] },
      { words: ["Stars", "shine", "at", "night"] },
    ],
    sentence_completion_prompts: [
      { number: 1, prompt: "The sky is ___" },
      { number: 2, prompt: "Gravity ___ objects down" },
    ],
    writing_prompt: "Describe your favorite star.",
    writing_plan_prompts: ["What is your star?", "Why do you like it?"],
    writing_sentence_frames: ["My favorite star is ___."],
    reflection_focus: "What did you learn about stars?",
    article_images: [
      { url: "https://cdn.example.com/hero.png", caption: "Hero shot", position: "hero" },
    ],
    article_caption: "A night sky view",
    article_url: "https://app.example.com/articles/1",
  };
}

/**
 * Minimal legacy lesson fixture: only the schema-required carriers. Used to
 * assert the renderers degrade gracefully instead of emitting `undefined`.
 * @returns A legacy lesson with a title and a single paragraph.
 */
export function makeMinimalLesson(): LegacyWorkbookLesson {
  return {
    lesson_title: "Minimal",
    cefr_level: "A1",
    article_paragraphs: [{ number: 1, text: "One." }],
  };
}
