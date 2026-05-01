import { Article } from "@/components/models/article-model";

export interface WorkbookJSON {
  lesson_number: string;
  lesson_title: string;
  level_name: string;
  cefr_level: string;
  article_type: string;
  genre: string;
  vocabulary: {
    word: string;
    phonetic: string;
    definition: string;
  }[];
  article_image_url: string;
  article_caption: string;
  article_url?: string;
  article_paragraphs: {
    number: number;
    text: string;
  }[];
  comprehension_questions: {
    number: number;
    question: string;
    options: string[];
  }[];
  short_answer_question: string;
  sentence_starters: string[];
  vocab_match: any[]; // To be implemented or left empty
  vocab_fill: any[]; // To be implemented or left empty
  vocab_word_bank: string[];
  sentence_order_questions: any[];
  sentence_completion_prompts: any[];
  writing_prompt: string;
  mc_answers: any[];
  vocab_match_answer_string: string;
  vocab_fill_answer_string: string;
  sentence_order_answers: any[];
  translation_paragraphs: {
    label: string;
    text: string;
  }[];
}

export const mapArticleToWorkbookJSON = (
  article: Article,
  wordList: any[],
  mcq: any[],
  saq: any[],
  laq: any[],
  translated: string[]
): WorkbookJSON => {
  const paragraphs = article.passage.split("\n\n").map((p, i) => ({
    number: i + 1,
    text: p,
  }));

  const vocab = wordList.map((w: any) => ({
    word: w.vocabulary,
    phonetic: "", // Not currently available in standard response
    definition: w.definition.en || w.definition, // Fallback
  }));

  const compQuestions = mcq.map((q: any, i: number) => ({
    number: i + 1,
    question: q.question,
    options: q.options,
  }));

  const translation = translated.map((t, i) => ({
    label: `Paragraph ${i + 1}`,
    text: t,
  }));

  return {
    lesson_number: "Lesson 1", // Placeholder
    lesson_title: article.title,
    level_name: `Level ${article.ra_level}`,
    cefr_level: `CEFR ${article.cefr_level}`,
    article_type: article.type || "",
    genre: article.genre || "",
    vocabulary: vocab,
    article_image_url: `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}.png`,
    article_caption: article.image_description || "Article Illustration",
    article_paragraphs: paragraphs,
    comprehension_questions: compQuestions,
    short_answer_question: saq.length > 0 ? saq[0] : "",
    sentence_starters: [
      "I think...",
      "The article says...",
      "In my opinion...",
    ],
    vocab_match: [], // Placeholder for manual generator logic
    vocab_fill: [], // Placeholder
    vocab_word_bank: vocab.map((v) => v.word),
    sentence_order_questions: [],
    sentence_completion_prompts: [],
    writing_prompt: laq.length > 0 ? laq[0] : "",
    mc_answers: [], // Would need correct answer logic
    vocab_match_answer_string: "",
    vocab_fill_answer_string: "",
    sentence_order_answers: [],
    translation_paragraphs: translation,
  };
};
